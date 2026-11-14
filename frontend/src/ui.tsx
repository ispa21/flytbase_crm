import type { ReactNode } from 'react'
import { Popover } from '@base-ui/react/popover'
import type { Account, BandKey, Book, Line, Move, Receipt, RiskItem } from './api'

// ---- formatting ----
const SYM: Record<string, string> = { GBP: '£', EUR: '€', USD: '$', INR: '₹' }
export const NO_CUR = 'unknown'
export const NOT_ON_FILE = 'not on file'
export const money = (n: number, cur: string) => (cur === NO_CUR ? '' : SYM[cur] ?? cur + ' ') + n.toLocaleString('en-GB')
export const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null
export const day = (iso: string | null | undefined) => {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(+d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
export const BANDS: { key: BandKey; label: string; apart?: boolean }[] = [
  { key: 'on_contract', label: 'On contract' },
  { key: 'backed_upside', label: 'Backed upside' },
  { key: 'unbacked', label: 'Unbacked', apart: true },
  { key: 'unpriced', label: 'Unpriced', apart: true },
]
export const bandName = (k: string) => BANDS.find(b => b.key === k)?.label ?? k

// ---- icons (one stroke family) ----
const P: Record<string, string> = {
  home: 'M3 11 12 3l9 8M5 10v10h14V10',
  accounts: 'M4 21V5l8-2v18M12 9l8 2v10M8 9h.01M8 13h.01M8 17h.01M16 15h.01M16 18h.01',
  deals: 'M3 7h18v13H3zM8 7V4h8v3',
  people: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  moves: 'M5 12h14M13 6l6 6-6 6',
  notes: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
  sync: 'M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M21 21l-5-5',
  bell: 'M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 0 0 4 0',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6 6 18',
  chev: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  board: 'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v13h-4z',
  up: 'M7 14l5-5 5 5',
  down: 'M7 10l5 5 5-5',
}
export const Icon = ({ n, size = 18 }: { n: string; size?: number }) => (
  <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>
)
export const Chev = () => <svg className="chev" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>

// ---- receipts ----
export function Chip({ r }: { r: Receipt }) {
  const long = r.id.length > 28
  const text = long ? `${r.id.slice(0, 12)}…${r.id.slice(-12)}` : r.id
  const copy = () => navigator.clipboard?.writeText(r.id).catch(() => {})
  if (!long) return <button type="button" className="receipt" onClick={copy} title={`Copy ${r.id}`}>{text}</button>
  return (
    <Popover.Root>
      <Popover.Trigger className="receipt" onClick={copy}>{text}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6}>
          <Popover.Popup className="popup"><span className="k">{r.kind}</span>{r.id}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
export const uniq = (rs: Receipt[]) => [...new Map(rs.map(r => [`${r.kind}:${r.id}`, r])).values()]
export const Receipts = ({ rs }: { rs: Receipt[] }) =>
  rs.length ? <span className="receipts">{uniq(rs).map(r => <Chip key={`${r.kind}:${r.id}`} r={r} />)}</span>
    : <span className="muted">no receipt</span>

// ---- small shared bits ----
export const BandChip = ({ k }: { k: BandKey }) => <span className={`bchip band-${k}`}><span className="mark" aria-hidden="true" />{bandName(k)}</span>
export const Tag = ({ level, children }: { level?: string | null; children: ReactNode }) => <span className={`rtag ${level ?? ''}`}>{children}</span>
export const PageHead = ({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) => (
  <div className="page-head"><div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div>{children && <div className="page-actions">{children}</div>}</div>
)
export const Empty = ({ title, children }: { title: string; children?: ReactNode }) => <div className="empty-state"><strong>{title}</strong>{children && <p className="muted">{children}</p>}</div>
export const NotAvailable = ({ what }: { what: string }) => <Empty title={`${what} is not available yet`}>The backend has not published this feed. It appears here by itself once it does.</Empty>
export const Loading = ({ rows = 5 }: { rows?: number }) => (
  <div aria-busy="true"><span className="sr-only" role="status">Loading…</span>
    {Array.from({ length: rows }, (_, i) => <div key={i} className="sk sk-row" aria-hidden="true" />)}</div>
)
export const Failed = ({ what, retry }: { what: string; retry?: () => void }) => (
  <Empty title={`Could not load ${what}`}>The last attempt failed. {retry && <button type="button" className="btn ghost" onClick={retry}>Try again</button>}</Empty>
)
export const Avatar = ({ name }: { name: string }) => <span className="avatar" aria-hidden="true">{name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span>

// ---- derived deals (the one list Home, Deals, search and palette read) ----
export type Deal = {
  key: string; acct: string; id: string | null; title: string; band: BandKey; value: number | null; currency: string | null
  stage: string | null; term_ends: string | null; renewal_risk: boolean; blocker: unknown; note?: string; receipts: Receipt[]
  risk: 'red' | 'amber' | 'watch' | null; risks: RiskItem[]
}
export const dealKey = (l: { id: string | null; title: string }) => l.id ?? `x:${l.title}`
const RANK = { red: 3, amber: 2, watch: 1 }
export function dealsOf(book: Book | null): Deal[] {
  const out: Deal[] = []
  for (const [aid, a] of Object.entries(book?.accounts ?? {})) {
    for (const [band, ls] of Object.entries(a.q1?.bands ?? {}))
      for (const l of ls as (Line & { stage?: string | null; blocker?: unknown })[]) {
        const risks = (a.q4?.items ?? []).filter(i => l.id && i.deal === l.id)
        const worst = risks.reduce<Deal['risk']>((w, i) => {
          const r = i.level ?? 'watch'
          return !w || RANK[r] > RANK[w] ? r : w
        }, null)
        out.push({
          key: dealKey(l), acct: aid, id: l.id, title: l.title, band: band as BandKey, value: l.value, currency: l.currency,
          stage: l.stage ?? null, term_ends: l.term_ends ?? null, renewal_risk: !!l.renewal_risk, blocker: l.blocker ?? null,
          note: l.note, receipts: l.receipts, risk: worst, risks,
        })
      }
  }
  return out
}
export const dealValue = (d: { value: number | null; currency: string | null }) =>
  d.value == null ? null : d.currency ? money(d.value, d.currency) : `${d.value.toLocaleString('en-GB')} (currency not on file)`
export const riskLabel = (r: Deal['risk']) => (r === 'red' ? 'Red' : r === 'amber' ? 'Amber' : r === 'watch' ? 'Watch' : 'None flagged')
export const turns = (r: RiskItem) => (r.turns_bad_on && r.turns_bad_on !== NOT_ON_FILE ? `Turns bad on ${r.turns_bad_on}` : 'Turn date not on file')
export const allMoves = (book: Book | null, account: string): (Move & { acct: string })[] =>
  Object.entries(book?.accounts ?? {}).filter(([id]) => account === 'all' || id === account)
    .flatMap(([id, a]: [string, Account]) => (a.q3?.moves ?? []).map(m => ({ ...m, acct: id })))
