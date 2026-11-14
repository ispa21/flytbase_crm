from datetime import datetime, timezone

STALE_AFTER = 300  # s without a good poll


def iso(t):
    return datetime.fromtimestamp(t, timezone.utc).isoformat() if t else None


def health(store, queue, sync=None):
    now = queue.clock.time()
    last_poll = store.last_fetch("get_signals", "whoami")  # survives restart
    stale = last_poll is None or now - last_poll > STALE_AFTER
    err = queue.last_error
    return {
        "now": iso(now),
        "stale": stale,
        "reachable": not stale,  # unreachable once the last good poll is over 5 min old
        "last_good_poll": iso(last_poll),
        "last_error": {"at": iso(err[0]), "message": err[1]} if err else None,
        "pending_calls": len(queue.heap),
        "fetched": [{"tool": t, "args": a, "fetched_at": iso(f)} for t, a, f in store.latest_all()],
    }
