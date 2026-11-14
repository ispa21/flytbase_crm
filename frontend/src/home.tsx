import type { ReactNode } from 'react'
import { Collapsible } from '@base-ui/react/collapsible'
import type { Account, Book, Changes, DealPower, Entry, Gap, Move, RiskItem, RoleKey } from './api'
import { Chev, NOT_ON_FILE, NO_CUR, Receipts, bandName, money, turns } from './ui'
import { WorthBars } from './viz'
import { RadarScope } from './radar'


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




export const KIND: Record<string, string> = { renewal: 'Renewal', cold: 'Going cold', stuck: 'Stuck', usage_drop: 'Usage', signal: 'Signal', insight: 'Insight' }

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
  <div className="home" aria-busy="true">
    <span className="sr-only" role="status">Loading…</span>
    {[0, 1, 2].map(i => <div key={i} className="sk sk-row" aria-hidden="true" />)}
  </div>
)

// ---------- Home: two things only. The three moves to make first, and one card per account in five sentences ----------
type Dot = 'red' | 'amber' | 'good' | 'grey' | null
const LV: Record<string, number> = { red: 0, amber: 1 }
const fmt = (by: Record<string, number> | undefined) => Object.entries(by ?? {}).map(([c, n]) => (c === NO_CUR ? `${n.toLocaleString('en-GB')} (currency not on file)` : money(n, c))).join(' + ')
const daysTo = (iso: string, today: string) => Math.round((Date.parse(iso) - Date.parse(today)) / 86_400_000)

function Line({ label, dot, href, children }: { label: string; dot: Dot; href: string; children: ReactNode }) {
  return (
    <a className="hl" href={href}>
      <span className={`hl-dot ${dot ?? ''}`} aria-hidden="true" />
      <span className="hl-k">{label}</span>
      <span className="hl-v">{children}</span>
      <Chev />
    </a>
  )
}

function worth(a: Account) {
  const t = a.q1?.totals
  if (!t) return 'not available yet'
  const parts = [fmt(t.on_contract.by_currency) && `${fmt(t.on_contract.by_currency)} on contract`,
    fmt(t.backed_upside.by_currency) && `${fmt(t.backed_upside.by_currency)} likely more`,
    fmt(t.unbacked.by_currency) && `${fmt(t.unbacked.by_currency)} not backed (kept apart)`].filter(Boolean)
  const unpriced = a.q1!.bands.unpriced.length
  return [...parts, unpriced ? `${unpriced} with no value yet` : ''].filter(Boolean).join(' · ') || 'no value on file'
}

function decider(a: Account): { text: string; dot: Dot } {
  const ren = a.q1?.bands.on_contract[0]
  const deal = a.q2?.deals.find(d => d.deal === ren?.id) ?? a.q2?.deals[0]
  const e = deal?.roles.decides.entries[0] ?? (a.q2 as { contract?: { decides?: { entries: Entry[] } } } | undefined)?.contract?.decides?.entries[0]
  if (!e?.who) return { text: 'not on file', dot: 'grey' }
  const named = (e as Entry & { person_named?: boolean }).person_named !== false
  return { text: `${e.who}${e.title ? `, ${e.title}` : ''}${named ? '' : ' (no named person)'}${e.stands && e.stands !== NOT_ON_FILE ? ` · ${e.stands}` : ''}`, dot: named ? null : 'amber' }
}

