import { useMemo, useState } from 'react'
import { postNote, useApi, useData, type Account, type ActivityItem, type BandKey, type Note, type Person } from './api'
import { GapRow, Risk } from './home'
import { toast } from './live'
import { StandMeter, WorthBars } from './viz'
import { RiskTiles } from './radar'
import { StatusPill, Timeline } from './pages'
import { Avatar, BandChip, Empty, Failed, Loading, NotAvailable, NOT_ON_FILE, PageHead, Receipts, Stat, WorthInfo, countLabel, dealHref, dealValue, dealsOf, dueIn, riskLabel, when } from './ui'
import './accounts.css'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'deals', label: 'Deals' },
  { id: 'people', label: 'People' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'notes', label: 'Notes' },
] as const
type Tab = (typeof TABS)[number]['id']

const level = (a: Account, l: 'red' | 'amber') => (a.q4 ? a.q4.items.filter(i => i.level === l).length : null)
const today = (a: Account) => a.q4?.today ?? new Date().toISOString().slice(0, 10)

// ---------- list: one small dashboard per account ----------
function AccountsList() {
  const { book, names } = useData()
  const rows = Object.entries(book?.accounts ?? {})
  if (!book) return <><PageHead title="Accounts" /><Loading /></>
  if (!rows.length) return <><PageHead title="Accounts" /><Empty title="No accounts yet">They appear here once the first sync lands.</Empty></>
  return (
    <>
      <PageHead title="Accounts" info={<WorthInfo />} />
      <div className="acct-grid">{rows.map(([id, a]) => {
        const m = a.q3?.moves?.[0]
        const due = a.q3 ? dueIn(a.q3.moves, today(a)).week : null
        return (
          <section key={id} className="card acct-card" aria-label={names[id] ?? id}>
            <div><a className="acct-link" href={`#/accounts/${id}`}>{names[id] ?? id}</a>
              <span className="muted small block">{countLabel(dealsOf(book).filter(d => d.acct === id).map(d => d.kind))}</span></div>
            <WorthBars a={a} />
            <div className="stats-row">
              <Stat n={level(a, 'red')} label="red" tone="red" /><Stat n={level(a, 'amber')} label="amber" tone="amber" />
              <Stat n={due} label="due this week" /><Stat n={a.q5 ? a.q5.gaps.length : null} label="not known" />
            </div>
            {m && <p className="small next"><span className="label">Next</span> <b>{m.action}</b> <span className="muted">· {m.owner} · {m.due}</span></p>}
          </section>)
      })}</div>
    </>
  )
}

// ---------- tabs ----------
function Overview({ id, a }: { id: string; a: Account }) {
  const risks = a.q4?.items ?? []
  const moves = (a.q3?.moves ?? []).slice(0, 3)
  const gaps = a.q5?.gaps ?? []
  return (
    <div className="acct-cols">
      <div className="stack">
        <section className="card">
          <h2>Worth</h2>
          <WorthBars a={a} />
        </section>
        <section className="card">
          <h2>Do first</h2>
          {!a.q3 ? <p className="muted">Ranked moves are not available yet.</p> : !moves.length ? <p className="muted">No moves on file for this account.</p> : moves.map(m => (
            <div key={m.rank} className="mini-move">
              <span className="n" aria-label={`Move ${m.rank}`}>{m.rank}</span>
              <div>
                <p><b>{m.action}</b></p>
                <div className="meta"><span>Owner <b>{m.owner}</b></span><span>Due <b className="num">{m.due}</b></span>
                  {m.deal ? <span>Deal <a className="link" href={dealHref({ acct: id, key: m.deal.id })}>{m.deal.title}</a></span> : <span>No single deal</span>}</div>
                <Receipts rs={m.receipts} />
              </div>
            </div>))}
        </section>
      </div>
      <div className="stack">
        <section className="card">
          <h2>Going wrong</h2>
          {a.radar && <RiskTiles radar={a.radar} compact />}
          {risks.length ? <ol className="risk-list">{risks.slice(0, 4).map((r, i) => <Risk key={i} r={r} />)}</ol> : <p className="muted">Nothing flagged.{a.q4?.gaps.length ? ` Not checked: ${a.q4.gaps.join('; ')}.` : ''}</p>}
        </section>
        <section className="card">
          <h2>Not known yet</h2>
          {gaps.length ? gaps.slice(0, 4).map((g, i) => <GapRow key={i} g={g} />) : <p className="muted">{a.q5 ? 'No gaps recorded.' : 'Not available yet.'}</p>}
        </section>
      </div>
    </div>
  )
}

