import { Count } from './live'
import { MiniBar, RiskTimeline, SignalField } from './viz'
import { Collapsible } from '@base-ui/react/collapsible'
import type { Account, Book, BandKey, Changes, DealPower, Entry, Gap, Line, Q4, Q5, RiskItem, RoleKey } from './api'
import { BANDS, Chev, NOT_ON_FILE, NO_CUR, Receipts, bandName, dealsOf, money, turns } from './ui'

function leadOf(a: Account) {
  const l = a.q1?.bands.on_contract.find(x => x.renewal_risk && x.term_ends && x.value != null && x.currency)
  return l && { label: l.title, text: `Renewal ends ${l.term_ends}: ${money(l.value!, l.currency!)} on contract.`, receipts: l.receipts }
}

const ROLES: [RoleKey, string][] = [['decides', 'Decides'], ['pays', 'Pays'], ['uses', 'Uses'], ['could_block', 'Could block']]

export function describe(e: Entry): string {
  if (e.who) return e.title ? `${e.who}, ${e.title}` : e.who
  if (e.unnamed_logins) return `${e.unnamed_logins} unnamed ${e.unnamed_logins === 1 ? 'login' : 'logins'}`
  if (e.usage_by) return `Usage by ${e.usage_by}`
  if (e.paid_invoices?.length) return `Invoices ${e.paid_invoices.join(', ')}`
  return e.text ?? NOT_ON_FILE
}

export function Person({ e }: { e: Entry }) {
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

export function PowerGrid({ p }: { p: DealPower }) {
  const voices = p.voices.filter(v => v.who)
  return (
    <div className="roles">
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
        <div className="role wide">
          <span className="label">Spoke on this deal</span>
          {voices.map((v, i) => <Person key={i} e={v} />)}
        </div>
      )}
    </div>
  )
}

function Power({ p }: { p: DealPower }) {
  return (
    <Collapsible.Root className="power">
      <Collapsible.Trigger className="power-head"><Chev /><span>Who decides, pays, uses, could block</span></Collapsible.Trigger>
      <Collapsible.Panel className="panel"><PowerGrid p={p} /></Collapsible.Panel>
    </Collapsible.Root>
  )
}

const BAND_HINT: Record<BandKey, string> = {
  on_contract: 'Signed and backed by the contract file',
  backed_upside: 'Open deals a file or a verified fact backs',
  unbacked: 'Rests on a claim only',
  unpriced: 'No value on file',
}

