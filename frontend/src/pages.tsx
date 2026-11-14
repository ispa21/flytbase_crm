import { useMemo, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { postNote, useApi, useData, type ActivityItem, type ActivityKind, type Health, type Move, type Note, type NoteStatus, type Person, type Receipt } from './api'
import { PowerGrid, GapRow } from './home'
import { Avatar, BandChip, BANDS, Empty, Failed, Icon, Loading, NotAvailable, NOT_ON_FILE, PageHead, Receipts, Tag, allMoves, dealValue, dealsOf, day, riskLabel, turns, uniq, when, type Deal } from './ui'

const acctLabel = (names: Record<string, string>, id: string) => `${id.toUpperCase()} · ${names[id] ?? id}`
export const dealHref = (d: { acct: string; key: string }) => `#/deals/${d.acct}/${encodeURIComponent(d.key)}`
const sameAcct = (account: string, id: string) => account === 'all' || account === id

// ---------- notes: status + approve/save ----------
export const StatusPill = ({ s }: { s: NoteStatus | 'saving' }) => (
  <span className={`status st-${s}`} role="status">{s === 'saving' ? 'Saving…' : s === 'queued' ? 'Queued' : s === 'saved' ? 'Saved' : 'Failed'}</span>
)
const REASON = 'MCP unreachable: notes cannot be saved until the link is back.'

function SaveBox({ account, deal, initial, kind, label, source, onSaved, rows = 6 }: {
  account: string; deal?: string | null; initial: string; kind?: string; label: string; source?: string; onSaved?: () => void; rows?: number
}) {
  const { mcpDown, names } = useData()
  const [text, setText] = useState(initial)
  const [phase, setPhase] = useState<NoteStatus | 'saving' | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const blocked = mcpDown ? REASON : !text.trim() ? 'Write the note first.' : null
  const save = async () => {
    setPhase('saving'); setErr(null)
    try { const r = await postNote({ account, deal, text: text.trim(), source }); setPhase(r.status); onSaved?.() }
    catch (e) { setPhase('failed'); setErr(e instanceof Error ? e.message : 'Save failed') }
  }
  return (
    <div className="savebox">
      <label className="label" htmlFor={`n-${label}-${deal ?? account}`}>Note text</label>
      <textarea id={`n-${label}-${deal ?? account}`} rows={rows} value={text} onChange={e => setText(e.target.value)} />
      <p className="muted small">{kind ? `Kind: ${kind} · ` : ''}Account: {acctLabel(names, account)}{deal ? ` · Deal: ${deal}` : ''}. Nothing is written until you press the button.</p>
      <div className="row">
        <button type="button" className="btn primary" disabled={!!blocked || phase === 'saving'} aria-describedby={blocked ? `why-${label}-${deal ?? account}` : undefined} onClick={save}>{label}</button>
        {phase && <StatusPill s={phase} />}
        {err && <span className="err" role="alert">{err}</span>}
      </div>
      {blocked && <p className="muted small" id={`why-${label}-${deal ?? account}`}>{blocked}</p>}
    </div>
  )
}

// ---------- Moves ----------
function MoveCard({ m, acct, onSaved }: { m: Move & { acct: string }; acct: string; onSaved: () => void }) {
  const { names } = useData()
  const [open, setOpen] = useState(false)
  return (
    <li className="card move">
      <div className="move-top">
        <span className="rank" aria-label={`Move ${m.rank}`}>{m.rank}</span>
        <div className="grow">
          <p className="move-action">{m.action}</p>
          <div className="meta">
            <span>Owner <b>{m.owner}</b></span>
            <span>Due <b className="num">{m.due}</b></span>
            <span>Account <b>{acctLabel(names, acct)}</b></span>
            {m.deal ? <span>Deal <a className="link" href={`#/deals/${acct}/${m.deal.id}`}>{m.deal.title}</a></span> : <span className="muted">No single deal</span>}
            {m.with && m.with !== NOT_ON_FILE && <span>With <b>{m.with}</b></span>}
          </div>
          {m.due_basis && <p className="muted small">Due basis: {m.due_basis}</p>}
          <p><span className="label">Why now</span><br />{m.why_now}</p>
          {m.level && <Tag level={m.level}>{m.level === 'red' ? 'Red' : 'Amber'}</Tag>} {m.turns_bad_on && m.turns_bad_on !== NOT_ON_FILE && <span className="muted small">Turns bad on {m.turns_bad_on}</span>}
          <div className="receipt-row"><Receipts rs={m.receipts} /></div>
        </div>
      </div>
      <div className="move-note">
        {!open ? <button type="button" className="btn" aria-expanded={false} onClick={() => setOpen(true)}>Review note</button> : (
          <>
            <h3 className="label">Draft note for the CRM</h3>
            <SaveBox account={acct} deal={m.deal?.id} initial={m.draft_note.text} kind={m.draft_note.kind} label="Approve and save to CRM" source="move" onSaved={onSaved} />
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Close review</button>
          </>
        )}
      </div>
    </li>
  )
}

export function MovesPage() {
  const { book, account, names, unreachable } = useData()
  const notes = useApi<{ notes: Note[] }>('/api/notes')
  if (!book) return unreachable ? <Failed what="moves" /> : <Loading />
  const ids = Object.keys(book.accounts).filter(id => sameAcct(account, id))
  return (
    <>
      <PageHead title="Moves" sub="The first three moves per account, ranked. Each has an owner, a date inside its deadline and the deal it moves." />
      {ids.map(id => {
        const moves = allMoves(book, id)
        return (
          <section key={id} className="block" aria-label={acctLabel(names, id)}>
            <h2 className="block-h"><span className="letter-sm">{id.toUpperCase()}</span>{names[id] ?? id}</h2>
            {!book.accounts[id].q3 ? <Empty title="Moves are not computed yet">They appear after the next sync.</Empty>
              : !moves.length ? <Empty title="No moves right now">Nothing on file asks for a first move. That is not an all-clear: see Not known on Home.</Empty>
              : <ol className="stack">{moves.map(m => <MoveCard key={m.rank} m={m} acct={id} onSaved={notes.reload} />)}</ol>}
          </section>
        )
      })}
    </>
  )
}

// ---------- Notes ----------
export function NotesPage() {
  const { account, names } = useData()
  const { data, state, reload } = useApi<{ notes: Note[] }>('/api/notes', 15_000)
  const [f, setF] = useState<'all' | NoteStatus>('all')
  if (state === 'loading') return <><PageHead title="Notes" /><Loading /></>
  if (state === 'na') return <><PageHead title="Notes" /><NotAvailable what="The notes history" /></>
  if (state === 'error') return <><PageHead title="Notes" /><Failed what="notes" retry={reload} /></>
  const notes = (data?.notes ?? []).filter(n => sameAcct(account, n.account) && (f === 'all' || n.status === f))
  return (
    <>
      <PageHead title="Notes" sub="Every note written back to the CRM, with its status.">
        <select aria-label="Status" value={f} onChange={e => setF(e.target.value as typeof f)}>
          <option value="all">All statuses</option><option value="queued">Queued</option><option value="saved">Saved</option><option value="failed">Failed</option>
        </select>
      </PageHead>
      {!notes.length ? <Empty title="No notes yet">Approve a draft on Moves, or write one on a deal.</Empty> : (
        <ul className="stack">{notes.map(n => (
          <li key={n.id} className="card note">
            <div className="row between"><span className="muted small">{acctLabel(names, n.account)}{n.deal ? ` · ${n.deal}` : ''} · created {when(n.created_at) ?? NOT_ON_FILE}</span><StatusPill s={n.status} /></div>
            <p className="note-text">{n.text}</p>
            {n.status === 'saved' && <p className="muted small">Saved to CRM {when(n.saved_at) ?? ''}</p>}
            {n.status === 'failed' && <p className="err small">{n.error ?? 'No reason recorded.'}</p>}
          </li>))}</ul>
      )}
    </>
  )
}

// ---------- Deals ----------
type SortKey = 'title' | 'acct' | 'band' | 'stage' | 'value' | 'term_ends' | 'risk'
const RISK_ORD = { red: 3, amber: 2, watch: 1 }
const cmp = (k: SortKey, a: Deal, b: Deal): number => {
  switch (k) {
    case 'title': return a.title.localeCompare(b.title)
    case 'acct': return a.acct.localeCompare(b.acct)
    case 'band': return BANDS.findIndex(x => x.key === a.band) - BANDS.findIndex(x => x.key === b.band)
    case 'stage': return (a.stage ?? '~').localeCompare(b.stage ?? '~')
    case 'value': return (a.currency ?? '~').localeCompare(b.currency ?? '~') || (a.value ?? -1) - (b.value ?? -1) // never compare across currencies
    case 'term_ends': return (a.term_ends ?? '~').localeCompare(b.term_ends ?? '~')
    case 'risk': return (a.risk ? RISK_ORD[a.risk] : 0) - (b.risk ? RISK_ORD[b.risk] : 0)
  }
}

export function DealsPage() {
  const { book, account, names, unreachable } = useData()
  const all = useMemo(() => dealsOf(book), [book])
  const [view, setView] = useState<'table' | 'board'>('table')
  const [group, setGroup] = useState<'band' | 'stage'>('band')
  const [band, setBand] = useState(''); const [stage, setStage] = useState(''); const [risk, setRisk] = useState(''); const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'risk', dir: -1 })
  if (!book) return unreachable ? <Failed what="deals" /> : <><PageHead title="Deals" /><Loading /></>
  const stages = [...new Set(all.map(d => d.stage).filter(Boolean))] as string[]
  const rows = all.filter(d => sameAcct(account, d.acct) && (!band || d.band === band) && (!stage || (stage === '-' ? !d.stage : d.stage === stage))
    && (!risk || (risk === 'none' ? !d.risk : d.risk === risk)) && (!q || `${d.title} ${d.id ?? ''}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => cmp(sort.k, a, b) * sort.dir)
  const th = (k: SortKey, label: string) => (
    <th scope="col" aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="th" onClick={() => setSort(s => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label}{sort.k === k && <Icon n={sort.dir === 1 ? 'up' : 'down'} size={14} />}</button>
    </th>
  )
  const cols = group === 'band' ? BANDS.map(b => ({ key: b.key as string, label: b.label })) : [...stages, '-'].map(s => ({ key: s, label: s === '-' ? 'No stage on file' : s }))
  return (
    <>
      <PageHead title="Deals" sub={`${rows.length} of ${all.length} deals. Values stay in their own currency and are never added across bands.`}>
        <div className="seg" role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}><Icon n="list" size={16} />Table</button>
          <button type="button" aria-pressed={view === 'board'} onClick={() => setView('board')}><Icon n="board" size={16} />Board</button>
        </div>
      </PageHead>
      <div className="filters">
        <input type="search" aria-label="Filter deals" placeholder="Filter by title or id" value={q} onChange={e => setQ(e.target.value)} />
        <select aria-label="Band" value={band} onChange={e => setBand(e.target.value)}><option value="">All bands</option>{BANDS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}</select>
        <select aria-label="Stage" value={stage} onChange={e => setStage(e.target.value)}><option value="">All stages</option>{stages.map(s => <option key={s}>{s}</option>)}<option value="-">No stage on file</option></select>
        <select aria-label="Risk level" value={risk} onChange={e => setRisk(e.target.value)}><option value="">Any risk</option><option value="red">Red</option><option value="amber">Amber</option><option value="watch">Watch</option><option value="none">None flagged</option></select>
        {view === 'board' && <select aria-label="Group by" value={group} onChange={e => setGroup(e.target.value as typeof group)}><option value="band">Group by band</option><option value="stage">Group by stage</option></select>}
      </div>
      {!rows.length ? <Empty title="No deals match">Clear a filter to see more.</Empty> : view === 'table' ? (
        <div className="table-wrap">
          <table className="grid">
            <thead><tr>{th('title', 'Deal')}{th('acct', 'Account')}{th('band', 'Band')}{th('stage', 'Stage')}{th('value', 'Value')}{th('term_ends', 'Renewal date')}{th('risk', 'Risk')}<th scope="col">Receipts</th></tr></thead>
            <tbody>{rows.map(d => (
              <tr key={`${d.acct}${d.key}`}>
                <td><a className="link strong" href={dealHref(d)}>{d.title}</a><div className="mono muted">{d.id ?? 'no id on file'}</div></td>
                <td>{acctLabel(names, d.acct)}</td>
                <td><BandChip k={d.band} /></td>
                <td>{d.stage ?? <span className="muted">not on file</span>}</td>
                <td className="num">{dealValue(d) ?? <span className="muted">{d.band === 'unpriced' ? 'unpriced' : 'no value'}</span>}</td>
                <td className="num">{d.term_ends ?? <span className="muted">not on file</span>}</td>
                <td><Tag level={d.risk === 'watch' ? '' : d.risk}>{riskLabel(d.risk)}</Tag></td>
                <td><Receipts rs={d.receipts.slice(0, 2)} />{d.receipts.length > 2 && <span className="muted small"> +{d.receipts.length - 2}</span>}</td>
              </tr>))}</tbody>
          </table>
        </div>
      ) : (
        <div className="board">{cols.map(c => {
          const items = rows.filter(d => (group === 'band' ? d.band : d.stage ?? '-') === c.key)
          return (
            <section key={c.key} className="lane" aria-label={c.label}>
              <h2 className="lane-h">{c.label}<span className="count">{items.length}</span></h2>
              {items.map(d => (
                <a key={`${d.acct}${d.key}`} className="card deal-card" href={dealHref(d)}>
                  <strong>{d.title}</strong>
                  <span className="num">{dealValue(d) ?? 'no value'}</span>
                  <span className="muted small">{acctLabel(names, d.acct)}{d.term_ends ? ` · ends ${d.term_ends}` : ''}</span>
                  {d.risk && <Tag level={d.risk === 'watch' ? '' : d.risk}>{riskLabel(d.risk)}</Tag>}
                </a>))}
              {!items.length && <p className="muted small">None</p>}
            </section>)
        })}</div>
      )}
    </>
  )
}

// ---------- Deal detail ----------
export function DealPage({ acct, k }: { acct: string; k: string }) {
  const { book, names, unreachable } = useData()
  const deal = useMemo(() => dealsOf(book).find(d => d.acct === acct && d.key === k), [book, acct, k])
  const activity = useApi<{ items: ActivityItem[] }>('/api/activity')
  const notes = useApi<{ notes: Note[] }>('/api/notes')
  if (!book) return unreachable ? <Failed what="this deal" /> : <Loading />
  const back = <a className="link back" href="#/deals"><Icon n="back" size={16} />All deals</a>
  if (!deal) return <>{back}<Empty title="Deal not found">No deal with id {k} on account {acct.toUpperCase()} in the current book.</Empty></>
  const a = book.accounts[acct]
  const power = a.q2?.deals?.find(p => p.deal === deal.id)
  const gaps = (a.q5?.gaps ?? []).filter(g => g.deals.some(x => x.id === deal.id))
  const moves = allMoves(book, acct).filter(m => m.deal?.id === deal.id)
  const items = (activity.data?.items ?? []).filter(i => i.deal === deal.id)
  const mine = (notes.data?.notes ?? []).filter(n => n.deal === deal.id)
  return (
    <>
      {back}
      <PageHead title={deal.title} sub={<>{acctLabel(names, acct)} · <span className="mono">{deal.id ?? 'no id on file'}</span></>}><BandChip k={deal.band} /></PageHead>
      <div className="detail">
        <section className="card" aria-label="Value">
          <h2 className="label">Value</h2>
          <p className="big num">{dealValue(deal) ?? (deal.band === 'unpriced' ? 'Unpriced: no value on file' : 'No value on file')}</p>
          <p className="muted small">{deal.stage ? `Stage ${deal.stage}` : 'Stage not on file'}{deal.term_ends ? ` · term ends ${deal.term_ends}` : ''}{deal.renewal_risk ? ' · renewal risk' : ''}</p>
          {deal.note && <p>{deal.note}</p>}
          <Receipts rs={deal.receipts} />
        </section>
        <section className="card" aria-label="Risks">
          <h2 className="label">What could go wrong</h2>
          {!deal.risks.length ? <p className="muted">Nothing flagged on file for this deal. That is not an all-clear.</p> : (
            <ul className="stack tight">{deal.risks.map((r, i) => (
              <li key={i}><Tag level={r.level}>{r.level === 'red' ? 'Red' : r.level === 'amber' ? 'Amber' : 'Watch'}</Tag> {r.text}
                <div className={`muted small${r.turns_bad_on && r.turns_bad_on !== NOT_ON_FILE ? ' bad' : ''}`}>{turns(r)}</div><Receipts rs={r.receipts} /></li>))}</ul>
          )}
        </section>
        <section className="card wide" aria-label="Power">
          <h2 className="label">Who holds the power</h2>
          {power ? <PowerGrid p={power} /> : <p className="muted">Decides, pays, uses, could block: not on file for this deal.</p>}
        </section>
        <section className="card" aria-label="Unknowns">
          <h2 className="label">Not known</h2>
          {gaps.length ? gaps.map((g, i) => <GapRow key={i} g={g} />) : <p className="muted">No gaps recorded against this deal.</p>}
        </section>
        <section className="card" aria-label="Moves">
          <h2 className="label">Moves</h2>
          {moves.length ? <ul className="stack tight">{moves.map(m => <li key={m.rank}><b>{m.rank}.</b> {m.action}<div className="muted small">{m.owner} · due {m.due}</div></li>)}</ul>
            : <p className="muted">No ranked move touches this deal.</p>}
          {moves.length > 0 && <a className="link" href="#/moves">Review in Moves</a>}
        </section>
        <section className="card wide" aria-label="Activity">
          <h2 className="label">Activity</h2>
          {activity.state === 'na' ? <p className="muted">The activity feed is not available yet.</p> : activity.state === 'loading' ? <Loading rows={2} />
            : items.length ? <Timeline items={items} /> : <p className="muted">No activity linked to this deal.</p>}
        </section>
        <section className="card wide" aria-label="Notes">
          <h2 className="label">Notes</h2>
          <SaveBox account={acct} deal={deal.id} initial="" label="Save note to CRM" source="deal" rows={3} onSaved={notes.reload} />
          {mine.length > 0 && <ul className="stack tight">{mine.map(n => <li key={n.id} className="row between"><span>{n.text}</span><StatusPill s={n.status} /></li>)}</ul>}
        </section>
      </div>
    </>
  )
}

// ---------- Activity ----------
const KINDS: ActivityKind[] = ['email', 'call', 'request', 'ticket', 'signal', 'invoice']
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
export function Timeline({ items }: { items: ActivityItem[] }) {
  const { names } = useData()
  return (
    <ol className="timeline">{items.map(i => (
      <li key={i.id}>
        <span className={`kind k-${i.kind}`}>{cap(i.kind)}</span>
        <div className="grow"><p><b>{i.title}</b></p>{i.summary && <p className="muted">{i.summary}</p>}
          <div className="meta small"><span className="num">{day(i.dated) ?? 'date not on file'}</span><span>{acctLabel(names, i.account)}</span>{i.deal && <span className="mono">{i.deal}</span>}</div>
          <Receipts rs={i.receipts} /></div>
      </li>))}</ol>
  )
}
export function ActivityPage() {
  const { account } = useData()
  const { data, state, reload } = useApi<{ as_of: string; items: ActivityItem[] }>('/api/activity')
  const [kinds, setKinds] = useState<Set<string>>(new Set()); const [deal, setDeal] = useState(''); const [q, setQ] = useState('')
  const head = <PageHead title="Activity" sub={data?.as_of ? `Emails, calls, requests, tickets, signals and invoices. As of ${when(data.as_of)}.` : 'Emails, calls, requests, tickets, signals and invoices.'} />
  if (state === 'loading') return <>{head}<Loading /></>
  if (state === 'na') return <>{head}<NotAvailable what="The activity feed" /></>
  if (state === 'error') return <>{head}<Failed what="activity" retry={reload} /></>
  const all = data?.items ?? []
  const deals = [...new Set(all.map(i => i.deal).filter(Boolean))] as string[]
  const items = all.filter(i => sameAcct(account, i.account) && (!kinds.size || kinds.has(i.kind)) && (!deal || i.deal === deal)
    && (!q || `${i.title} ${i.summary ?? ''}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (b.dated ?? '').localeCompare(a.dated ?? ''))
  return (
    <>
      {head}
      <div className="filters">
        <input type="search" aria-label="Search activity" placeholder="Search activity" value={q} onChange={e => setQ(e.target.value)} />
        <select aria-label="Deal" value={deal} onChange={e => setDeal(e.target.value)}><option value="">All deals</option>{deals.map(d => <option key={d}>{d}</option>)}</select>
        <div className="seg" role="group" aria-label="Kind">{KINDS.map(k => (
          <button key={k} type="button" aria-pressed={kinds.has(k)} onClick={() => setKinds(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })}>{cap(k)}</button>))}</div>
      </div>
      {items.length ? <Timeline items={items} /> : <Empty title="No activity matches">Clear a filter to see more.</Empty>}
    </>
  )
}