function Deals({ id }: { id: string }) {
  const { book } = useData()
  const rows = dealsOf(book).filter(d => d.acct === id)
  if (!rows.length) return <Empty title="No deals on file">Deals appear here as the CRM provides them.</Empty>
  return (
    <div className="table-wrap">
      <table className="grid">
        <thead><tr><th scope="col">Deal</th><th scope="col">Band</th><th scope="col">Value</th><th scope="col">Stage</th><th scope="col">Term ends</th><th scope="col">Risk</th></tr></thead>
        <tbody>{rows.map(d => (
          <tr key={d.key}>
            <td><a className="acct-link" href={dealHref(d)}>{d.title}</a></td>
            <td><BandChip k={d.band} /></td>
            <td className="num">{dealValue(d) ?? <span className="muted">no value</span>}</td>
            <td>{d.stage ?? <span className="muted">not on file</span>}</td>
            <td className="num">{d.term_ends ?? <span className="muted">not on file</span>}</td>
            <td>{d.risk ? <span className={`rtag ${d.risk}`}>{riskLabel(d.risk)}</span> : <span className="muted">none flagged</span>}</td>
          </tr>))}</tbody>
      </table>
    </div>
  )
}

function People({ id }: { id: string }) {
  const { data, state, reload } = useApi<{ people: Person[] }>('/api/people')
  if (state === 'loading') return <Loading />
  if (state === 'na') return <NotAvailable what="The people directory" />
  if (state === 'error') return <Failed what="people" retry={reload} />
  const rows = (data?.people ?? []).filter(p => p.account === id)
  if (!rows.length) return <Empty title="No people on file">Names appear as the CRM provides them.</Empty>
  return (
    <div className="card">
      {rows.map(p => (
        <div key={p.id} className="person-row">
          <Avatar name={p.name} />
          <div>
            <b>{p.name}</b>
            <span className="muted small block">{[p.title, p.side === 'flytbase' ? 'FlytBase' : 'Customer'].filter(Boolean).join(' · ')}</span>
            <span className="muted small block">{p.role_tags.length ? p.role_tags.map(r => r.replace('_', ' ')).join(', ') : 'roles not on file'} · {p.deals.length} {p.deals.length === 1 ? 'deal' : 'deals'}</span>
          </div>
          <StandMeter stands={p.standing === NOT_ON_FILE ? null : p.standing} />
        </div>))}
    </div>
  )
}

function TimelineTab({ id }: { id: string }) {
  const { data, state, reload } = useApi<{ items: ActivityItem[] }>('/api/activity')
  if (state === 'loading') return <Loading />
  if (state === 'na') return <NotAvailable what="The activity feed" />
  if (state === 'error') return <Failed what="activity" retry={reload} />
  const items = (data?.items ?? []).filter(i => i.account === id).sort((a, b) => (b.dated ?? '').localeCompare(a.dated ?? ''))
  return items.length ? <div className="card"><Timeline items={items} /></div> : <Empty title="No activity on file">Emails, calls, tickets and signals appear here.</Empty>
}

