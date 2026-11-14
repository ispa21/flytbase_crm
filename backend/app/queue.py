"""The one MCP caller: one worker, calls started >= SPACING seconds apart."""
import asyncio
import heapq
import logging
import time
from itertools import count

from .store import key

log = logging.getLogger("aq.queue")
SPACING = 61  # seconds between call starts, writes included
WRITE, SIGNALS, WHOAMI, REFETCH, COLD = range(5)  # priority, lowest number first


class RealClock:
    time = staticmethod(time.time)
    sleep = staticmethod(asyncio.sleep)


class CallQueue:
    def __init__(self, client, clock=None, on_result=None):
        self.client, self.clock = client, clock or RealClock()
        self.on_result = on_result  # async (tool, args, payload) -> None
        self.heap, self.pending, self.seq = [], set(), count()
        self.last_start = None
        self.last_error = None  # (time, message)
        self.last_ok = None

    def put(self, prio, tool, args=None):
        k = (tool, key(args))
        if k in self.pending:  # already waiting for a slot
            return False
        self.pending.add(k)
        heapq.heappush(self.heap, (prio, next(self.seq), tool, args or {}))
        return True

    async def step(self):
        """Run one slot. False if nothing queued."""
        if not self.heap:
            return False
        if self.last_start is not None:
            wait = self.last_start + SPACING - self.clock.time()
            if wait > 0:
                await self.clock.sleep(wait)
        prio, _, tool, args = heapq.heappop(self.heap)
        self.pending.discard((tool, key(args)))
        self.last_start = self.clock.time()  # slot consumed even on error
        try:
            payload = await self.client.call(tool, args)
            self.last_ok = self.clock.time()
            if self.on_result:
                await self.on_result(tool, args, payload)
        except Exception as e:  # loop must never die
            log.exception("call %s %s failed; retry in a later slot", tool, args)
            self.last_error = (self.clock.time(), f"{tool}: {e}")
            self.put(prio, tool, args)
        return True

    async def run(self, tick=None):
        while True:
            try:
                if tick:
                    tick()
                if not await self.step():
                    await self.clock.sleep(1)
            except Exception:
                log.exception("queue loop error")
                await self.clock.sleep(1)
