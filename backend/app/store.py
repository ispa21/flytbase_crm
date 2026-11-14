"""Append-only SQLite snapshots. Never updated, never deleted."""
import json
import sqlite3


def key(args: dict | None) -> str:
    return json.dumps(args or {}, sort_keys=True)


class Store:
    def __init__(self, path=":memory:"):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS snapshots(
          id INTEGER PRIMARY KEY, tool TEXT NOT NULL, args TEXT NOT NULL,
          fetched_at REAL NOT NULL, payload TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS snap_key ON snapshots(tool, args, id);
        CREATE TABLE IF NOT EXISTS signals(
          id TEXT PRIMARY KEY, account TEXT, first_seen REAL NOT NULL, payload TEXT NOT NULL);
        """)

    def add(self, tool, args, payload, fetched_at):
        self.db.execute("INSERT INTO snapshots(tool,args,fetched_at,payload) VALUES(?,?,?,?)",
                        (tool, key(args), fetched_at, json.dumps(payload)))
        self.db.commit()

    def latest(self, tool, args=None):
        """-> (payload, fetched_at) or None. Always carries its fetch time."""
        r = self.db.execute(
            "SELECT payload, fetched_at FROM snapshots WHERE tool=? AND args=? ORDER BY id DESC LIMIT 1",
            (tool, key(args))).fetchone()
        return (json.loads(r[0]), r[1]) if r else None

    def latest_all(self):
        """[(tool, args_dict, fetched_at)] newest snapshot per (tool, args)."""
        rows = self.db.execute(
            "SELECT tool, args, MAX(fetched_at) FROM snapshots GROUP BY tool, args ORDER BY tool, args")
        return [(t, json.loads(a), f) for t, a, f in rows]

    def last_fetch(self, *tools):
        q = ",".join("?" * len(tools))
        return self.db.execute(
            f"SELECT MAX(fetched_at) FROM snapshots WHERE tool IN ({q})", tools).fetchone()[0]

    def add_signal(self, sig: dict, now: float) -> bool:
        """True if new (dedupe by id)."""
        cur = self.db.execute("INSERT OR IGNORE INTO signals VALUES(?,?,?,?)",
                              (sig["id"], sig.get("account"), now, json.dumps(sig)))
        self.db.commit()
        return cur.rowcount == 1
