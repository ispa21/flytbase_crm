import { useEffect, useState } from 'react'
import { Collapsible } from '@base-ui/react/collapsible'
import { Popover } from '@base-ui/react/popover'
import { useBook, type Account, type BandKey, type DealPower, type Entry, type Line, type Q4, type Receipt, type RiskItem, type RoleKey } from './api'

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

const ROLES: [RoleKey, string][] = [['decides', 'Decides'], ['pays', 'Pays'], ['uses', 'Uses'], ['could_block', 'Could block']]
const NOT_ON_FILE = 'not on file'

function describe(e: Entry): string {
  if (e.who) return e.title ? `${e.who}, ${e.title}` : e.who
  if (e.unnamed_logins) return `${e.unnamed_logins} unnamed ${e.unnamed_logins === 1 ? 'login' : 'logins'}`
  if (e.usage_by) return `Usage by ${e.usage_by}`
  if (e.paid_invoices?.length) return `Invoices ${e.paid_invoices.join(', ')}`
  return e.text ?? NOT_ON_FILE
}

function Person({ e }: { e: Entry }) {
  return (
    <div className="person">
      <span><strong>{describe(e)}</strong>
        {e.who && e.text && <span className="muted"> · {e.text}</span>}
        {e.stands && <span className={e.stands === NOT_ON_FILE ? 'muted' : 'stands'}> · {e.stands === NOT_ON_FILE ? 'standing not on file' : e.stands}</span>}
        {e.gap && <span className="muted"> · {e.gap}</span>}
        {e.backing === 'claim only' && <span className="muted"> · claim only</span>}</span>
      <Receipts rs={e.receipts} />
    </div>
  )
}

function Power({ p }: { p: DealPower }) {
  const voices = p.voices.filter(v => v.who)
  return (
    <Collapsible.Root className="power">
      <Collapsible.Trigger className="power-head">
        <svg className="chev" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span>Who decides, pays, uses, could block</span>
      </Collapsible.Trigger>
      <Collapsible.Panel className="panel">
        {ROLES.map(([k, label]) => {
          const c = p.roles[k]
          return (
            <div className="role" key={k}>
              <span className="label">{label}</span>
              {c && c.entries.length ? c.entries.map((e, i) => <Person key={i} e={e} />)
                : <span className="muted">{NOT_ON_FILE}{c?.gap && c.gap !== NOT_ON_FILE ? `: ${c.gap}` : ''}</span>}
            </div>
          )
        })}
        {voices.length > 0 && (
          <div className="role">
            <span className="label">Spoke on this deal</span>
            {voices.map((v, i) => <Person key={i} e={v} />)}
          </div>
        )}
      </Collapsible.Panel>
    </Collapsible.Root>
  )
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
        {lines.map(l => <DealRow key={l.id ?? l.title} l={l} k={k} power={acc.q2?.deals?.find(d => d.deal === l.id)} />)}
        {k !== 'unpriced' && !!t?.receipts.length && <div className="row"><span className="label">All receipts</span><Receipts rs={t.receipts} /></div>}
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}

function DealRow({ l, k, power }: { l: Line; k: BandKey; power?: DealPower }) {
  return (
    <div className="row">
      <div>
        <strong>{l.title}</strong>{' '}
        <span className="num">{l.value != null && l.currency ? money(l.value, l.currency) : k === 'unpriced' ? '' : 'no value'}</span>
        {l.renewal_risk && <span className="risk"> Renewal risk{l.term_ends ? `, term ends ${l.term_ends}` : ''}</span>}
        {l.note && <div className="muted">{l.note}</div>}
      </div>
      <Receipts rs={l.receipts} />
      {power && <Power p={power} />}
    </div>
  )
}

function Risk({ r }: { r: RiskItem }) {
  const bad = r.turns_bad_on && r.turns_bad_on !== NOT_ON_FILE ? r.turns_bad_on : null
  return (
    <li className="risk-item">
      <div>
        {r.level && <span className={`level level-${r.level}`}>{r.level === 'red' ? 'Red' : 'Amber'}</span>}{' '}
        {r.text}
        <div className="muted">{bad ? `Turns bad on ${bad}` : 'Turn date not on file'}</div>
      </div>
      <Receipts rs={r.receipts} />
    </li>
  )
}

function Risks({ q4 }: { q4: Q4 }) {
  const items = q4.items ?? []
  const gaps = q4.gaps ?? []
  if (!items.length && !gaps.length) return null
  return (
    <Collapsible.Root className="band risks">
      <Collapsible.Trigger className="band-head">
        <svg className="chev" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span className="chip">Slipping</span>
        <span className="muted count">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
      </Collapsible.Trigger>
      <Collapsible.Panel className="panel">
        {items.length > 0 && <ol className="risk-list">{items.map((r, i) => <Risk key={i} r={r} />)}</ol>}
        {gaps.length > 0 && <ul className="risk-gaps muted">{gaps.map((g, i) => <li key={i}>Not checked: {g}</li>)}</ul>}
      </Collapsible.Panel>
    </Collapsible.Root>
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
  const urgent = acc.q4?.items?.[0]
  return (
    <section className="column" aria-label={acc.name ?? aid}>
      <h2 className="title">{acc.name ?? aid}</h2>
      {(lead || urgent) && (
        <div className="lead">
          {lead && <>
            <span className="label">{lead.label}</span>
            <p className="display">{lead.text}</p>
            <Receipts rs={lead.receipts} />
          </>}
          {urgent && (
            <div className={`urgent${lead ? ' after' : ''}`}>
              <p className="display">{urgent.text}</p>
              <p className="muted">{urgent.turns_bad_on && urgent.turns_bad_on !== NOT_ON_FILE ? `Turns bad on ${urgent.turns_bad_on}` : 'Turn date not on file'}</p>
              <Receipts rs={urgent.receipts} />
            </div>
          )}
        </div>
      )}
      {acc.q1 ? (
        <div className="strip">
          <h3 className="label strip-title">Worth</h3>
          {BANDS.map(b => <Band key={b.key} k={b.key} label={b.label} apart={b.apart} acc={acc} aid={aid} changed={changed} />)}
        </div>
      ) : <p className="empty">No value data for this account yet. It will appear here as soon as the next sync brings it in.</p>}
      {acc.q4 && <Risks q4={acc.q4} />}
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
