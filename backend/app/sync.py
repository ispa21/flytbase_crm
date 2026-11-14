"""What to fetch and when. Ids come from responses, never hard-coded."""
import logging

from .queue import COLD, REFETCH, SIGNALS, WHOAMI

log = logging.getLogger("aq.sync")
SIGNALS_EVERY = 120   # s
WHOAMI_EVERY = 600
ACCOUNTS_EVERY = 600
PAPERWORK_EVERY = 900
FILES_TEAM_EVERY = 3600


def _ids(items):
    """new_accounts elements: plain ids or {id|account: ...}. Unknown shape -> logged, skipped."""
    out = []
    for x in items if isinstance(items, list) else []:
        v = x if isinstance(x, str) else (x.get("id") or x.get("account")) if isinstance(x, dict) else None
        if v:
            out.append(v)
        else:
            log.warning("unknown new_accounts shape: %r", x)
    return out


class Sync:
    def __init__(self, db):
        self.db = db

    def _due(self, now, every, prio, tool, args=None):
        snap = self.db.latest(tool, args)
        if snap is None or now - snap[1] > every or snap[1] < self.db.resync_at():
            self.db.enqueue(prio, tool, args)

    def schedule(self, now):
        """Queue every poll or refresh that is due. Cheap; called before each call slot."""
        d = self.db
        self._due(now, SIGNALS_EVERY, SIGNALS, "get_signals")
        self._due(now, WHOAMI_EVERY, WHOAMI, "whoami")
        self._due(now, ACCOUNTS_EVERY, REFETCH, "get_my_accounts")
        self._due(now, FILES_TEAM_EVERY, COLD, "get_flytbase_team")
        ma = d.latest("get_my_accounts")
        if ma and isinstance(ma[0], dict):
            for a in ma[0].get("accounts") or []:
                if isinstance(a, dict) and a.get("id"):
                    self._due(now, PAPERWORK_EVERY, COLD, "get_all_paperwork", {"account": a["id"]})
            for f in ma[0].get("files") or []:
                if isinstance(f, dict) and f.get("id"):
                    self._due(now, FILES_TEAM_EVERY, COLD, "get_file", {"id": f["id"]})

    def handle(self, tool, args, payload, now):
        """React to a stored snapshot. May raise; the worker contains it."""
        d = self.db
        if tool == "get_signals":
            for s in payload.get("signals") or []:
                if not isinstance(s, dict) or not s.get("id"):
                    log.warning("signal without id skipped: %r", s)
                    continue
                if d.add_signal(s, now):
                    log.info("new signal %s", s["id"])
                    d.bump()
                    d.enqueue(REFETCH, "get_my_accounts")
                    if s.get("account"):
                        d.enqueue(REFETCH, "get_all_paperwork", {"account": s["account"]})
        elif tool == "whoami":
            ma = d.latest("get_my_accounts")
            known = {a.get("id") for a in (ma[0].get("accounts") or [])} if ma else set()
            for acc in _ids(payload.get("new_accounts")):
                if acc not in known and not d.latest("get_all_paperwork", {"account": acc}):
                    d.enqueue(REFETCH, "get_all_paperwork", {"account": acc})
                    d.enqueue(REFETCH, "get_my_accounts")  # brings its files; schedule() queues them
