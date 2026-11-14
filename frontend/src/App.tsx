import { useEffect, useState } from 'react'
import { Collapsible } from '@base-ui/react/collapsible'
import { Popover } from '@base-ui/react/popover'
import { useBook, type Account, type BandKey, type Line, type Receipt } from './api'

const SYM: Record<string, string> = { GBP: '£', EUR: '€', USD: '$', INR: '₹' }
export const money = (n: number, cur: string) => `${SYM[cur] ?? cur + ' '}${n.toLocaleString('en-GB')}`
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null

const BANDS: { key: BandKey; label: string; apart?: boolean }[] = [
  { key: 'on_contract', label: 'On contract' },
  { key: 'backed_upside', label: 'Backed upside' },
  { key: 'unbacked', label: 'Unbacked', apart: true },
  { key: 'unpriced', label: 'Unpriced', apart: true },
]

function Chip({ r }: { r: Receipt }) {
  const long = r.id.length > 28
  const text = long ? `${r.id.slice(0, 12)}…${r.id.slice(-12)}` : r.id
  const copy = () => navigator.clipboard?.writeText(r.id).catch(() => {})
  const btn = <button type="button" className="receipt" onClick={copy} title={`Copy ${r.id}`}>{text}</button>
  if (!long) return btn
  return (
    <Popover.Root>
      <Popover.Trigger className="receipt" onClick={copy}>{text}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6}>
          <Popover.Popup className="popup"><span className="label">{r.kind}</span><br /><code>{r.id}</code></Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

const uniq = (rs: Receipt[]) => [...new Map(rs.map(r => [`${r.kind}:${r.id}`, r])).values()]
const Receipts = ({ rs }: { rs: Receipt[] }) =>
  rs.length ? <span className="receipts">{uniq(rs).map(r => <Chip key={`${r.kind}:${r.id}`} r={r} />)}</span>
    : <span className="muted">no receipt</span>

function leadOf(a: Account) {
  const l = a.q1?.bands.on_contract.find(x => x.renewal_risk && x.term_ends && x.value != null && x.currency)
  return l && { label: l.title, text: `Renewal ends ${l.term_ends}: ${money(l.value!, l.currency!)} on contract.`, receipts: l.receipts }
}

function Band({ k, label, apart, acc, aid, changed }: { k: BandKey; label: string; apart?: boolean; acc: Account; aid: string; changed: Set<string> }) {
  const q1 = acc.q1!
  const lines = q1.bands[k]
  const t = k === 'unpriced' ? null : q1.totals[k]
  const amounts = Object.entries(t?.by_currency ?? {}).map(([c, n]) => money(n, c))
  const isNew = lines.some(l => changed.has(`${aid}/${k}/${l.id ?? l.title}`))
  return (
    <Collapsible.Root className={`band band-${k}${apart ? ' apart' : ''}${isNew ? ' changed' : ''}`}>
      <Collapsible.Trigger className="band-head">
        <svg className="chev" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span className="chip">{label}</span>
        {isNew && <span className="tag">New</span>}
        <span className="amount">{amounts.length ? amounts.join(' · ') : k === 'unpriced' ? 'no value yet' : '—'}</span>
        <span className="muted count">{lines.length} {lines.length === 1 ? 'deal' : 'deals'}</span>
      </Collapsible.Trigger>
      <Collapsible.Panel className="panel">
        {lines.length === 0 && <p className="muted">No deals in this band.</p>}
        {lines.map(l => <DealRow key={l.id ?? l.title} l={l} k={k} />)}
        {k !== 'unpriced' && !!t?.receipts.length && <div className="row"><span className="label">All receipts</span><Receipts rs={t.receipts} /></div>}
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}

function DealRow({ l, k }: { l: Line; k: BandKey }) {
  return (
    <div className="row">
      <div>
        <strong>{l.title}</strong>{' '}
        <span className="num">{l.value != null && l.currency ? money(l.value, l.currency) : k === 'unpriced' ? '' : 'no value'}</span>
        {l.renewal_risk && <span className="risk"> Renewal risk{l.term_ends ? `, term ends ${l.term_ends}` : ''}</span>}
        {l.note && <div className="muted">{l.note}</div>}
      </div>
      <Receipts rs={l.receipts} />
    </div>
  )
}

const Skeleton = () => (
  <div className="columns" aria-busy="true">
    <span className="sr-only" role="status">Loading…</span>
    {[0, 1].map(i => (
      <section key={i} className="column" aria-hidden="true">
        <div className="sk sk-title" />
        <div className="lead"><div className="sk sk-label" /><div className="sk sk-display" /><div className="sk sk-display short" /></div>
        {[0, 1, 2, 3].map(j => <div key={j} className="sk sk-band" />)}
      </section>
    ))}
  </div>
)

function Column({ aid, acc, changed }: { aid: string; acc: Account; changed: Set<string> }) {
  const lead = leadOf(acc)
  return (
    <section className="column" aria-label={acc.name ?? aid}>
      <h2 className="title">{acc.name ?? aid}</h2>
      {lead && (
        <div className="lead">
          <span className="label">{lead.label}</span>
          <p className="display">{lead.text}</p>
          <Receipts rs={lead.receipts} />
        </div>
      )}
      {acc.q1 ? (
        <div className="strip">
          <h3 className="label strip-title">Worth</h3>
          {BANDS.map(b => <Band key={b.key} k={b.key} label={b.label} apart={b.apart} acc={acc} aid={aid} changed={changed} />)}
        </div>
      ) : <p className="empty">No value data for this account yet. It will appear here as soon as the next sync brings it in.</p>}
      {/* later sections (q2..q5) render here when their key arrives and their stories land */}
    </section>
  )
}

export default function App() {
  const { book, health, unreachable, changed, clearChanged, resync, resyncing, resyncError } = useBook()
  const [note, setNote] = useState('')
  useEffect(() => { setNote(changed.size ? `${changed.size} ${changed.size === 1 ? 'item' : 'items'} changed` : '') }, [changed])
  const asOf = when(book?.as_of ?? null)
  const accounts = Object.entries(book?.accounts ?? {})
  const banner = unreachable
    ? `Can't reach the app. Showing data${asOf ? ` as of ${asOf}` : ' (none yet)'}.`
    : health?.stale
      ? `MCP unreachable. Showing data last fetched ${when(health.last_good_poll) ?? 'never (no successful fetch yet)'}.`
      : null
  const left = health?.resync_at ? health.pending_calls ?? 0 : 0
  const progress = left > 0 ? `Resyncing · ${left} ${left === 1 ? 'call' : 'calls'} left (about ${left} ${left === 1 ? 'minute' : 'minutes'}, 1 call a minute)` : null
  return (
    <div onPointerDown={clearChanged}>
      <header className={`fresh${banner ? ' stale' : ''}`} role={banner ? 'alert' : undefined}>
        {banner ?? (asOf ? `As of ${asOf} · live` : 'Waiting for first sync')}
        {banner && asOf && !unreachable && <span> · figures as of {asOf}</span>}
        <button type="button" className="resync" onClick={resync} disabled={resyncing}>{resyncing ? 'Resyncing…' : 'Resync now'}</button>
        {progress && <span className="resync-note" role="status">{progress}</span>}
        {resyncError && <span className="resync-note resync-err" role="alert">{resyncError}</span>}
      </header>
      <div className="sr-only" role="status" aria-live="polite">{note}</div>
      <main>
        {!book ? (unreachable ? null : <Skeleton />)
          : book.as_of === null ? <div className="calm"><span className="pulse" aria-hidden="true" /><p>Waiting for first sync. Figures appear here once the first data arrives.</p></div>
          : <div className="columns">{accounts.map(([id, a]) => <Column key={id} aid={id} acc={a} changed={changed} />)}</div>}
      </main>
    </div>
  )
}
