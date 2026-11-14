import { useState, useEffect, type ReactNode } from 'react'
import { Popover } from '@base-ui/react/popover'
import { Dialog } from '@base-ui/react/dialog'
import recordsData from './records-data.json'
import type { Account, BandKey, Book, Level, Line, Move, Receipt, RiskItem } from './api'

// ---- formatting ----
const SYM: Record<string, string> = { GBP: '£', EUR: '€', USD: '$', INR: '₹' }
export const NO_CUR = 'unknown'
export const NOT_ON_FILE = 'not on file'
export const money = (n: number, cur: string) => (cur === NO_CUR ? '' : SYM[cur] ?? cur + ' ') + n.toLocaleString('en-GB')
/** ISO string, or epoch seconds (how the backend stores note times). */
export const when = (iso: string | number | null | undefined) =>
  iso ? new Date(typeof iso === 'number' ? iso * 1000 : iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null
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
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 11v5M12 8h.01',
  radar: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 12l6-6',
  power: 'M12 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6M5 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6M10.5 8.6l-4 7M13.5 8.6l4 7',
}
export const Icon = ({ n, size = 18 }: { n: string; size?: number }) => (
  <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>
)
export const Chev = () => <svg className="chev" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>

// ---- receipts & record viewer ----
export function openRecord(id: string) {
  window.dispatchEvent(new CustomEvent('open-record', { detail: id }))
}

export function Chip({ r }: { r: Receipt }) {
  const long = r.id.length > 28
  const text = long ? `${r.id.slice(0, 12)}…${r.id.slice(-12)}` : r.id
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    openRecord(r.id)
  }
  return (
    <button
      type="button"
      className="receipt"
      onClick={handleClick}
      title={`Open record ${r.id}`}
    >
      <span className="receipt-dot" aria-hidden="true" />
      {text}
    </button>
  )
}

