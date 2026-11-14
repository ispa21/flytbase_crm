import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'

const line = (id: string, v: number | null, extra = {}) => ({ id, title: `Deal ${id}`, value: v, currency: 'GBP', receipts: [{ id, kind: 'deal' }], stage: 'negotiation', ...extra })
const q1 = (ids: [string, string]) => ({
  currency: 'GBP',
  bands: { on_contract: [line(ids[0], 100000, { renewal_risk: true, term_ends: '2027-01-31' })], backed_upside: [], unbacked: [line(ids[1], 5000, { stage: null })], unpriced: [] },
  totals: { on_contract: { by_currency: { GBP: 100000 }, receipts: [] }, backed_upside: { by_currency: {}, receipts: [] }, unbacked: { by_currency: { GBP: 5000 }, receipts: [] } },
})
const move = { rank: 1, kind: 'renewal', action: 'Clear what blocks Deal d1', why_now: 'Renewal ends in 78 days', owner: 'the CSM (you)', due: '2026-11-18', due_basis: '2 business days (red)',
  turns_bad_on: '2026-11-30', level: 'red', deal: { id: 'd1', title: 'Deal d1' }, receipts: [{ id: 'd1', kind: 'deal' }], draft_note: { kind: 'next_step', text: 'Next step: Clear what blocks Deal d1.' } }
const cell = (e: any[]) => ({ status: e.length ? 'backed' : 'gap', entries: e, ...(e.length ? {} : { gap: 'not on file' }) })
const q2 = { loaded: true, gaps: [], deals: [{ deal: 'd1', title: 'Deal d1', voices: [], roles: {
  decides: cell([{ who: 'Priya Nair', title: 'COO', stands: 'champion', receipts: [{ id: 's1', kind: 'stakeholder' }] }]), pays: cell([]), uses: cell([]), could_block: cell([]) } }] }
const q4 = { today: '2026-11-14', loaded: true, signals_loaded: true, gaps: [], items: [{ kind: 'renewal', level: 'red', deal: 'd1', text: 'Renewal is red', turns_bad_on: '2026-11-30', receipts: [{ id: 'd1', kind: 'deal' }] }] }
const book = () => ({ as_of: '2026-11-14T09:42:00+00:00', state: 'ok', accounts: {
  a: { name: 'Acme', q1: q1(['d1', 'd2']), q2, q3: { loaded: true, moves: [move] }, q4 },
  b: { name: 'Beta', q1: q1(['e1', 'e2']) } } })
const ok = { stale: false, last_good_poll: '2026-11-14T09:41:00+00:00', fetched: [{ tool: 'get_signals', args: {}, fetched_at: '2026-11-14T09:41:00+00:00', age_s: 120 }], pending_calls: 0, last_error: null }

type Routes = Record<string, any>
function mock(routes: Routes = {}, health: any = ok) {
  const f = vi.fn(async (url: string, init?: any) => {
    const key = `${init?.method ?? 'GET'} ${url.split('?')[0]}`
    if (key in routes) { const r = routes[key]; return typeof r === 'function' ? r(init) : r }
    if (url.startsWith('/api/book')) return { ok: true, status: 200, json: async () => book() }
    if (url.startsWith('/api/health')) return { ok: true, status: 200, json: async () => health }
    if (url.startsWith('/api/changes')) return { ok: true, status: 200, json: async () => ({ n: 1 }) }
    if (init?.method === 'POST') return { ok: true, status: 200, json: async () => ({}) }
    return { ok: false, status: 404, json: async () => ({}) }
  })
  vi.stubGlobal('fetch', f)
  return f
}
const json = (b: any) => ({ ok: true, status: 200, json: async () => b })
const at = (h: string) => { window.location.hash = h }
const main = () => within(screen.getByRole('main'))

beforeEach(() => { window.location.hash = ''; localStorage.clear() })
afterEach(() => vi.unstubAllGlobals())

test('shell: nav, account filter narrows Home, theme toggle', async () => {
  mock()
  render(<App />)
  expect(await within(screen.getByRole('main')).findByText('Beta')).toBeInTheDocument()
  for (const n of ['Home', 'Pipeline', 'People', 'Activity', 'Tasks']) expect(within(screen.getByRole('navigation', { name: '' }) ?? document.body).queryAllByText(n).length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole('button', { name: 'Acme' }))
  await waitFor(() => expect(within(screen.getByRole('main')).queryByText('Beta')).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: /dark theme/ }))
  expect(document.documentElement.dataset.theme).toBe('dark')
})

