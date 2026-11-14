BOOK TOOL: HOW TO TRY EACH PIECE (one by one)

0. Start the two local pages
   python3 dev/console.py            -> http://localhost:8765   (dev console: progress, live health, tests)
   cd frontend && npm run dev        -> http://localhost:5173   (the CRM page, reads the live API)
   Both are already running if you were told so. Local pages never call the MCP.

1. Dev console (localhost:8765)  - catch problems early
   - "Live pipeline": red "stale" + "calls queued" means the worker has not run lately.
     Fix: GitHub -> Actions -> worker -> Run workflow (about 4 min per run; cold start needs several runs).
   - "Builds": one row per spec; in-progress / built / superseded.
   - "Run tests": runs the backend tests (no network, no MCP calls).
   - Refreshes every 10 s.

2. The CRM page (localhost:5173)
   - Opens on Account A and Account B side by side. No click needed.
   - Worth strip: On contract, Backed upside, Unbacked, Unpriced. Totals are per currency, never added together.
   - Tap a band to see its deals. Tap a receipt chip to copy the record id.
   - Top bar: "As of <time>". Red banner = data is stale or the app cannot be reached; it shows last good time.
   - It re-checks every 30 s and marks changed rows "New". No reload needed.
   - Empty until paperwork is fetched (about 25 MCP calls at 1 per minute).

3. Live data check (what judges see)
   - https://flytbase-crm.vercel.app/api/health  -> freshness, queue size
   - https://flytbase-crm.vercel.app/api/book    -> the answers as JSON
   - Open in a private window to confirm it works without your laptop.

4. Coming next (will appear on the page as built)
   Power per deal, what goes wrong, first moves, unknowns, What Changed, Approve-and-save notes.
   Nothing is ever written to the CRM until you press Approve.