function AccountCard({ id, a, today }: { id: string; a: Account; today: string }) {
  const ren = a.q1?.bands.on_contract.find(l => l.term_ends)
  const risks = [...(a.q4?.items ?? [])].sort((x, y) => (LV[x.level ?? ''] ?? 2) - (LV[y.level ?? ''] ?? 2))
  const worst = risks[0]
  const m = a.q3?.moves?.[0]
  const gaps = [...(a.q5?.gaps ?? [])].sort((x, y) => (y.value_at_stake ?? -1) - (x.value_at_stake ?? -1))
  const top = a.insights?.items?.[0]
  const who = decider(a)
  const health: Dot = worst?.level === 'red' ? 'red' : worst?.level === 'amber' ? 'amber' : null
  const days = ren?.term_ends ? daysTo(ren.term_ends, today) : null

  return (
    <section className="card hcard" aria-label={a.name ?? id}>
      <div className="hcard-h">
        <div className="hcard-title-row">
          <span className={`hl-dot ${health ?? ''}`} aria-hidden="true" />
          <h2><a href={`#/accounts/${id}`}>{a.name ?? id}</a></h2>
        </div>
        {ren?.term_ends && (
          <span className="hcard-badge">
            Renewal {ren.term_ends} · <span className={days != null && days < 90 ? 'err strong' : 'strong'}>{days} days</span>
          </span>
        )}
      </div>

      <div className="hcard-visuals">
        <div className="hcard-viz-col worth-col">
          <span className="label">Contract pipeline</span>
          <WorthBars a={a} />
        </div>
        {a.radar ? (
          <div className="hcard-viz-col radar-col">
            <div className="row between">
              <span className="label">Risk radar</span>
              <a className="link small" href="#/radar">Open radar →</a>
            </div>
            <RadarScope acct={id} radar={a.radar} compact={true} />
          </div>
        ) : null}
      </div>

      <div className="hcard-lines">
        <Line label="Who decides" dot={who.dot} href="#/power">{who.text}</Line>
        <Line label="Next move" dot={m ? (m.overdue_since ? 'red' : (m.level as Dot) ?? null) : 'grey'} href="#/tasks">
          {m ? <>{m.action} · <span className="nowrap">{m.overdue_since ? <span className="err strong">overdue ({m.due})</span> : `by ${m.due}`}</span></> : 'no move on file'}
        </Line>
        <Line label="Top risk" dot={(worst?.level as Dot) ?? (worst ? null : 'grey')} href="#/radar">
          {worst ? <>{worst.text}{worst.turns_bad_on !== NOT_ON_FILE && <span className="muted"> · {turns(worst).toLowerCase()}</span>}{risks.length > 1 && <span className="muted"> · +{risks.length - 1} more</span>}</> : 'nothing flagged (not an all-clear)'}
        </Line>
        <Line label="Gaps" dot="grey" href="#/radar">
          {gaps.length ? <>{gaps.length} {gaps.length === 1 ? 'gap' : 'gaps'}; biggest: {gaps[0].text}</> : a.q5 ? 'no gaps recorded' : 'not available yet'}
        </Line>
        {top && <Line label="Key insight" dot={top.tone === 'red' ? 'red' : top.tone === 'amber' ? 'amber' : top.tone === 'good' ? 'good' : null} href="#/insights">{top.headline}</Line>}
      </div>
    </section>
  )
}

function FirstMoves({ book, ids, names }: { book: Book; ids: string[]; names: Record<string, string> }) {
  const all = ids.flatMap(id => (book.accounts[id].q3?.moves ?? []).map(m => ({ ...m, acct: id })))
  const rank = (m: Move) => [m.overdue_since ? 0 : 1, LV[m.level ?? ''] ?? 2, m.due] as const
  const top = all.sort((a, b) => { const x = rank(a), y = rank(b); return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]) }).slice(0, 3)
  if (!top.length) return null
  return (
    <section className="card firsts-card" aria-label="Do these first">
      <div className="firsts-head">
        <h2 className="label">Do these first</h2>
        <span className="mono small muted">3 immediate priorities</span>
      </div>
      <ol className="first3">{top.map((m, i) => (
        <li key={`${m.acct}${m.rank}`}>
          <span className={`hl-dot ${m.overdue_since ? 'red' : m.level ?? ''}`} aria-hidden="true" />
          <span className="n">{i + 1}</span>
          <a className="grow" href="#/tasks">
            <div className="first-top">
              <b>{m.action}</b>
              {m.overdue_since && <span className="rtag red">Overdue</span>}
            </div>
            <span className="muted small block">
              <span className="strong" style={{ color: 'var(--ink)' }}>{names[m.acct] ?? m.acct}</span>
              {' · '}
              <span>{m.owner}</span>
              {' · '}
              <span className={m.overdue_since ? 'bad' : ''}>by {m.due}</span>
              {m.deal ? ` · ${m.deal.title}` : ''}
            </span>
          </a>
          <Receipts rs={m.receipts.slice(0, 2)} />
        </li>))}</ol>
    </section>
  )
}

export function Home({ book, names, markSeen, account }: { book: Book | null; changed: Set<string>; names: Record<string, string>; markSeen: () => void; account: string }) {
  if (!book) return <Skeleton />
  if (book.as_of === null) return <div className="calm"><p>Waiting for first sync. Figures appear here once the first data arrives.</p></div>
  const ids = Object.keys(book.accounts).filter(id => account === 'all' || id === account)
  const today = book.today ?? Object.values(book.accounts).find(a => a.q4?.today)?.q4?.today ?? new Date().toISOString().slice(0, 10)
  const c = book.changes, n = c ? c.moved.length + c.new_deals.length + c.new_signals.length : 0
  return (
    <div className="home">
      {n > 0 && <p className="news"><b>{n} new</b> since you last looked{c!.new_signals[0]?.title ? `: ${c!.new_signals[0].title}` : ''} <button type="button" className="btn ghost" onClick={markSeen}>Mark as seen</button></p>}
      <FirstMoves book={book} ids={ids} names={names} />
      <div className="hcards">{ids.map(id => <AccountCard key={id} id={id} a={book.accounts[id]} today={today} />)}</div>
      {book.today && book.today_basis !== 'server date' && <p className="muted small">Days are counted from {book.today}, the newest record on file.</p>}
    </div>
  )
}