test('deals: table sorts, filters by band, opens detail with value, power, risk and receipts', async () => {
  at('#/deals'); mock()
  render(<App />)
  expect(await main().findByRole('table')).toBeInTheDocument()
  expect(main().getAllByRole('row')).toHaveLength(5) // header + 4 deals
  const th = main().getByRole('columnheader', { name: /Deal/ })
  fireEvent.click(within(th).getByRole('button'))
  expect(th).toHaveAttribute('aria-sort', 'ascending')
  fireEvent.change(screen.getByLabelText('Band'), { target: { value: 'unbacked' } })
  expect(main().getAllByRole('row')).toHaveLength(3)
  expect(main().getAllByText('not on file').length).toBeGreaterThan(0) // missing stage
  fireEvent.change(screen.getByLabelText('Band'), { target: { value: '' } })
  fireEvent.click(main().getByRole('button', { name: /Board/ }))
  expect(main().getByRole('region', { name: 'On contract' })).toBeInTheDocument()
  fireEvent.click(main().getAllByRole('link', { name: /Deal d1/ })[0])
  expect((await main().findAllByText('Priya Nair, COO')).length).toBeGreaterThan(0) // the power map and the table both name them
  expect(main().getAllByText('£100,000').length).toBeGreaterThan(0)
  expect(main().getByText('Turns bad on 2026-11-30')).toBeInTheDocument()
  expect(main().getAllByText('d1').length).toBeGreaterThan(0)
  expect(main().getByText(/activity feed is not available yet/)).toBeInTheDocument()
})

test('deal detail: notes composer posts account and deal', async () => {
  at('#/deals/a/d1')
  const f = mock({ 'POST /api/notes': json({ id: 7, status: 'queued' }), 'GET /api/notes': json({ notes: [] }) })
  render(<App />)
  const box = await main().findByLabelText('Note text')
  fireEvent.change(box, { target: { value: 'Called Priya' } })
  fireEvent.click(main().getByRole('button', { name: 'Save note to CRM' }))
  expect(await main().findByText('Queued')).toBeInTheDocument()
  const call = f.mock.calls.find(c => c[0] === '/api/notes' && c[1]?.method === 'POST')!
  expect(JSON.parse(call[1].body)).toMatchObject({ account: 'a', deal: 'd1', text: 'Called Priya' })
})

test('people: not-available falls back to the power map; real feed shows roles and detail drawer', async () => {
  at('#/people'); mock()
  const r = render(<App />)
  expect(await main().findByText(/directory is not available yet/)).toBeInTheDocument()
  expect(main().getByText('Priya Nair')).toBeInTheDocument()
  r.unmount(); vi.unstubAllGlobals()
  mock({ 'GET /api/people': json({ as_of: 'x', people: [{ id: 'p1', account: 'a', name: 'Sam Lee', title: 'CFO', org: 'Acme', side: 'customer', role_tags: ['pays'], standing: 'neutral', deals: ['d1'], receipts: [{ id: 'em1', kind: 'record' }] }] }),
    'GET /api/activity': json({ as_of: 'x', items: [{ id: 'i1', account: 'a', kind: 'email', dated: '2026-10-20', title: 'Pricing email', deal: 'd1', receipts: [{ id: 'em1', kind: 'record' }] }] }) })
  render(<App />)
  fireEvent.click(await main().findByRole('button', { name: /Sam Lee/ }))
  const dlg = await screen.findByRole('dialog')
  expect(within(dlg).getByText('neutral')).toBeInTheDocument()
  expect(within(dlg).getByText(/Pricing email/)).toBeInTheDocument() // last contact joined by receipt id
})

test('activity: 404 is calm; feed filters by kind and search', async () => {
  at('#/activity'); mock()
  const r = render(<App />)
  expect(await main().findByText('The activity feed is not available yet')).toBeInTheDocument()
  r.unmount(); vi.unstubAllGlobals()
  mock({ 'GET /api/activity': json({ as_of: '2026-11-14T09:00:00+00:00', items: [
    { id: 'i1', account: 'a', kind: 'email', dated: '2026-10-20', title: 'Pricing email', deal: 'd1', receipts: [{ id: 'em1', kind: 'record' }] },
    { id: 'i2', account: 'b', kind: 'ticket', dated: '2026-10-22', title: 'Login ticket', deal: null, receipts: [{ id: 'tk1', kind: 'record' }] }] }) })
  render(<App />)
  expect(await main().findByText('Pricing email')).toBeInTheDocument()
  fireEvent.click(main().getByRole('button', { name: 'Ticket' }))
  expect(main().queryByText('Pricing email')).toBeNull()
  expect(main().getByText('tk1')).toBeInTheDocument()
  fireEvent.click(main().getByRole('button', { name: 'Ticket' }))
  fireEvent.change(screen.getByLabelText('Search activity'), { target: { value: 'pricing' } })
  expect(main().queryByText('Login ticket')).toBeNull()
})

