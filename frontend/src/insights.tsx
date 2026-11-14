import { useState } from 'react'
import { useData, type Insight, type Tone } from './api'
import { CsvButton, Empty, Failed, Info, Loading, PageHead, Receipts, Stat, ids } from './ui'

/* Insights: each one is a fixed rule over records (exact keys only), with the rows behind its number and its receipts.
   Nothing here is a guess: the method line says exactly how the number was counted. */

export const TONE: Record<Tone, string> = { red: 'Red', amber: 'Amber', good: 'Better', info: 'Fact' }
const ORDER: Record<Tone, number> = { red: 0, amber: 1, good: 2, info: 3 }

/** Flights per week as a line; a missing week is a gap in the line, never a zero. */
export function Sparkline({ series }: { series: { week: string; flights: number | null }[] }) {
  const pts = series.map((p, i) => ({ ...p, i })).filter(p => p.flights != null) as { week: string; flights: number; i: number }[]
  if (pts.length < 2) return null
  const w = 240, h = 44, max = Math.max(...pts.map(p => p.flights), 1), n = series.length - 1
  const x = (i: number) => (i / n) * (w - 4) + 2, y = (v: number) => h - 4 - (v / max) * (h - 8)
  let d = ''
  pts.forEach((p, k) => { d += `${k && pts[k - 1].i === p.i - 1 ? 'L' : 'M'}${x(p.i).toFixed(1)} ${y(p.flights).toFixed(1)}` })
  const last = pts[pts.length - 1]
  return (
    <figure className="spark">
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={`Flights per week, ${series[0].week} to ${last.week}: from ${pts[0].flights} to ${last.flights}, highest ${max}`}>
        <path d={d} className="spark-l" /><circle cx={x(last.i)} cy={y(last.flights)} r="3" className="spark-p" />
      </svg>
      <figcaption className="muted small">Flights a week, {series[0].week} to {last.week}{series.some(p => p.flights == null) ? ' · gaps are weeks not on file' : ''}</figcaption>
    </figure>
  )
}

const label = (k: string) => k.replace(/_/g, ' ')
const show = (v: unknown): string => (v == null ? 'not on file' : Array.isArray(v) ? v.map(x => (typeof x === 'object' && x ? Object.values(x).join(' ') : String(x))).join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v))

/** The rows behind the number, as a small table (or a list of ids). */
function Rows({ rows }: { rows: Insight['rows'] }) {
  if (!rows.length) return null
  if (typeof rows[0] !== 'object') return <p className="mono small">{(rows as string[]).join(', ')}</p>
  const rs = rows as Record<string, unknown>[]
  const cols = [...new Set(rs.flatMap(r => Object.keys(r)))].filter(c => c !== 'path')
  return (
    <div className="table-wrap"><table className="grid compact">
      <thead><tr>{cols.map(c => <th key={c} scope="col">{label(c)}</th>)}</tr></thead>
      <tbody>{rs.slice(0, 12).map((r, i) => <tr key={i}>{cols.map(c => <td key={c}>{show(r[c])}</td>)}</tr>)}</tbody>
    </table>{rs.length > 12 && <p className="muted small">+{rs.length - 12} more in the CSV</p>}</div>
  )
}

export function InsightCard({ i, open = false, acct }: { i: Insight; open?: boolean; acct?: string }) {
  return (
    <details className={`card insight tone-${i.tone}`} open={open}>
      <summary>
        <span className={`rtag ${i.tone === 'good' ? 'good' : i.tone === 'info' ? '' : i.tone}`}>{TONE[i.tone]}</span>
        <span className="grow"><b>{i.headline}</b>{acct && <span className="muted small block">{acct}</span>}</span>
      </summary>
      <div className="insight-in">
        {i.series && <Sparkline series={i.series} />}
        <Rows rows={i.rows} />
        <p className="small"><span className="label">How it is counted</span> {i.method}</p>
        <p className="small muted">Window: {i.window}{i.missing_weeks?.length ? ` · weeks not on file: ${i.missing_weeks.join(', ')}` : ''}</p>
        <Receipts rs={i.receipts} />
      </div>
    </details>
  )
}

export const insightCsv = (items: (Insight & { acctName?: string })[]) => items.map(i => ({
  account: i.acctName ?? i.account, tone: TONE[i.tone], insight: i.headline, method: i.method, window: i.window, records: ids(i.receipts),
}))

export function InsightsPage() {
  const { book, account, names, unreachable } = useData()
  const [tone, setTone] = useState<'' | Tone>('')
  if (!book) return unreachable ? <Failed what="insights" /> : <><PageHead title="Insights" /><Loading /></>
  const accs = Object.entries(book.accounts).filter(([id]) => account === 'all' || id === account)
  const all = accs.flatMap(([id, a]) => (a.insights?.items ?? []).map(i => ({ ...i, acctName: names[id] ?? id })))
  const items = all.filter(i => !tone || i.tone === tone).sort((a, b) => ORDER[a.tone] - ORDER[b.tone])
  const notChecked = accs.flatMap(([id, a]) => (a.insights?.not_checked ?? []).map(t => `${names[id] ?? id}: ${t}`))
  const n = (t: Tone) => all.filter(i => i.tone === t).length
  return (
    <>
      <PageHead title="Insights" sub={<><Stat n={n('red')} label="red" tone="red" /><Stat n={n('amber')} label="amber" tone="amber" /><Stat n={all.length} label="in all" /></>}
        info={<p>Each insight is one fixed rule over the records, joined only on exact keys (dock id, ticket id, a person's exact name). Open one to see how it is counted, the rows behind the number and the record ids.</p>}>
        <select aria-label="Tone" value={tone} onChange={e => setTone(e.target.value as typeof tone)}>
          <option value="">All</option><option value="red">Red</option><option value="amber">Amber</option><option value="good">Better</option><option value="info">Fact</option>
        </select>
        <CsvButton name="insights" rows={() => insightCsv(items)} />
      </PageHead>
      {!items.length ? <Empty title="No insights match">{all.length ? 'Clear the filter to see more.' : 'They appear once paperwork for an account is fetched.'}</Empty>
        : <div className="stack">{items.map(i => <InsightCard key={i.id} i={i} acct={account === 'all' ? i.acctName : undefined} />)}</div>}
      {notChecked.length > 0 && <div className="card"><h2 className="label">Not checked</h2><ul className="stack tight small">{notChecked.map(t => <li key={t}>{t}</li>)}</ul></div>}
    </>
  )
}

export const InsightsInfo = Info
