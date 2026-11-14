"""Queue constants (ADR 0002/0004). The queue itself is the Postgres `queue` table (db.py)."""
import asyncio
import time

SPACING = 61  # seconds between call starts, writes included; kept in caller.last_call_at
WRITE, SIGNALS, WHOAMI, REFETCH, COLD = range(5)  # priority, lowest number first
MAX_ATTEMPTS = 5
BACKOFF_CAP = 900  # s


class RealClock:
    time = staticmethod(time.time)
    sleep = staticmethod(asyncio.sleep)