export function RecordDrawer() {
  const [recId, setRecId] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail
      if (id) setRecId(id)
    }
    window.addEventListener('open-record', handler)
    return () => window.removeEventListener('open-record', handler)
  }, [])

  if (!recId) return null

  const data = recordsData as Record<string, { id: string; account: string; path: string; kind?: string; text?: string | null; data?: unknown }>
  const cleanId = recId.trim()
  const rec = data[cleanId] || data[cleanId.replace(/^[A-Z]\//, '')] || null

  const copyContent = () => {
    const textToCopy = rec?.text || (rec?.data ? JSON.stringify(rec.data, null, 2) : cleanId)
    navigator.clipboard?.writeText(textToCopy).catch(() => {})
  }

  const copyPath = () => {
    navigator.clipboard?.writeText(cleanId).catch(() => {})
  }

  const fileName = rec?.path?.split('/').pop() || cleanId.split('/').pop() || cleanId
  const dirPath = rec?.path ? rec.path.substring(0, rec.path.lastIndexOf('/')) : ''

  return (
    <Dialog.Root open={!!recId} onOpenChange={open => { if (!open) setRecId(null) }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="scrim" />
        <Dialog.Popup className="drawer record-drawer">
          <div className="row between record-drawer-head">
            <div>
              <Dialog.Title className="drawer-title">{fileName}</Dialog.Title>
              <div className="record-meta">
                {rec?.account && <span className="rtag">Account {rec.account}</span>}
                {rec?.kind && <span className="rtag amber">{rec.kind}</span>}
                {dirPath && <span className="mono muted small">{dirPath}/</span>}
              </div>
            </div>
            <Dialog.Close className="icon-btn" aria-label="Close record view">
              <Icon n="close" />
            </Dialog.Close>
          </div>
          <div className="record-actions row">
            <button type="button" className="btn small primary" onClick={copyContent}>Copy Content</button>
            <button type="button" className="btn small ghost" onClick={copyPath}>Copy Path</button>
          </div>
          <div className="record-body">
            {rec?.text ? (
              <pre className="record-text">{rec.text}</pre>
            ) : rec?.data ? (
              <pre className="record-text record-json">{JSON.stringify(rec.data, null, 2)}</pre>
            ) : (
              <div className="empty-state">
                <p><strong>{cleanId}</strong></p>
                <p className="muted">Record reference tracked on file.</p>
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
export const uniq = (rs: Receipt[]) => [...new Map(rs.map(r => [`${r.kind}:${r.id}`, r])).values()]
export const Receipts = ({ rs }: { rs: Receipt[] }) =>
  rs.length ? <span className="receipts">{uniq(rs).map(r => <Chip key={`${r.kind}:${r.id}`} r={r} />)}</span>
    : <span className="muted">no receipt</span>
/** A figure whose receipts open on click: keeps dashboards light without losing a single record id. */
export const ReceiptsPop = ({ label, rs }: { label: string; rs: Receipt[] }) => (
  <Popover.Root>
    <Popover.Trigger className="fig" aria-label={`${label}, ${uniq(rs).length} receipts`}>{label}</Popover.Trigger>
    <Popover.Portal><Popover.Positioner sideOffset={6} align="end">
      <Popover.Popup className="popup"><span className="k">Receipts</span><Receipts rs={rs} /></Popover.Popup>
    </Popover.Positioner></Popover.Portal>
  </Popover.Root>
)

// ---- small shared bits ----
/** The caveat lives here, one click away, instead of a sentence on every page. */
export const Info = ({ children, label = 'How to read this' }: { children: ReactNode; label?: string }) => (
  <Popover.Root>
    <Popover.Trigger className="info-btn" aria-label={label}><Icon n="info" size={16} /></Popover.Trigger>
    <Popover.Portal><Popover.Positioner sideOffset={6}><Popover.Popup className="popup info-pop">{children}</Popover.Popup></Popover.Positioner></Popover.Portal>
  </Popover.Root>
)
const BAND_HINT: Record<BandKey, string> = {
  on_contract: 'signed, backed by the contract file', backed_upside: 'open, a file or verified fact backs it',
  unbacked: 'rests on a claim only', unpriced: 'no value on file',
}
export const WorthInfo = () => (
  <>
    <dl className="info-dl">{BANDS.map(b => <div key={b.key}><dt><BandChip k={b.key} /></dt><dd>{BAND_HINT[b.key]}</dd></div>)}</dl>
    <p>Values stay in their own currency and are never added across bands.</p>
  </>
)
export const BandChip = ({ k }: { k: BandKey }) => <span className={`bchip band-${k}`}><span className="mark" aria-hidden="true" />{bandName(k)}</span>
export const Tag = ({ level, children }: { level?: string | null; children: ReactNode }) => <span className={`rtag ${level ?? ''}`}>{children}</span>
export const PageHead = ({ title, sub, info, children }: { title: string; sub?: ReactNode; info?: ReactNode; children?: ReactNode }) => (
  <div className="page-head"><div><div className="ph-t"><h1>{title}</h1>{info && <Info>{info}</Info>}</div>{sub && <p className="muted ph-sub">{sub}</p>}</div>{children && <div className="page-actions">{children}</div>}</div>
)
/** One number with its word: "3 due this week". null = the feed is not there yet. */
export const Stat = ({ n, label, tone }: { n: number | null; label: string; tone?: string }) => (
  <span className={`stat${tone && n ? ` ${tone}` : ''}${n === 0 ? ' zero' : ''}`}><b>{n ?? '–'}</b> {label}{n == null && <span className="sr-only"> not available yet</span>}</span>
)
export const Empty = ({ title, children }: { title: string; children?: ReactNode }) => <div className="empty-state"><strong>{title}</strong>{children && <p className="muted">{children}</p>}</div>
export const NotAvailable = ({ what }: { what: string }) => <Empty title={`${what} is not available yet`}>Appears here by itself once the backend publishes it.</Empty>

// ---- RAG levels: colour always travels with a shape and a word ----
export const LEVEL: Record<Level, string> = { red: 'Red', amber: 'Amber', green: 'Green', unknown: 'Not on file' }
/** SVG mark for a level, centred on (x, y): red disc, amber diamond, green ring, grey dashed ring. */
export const Mark = ({ level, x = 0, y = 0 }: { level: Level; x?: number; y?: number }) =>
  level === 'red' ? <circle cx={x} cy={y} r={6} className="mk mk-red" />
    : level === 'amber' ? <path d={`M${x} ${y - 7}L${x + 7} ${y}L${x} ${y + 7}L${x - 7} ${y}Z`} className="mk mk-amber" />
      : level === 'green' ? <circle cx={x} cy={y} r={5} className="mk mk-green" />
        : <circle cx={x} cy={y} r={5} className="mk mk-unknown" />
export const Glyph = ({ level }: { level: Level }) => <svg className="glyph" width="12" height="12" viewBox="-8 -8 16 16" aria-hidden="true"><Mark level={level} /></svg>
export const Loading = ({ rows = 5 }: { rows?: number }) => (
  <div aria-busy="true"><span className="sr-only" role="status">Loading…</span>
    {Array.from({ length: rows }, (_, i) => <div key={i} className="sk sk-row" aria-hidden="true" />)}</div>
)
export const Failed = ({ what, retry }: { what: string; retry?: () => void }) => (
  <Empty title={`Could not load ${what}`}>The last attempt failed. {retry && <button type="button" className="btn ghost" onClick={retry}>Try again</button>}</Empty>
)
export const Avatar = ({ name }: { name: string }) => <span className="avatar" aria-hidden="true">{name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span>

// ---- derived deals (the one list Home, Deals, search and palette read) ----
/** deal = an opportunity; offer = an open offer; told = a told-only item (no id, or only claims behind it). */
export type Kind = 'deal' | 'offer' | 'told'
export const kindOf = (l: { id: string | null; receipts: Receipt[] }): Kind =>
  l.receipts.some(r => r.kind === 'offer' && r.id === l.id) ? 'offer'
    : l.id == null || (l.receipts.some(r => r.status === 'claim') && l.receipts.every(r => r.kind === 'fact')) ? 'told' : 'deal'
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
/** "7 deals · 2 offers · 2 told only": zero kinds are left out. */
export const countLabel = (kinds: Kind[]) => {
  const n = (k: Kind) => kinds.filter(x => x === k).length
  const parts = [n('deal') || !kinds.length ? plural(n('deal'), 'deal') : '', n('offer') ? plural(n('offer'), 'offer') : '', n('told') ? `${n('told')} told only` : '']
  return parts.filter(Boolean).join(' · ')
}
export type Deal = {
  key: string; acct: string; id: string | null; title: string; band: BandKey; value: number | null; currency: string | null
  stage: string | null; term_ends: string | null; renewal_risk: boolean; blocker: unknown; note?: string; receipts: Receipt[]
  risk: 'red' | 'amber' | 'watch' | null; risks: RiskItem[]; kind: Kind
}
export const dealKey = (l: { id: string | null; title: string }) => l.id ?? `x:${l.title}`
export const dealHref = (d: { acct: string; key: string }) => `#/deals/${d.acct}/${encodeURIComponent(d.key)}`
/** First word if it is long enough to stand alone, else the first two: "Eastern Counties", "Aldermoor". */
export const shortName = (name: string) => { const w = name.trim().split(/\s+/); return w[0].length >= 8 ? w[0] : w.slice(0, 2).join(' ') } // ponytail: length heuristic, swap for a backend short_name if one ships
const DAY = 86_400_000
/** The book's "today" (from q4), else the browser's. */
export const todayOf = (book: Book | null) => Object.values(book?.accounts ?? {}).find(a => a.q4?.today)?.q4?.today ?? new Date().toISOString().slice(0, 10)
/** Moves due in the next 7 days, and already late. Undated moves count in neither. */
export const dueIn = (moves: Move[], today: string) => {
  const t = Date.parse(today); let week = 0, late = 0
  for (const m of moves) { const d = Date.parse(m.due); if (isNaN(d)) continue; if (d < t) late++; else if (d < t + 7 * DAY) week++ }
  return { week, late }
}
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
          note: l.note, receipts: l.receipts, risk: worst, risks, kind: kindOf(l),
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

// ---- CSV export: what a table shows, record ids included, so a spreadsheet stays checkable ----
const cell = (v: unknown) => {
  const t = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v)
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}
export const toCsv = (rows: Record<string, unknown>[]) => {
  const cols = [...new Set(rows.flatMap(r => Object.keys(r)))]
  return [cols.join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))].join('\n') + '\n'
}
export const ids = (rs: Receipt[]) => uniq(rs).map(r => r.id).join('; ')
export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
export const CsvButton = ({ name, rows }: { name: string; rows: () => Record<string, unknown>[] }) => (
  <button type="button" className="btn ghost" onClick={() => downloadCsv(name, rows())}>Download CSV</button>
)
