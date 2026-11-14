"""What to fetch and when. Ids come from responses, never hard-coded."""
import logging

from .queue import COLD, REFETCH, SIGNALS, WHOAMI

log = logging.getLogger("aq.sync")
SIGNALS_EVERY = 120   # s
WHOAMI_EVERY = 600    # s


def _ids(items):
    """new_accounts elements: plain ids or {id|account: ...}. Unknown shape -> skipped."""
    out = []
    for x in items or []:
        v = x if isinstance(x, str) else (x.get("id") or x.get("account")) if isinstance(x, dict) else None
        if v:
            out.append(v)
        else:
            log.warning("unknown new_accounts shape: %r", x)
    return out


class Sync:
    def __init__(self, queue, store, on_update=None):
        self.q, self.store, self.on_update = queue, store, on_update
        self.next_signals = self.next_whoami = 0.0  # due immediately: refreshes after restart too
        self.q.on_result = self.handle

    # --- scheduling -------------------------------------------------
    def start(self):
        """Cold start: queue whatever has no snapshot yet."""
        for tool in ("whoami", "get_my_accounts", "get_flytbase_team", "get_signals"):
            if not self.store.latest(tool):
                self.q.put(COLD, tool)
        self.fill_missing()

    def fill_missing(self, prio=COLD):
        ma = self.store.latest("get_my_accounts")
        if not ma:
            return
        for a in ma[0].get("accounts", []):
            if not self.store.latest("get_all_paperwork", {"account": a["id"]}):
                self.q.put(prio, "get_all_paperwork", {"account": a["id"]})
        for f in ma[0].get("files", []):
            if not self.store.latest("get_file", {"id": f["id"]}):
                self.q.put(prio, "get_file", {"id": f["id"]})

    def tick(self):
        now = self.q.clock.time()
        if now >= self.next_signals:
            self.next_signals = now + SIGNALS_EVERY
            self.q.put(SIGNALS, "get_signals")
        if now >= self.next_whoami:
            self.next_whoami = now + WHOAMI_EVERY
            self.q.put(WHOAMI, "whoami")

    # --- results ----------------------------------------------------
    async def handle(self, tool, args, payload):
        now = self.q.clock.time()
        self.store.add(tool, args, payload, now)
        if tool == "get_my_accounts":
            self.fill_missing()
        elif tool == "get_signals":
            for s in payload.get("signals", []):
                if self.store.add_signal(s, now):
                    log.info("new signal %s", s["id"])
                    self.q.put(REFETCH, "get_my_accounts")
                    if s.get("account"):
                        self.q.put(REFETCH, "get_all_paperwork", {"account": s["account"]})
        elif tool == "whoami":
            known = {a["id"] for a in (self.store.latest("get_my_accounts") or ({},))[0].get("accounts", [])}
            for acc in _ids(payload.get("new_accounts")):
                if acc not in known:
                    self.q.put(REFETCH, "get_all_paperwork", {"account": acc})
                    self.q.put(REFETCH, "get_my_accounts")  # brings its files; fill_missing queues them
        if self.on_update:
            self.on_update()
