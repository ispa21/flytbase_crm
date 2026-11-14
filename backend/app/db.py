"""All state lives here: Postgres in production (DATABASE_URL), sqlite only for tests.

Autocommit: every statement is atomic, so the lease UPDATE is the lock.
"""
import json
import os
import sqlite3

PG = "BIGSERIAL PRIMARY KEY"
LITE = "INTEGER PRIMARY KEY"
DDL = """
CREATE TABLE IF NOT EXISTS snapshots(
  id {pk}, tool TEXT NOT NULL, args TEXT NOT NULL,
  fetched_at DOUBLE PRECISION NOT NULL, payload TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS snap_key ON snapshots(tool, args, id);
CREATE TABLE IF NOT EXISTS signals(
  id TEXT PRIMARY KEY, account TEXT, first_seen DOUBLE PRECISION NOT NULL, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS queue(
  id {pk}, prio INTEGER NOT NULL, tool TEXT NOT NULL, args TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, not_before DOUBLE PRECISION NOT NULL DEFAULT 0,
  UNIQUE(tool, args));
CREATE TABLE IF NOT EXISTS caller(
  id INTEGER PRIMARY KEY, last_call_at DOUBLE PRECISION NOT NULL DEFAULT 0,
  lease_until DOUBLE PRECISION NOT NULL DEFAULT 0, last_run_end DOUBLE PRECISION NOT NULL DEFAULT 0,
  last_error_at DOUBLE PRECISION, last_error TEXT);
CREATE TABLE IF NOT EXISTS changes(id INTEGER PRIMARY KEY, n BIGINT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v DOUBLE PRECISION NOT NULL);
CREATE TABLE IF NOT EXISTS notes(
  id {pk}, account TEXT NOT NULL, deal TEXT, text TEXT NOT NULL, kind TEXT NOT NULL, source TEXT,
  status TEXT NOT NULL, created_at DOUBLE PRECISION NOT NULL, saved_at DOUBLE PRECISION,
  error TEXT, response TEXT);
INSERT INTO caller(id) VALUES(1) ON CONFLICT DO NOTHING;
INSERT INTO changes(id) VALUES(1) ON CONFLICT DO NOTHING;
"""


def key(args: dict | None) -> str:
    return json.dumps(args or {}, sort_keys=True)


def _stable(p):  # exported_at changes on every call: never a change signal
    return {k: v for k, v in p.items() if k != "exported_at"} if isinstance(p, dict) else p


