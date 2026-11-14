import { useMemo, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { dismissDraft, postNote, useApi, useData, type ActivityItem, type ActivityKind, type Draft, type Health, type Move, type Note, type NoteStatus, type Person, type Receipt } from './api'
import { PowerGrid, GapRow } from './home'
import { toast } from './live'
import { RiskTimeline, StandMeter } from './viz'
import { PowerView } from './power'
import { DIMS, RagChip, RadarPage } from './radar'
import { Avatar, BandChip, CsvButton, ids as rid, BANDS, Empty, Failed, Icon, Loading, NotAvailable, NOT_ON_FILE, PageHead, Receipts, Stat, Tag, WorthInfo, allMoves, countLabel, dealHref, dealKey, dealValue, dealsOf, day, dueIn, riskLabel, todayOf, turns, uniq, when, type Deal } from './ui'
export { dealHref }

const acctLabel = (names: Record<string, string>, id: string) => names[id] ?? id
const sameAcct = (account: string, id: string) => account === 'all' || account === id

// ---------- notes: status + approve/save ----------
export const StatusPill = ({ s }: { s: NoteStatus | 'saving' }) => (
  <span className={`status st-${s}`} role="status">{s === 'saving' ? 'Saving…' : s === 'queued' ? 'Queued' : s === 'saved' ? 'Saved' : 'Failed'}</span>
)
const REASON = 'MCP unreachable: notes cannot be saved until the link is back.'

function SaveBox({ account, deal, initial, kind, label, source, title, draft, onSaved, rows = 6 }: {
  account: string; deal?: string | null; initial: string; kind?: string; label: string; source?: string; title?: string; draft?: string; onSaved?: () => void; rows?: number
}) {
  const { mcpDown, names } = useData()
  const [text, setText] = useState(initial)
  const [phase, setPhase] = useState<NoteStatus | 'saving' | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const blocked = mcpDown ? REASON : !text.trim() ? 'Write the note first.' : null
  const save = async () => {
    setPhase('saving'); setErr(null)
    try { const r = await postNote({ account, deal, text: text.trim(), source, title, draft, kind: kind === 'next_step' || kind === 'risk' || kind === 'task' ? kind : undefined }); setPhase(r.status); onSaved?.(); toast(r.status === 'failed' ? 'Note could not be saved' : 'Note queued for the CRM', r.status === 'failed' ? 'bad' : 'ok') }
    catch (e) { setPhase('failed'); setErr(e instanceof Error ? e.message : 'Save failed'); toast('Note could not be saved', 'bad') }
  }
  return (
    <div className="savebox">
      <label className="label" htmlFor={`n-${label}-${deal ?? account}`}>Note text</label>
      <textarea id={`n-${label}-${deal ?? account}`} rows={rows} value={text} onChange={e => setText(e.target.value)} />
      <p className="muted small mono">{[kind, acctLabel(names, account), deal].filter(Boolean).join(' · ')}</p>
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
  const { book } = useData()
  const deal = dealsOf(book).find(d => d.acct === acct && d.id === m.deal?.id)
  const [open, setOpen] = useState(false)
  return (
    <li className="card move">
      <div className="move-top">
        <span className="rank" aria-label={`Move ${m.rank}`}>{m.rank}</span>
        <div className="grow">
          <p className="move-action">{m.action}</p>
          <div className="meta">
            <span>Owner <b>{m.owner}</b></span>
            <span>Due <b className="num">{m.due}</b>{m.due_basis && <span className="muted"> · {m.due_basis}</span>}</span>
            {m.deal ? <span>Deal <a className="link" href={`#/deals/${acct}/${m.deal.id}`}>{m.deal.title}</a>{deal && dealValue(deal) ? <span className="num"> · {dealValue(deal)}</span> : null}</span> : <span className="muted">No single deal</span>}
            {m.with && m.with !== NOT_ON_FILE && <span>With <b>{m.with}</b></span>}
          </div>
          <p className="why"><span className="label">Why now</span> {m.why_now}</p>
          <div className="row">{m.level && <Tag level={m.level}>{m.level === 'red' ? 'Red' : 'Amber'}</Tag>}{m.turns_bad_on && m.turns_bad_on !== NOT_ON_FILE && <span className="muted small mono">Turns bad on {m.turns_bad_on}</span>}</div>
          <div className="receipt-row"><Receipts rs={m.receipts} /></div>
        </div>
      </div>
      <div className="move-note">
        {!open ? <button type="button" className="btn" aria-expanded={false} onClick={() => setOpen(true)}>Review note</button> : (
          <>
            <h3 className="label">Draft note for the CRM</h3>
            <SaveBox account={acct} deal={m.deal?.id} initial={m.draft_note.text} kind={m.draft_note.kind} title={m.draft_note.title} label="Approve and save to CRM" source="move" onSaved={onSaved} />
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Close review</button>
          </>
        )}
      </div>
    </li>
  )
}

const moveCsv = (book: NonNullable<ReturnType<typeof useData>['book']>, ids: string[], names: Record<string, string>) =>
  ids.flatMap(id => allMoves(book, id)).map(m => ({ account: names[m.acct] ?? m.acct, rank: m.rank, action: m.action, owner: m.owner, due: m.due, deal: m.deal?.id ?? '', why_now: m.why_now, records: rid(m.receipts) }))

function Moves() {
  const { book, account, names } = useData()
  const notes = useApi<{ notes: Note[] }>('/api/notes')
  if (!book) return <Loading />
  const ids = Object.keys(book.accounts).filter(id => sameAcct(account, id))
  return (
    <>
      <div className="row"><CsvButton name="tasks" rows={() => moveCsv(book, ids, names)} /></div>
      {ids.map(id => {
        const moves = allMoves(book, id)
        return (
          <section key={id} className="block" aria-label={acctLabel(names, id)}>
            <h2 className="block-h">{names[id] ?? id}</h2>
            {!book.accounts[id].q3 ? <Empty title="Moves are not computed yet">They appear after the next sync.</Empty>
              : !moves.length ? <Empty title="No moves right now">Not an all-clear: check Risks & gaps.</Empty>
              : <ol className="stack">{moves.map(m => <MoveCard key={m.rank} m={m} acct={id} onSaved={notes.reload} />)}</ol>}
          </section>
        )
      })}
    </>
  )
}

/** Automation: a draft risk note for every red or amber risk. Nothing is written until you approve. */
function Drafts() {
  const { account, names } = useData()
  const { data, state, reload } = useApi<{ drafts: Draft[] }>('/api/drafts')
  const [open, setOpen] = useState<string | null>(null)
  if (state === 'loading') return <Loading />
  if (state === 'na') return <NotAvailable what="Drafts" />
  if (state === 'error') return <Failed what="drafts" retry={reload} />
  const waiting = (data?.drafts ?? []).filter(d => !d.decision && sameAcct(account, d.account))
  if (!waiting.length) return <Empty title="No drafts waiting">Every red or amber risk has been approved or dismissed.</Empty>
  return (
    <ul className="stack">{waiting.map(d => (
      <li key={d.id} className="card note">
        <div className="row between"><span className="muted small">{acctLabel(names, d.account)}{d.deal ? ` · ${d.deal}` : ''}</span><Tag level={d.level}>{d.level === 'red' ? 'Red' : 'Amber'}</Tag></div>
        <p className="note-text"><b>{d.title}</b></p>
        <Receipts rs={d.receipts} />
        {open === d.id ? (
          <SaveBox account={d.account} deal={d.deal} initial={d.text} kind="risk" title={d.title} draft={d.id} label="Approve and save to CRM" source="draft" onSaved={() => { setOpen(null); reload() }} />
        ) : (
          <div className="row">
            <button type="button" className="btn primary" onClick={() => setOpen(d.id)}>Review and approve</button>
            <button type="button" className="btn ghost" onClick={() => dismissDraft(d.id).then(reload).catch(() => toast('Could not dismiss', 'bad'))}>Dismiss</button>
          </div>)}
      </li>))}</ul>
  )
}

function Saved() {
  const { account, names } = useData()
  const { data, state, reload } = useApi<{ notes: Note[] }>('/api/notes', 15_000)
  const [f, setF] = useState<'all' | NoteStatus>('all')
  if (state === 'loading') return <Loading />
  if (state === 'na') return <NotAvailable what="The notes history" />
  if (state === 'error') return <Failed what="notes" retry={reload} />
  const mine = (data?.notes ?? []).filter(n => sameAcct(account, n.account))
  const notes = mine.filter(n => f === 'all' || n.status === f)
  const by = (s: NoteStatus) => mine.filter(n => n.status === s).length
  return (
    <>
      <div className="row"><Stat n={by('saved')} label="saved" /><Stat n={by('queued')} label="queued" tone="amber" /><Stat n={by('failed')} label="failed" tone="red" />
        <select aria-label="Status" value={f} onChange={e => setF(e.target.value as typeof f)}>
          <option value="all">All statuses</option><option value="queued">Queued</option><option value="saved">Saved</option><option value="failed">Failed</option>
        </select>
        <CsvButton name="saved-notes" rows={() => notes.map(n => ({ account: names[n.account] ?? n.account, deal: n.deal ?? '', kind: n.kind ?? '', title: n.title ?? '', status: n.status, created: when(n.created_at) ?? '', text: n.text }))} />
      </div>
      {!notes.length ? <Empty title="No notes yet">Approve a task or a draft, or write a note on a deal.</Empty> : (
        <ul className="stack">{notes.map(n => (
          <li key={n.id} className="card note">
            <div className="row between"><span className="muted small">{acctLabel(names, n.account)}{n.deal ? ` · ${n.deal}` : ''} · created {when(n.created_at) ?? NOT_ON_FILE}</span><StatusPill s={n.status} /></div>
            {n.title && <p className="note-text"><b>{n.title}</b></p>}
            <p className="note-text">{n.text}</p>
            {n.status === 'saved' && <p className="muted small">Saved to CRM {when(n.saved_at) ?? ''}</p>}
            {n.status === 'failed' && <p className="err small">{n.error ?? 'No reason recorded.'}</p>}
          </li>))}</ul>
      )}
    </>
  )
}

const TASK_TABS = [{ id: 'moves', label: 'To do' }, { id: 'drafts', label: 'Drafts waiting' }, { id: 'saved', label: 'Saved to CRM' }] as const
export function TasksPage({ tab }: { tab?: string }) {
  const { book, account, unreachable } = useData()
  const t = TASK_TABS.some(x => x.id === tab) ? (tab as (typeof TASK_TABS)[number]['id']) : 'moves'
  const drafts = useApi<{ drafts: Draft[] }>('/api/drafts')
  if (!book) return unreachable ? <Failed what="tasks" /> : <><PageHead title="Tasks" /><Loading /></>
  const mv = Object.keys(book.accounts).filter(id => sameAcct(account, id)).flatMap(id => allMoves(book, id)), due = dueIn(mv, todayOf(book))
  const nd = (drafts.data?.drafts ?? []).filter(d => !d.decision && sameAcct(account, d.account)).length
  return (
    <>
      <PageHead title="Tasks" sub={<><Stat n={mv.length} label={mv.length === 1 ? 'task' : 'tasks'} /><Stat n={due.week} label="due this week" /><Stat n={due.late} label="late" tone="red" /></>} />
      <nav className="tabs" aria-label="Task sections">
        {TASK_TABS.map(x => <a key={x.id} href={`#/tasks${x.id === 'moves' ? '' : `/${x.id}`}`} aria-current={t === x.id ? 'page' : undefined}>{x.label}{x.id === 'drafts' && nd > 0 && <span className="count">{nd}</span>}</a>)}
      </nav>
      {t === 'moves' && <Moves />}{t === 'drafts' && <Drafts />}{t === 'saved' && <Saved />}
    </>
  )
}

/** Risks & gaps: the radar, then what turns bad and when (q4), then what is not known and who could fill it (q5). */
export function RisksPage() {
  const { book, account, names } = useData()
  const accs = Object.entries(book?.accounts ?? {}).filter(([id]) => sameAcct(account, id))
  const risks = accs.flatMap(([id, a]) => (a.q4?.items ?? []).map(r => ({ ...r, acct: id })))
    .sort((x, y) => ((x.level === 'red' ? 0 : x.level === 'amber' ? 1 : 2) - (y.level === 'red' ? 0 : y.level === 'amber' ? 1 : 2)) || (x.turns_bad_on ?? '').localeCompare(y.turns_bad_on ?? ''))
  const gaps = accs.flatMap(([id, a]) => (a.q5?.gaps ?? []).map(g => ({ ...g, acct: id }))).sort((x, y) => (y.value_at_stake ?? -1) - (x.value_at_stake ?? -1))
  return (
    <>
      <RadarPage />
      {book && (
        <>
          <div className="row between"><h2 className="block-h">What turns bad, and when</h2>
            <CsvButton name="risks" rows={() => risks.map(r => ({ account: names[r.acct] ?? r.acct, level: r.level ?? '', risk: r.text, turns_bad_on: r.turns_bad_on, deal: r.deal ?? '', records: rid(r.receipts) }))} /></div>
          {risks.length ? <ol className="risk-list">{risks.map((r, i) => <li key={i} className="slip"><span className={`slip-k ${r.level ?? ''}`}>{r.level === 'red' ? 'Red' : r.level === 'amber' ? 'Amber' : 'Watch'}</span>
            <div><p>{r.text}</p><div className={`slip-when${r.turns_bad_on !== NOT_ON_FILE ? ' bad' : ''}`}>{names[r.acct] ?? r.acct} · {turns(r)}</div></div><Receipts rs={r.receipts} /></li>)}</ol>
            : <Empty title="Nothing flagged">Not an all-clear: see what is not known below.</Empty>}
          <div className="row between"><h2 className="block-h">What is not known</h2>
            <CsvButton name="gaps" rows={() => gaps.map(g => ({ account: names[g.acct] ?? g.acct, gap: g.text, who_could_fill: g.who_could_fill, value_at_stake: g.value_at_stake ?? '', records: rid(g.receipts) }))} /></div>
          {gaps.length ? <div className="stack">{gaps.map((g, i) => <GapRow key={i} g={g} />)}</div> : <Empty title="No gaps recorded" />}
        </>)}
    </>
  )
}

// ---------- Deals ----------
const KindTag = ({ k }: { k: Deal['kind'] }) => (k === 'deal' ? null : <span className="kind-tag">{k === 'offer' ? 'Offer' : 'Told only'}</span>)
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
  const [view, setView] = useState<'table' | 'board'>('board')
  const [group, setGroup] = useState<'band' | 'stage'>('band')
  const [band, setBand] = useState(''); const [stage, setStage] = useState(''); const [risk, setRisk] = useState(''); const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'risk', dir: -1 })
  if (!book) return unreachable ? <Failed what="deals" /> : <><PageHead title="Pipeline" /><Loading /></>
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
  const scoped = all.filter(d => sameAcct(account, d.acct))
  const cols = group === 'band' ? BANDS.map(b => ({ key: b.key as string, label: b.label })) : [...stages, '-'].map(s => ({ key: s, label: s === '-' ? 'No stage on file' : s }))
  return (
    <>
      <PageHead title="Pipeline" info={<WorthInfo />} sub={`${countLabel(scoped.map(d => d.kind))}${rows.length < scoped.length ? ` · ${rows.length} shown` : ''}`}>
        <CsvButton name="pipeline" rows={() => rows.map(d => ({ account: acctLabel(names, d.acct), deal: d.title, id: d.id ?? '', band: d.band, stage: d.stage ?? '', value: d.value ?? '', currency: d.currency ?? '', renewal: d.term_ends ?? '', risk: d.risk ?? '', records: rid(d.receipts) }))} />
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
                <td><a className="link strong" href={dealHref(d)}>{d.title}</a><KindTag k={d.kind} /><div className="mono muted">{d.id ?? 'no id on file'}</div></td>
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
                  <strong>{d.title}<KindTag k={d.kind} /></strong>
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
  const back = <a className="link back" href="#/deals"><Icon n="back" size={16} />Pipeline</a>
  if (!deal) return <>{back}<Empty title="Deal not found">No deal with id {k} on account {acct.toUpperCase()} in the current book.</Empty></>
  const a = book.accounts[acct]
  const power = a.q2?.deals?.find(p => p.deal === deal.id)
  const pw = a.power?.deals.find(p => dealKey(p.deal) === deal.key)
  const rd = a.radar?.deals.find(r => dealKey(r.deal) === deal.key)
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
          {rd && <div className="rag-row">{DIMS.map(dim => <div key={dim.k}><span className="label">{dim.label}</span><RagChip c={rd[dim.k]} dim={dim} /></div>)}</div>}
          {a.q4 && deal.risks.length > 0 && <RiskTimeline q4={a.q4} deal={deal.id} />}
          {!deal.risks.length ? <p className="muted">None flagged · not an all-clear</p> : (
            <ul className="stack tight">{deal.risks.map((r, i) => (
              <li key={i}><Tag level={r.level}>{r.level === 'red' ? 'Red' : r.level === 'amber' ? 'Amber' : 'Watch'}</Tag> {r.text}
                <div className={`muted small${r.turns_bad_on && r.turns_bad_on !== NOT_ON_FILE ? ' bad' : ''}`}>{turns(r)}</div><Receipts rs={r.receipts} /></li>))}</ul>
          )}
        </section>
        <section className="card wide" aria-label="Power">
          <h2 className="label">Who holds the power</h2>
          {pw ? <PowerView acct={acct} pd={pw} all={a.power!.deals} /> : power ? <PowerGrid p={power} /> : <p className="muted">not on file</p>}
        </section>
        <section className="card" aria-label="Unknowns">
          <h2 className="label">Not known</h2>
          {gaps.length ? gaps.map((g, i) => <GapRow key={i} g={g} />) : <p className="muted">None recorded</p>}
        </section>
        <section className="card" aria-label="Moves">
          <h2 className="label">Moves</h2>
          {moves.length ? <ul className="stack tight">{moves.map(m => <li key={m.rank}><b>{m.rank}.</b> {m.action}<div className="muted small">{m.owner} · due {m.due}</div></li>)}</ul>
            : <p className="muted">None</p>}
          {moves.length > 0 && <a className="link" href="#/tasks">Review in Tasks</a>}
        </section>
        <section className="card wide" aria-label="Activity">
          <h2 className="label">Activity</h2>
          {activity.state === 'na' ? <p className="muted">The activity feed is not available yet.</p> : activity.state === 'loading' ? <Loading rows={2} />
            : items.length ? <Timeline items={items} /> : <p className="muted">None linked</p>}
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
  const head = <PageHead title="Activity" sub={data ? `${data.items.length} items${data.as_of ? ` · as of ${when(data.as_of)}` : ''}` : undefined} />
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
        <CsvButton name="activity" rows={() => items.map(i => ({ account: i.account, date: i.dated ?? '', kind: i.kind, title: i.title, summary: i.summary ?? '', deal: i.deal ?? '', records: rid(i.receipts) }))} />
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
  if (ppl.state === 'loading') return <><PageHead title="People" /><Loading /></>
  if (ppl.state === 'error') return <><PageHead title="People" /><Failed what="people" retry={ppl.reload} /></>
  const list: P[] = ppl.state === 'na' ? derived : ppl.data?.people ?? []
  const rows = list.filter(p => sameAcct(account, p.account) && (!side || p.side === side) && (!q || `${p.name} ${p.title ?? ''} ${p.org ?? ''}`.toLowerCase().includes(q.toLowerCase())))
  const n = (s: string) => rows.filter(p => p.side === s).length
  const head = <PageHead title="People" sub={<><Stat n={n('customer')} label="customer" /><Stat n={n('flytbase')} label="FlytBase" /></>}>
    <CsvButton name="people" rows={() => rows.map(p => ({ account: names[p.account] ?? p.account, name: p.name, title: p.title ?? '', side: p.side, roles: p.role_tags.join('; '), standing: p.standing ?? '', last_contact: p.last_contact?.date ?? '', sign_ins_90_days: p.sign_ins_90 ?? '', records: rid(p.receipts) }))} /></PageHead>
  const last = (p: P) => (act.data?.items ?? []).filter(i => (i.kind === 'email' || i.kind === 'call') && i.receipts.some(r => p.receipts.some(x => x.id === r.id)))
    .sort((a, b) => (b.dated ?? '').localeCompare(a.dated ?? ''))[0]
  return (
    <>
      {head}
      {ppl.state === 'na' && <p className="notice">Full directory is not available yet · showing names from the power data</p>}
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
                <td><StandMeter stands={p.standing === NOT_ON_FILE ? null : p.standing} /></td>
                <td className="num">{p.deals.length}</td>
                <td>{p.last_contact ? <span className="num">{day(p.last_contact.date)} · {p.last_contact.days} d ago</span> : l ? <span className="num">{day(l.dated)}</span> : <span className="muted">not on file</span>}</td>
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
                <dt>Last contact</dt><dd>{sel.last_contact ? `${day(sel.last_contact.date)} (${sel.last_contact.days} days ago)` : last(sel) ? `${last(sel)!.title}, ${day(last(sel)!.dated)}` : 'not on file'}</dd>
                <dt>Sign-ins, last 90 days</dt><dd>{sel.sign_ins_90 != null ? `${sel.sign_ins_90}${sel.last_sign_in ? ` (last ${sel.last_sign_in})` : ''}` : 'not on file'}</dd>
                {!!sel.signals?.length && <><dt>New since handover</dt><dd>{sel.signals.map(g => g.title ?? g.id).join('; ')}</dd></>}
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
      <PageHead title="Sync" sub="1 MCP call a minute">
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
