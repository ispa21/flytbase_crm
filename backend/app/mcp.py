"""JSON-RPC tools/call client. The only code that talks to the MCP (via the queue)."""
import json
import os
from itertools import count

import httpx


class McpError(Exception):
    pass


def unwrap(resp: dict) -> dict:
    """JSON-RPC envelope -> parsed payload; raise on error / isError / bad shape."""
    if "error" in resp:
        raise McpError(f"rpc error: {resp['error']}")
    res = resp.get("result") or {}
    try:
        text = res["content"][0]["text"]
    except (KeyError, IndexError, TypeError):
        raise McpError(f"unknown response shape: {str(resp)[:200]}")
    if res.get("isError"):
        raise McpError(f"tool error: {text[:200]}")
    try:
        return json.loads(text)
    except ValueError:
        raise McpError(f"payload is not JSON: {text[:200]}")


def _body_to_dict(r: httpx.Response) -> dict:
    if "text/event-stream" in r.headers.get("content-type", ""):
        datas = [ln[5:].strip() for ln in r.text.splitlines() if ln.startswith("data:")]
        return json.loads(datas[-1])
    return r.json()


class McpClient:
    """send: async (request_dict) -> response_dict. Default is HTTP; tests inject a fake."""

    def __init__(self, url=None, token=None, send=None):
        self.url = url or os.environ.get("AQ_URL", "https://questathon.aihackerscollective.com/api/public/mcp")
        self.token = token or os.environ.get("AQ_TOKEN", "")  # env only
        self._send = send or self._http
        self._ids = count(1)

    async def _http(self, req: dict) -> dict:
        # ponytail: no initialize handshake / session id; add if the server demands it.
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(
                self.url, json=req,
                headers={"Authorization": f"Bearer {self.token}",
                         "Accept": "application/json, text/event-stream"})
            r.raise_for_status()
            return _body_to_dict(r)

    async def call(self, tool: str, args: dict | None = None) -> dict:
        req = {"jsonrpc": "2.0", "id": next(self._ids), "method": "tools/call",
               "params": {"name": tool, "arguments": args or {}}}
        return unwrap(await self._send(req))