class DB:
    def __init__(self, url: str | None = None):
        url = url or os.environ.get("DATABASE_URL")
        if not url:
            raise RuntimeError("DATABASE_URL not set")
        self.pg = not url.startswith("sqlite")
        if self.pg:
            import psycopg
            self.c = psycopg.connect(url, autocommit=True)
        else:  # "sqlite::memory:" or "sqlite:///path"
            self.c = sqlite3.connect(url.split(":", 1)[1].lstrip("/") or ":memory:", isolation_level=None,
                                     check_same_thread=False)
        for stmt in DDL.format(pk=PG if self.pg else LITE).split(";"):
            if stmt.strip():
                self.x(stmt)

    def x(self, sql, *params):
        sql = sql.replace("?", "%s") if self.pg else sql
        cur = self.c.cursor() if self.pg else self.c
        return cur.execute(sql, params)

    def close(self):
        self.c.close()

    # --- snapshots (append-only) ---------------------------------------
    def add_snapshot(self, tool, args, payload, t) -> bool:
        """Append once; True (and counter bump) if content differs from the previous one."""
        prev = self.latest(tool, args)
        self.x("INSERT INTO snapshots(tool,args,fetched_at,payload) VALUES(?,?,?,?)",
               tool, key(args), t, json.dumps(payload))
        changed = prev is None or _stable(prev[0]) != _stable(payload)
        if changed:
            self.bump()
        return changed

    def latest(self, tool, args=None):
        """-> (payload, fetched_at) or None."""
        r = self.x("SELECT payload, fetched_at FROM snapshots WHERE tool=? AND args=? ORDER BY id DESC LIMIT 1",
                   tool, key(args)).fetchone()
        return (json.loads(r[0]), r[1]) if r else None

    def snapshot_at(self, tool, args, t):
        """-> (payload, fetched_at) the snapshot in force at `t` (latest at or before it), else the first one."""
        for sql in ("SELECT payload, fetched_at FROM snapshots WHERE tool=? AND args=? AND fetched_at<=? ORDER BY id DESC LIMIT 1",
                    "SELECT payload, fetched_at FROM snapshots WHERE tool=? AND args=? AND fetched_at>? ORDER BY id LIMIT 1"):
            r = self.x(sql, tool, key(args), t).fetchone()
            if r:
                return json.loads(r[0]), r[1]
        return None

    def signals_since(self, t):
        rows = self.x("SELECT payload, first_seen FROM signals WHERE first_seen>? ORDER BY first_seen", t).fetchall()
        return [(json.loads(p), f) for p, f in rows]

    def latest_all(self):
        rows = self.x("SELECT tool, args, MAX(fetched_at) FROM snapshots GROUP BY tool, args ORDER BY tool, args")
        return [(t, json.loads(a), f) for t, a, f in rows.fetchall()]

    def last_fetch(self, *tools):
        q = ",".join("?" * len(tools))
        return self.x(f"SELECT MAX(fetched_at) FROM snapshots WHERE tool IN ({q})", *tools).fetchone()[0]

    def add_signal(self, sig: dict, now: float) -> bool:
        cur = self.x("INSERT INTO signals(id,account,first_seen,payload) VALUES(?,?,?,?) ON CONFLICT DO NOTHING",
                     sig["id"], sig.get("account"), now, json.dumps(sig))
        return cur.rowcount == 1

    # --- queue ----------------------------------------------------------
    def enqueue(self, prio, tool, args=None, attempts=0, not_before=0.0) -> bool:
        """False if the same call already waits (dedupe)."""
        return self.x("INSERT INTO queue(prio,tool,args,attempts,not_before) VALUES(?,?,?,?,?) "
                      "ON CONFLICT DO NOTHING", prio, tool, key(args), attempts, not_before).rowcount == 1

    def has_eligible(self, t) -> bool:
        return self.x("SELECT 1 FROM queue WHERE not_before<=? LIMIT 1", t).fetchone() is not None

    def pop(self, t):
        """Remove and return the best eligible (prio, tool, args, attempts) or None."""
        r = self.x("DELETE FROM queue WHERE id=(SELECT id FROM queue WHERE not_before<=? "
                   "ORDER BY prio, id LIMIT 1) RETURNING prio, tool, args, attempts", t).fetchone()
        return (r[0], r[1], json.loads(r[2]), r[3]) if r else None

    def queue_len(self):
        return self.x("SELECT COUNT(*) FROM queue").fetchone()[0]

    # --- notes (write-back, story 6.3) -----------------------------------
    def add_note(self, account, deal, text, kind, source, now) -> int:
        return self.x("INSERT INTO notes(account,deal,text,kind,source,status,created_at) "
                      "VALUES(?,?,?,?,?,'queued',?) RETURNING id", account, deal, text, kind, source, now).fetchone()[0]

    def claim_note(self, nid):
        """queued -> sending, atomically. None if already claimed/sent: a note is sent at most once."""
        r = self.x("UPDATE notes SET status='sending' WHERE id=? AND status='queued' "
                   "RETURNING account, deal, text, kind", nid).fetchone()
        return dict(zip(("account", "deal", "text", "kind"), r)) if r else None

    def finish_note(self, nid, ok, now, error, response):
        self.x("UPDATE notes SET status=?, saved_at=?, error=?, response=? WHERE id=?",
               "saved" if ok else "failed", now if ok else None, error, response, nid)
        self.bump()

    def notes(self):
        rows = self.x("SELECT id, account, deal, kind, source, text, status, created_at, saved_at, error, response "
                      "FROM notes ORDER BY id DESC").fetchall()
        cols = ("id", "account", "deal", "kind", "source", "text", "status", "created_at", "saved_at", "error", "response")
        return [dict(zip(cols, r)) for r in rows]

    # --- caller: lease, spacing, error ---------------------------------
    def acquire(self, now, ttl, min_idle=0.0) -> bool:
        """Take the lease if free and the last run ended >= min_idle ago."""
        return self.x("UPDATE caller SET lease_until=? WHERE id=1 AND lease_until<? AND last_run_end<=?",
                      now + ttl, now, now - min_idle).rowcount == 1

    def extend(self, now, ttl):
        self.x("UPDATE caller SET lease_until=? WHERE id=1", now + ttl)

    def release(self, now):
        self.x("UPDATE caller SET lease_until=0, last_run_end=? WHERE id=1", now)

    def last_call_at(self):
        return self.x("SELECT last_call_at FROM caller WHERE id=1").fetchone()[0]

    def set_last_call(self, t):
        self.x("UPDATE caller SET last_call_at=? WHERE id=1", t)

    def set_error(self, t, msg):
        self.x("UPDATE caller SET last_error_at=?, last_error=? WHERE id=1", t, msg)

    def clear_error(self):
        self.x("UPDATE caller SET last_error_at=NULL, last_error=NULL WHERE id=1")

    def error(self):
        r = self.x("SELECT last_error_at, last_error FROM caller WHERE id=1").fetchone()
        return r if r[0] is not None else None

    # --- change counter -------------------------------------------------
    def bump(self):
        self.x("UPDATE changes SET n=n+1 WHERE id=1")

    def changes(self) -> int:
        return self.x("SELECT n FROM changes WHERE id=1").fetchone()[0]

    # --- manual resync: every snapshot fetched before this time counts as stale ----
    def set_resync(self, t):
        self.x("INSERT INTO meta(k,v) VALUES('resync_at',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", t)

    def resync_at(self) -> float:
        r = self.x("SELECT v FROM meta WHERE k='resync_at'").fetchone()
        return r[0] if r else 0.0
