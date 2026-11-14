import { useMemo, useState } from 'react'
import { postNote, useApi, useData, type Account, type ActivityItem, type BandKey, type Note, type Person } from './api'
import { GapRow, Risk } from './home'
import { toast } from './live'
import { StandMeter } from './viz'
import { StatusPill, Timeline, dealHref } from './pages'
import { Avatar, BandChip, BANDS, Empty, Failed, Loading, NotAvailable, NOT_ON_FILE, PageHead, Receipts, dealValue, dealsOf, money, riskLabel, when } from './ui'
import './accounts.css'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'deals', label: 'Deals' },
  { id: 'people', label: 'People' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'notes', label: 'Notes' },
] as const
type Tab = (typeof TABS)[number]['id']

/** "£310,000 · €20,000" for a band; null when the band has nothing priced. Never summed across currencies or bands. */
const bandTotal = (a: Account, k: Exclude<BandKey, 'unpriced'>) => {
  const e = Object.entries(a.q1?.totals[k]?.by_currency ?? {})
  return e.length ? e.map(([c, n]) => money(n, c) + (c === 'unknown' ? ' (currency not on file)' : '')).join(' · ') : null
}
const redCount = (a: Account) => (a.q4?.items ?? []).filter(i => i.level === 'red').length
const nextMove = (a: Account) => a.q3?.moves?.[0]

// ---------- list ----------
function AccountsList() {
  const { book, names } = useData()
  const rows = Object.entries(book?.accounts ?? {})
  if (!book) return <><PageHead title="Accounts" /><Loading /></>
  if (!rows.length) return <><PageHead title="Accounts" /><Empty title="No accounts yet">They appear here once the first sync lands.</Empty></>
  return (
    <>
      <PageHead title="Accounts" sub="Every account in the book, with what it is worth, what is slipping and what to do first. Bands are never added together." />
      <div className="table-wrap">
        <table className="grid">
          <thead><tr>
            <th scope="col">Account</th><th scope="col">Deals</th><th scope="col">On contract</th><th scope="col">Backed upside</th>
            <th scope="col">Unbacked</th><th scope="col">Going wrong</th><th scope="col">Do first</th><th scope="col">Not known</th>
          </tr></thead>
          <tbody>{rows.map(([id, a]) => {
            const n = dealsOf(book).filter(d => d.acct === id).length
            const m = nextMove(a)
            const red = redCount(a)
            const items = a.q4?.items.length ?? 0
            return (
              <tr key={id}>
                <td><div className="acct-name"><span className="acct-mark" aria-hidden="true">{id}</span>
                  <a className="acct-link" href={`#/accounts/${id}`}>{names[id] ?? id}</a></div></td>
                <td className="num">{n}</td>
                <td>{bandTotal(a, 'on_contract') ?? <span className="muted">none</span>}</td>
                <td>{bandTotal(a, 'backed_upside') ?? <span className="muted">none</span>}</td>
                <td>{bandTotal(a, 'unbacked') ?? <span className="muted">none</span>}</td>
                <td>{items ? <>{red > 0 && <span className="rtag red">{red} red</span>} <span className="muted">{items} {items === 1 ? 'item' : 'items'}</span></> : <span className="muted">none flagged</span>}</td>
                <td>{m ? <>{m.action}<span className="muted small block">{m.owner} · due {m.due}</span></> : <span className="muted">not available yet</span>}</td>
                <td className="num">{a.q5?.gaps.length ?? 0}</td>
              </tr>)
          })}</tbody>
        </table>
      </div>
    </>
  )
}

// ---------- tabs ----------
function Overview({ id, a }: { id: string; a: Account }) {
  const { book } = useData()
  const deals = dealsOf(book).filter(d => d.acct === id)
  const risks = a.q4?.items ?? []
  const moves = (a.q3?.moves ?? []).slice(0, 3)
  const gaps = a.q5?.gaps ?? []
  return (
    <div className="acct-cols">
      <div className="stack">
        <section className="card">
          <h2>Worth</h2>
          <dl className="kv">
            {BANDS.map(b => (
              <div key={b.key} style={{ display: 'contents' }}>
                <dt><BandChip k={b.key} /></dt>
                <dd>{b.key === 'unpriced' ? `${a.q1?.bands.unpriced.length ?? 0} deals, no value` : bandTotal(a, b.key) ?? 'none'}</dd>
              </div>
            ))}
          </dl>
          <p className="muted small">{deals.length} {deals.length === 1 ? 'deal' : 'deals'}. Unbacked and Unpriced are held apart and never added to a total.</p>
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
  const n = dealsOf(book).filter(d => d.acct === id).length
  const red = redCount(a)
  return (
    <>
      <p className="acct-crumb"><a href="#/accounts">Accounts</a> / {names[id] ?? id}</p>
      <div className="acct-head">
        <span className="acct-mark" aria-hidden="true">{id}</span>
        <div><h1>{names[id] ?? id}</h1>
          <p className="muted small">{n} {n === 1 ? 'deal' : 'deals'}{red ? ` · ${red} red` : ''}{asOf ? ` · as of ${when(asOf)}` : ''}</p></div>
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
