import { useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import { useData, type Account, type Dim, type Level, type Radar, type RadarDeal, type RagCell } from './api'
import { BandChip, Empty, Failed, Glyph, LEVEL, Loading, Mark, NotAvailable, PageHead, Receipts, day, dealHref, dealKey } from './ui'

export const DIMS: { k: Dim; label: string; short: string }[] = [
  { k: 'deadline', label: 'Deadline', short: 'Deadline' },
  { k: 'cold', label: 'Deciders & payers cold', short: 'Cold' },
  { k: 'blocked', label: 'Blocked', short: 'Blocked' },
]
const RING: Level[] = ['red', 'amber', 'green', 'unknown'] // inside out
const lvl = (c?: RagCell): Level => (c && RING.includes(c.level) ? c.level : 'unknown')
const text = (c?: RagCell) => c?.label || 'not on file'
const countsOf = (r: Radar) => r.counts ?? Object.fromEntries(DIMS.map(d => [d.k, Object.fromEntries(RING.map(L => [L, r.deals.filter(x => lvl(x[d.k]) === L).length]))])) as NonNullable<Radar['counts']>

// ---------- the scope: three sectors, rings red (inner) → amber → green → grey "not on file" (outer) ----------
const C = 160, R = [0, 44, 84, 120, 146]
const VB = [-72, -28, 444, 362]
const pt = (r: number, a: number) => [C + r * Math.sin((a * Math.PI) / 180), C - r * Math.cos((a * Math.PI) / 180)]
type Dot = { x: number; y: number; d: RadarDeal; dim: (typeof DIMS)[number]; L: Level }
function dots(deals: RadarDeal[]): Dot[] {
  const out: Dot[] = []
  DIMS.forEach((dim, s) => RING.forEach((L, ri) => {
    const here = deals.filter(d => lvl(d[dim.k]) === L)
    const mid = (R[ri] + R[ri + 1]) / 2 + (ri === 0 ? 4 : 0)
    const cap = Math.max(1, Math.floor((mid * 2.09) / 16)) // dots that fit on the ring's arc at 16 units apart
    here.forEach((d, k) => {
      const r = here.length > cap ? mid + (k % 2 ? 7 : -7) : mid // ponytail: two staggered rows; past ~2x cap dots touch, fold into a count then
      const [x, y] = pt(r, s * 120 - 60 + ((k + 1) * 120) / (here.length + 1))
      out.push({ x, y, d, dim, L })
    })
  }))
  return out
}

export function RadarScope({ acct, radar, compact }: { acct: string; radar: Radar; compact?: boolean }) {
  const [tip, setTip] = useState<Dot | null>(null)
  const fs = 16
  const svg = (
    <svg viewBox={compact ? '10 10 300 300' : VB.join(' ')} {...(compact ? { 'aria-hidden': true } : { role: 'group', 'aria-label': `Risk radar, ${radar.deals.length} deals` })}>
      {[4, 3, 2, 1].map(i => <circle key={i} cx={C} cy={C} r={R[i]} className={`ring ring-${RING[i - 1]}`} />)}
      {[60, 180, 300].map(a => { const [x, y] = pt(R[4], a); return <line key={a} x1={C} y1={C} x2={x} y2={y} className="spoke" /> })}
      {!compact && DIMS.map((dim, s) => {
        const [x, y] = pt(R[4] + 10, s * 120)
        return <text key={dim.k} x={x} y={s ? y + fs * 0.5 : y - 6} fontSize={fs} textAnchor={s === 0 ? 'middle' : s === 1 ? 'start' : 'end'} className="scope-l">{dim.short}</text>
      })}
      {dots(radar.deals).map((p, i) => compact ? <Mark key={i} level={p.L} x={p.x} y={p.y} /> : (
        <a key={i} href={dealHref({ acct, key: dealKey(p.d.deal) })} className="dot-a"
          aria-label={`${p.d.deal.title}. ${p.dim.label}: ${LEVEL[p.L]}, ${text(p.d[p.dim.k])}`}
          onMouseEnter={() => setTip(p)} onMouseLeave={() => setTip(null)} onFocus={() => setTip(p)} onBlur={() => setTip(null)}>
          <circle cx={p.x} cy={p.y} r={12} className="hit" />
          <Mark level={p.L} x={p.x} y={p.y} />
        </a>))}
    </svg>
  )
  if (compact) return <a className="scope compact" href="#/radar" aria-label="Open the risk radar">{svg}</a>
  return (
    <div className="scope">
      {svg}
      {tip && (
        <div className="chart-tip" role="tooltip" style={{ left: `${((tip.x - VB[0]) / VB[2]) * 100}%`, top: `${((tip.y - VB[1]) / VB[3]) * 100}%` }}>
          <b>{tip.d.deal.title}</b><span><Glyph level={tip.L} /> {tip.dim.label} · {text(tip.d[tip.dim.k])}</span>
        </div>)}
    </div>
  )
}

export const RadarLegend = () => (
  <ul className="legend" aria-label="Legend">
    {RING.map(L => <li key={L}><Glyph level={L} />{LEVEL[L]}{L === 'red' ? ' (inner ring)' : L === 'unknown' ? ' (outer band)' : ''}</li>)}
  </ul>
)

// ---------- counts per dimension ----------
export function RiskTiles({ radar, compact }: { radar: Radar; compact?: boolean }) {
  const counts = countsOf(radar)
  return (
    <div className={`rtiles${compact ? ' compact' : ''}`}>
      {DIMS.map(dim => {
        const c = counts[dim.k] ?? {}
        return (
          <div key={dim.k} className="rtile">
            <span className="label">{compact ? dim.short : dim.label}</span>
            <span className="segbar" aria-hidden="true">{RING.map(L => (c[L] ? <i key={L} className={`seg-${L}`} style={{ flexGrow: c[L] }} /> : null))}</span>
            <span className="pills">{RING.map(L => (
              <span key={L} className={`pill${c[L] ? '' : ' zero'}`} title={`${c[L] ?? 0} ${LEVEL[L].toLowerCase()}`}>
                <Glyph level={L} /><b>{c[L] ?? 0}</b><span className={compact ? 'sr-only' : 'pill-w'}> {LEVEL[L].toLowerCase()}</span>
              </span>))}</span>
          </div>)
      })}
    </div>
  )
}

/** Home: the scope (one link to the radar page) beside the counts that are its text twin. */
export const RadarMini = ({ acct, radar }: { acct: string; radar: Radar }) => (
  <div className="radar-mini"><RadarScope acct={acct} radar={radar} compact /><RiskTiles radar={radar} compact /></div>
)

// ---------- one RAG cell: chip with short label, popover with date and receipts ----------
export function RagChip({ c, dim }: { c?: RagCell; dim: (typeof DIMS)[number] }) {
  const L = lvl(c)
  return (
    <Popover.Root>
      <Popover.Trigger className={`rag rag-${L}`} aria-label={`${dim.label}: ${LEVEL[L]}, ${text(c)}`}><Glyph level={L} /><span>{text(c)}</span></Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6}>
          <Popover.Popup className="popup rag-pop">
            <span className="k">{dim.label} · {LEVEL[L]}</span>
            <span className="rag-pop-t">{text(c)}</span>
            <span className="muted">{c?.date ? day(c.date) : 'date not on file'}</span>
            <Receipts rs={c?.receipts ?? []} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function RagGrid({ rows }: { rows: [string, Account][] }) {
  const { names } = useData()
  return (
    <div className="table-wrap">
      <table className="grid rag-grid">
        <thead><tr><th scope="col">Deal</th>{DIMS.map(d => <th key={d.k} scope="col">{d.label}</th>)}</tr></thead>
        {rows.map(([id, a]) => (
          <tbody key={id}>
            <tr className="grp-row"><th colSpan={4} scope="colgroup">{names[id] ?? id}</th></tr>
            {a.radar!.deals.map(d => (
              <tr key={dealKey(d.deal)}>
                <th scope="row"><a className="link strong" href={dealHref({ acct: id, key: dealKey(d.deal) })}>{d.deal.title}</a><BandChip k={d.deal.band} /></th>
                {DIMS.map(dim => <td key={dim.k} data-label={dim.label}><RagChip c={d[dim.k]} dim={dim} /></td>)}
              </tr>))}
          </tbody>))}
      </table>
    </div>
  )
}

const INFO = <p>Inner ring is red, outer is green. Grey outer band means not on file: never counted as green. Click a dot or chip for the deal, date and receipts.</p>

export function RadarPage() {
  const { book, account, names, unreachable } = useData()
  const head = <PageHead title="Risk radar" info={INFO} />
  if (!book) return unreachable ? <Failed what="the risk radar" /> : <>{head}<Loading /></>
  const ids = Object.entries(book.accounts).filter(([id]) => account === 'all' || account === id)
  const have = ids.filter(([, a]) => a.radar)
  if (!have.length) return <>{head}<NotAvailable what="The risk radar" /></>
  return (
    <>
      {head}
      <div className="radar-cards">
        {ids.map(([id, a]) => (
          <section key={id} className="card radar-card" aria-label={names[id] ?? id}>
            <h2>{names[id] ?? id}</h2>
            {!a.radar ? <p className="muted">Not available yet</p> : !a.radar.deals.length ? <p className="muted">No deals on the radar</p>
              : <div className="radar-body"><RadarScope acct={id} radar={a.radar} /><RiskTiles radar={a.radar} /></div>}
          </section>))}
      </div>
      <RadarLegend />
      {have.some(([, a]) => a.radar!.deals.length) ? <RagGrid rows={have.filter(([, a]) => a.radar!.deals.length)} /> : <Empty title="No deals on the radar" />}
    </>
  )
}
