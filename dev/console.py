"""Dev console: localhost view of build progress and the live app. Read-only except 'run tests'.
Run: python3 dev/console.py   ->  http://localhost:8765
Never touches the MCP; the live app is only read through its public /api/health and /api/book."""
import json, re, subprocess, urllib.request, os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIVE = os.environ.get("APP_URL", "https://flytbase-crm.vercel.app")
SPECS = ROOT / "_bmad-output/implementation-artifacts"

def sh(cmd, cwd=ROOT, timeout=120):
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return (r.stdout + r.stderr).strip()
    except Exception as e:
        return f"error: {e}"

def live(path):
    try:
        with urllib.request.urlopen(LIVE + path, timeout=15) as r:
            return {"ok": True, "data": json.loads(r.read())}
    except Exception as e:
        return {"ok": False, "error": str(e)}

def specs():
    out = []
    for f in sorted(SPECS.glob("spec-*.md")):
        head = f.read_text()[:600]
        g = lambda k: (re.search(rf"^{k}: *'?([^'\n]*)'?", head, re.M) or [None, ""])[1]
        out.append({"file": f.name, "title": g("title"), "status": g("status"), "baseline": g("baseline_commit")})
    return out

def status():
    h = live("/api/health"); b = live("/api/book")
    return {
        "now": sh(["date", "-u", "+%H:%M:%S UTC"]),
        "git_log": sh(["git", "log", "--oneline", "-8"]),
        "git_dirty": sh(["git", "status", "--short"]),
        "specs": specs(),
        "health": h, "book": b,
        "sprint": (SPECS / "sprint-status.yaml").read_text() if (SPECS / "sprint-status.yaml").exists() else "",
    }

PAGE = """<!doctype html><meta charset=utf-8><title>Dev console</title>
<style>body{font:14px/1.5 system-ui;margin:24px;max-width:1100px;color:#1a1a1a;background:#faf9f6}
h1{font-size:20px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#666;margin:28px 0 8px}
.g{display:grid;grid-template-columns:1fr 1fr;gap:20px}pre{background:#fff;border:1px solid #e4e1d8;padding:12px;border-radius:8px;overflow:auto;font-size:12px;margin:0}
.p{display:inline-block;padding:1px 9px;border-radius:99px;font-size:12px}.ok{background:#dff3e4;color:#14532d}.bad{background:#fde2e1;color:#7f1d1d}.mid{background:#fdf0c7;color:#713f12}
button{font:inherit;padding:6px 12px;border-radius:8px;border:1px solid #bbb;background:#fff;cursor:pointer}a{color:#0b5fff}
td{padding:3px 12px 3px 0;vertical-align:top}</style>
<h1>Book Tool: dev console <span id=t style="color:#888;font-weight:400"></span></h1>
<p>Open the app: <a href="http://localhost:5173" target=_blank>localhost:5173</a> (dev, reads live API) ·
<a id=live target=_blank>live site</a> · <a href="/walkthrough" target=_blank>walkthrough</a></p>
<div id=a></div>
<h2>Tests (backend, no network)</h2><button onclick=runt()>Run tests</button> <pre id=tests style="margin-top:8px">not run</pre>
<script>
const pill=(t,c)=>`<span class="p ${c}">${t}</span>`;
async function load(){
 const s=await (await fetch('/status.json')).json();
 document.getElementById('t').textContent=s.now;
 const h=s.health.ok?s.health.data:null, b=s.book.ok?s.book.data:null;
 let hh=!h?pill('live site unreachable','bad'):
  (h.stale?pill('stale','bad'):pill('fresh','ok'))+' '+(h.reachable?pill('MCP reachable','ok'):pill('MCP not reachable','bad'))+
  ` · ${h.pending_calls} calls queued · ${h.fetched.length} tools fetched · last good poll ${h.last_good_poll||'never'}`;
 const acc=b&&b.accounts?Object.keys(b.accounts).join(', '):'';
 document.getElementById('a').innerHTML=`
 <h2>Live pipeline</h2><p>${hh}</p>
 <p>${b?pill('/api/book ok','ok')+' as of '+(b.as_of||'?')+' · keys: '+Object.keys(b).join(', '):pill('/api/book unavailable','bad')}</p>
 ${h&&h.pending_calls>0&&h.stale?'<p>'+pill('Worker idle? Run GitHub Actions → worker → Run workflow','mid')+'</p>':''}
 <div class=g><div><h2>Builds (specs)</h2><table>${s.specs.map(x=>`<tr><td>${pill(x.status||'?',x.status=='built'||x.status=='done'?'ok':x.status=='superseded'?'bad':'mid')}</td><td>${x.file}<br><small>${x.title}</small></td></tr>`).join('')}</table></div>
 <div><h2>Git</h2><pre>${s.git_log}</pre><h2>Uncommitted</h2><pre>${s.git_dirty||'clean'}</pre></div></div>
 <h2>Sprint status</h2><pre>${s.sprint||'none'}</pre>`;
 document.getElementById('live').href='${LIVE}'; document.getElementById('live').textContent='${LIVE}';
}
async function runt(){const e=document.getElementById('tests');e.textContent='running…';e.textContent=await (await fetch('/run/tests')).text()}
load();setInterval(load,10000);
</script>"""

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def send(self, body, ctype="text/html"):
        b = body.encode(); self.send_response(200)
        self.send_header("Content-Type", ctype + "; charset=utf-8"); self.send_header("Content-Length", str(len(b)))
        self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        if self.path == "/status.json": self.send(json.dumps(status()), "application/json")
        elif self.path == "/run/tests": self.send(sh(["uv", "run", "pytest", "-q"], ROOT / "backend", 300), "text/plain")
        elif self.path == "/walkthrough":
            self.send((ROOT / "docs/WALKTHROUGH.md").read_text(), "text/plain")
        else: self.send(PAGE.replace("${LIVE}", LIVE))

if __name__ == "__main__":
    print("Dev console on http://localhost:8765")
    ThreadingHTTPServer(("127.0.0.1", 8765), H).serve_forever()
