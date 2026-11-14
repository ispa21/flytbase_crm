import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .health import health
from .mcp import McpClient
from .queue import CallQueue
from .store import Store
from .sync import Sync

logging.basicConfig(level=logging.INFO)
store = Store(os.environ.get("AQ_DB", "aq.db"))
queue = CallQueue(McpClient())
sync = Sync(queue, store)


@asynccontextmanager
async def lifespan(app):
    task = None
    if os.environ.get("AQ_TOKEN"):
        sync.start()
        task = asyncio.create_task(queue.run(sync.tick))
    else:
        logging.warning("AQ_TOKEN not set: sync not started")
    yield
    if task:
        task.cancel()


app = FastAPI(lifespan=lifespan)


@app.get("/api/health")
def get_health():
    return health(store, queue, sync)