function NotesTab({ id }: { id: string }) {
  const { mcpDown } = useData()
  const { data, state, reload } = useApi<{ notes: Note[] }>('/api/notes', 15_000)
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<'saving' | 'queued' | 'failed' | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const blocked = mcpDown ? 'MCP unreachable: notes cannot be saved until the link is back.' : !text.trim() ? 'Write the note first.' : null
  const save = async () => {
    setPhase('saving'); setErr(null)
    try { const r = await postNote({ account: id, text: text.trim(), source: 'account page' }); setPhase(r.status === 'failed' ? 'failed' : 'queued'); setText(''); reload(); toast(r.status === 'failed' ? 'Note could not be saved' : 'Note queued for the CRM', r.status === 'failed' ? 'bad' : 'ok') }
    catch (e) { setPhase('failed'); setErr(e instanceof Error ? e.message : 'Save failed'); toast('Note could not be saved', 'bad') }
  }
  const notes = useMemo(() => (data?.notes ?? []).filter(n => n.account === id), [data, id])
  return (
    <div className="stack">
      <section className="card composer">
        <h2>Add a note</h2>
        <label className="label" htmlFor={`acct-note-${id}`}>Note text</label>
        <textarea id={`acct-note-${id}`} rows={4} value={text} onChange={e => setText(e.target.value)} />
        <p className="muted small">Saved to the CRM for account {id}. Nothing is written until you press the button.</p>
        <div className="row">
          <button type="button" className="btn primary" disabled={!!blocked || phase === 'saving'} onClick={save}>Approve and save</button>
          {phase && <StatusPill s={phase} />}
          {err && <span className="err" role="alert">{err}</span>}
        </div>
        {blocked && <p className="muted small">{blocked}</p>}
      </section>
      {state === 'loading' ? <Loading rows={2} /> : state === 'na' ? <NotAvailable what="The notes history" /> : state === 'error' ? <Failed what="notes" retry={reload} />
        : !notes.length ? <Empty title="No notes yet">Notes you save for this account are listed here with their status.</Empty>
        : <ul className="stack">{notes.map(n => (
          <li key={n.id} className="card note">
            <div className="row between"><span className="muted small">Created {when(n.created_at) ?? NOT_ON_FILE}{n.deal ? ` · ${n.deal}` : ''}</span><StatusPill s={n.status} /></div>
            <p className="note-text">{n.text}</p>
            {n.status === 'saved' && <p className="muted small">Saved to CRM {when(n.saved_at) ?? ''}</p>}
            {n.status === 'failed' && <p className="err small">{n.error ?? 'No reason recorded.'}</p>}
          </li>))}</ul>}
    </div>
  )
}

// ---------- page ----------
function AccountPage({ id, tab }: { id: string; tab: Tab }) {
  const { book, names, asOf } = useData()
  if (!book) return <Loading />
  const a = book.accounts[id]
  if (!a) return <><PageHead title="Account not found" /><Empty title={`No account "${id}"`}><a className="link" href="#/accounts">Back to Accounts</a></Empty></>
  const ds = dealsOf(book).filter(d => d.acct === id)
  const n = ds.length
  const red = level(a, 'red')
  return (
    <>
      <p className="acct-crumb"><a href="#/accounts">Accounts</a> / {names[id] ?? id}</p>
      <div className="acct-head">
        <div><h1>{names[id] ?? id}</h1>
          <p className="muted small">{countLabel(ds.map(d => d.kind))}{red ? ` · ${red} red` : ''}{asOf ? ` · as of ${when(asOf)}` : ''}</p></div>
      </div>
      <nav className="tabs" aria-label="Account sections">
        {TABS.map(t => <a key={t.id} href={`#/accounts/${id}${t.id === 'overview' ? '' : `/${t.id}`}`} aria-current={tab === t.id ? 'page' : undefined}>
          {t.label}{t.id === 'deals' && <span className="count">{n}</span>}</a>)}
      </nav>
      {tab === 'overview' && <Overview id={id} a={a} />}
      {tab === 'deals' && <Deals id={id} />}
      {tab === 'people' && <People id={id} />}
      {tab === 'timeline' && <TimelineTab id={id} />}
      {tab === 'notes' && <NotesTab id={id} />}
    </>
  )
}

/** `route` is the hash split on "/": ['accounts'] | ['accounts', id] | ['accounts', id, tab]. A bare [id, tab?] also works. */
export function AccountsPage({ route = [] }: { route?: string[] }) {
  const parts = route[0] === 'accounts' ? route.slice(1) : route
  const [id, t] = parts
  if (!id) return <AccountsList />
  return <AccountPage id={id} tab={TABS.some(x => x.id === t) ? (t as Tab) : 'overview'} />
}