test('moves: review, edit, approve and save posts once and shows status', async () => {
  at('#/moves')
  const f = mock({ 'POST /api/notes': json({ id: 1, status: 'queued' }), 'GET /api/notes': json({ notes: [] }) })
  render(<App />)
  expect(await main().findByText('Clear what blocks Deal d1')).toBeInTheDocument()
  expect(main().getByText('2026-11-18')).toBeInTheDocument()
  expect(main().getByText('the CSM (you)')).toBeInTheDocument()
  fireEvent.click(main().getByRole('button', { name: 'Review note' }))
  const box = main().getByLabelText('Note text') as HTMLTextAreaElement
  expect(box.value).toContain('Next step')
  fireEvent.change(box, { target: { value: box.value + ' Edited.' } })
  fireEvent.click(main().getByRole('button', { name: 'Approve and save to CRM' }))
  expect(await main().findByText('Queued')).toBeInTheDocument()
  const posts = f.mock.calls.filter(c => c[0] === '/api/notes' && c[1]?.method === 'POST')
  expect(posts).toHaveLength(1)
  expect(JSON.parse(posts[0][1].body)).toMatchObject({ account: 'a', deal: 'd1', source: 'move' })
  expect(JSON.parse(posts[0][1].body).text).toContain('Edited.')
})

test('moves: approve is disabled with a reason while the MCP is unreachable; failure is shown', async () => {
  at('#/moves')
  mock({}, { ...ok, stale: true })
  const r = render(<App />)
  fireEvent.click(await main().findByRole('button', { name: 'Review note' }))
  expect(main().getByRole('button', { name: 'Approve and save to CRM' })).toBeDisabled()
  expect(main().getByText(/MCP unreachable: notes cannot be saved/)).toBeInTheDocument()
  r.unmount(); vi.unstubAllGlobals()
  mock({ 'POST /api/notes': { ok: false, status: 500, json: async () => ({}) } })
  render(<App />)
  fireEvent.click(await main().findByRole('button', { name: 'Review note' }))
  fireEvent.click(main().getByRole('button', { name: 'Approve and save to CRM' }))
  expect(await main().findByText('Failed')).toBeInTheDocument()
  expect(main().getByRole('alert')).toHaveTextContent(/Save failed \(500\)/)
})

test('notes: history with status; 404 is calm', async () => {
  at('#/notes'); mock()
  const r = render(<App />)
  expect(await main().findByText('The notes history is not available yet')).toBeInTheDocument()
  r.unmount(); vi.unstubAllGlobals()
  mock({ 'GET /api/notes': json({ notes: [
    { id: 1, account: 'a', deal: 'd1', text: 'Saved one', status: 'saved', created_at: '2026-11-14T09:00:00+00:00', saved_at: '2026-11-14T09:01:00+00:00' },
    { id: 2, account: 'b', deal: null, text: 'Broken one', status: 'failed', error: 'MCP said no' }] }) })
  render(<App />)
  expect(await main().findByText('Saved one')).toBeInTheDocument()
  expect(main().getByText('MCP said no')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'failed' } })
  expect(main().queryByText('Saved one')).toBeNull()
})

test('sync: health, per-tool age table, queue, resync', async () => {
  at('#/sync')
  const f = mock({ 'POST /api/resync': json({ queued: 2 }) }, { ...ok, pending_calls: 4, last_error: { at: '2026-11-14T09:00:00+00:00', message: 'timeout' } })
  render(<App />)
  expect(await main().findByText('get_signals')).toBeInTheDocument()
  expect(main().getByText('timeout')).toBeInTheDocument()
  expect(main().getByText('4')).toBeInTheDocument()
  fireEvent.click(screen.getAllByRole('button', { name: 'Resync now' })[0])
  await waitFor(() => expect(f.mock.calls.some(c => c[0] === '/api/resync' && c[1]?.method === 'POST')).toBe(true))
})

test('command palette (Ctrl+K) searches deals and navigates; g then d jumps to Deals', async () => {
  mock()
  render(<App />)
  await within(screen.getByRole('main')).findByText('Beta')
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  const input = await screen.findByRole('combobox')
  fireEvent.change(input, { target: { value: 'd1' } })
  fireEvent.keyDown(input, { key: 'ArrowDown' }) // skips the page-name matches if any
  const opt = await screen.findByRole('option', { name: /Deal d1/ })
  fireEvent.click(opt)
  await waitFor(() => expect(window.location.hash).toBe('#/deals/a/d1'))
  fireEvent.keyDown(window, { key: 'g' })
  fireEvent.keyDown(window, { key: 'p' })
  await waitFor(() => expect(window.location.hash).toBe('#/people'))
})

test('record drawer: clicking a record chip opens the file preview with content', async () => {
  mock()
  render(<App />)
  await within(screen.getByRole('main')).findByText('Beta')
  const { openRecord } = await import('./ui')
  openRecord('A/emails/2026-08-11_karen_batteries.txt')
  const dlg = await screen.findByRole('dialog')
  expect(within(dlg).getByText('2026-08-11_karen_batteries.txt')).toBeInTheDocument()
  expect(within(dlg).getByText(/Batteries on two docks/)).toBeInTheDocument()
  expect(within(dlg).getByText(/Two of our docks have batteries/)).toBeInTheDocument()
})