function Band({ k, label, apart, acc, aid, changed }: { k: BandKey; label: string; apart?: boolean; acc: Account; aid: string; changed: Set<string> }) {
  const q1 = acc.q1!
  const lines = q1.bands[k]
  const t = k === 'unpriced' ? null : q1.totals[k]
  const cur = Object.entries(t?.by_currency ?? {})
  const isNew = lines.some(l => changed.has(`${aid}/${k}/${l.id ?? l.title}`))
  return (
    <Collapsible.Root className={`disc band-${k}${apart ? ' apart' : ''}${isNew ? ' changed' : ''}`}>
      <Collapsible.Trigger className="disc-h">
        <Chev />
        <span className="band-name"><span className="mark" aria-hidden="true" /><span>{label}</span>{isNew && <span className="tag">New</span>}</span>
        <span className="amt">
          {cur.length ? cur.map(([c, n]) => <span key={c} className="amt-line"><b><Count n={n} fmt={x => money(x, c)} /></b>{c === NO_CUR && <i>currency not on file</i>}</span>)
            : <span className="none">{k === 'unpriced' ? 'no value yet' : 'none'}</span>}
        </span>
        <span className="band-sub">{lines.length} {lines.length === 1 ? 'deal' : 'deals'} · {BAND_HINT[k]}</span>
        {k !== 'unpriced' && cur.length === 1 && <MiniBar acc={acc} band={k} currency={cur[0][0]} />}
      </Collapsible.Trigger>
      <Collapsible.Panel className="panel">
        <div className="panel-in">
          {lines.length === 0 && <p className="muted">No deals in this band.</p>}
          {lines.map(l => <DealRow key={l.id ?? l.title} aid={aid} l={l} k={k} power={acc.q2?.deals?.find(d => d.deal === l.id)} />)}
          {k !== 'unpriced' && !!t?.receipts.length && <div className="deal"><span className="sub">All receipts</span><Receipts rs={t.receipts} /></div>}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}

function DealRow({ l, k, power, aid }: { l: Line; k: BandKey; power?: DealPower; aid: string }) {
  const val = l.value == null ? (k === 'unpriced' ? '' : 'no value')
    : l.currency ? money(l.value, l.currency) : `${l.value.toLocaleString('en-GB')} (currency not on file)`
  return (
    <div className="deal">
      <div className="deal-top"><strong>{l.title}</strong><span className="num">{val}</span></div>
      {l.renewal_risk && <span className="risk">Renewal risk{l.term_ends ? `, term ends ${l.term_ends}` : ''}</span>}
      {l.note && <div className="muted">{l.note}</div>}
      <Receipts rs={l.receipts} />
      {power && <Power p={power} />}
      {l.id && <a className="link" href={`#/deals/${aid}/${l.id}`}>Open deal</a>}
    </div>
  )
}

export const KIND: Record<string, string> = { renewal: 'Renewal', cold: 'Going cold', stuck: 'Stuck', usage_drop: 'Usage', signal: 'Signal' }

export function Risk({ r }: { r: RiskItem }) {
  const bad = r.turns_bad_on && r.turns_bad_on !== NOT_ON_FILE
  return (
    <li className="slip">
      <span className={`slip-k ${r.level ?? ''}`}>{r.level === 'red' ? 'Red' : r.level === 'amber' ? 'Amber' : KIND[r.kind] ?? r.kind}</span>
      <div>
        <p>{r.text}</p>
        <div className={`slip-when${bad ? ' bad' : ''}`}>{turns(r)}</div>
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
    <Collapsible.Root className="disc risks">
      <Collapsible.Trigger className="disc-h">
        <Chev />
        <span className="band-name"><span>Slipping</span></span>
        <span className="amt"><span className="amt-line"><b>{items.length}</b><i>{items.length === 1 ? 'item' : 'items'}</i></span></span>
        <span className="band-sub">Deadlines at risk, people going cold, deals stuck</span>
      </Collapsible.Trigger>
      <Collapsible.Panel className="panel">
        <div className="panel-in">
          <RiskTimeline q4={q4} />
          {items.length > 0 && <ol className="risk-list">{items.map((r, i) => <Risk key={i} r={r} />)}</ol>}
          {gaps.length > 0 && <ul className="risk-gaps">{gaps.map((g, i) => <li key={i}>Not checked: {g}</li>)}</ul>}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}

/** Value at stake per currency, never summed across currencies. */
export const stake = (g: Gap) => {
  const by: Record<string, number> = {}
  for (const d of g.deals) if (d.value != null) by[d.currency] = (by[d.currency] ?? 0) + d.value
  return Object.entries(by).map(([c, n]) => money(n, c)).join(' · ')
}

export function GapRow({ g }: { g: Gap }) {
  const s = stake(g)
  return (
    <Collapsible.Root className="gap">
      <Collapsible.Trigger className="gap-head">
        <Chev />
        <span className="gap-text">{g.text}</span>
        {s && <span className="num">{s}</span>}
      </Collapsible.Trigger>
      <Collapsible.Panel className="panel">
        <div className="gap-in">
          <div className="role">
            <span className="label">Puts at risk</span>
            {g.deals.length ? g.deals.map(d => (
              <div key={d.id}><strong>{d.title}</strong> <span className="num">{d.value != null ? money(d.value, d.currency) : 'no value on file'}</span></div>
            )) : <span className="muted">No single deal; account-wide</span>}
            {g.unpriced_deals > 0 && g.deals.length > 0 && <span className="muted">{g.unpriced_deals} without a value, not counted</span>}
          </div>
          <div className="role">
            <span className="label">Who could fill it</span>
            <span className={g.who_could_fill === NOT_ON_FILE ? 'muted' : ''}>{g.who_could_fill === NOT_ON_FILE ? 'Not on file' : g.who_could_fill}</span>
          </div>
          <div className="role"><span className="label">Receipts</span><Receipts rs={g.receipts} /></div>
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}

function NotKnown({ q5 }: { q5: Q5 }) {
  const gaps = [...(q5.gaps ?? [])].sort((a, b) => (b.value_at_stake ?? -1) - (a.value_at_stake ?? -1)) // highest value first; unpriced last (stable)
  if (!gaps.length) return null
  return (
    <div className="not-known">
      <h3 className="label strip-title">Not known yet</h3>
      {gaps.map((g, i) => <GapRow key={i} g={g} />)}
    </div>
  )
}

export function WhatChanged({ c, names, onSeen }: { c: Changes; names: Record<string, string>; onSeen: () => void }) {
  const acc = (id?: string | null) => (id && names[id]) || id || ''
  const empty = !c.moved.length && !c.new_deals.length && !c.new_signals.length
  return (
    <section className="changes" aria-label="What changed">
      <div className="changes-head">
        <h2 className="label">What changed</h2>
        <button type="button" className="resync" onClick={onSeen}>Mark as seen</button>
      </div>
      {empty ? <p className="muted">Nothing changed since you last looked.</p> : (
        <ul className="changes-list">
          {c.new_signals.map(s => (
            <li key={`s${s.id}`}><span><span className="tag">New signal</span> {s.title ?? s.id}{s.account && <span className="muted"> · {acc(s.account)}</span>}</span><Receipts rs={s.receipts} /></li>
          ))}
          {c.moved.map(m => (
            <li key={`m${m.account}${m.deal}`}><span><span className="tag">Moved</span> {m.title}<span className="muted"> · {acc(m.account)}</span>
              {m.band && <span>, {bandName(m.band.from)} to {bandName(m.band.to)}</span>}
              {m.value && <span>, value {m.value.from ?? 'none'} to {m.value.to ?? 'none'}</span>}
              {m.stage && <span>, stage {m.stage.from ?? 'none'} to {m.stage.to ?? 'none'}</span>}</span><Receipts rs={m.receipts} /></li>
          ))}
          {c.new_deals.map(d => (
            <li key={`n${d.account}${d.deal}`}><span><span className="tag">New deal</span> {d.title}<span className="muted"> · {acc(d.account)} · {bandName(d.band)}</span></span><Receipts rs={[{ id: d.deal, kind: 'deal' }]} /></li>
          ))}
        </ul>
      )}
    </section>
  )
}

export const Skeleton = () => (
  <div className="columns" aria-busy="true">
    <span className="sr-only" role="status">Loading…</span>
    {[0, 1].map(i => (
      <section key={i} className="column" aria-hidden="true">
        <div className="sk sk-head" />
        <div className="sk sk-lead" />
        {[0, 1, 2, 3].map(j => <div key={j} className="sk sk-row" />)}
      </section>
    ))}
  </div>
)

export function Column({ aid, acc, changed }: { aid: string; acc: Account; changed: Set<string> }) {
  const lead = leadOf(acc)
  const urgent = acc.q4?.items?.[0]
  const deals = acc.q1 ? Object.values(acc.q1.bands).reduce((n, ls) => n + ls.length, 0) : 0
  const kick = urgent?.level === 'red' ? 'red' : urgent?.level === 'amber' ? 'amber' : ''
  return (
    <section className="column" aria-label={acc.name ?? aid}>
      <div className="head">
        <h2>{acc.name ?? aid}</h2>
        {acc.q1 && <span className="muted">{deals} {deals === 1 ? 'deal' : 'deals'}</span>}
      </div>
      {(lead || urgent) ? (
        <div className="lead">
          {lead && <>
            <span className="kicker">{lead.label}</span>
            <p className="display">{lead.text}</p>
            <Receipts rs={lead.receipts} />
          </>}
          {urgent && (
            <div className={`urgent${lead ? ' after' : ''}`}>
              <span className={`kicker ${kick}`}>{kick === 'red' ? 'Going red' : kick === 'amber' ? 'Amber' : 'Watch'}</span>
              <p className="display">{urgent.text}</p>
              <p className="when">{turns(urgent)}</p>
              <Receipts rs={urgent.receipts} />
            </div>
          )}
        </div>
      ) : null}
      {acc.q1 ? (
        <div className="sec">
          <div className="sec-h"><h3>Worth</h3></div>
          {BANDS.map((b, i) => (
            <div key={b.key} className="ledger-row">
              {i === 2 && <div className="ledger-sub">Held apart: never added to a total</div>}
              <Band k={b.key} label={b.label} apart={b.apart} acc={acc} aid={aid} changed={changed} />
            </div>
          ))}
        </div>
      ) : <p className="empty">No value data for this account yet. It will appear here as soon as the next sync brings it in.</p>}
      {!!acc.q3?.moves?.length && (
        <div className="sec">
          <div className="sec-h"><h3>Do first</h3></div>
          <ol className="firsts">
            {acc.q3.moves.map(m => (
              <li key={m.rank}><span className="rank">{m.rank}</span>
                <span><a className="link" href="#/moves">{m.action}</a><span className="muted"> · {m.owner} · due {m.due}</span></span></li>
            ))}
          </ol>
        </div>
      )}
      {acc.q4 && <div className="sec"><div className="sec-h"><h3>Going wrong</h3></div><Risks q4={acc.q4} /></div>}
      {acc.q5 && <NotKnown q5={acc.q5} />}
    </section>
  )
}


export function Home({ book, changed, names, markSeen, account }: { book: Book | null; changed: Set<string>; names: Record<string, string>; markSeen: () => void; account: string }) {
  const accounts = Object.entries(book?.accounts ?? {}).filter(([id]) => account === 'all' || id === account)
  return (
    <>
      {book?.changes && <WhatChanged c={book.changes} names={names} onSeen={markSeen} />}
      {book && book.as_of !== null && <SignalField deals={dealsOf(book).filter(d => account === 'all' || d.acct === account)} />}
      {!book ? <Skeleton />
        : book.as_of === null ? <div className="calm"><p>Waiting for first sync. Figures appear here once the first data arrives.</p></div>
        : <div className={`columns${accounts.length === 1 ? ' one' : ''}`}>{accounts.map(([id, a]) => <Column key={id} aid={id} acc={a} changed={changed} />)}</div>}
    </>
  )
}