// ---------- People ----------
type P = Person & { derived?: boolean }
const dealIds = (p: P) => p.deals.map(d => (typeof d === 'string' ? { id: d } : d))
export function PeoplePage() {
  const { book, account, names } = useData()
  const ppl = useApi<{ as_of: string; people: Person[] }>('/api/people')
  const act = useApi<{ items: ActivityItem[] }>('/api/activity')
  const [side, setSide] = useState(''); const [q, setQ] = useState(''); const [sel, setSel] = useState<P | null>(null)
  const derived = useMemo<P[]>(() => {
    const m = new Map<string, P>()
    for (const [aid, a] of Object.entries(book?.accounts ?? {}))
      for (const d of a.q2?.deals ?? []) for (const [role, c] of Object.entries(d.roles))
        for (const e of c.entries) if (e.who) {
          const k = `${aid}:${e.who}`
          const p = m.get(k) ?? { id: k, account: aid, name: e.who, title: e.title, org: names[aid], side: 'customer' as const, role_tags: [], standing: e.stands, deals: [], receipts: [], derived: true }
          if (!p.role_tags.includes(role)) p.role_tags.push(role)
          p.deals.push({ id: d.deal, title: d.title, role }); p.receipts = [...p.receipts, ...e.receipts]
          m.set(k, p)
        }
    return [...m.values()]
  }, [book, names])
  const head = <PageHead title="People" sub="Stakeholders on both sides, where each stands with you, and the deals they hold a role on." />
  if (ppl.state === 'loading') return <>{head}<Loading /></>
  if (ppl.state === 'error') return <>{head}<Failed what="people" retry={ppl.reload} /></>
  const list: P[] = ppl.state === 'na' ? derived : ppl.data?.people ?? []
  const rows = list.filter(p => sameAcct(account, p.account) && (!side || p.side === side) && (!q || `${p.name} ${p.title ?? ''} ${p.org ?? ''}`.toLowerCase().includes(q.toLowerCase())))
  const last = (p: P) => (act.data?.items ?? []).filter(i => (i.kind === 'email' || i.kind === 'call') && i.receipts.some(r => p.receipts.some(x => x.id === r.id)))
    .sort((a, b) => (b.dated ?? '').localeCompare(a.dated ?? ''))[0]
  return (
    <>
      {head}
      {ppl.state === 'na' && <p className="notice">The full directory is not available yet. Showing the people named in the power map.</p>}
      <div className="filters">
        <input type="search" aria-label="Search people" placeholder="Search people" value={q} onChange={e => setQ(e.target.value)} />
        <select aria-label="Side" value={side} onChange={e => setSide(e.target.value)}><option value="">Both sides</option><option value="customer">Customer</option><option value="flytbase">FlytBase</option></select>
      </div>
      {!rows.length ? <Empty title="No people on file">Nobody matches. Names appear as the CRM provides them.</Empty> : (
        <div className="table-wrap"><table className="grid">
          <thead><tr><th scope="col">Name</th><th scope="col">Side</th><th scope="col">Roles</th><th scope="col">Standing</th><th scope="col">Deals</th><th scope="col">Last contact</th></tr></thead>
          <tbody>{rows.map(p => {
            const l = last(p)
            return (
              <tr key={p.id}>
                <td><button type="button" className="person-btn" onClick={() => setSel(p)}><Avatar name={p.name} /><span><b>{p.name}</b><span className="muted small block">{[p.title, p.org].filter(Boolean).join(', ') || 'title not on file'}</span></span></button></td>
                <td>{p.side === 'flytbase' ? 'FlytBase' : 'Customer'}</td>
                <td>{p.role_tags.length ? p.role_tags.map(r => <span key={r} className="role-tag">{r.replace('_', ' ')}</span>) : <span className="muted">not on file</span>}</td>
                <td>{p.standing && p.standing !== NOT_ON_FILE ? p.standing : <span className="muted">not on file</span>}</td>
                <td className="num">{p.deals.length}</td>
                <td>{l ? <span className="num">{day(l.dated)}</span> : <span className="muted">not on file</span>}</td>
              </tr>)
          })}</tbody></table></div>
      )}
      <Dialog.Root open={!!sel} onOpenChange={o => { if (!o) setSel(null) }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="scrim" />
          <Dialog.Popup className="drawer">
            {sel && <>
              <div className="row between"><Dialog.Title className="drawer-title">{sel.name}</Dialog.Title><Dialog.Close className="icon-btn" aria-label="Close"><Icon n="close" /></Dialog.Close></div>
              <Dialog.Description className="muted">{[sel.title, sel.org].filter(Boolean).join(', ') || 'Title not on file'} · {sel.side === 'flytbase' ? 'FlytBase side' : 'Customer side'} · {acctLabel(names, sel.account)}</Dialog.Description>
              <dl className="dl">
                <dt>Standing with you</dt><dd>{sel.standing && sel.standing !== NOT_ON_FILE ? sel.standing : 'not on file'}</dd>
                <dt>Roles</dt><dd>{sel.role_tags.length ? sel.role_tags.map(r => r.replace('_', ' ')).join(', ') : 'not on file'}</dd>
                <dt>Last contact</dt><dd>{last(sel) ? `${last(sel)!.title}, ${day(last(sel)!.dated)}` : 'not on file'}</dd>
                <dt>Deals</dt><dd>{dealIds(sel).length ? <ul className="stack tight">{dealIds(sel).map((d, i) => <li key={i}><a className="link" href={`#/deals/${sel.account}/${d.id}`} onClick={() => setSel(null)}>{('title' in d && d.title) || d.id}</a>{'role' in d && d.role ? <span className="muted"> · {String(d.role).replace('_', ' ')}</span> : null}</li>)}</ul> : 'none on file'}</dd>
                <dt>Receipts</dt><dd><Receipts rs={uniq(sel.receipts) as Receipt[]} /></dd>
              </dl>
            </>}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

// ---------- Sync ----------
const ago = (s: number) => (s < 90 ? `${s}s` : s < 5400 ? `${Math.round(s / 60)} min` : `${Math.round(s / 3600)} h`)
export function SyncPage({ health, progress, resync, resyncing, resyncError }: { health: Health | null; progress: string | null; resync: () => void; resyncing: boolean; resyncError: string | null }) {
  const { unreachable } = useData()
  if (!health) return <><PageHead title="Sync" /><Loading rows={3} /></>
  const state = unreachable ? 'App unreachable' : health.stale ? 'MCP unreachable' : 'Live'
  return (
    <>
      <PageHead title="Sync" sub="How fresh the data is, per tool. The app polls the CRM one call a minute.">
        <button type="button" className="btn primary" onClick={resync} disabled={resyncing}>{resyncing ? 'Resyncing…' : 'Resync now'}</button>
      </PageHead>
      {resyncError && <p className="err" role="alert">{resyncError}</p>}
      <div className="stats">
        <div className="card"><span className="label">State</span><p className="big">{state}</p></div>
        <div className="card"><span className="label">Last good fetch</span><p className="big num">{when(health.last_good_poll) ?? 'never'}</p></div>
        <div className="card"><span className="label">Queue</span><p className="big num">{health.pending_calls ?? 0}</p><p className="muted small">calls waiting</p></div>
        <div className="card"><span className="label">Changes seen</span><p className="big num">{health.changes ?? 0}</p></div>
      </div>
      {progress && <p className="notice" role="status">{progress}</p>}
      <div className="card"><h2 className="label">Last error</h2>{health.last_error ? <p className="err">{health.last_error.message} <span className="muted small">at {when(health.last_error.at)}</span></p> : <p className="muted">No error recorded.</p>}</div>
      <h2 className="block-h">Per-tool freshness</h2>
      {health.fetched?.length ? (
        <div className="table-wrap"><table className="grid">
          <thead><tr><th scope="col">Tool</th><th scope="col">Arguments</th><th scope="col">Fetched</th><th scope="col">Age</th></tr></thead>
          <tbody>{health.fetched.map((f, i) => (
            <tr key={i}><td className="mono">{f.tool}</td><td className="mono muted">{f.args && JSON.stringify(f.args) !== '{}' ? JSON.stringify(f.args) : 'none'}</td><td className="num">{when(f.fetched_at) ?? 'never'}</td><td className="num">{ago(f.age_s)}</td></tr>))}</tbody>
        </table></div>
      ) : <Empty title="No per-tool ages yet">They appear after the first fetch.</Empty>}
    </>
  )
}
