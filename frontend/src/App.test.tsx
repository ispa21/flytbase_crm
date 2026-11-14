import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import App from './App'

const line = (id: string, v: number | null, extra = {}) => ({ id, title: `Deal ${id}`, value: v, currency: 'GBP', receipts: [{ id, kind: 'deal' }], ...extra })
const q1 = (over = {}) => ({
  currency: 'GBP',
  bands: { on_contract: [line('d1', 100000, { renewal_risk: true, term_ends: '2027-01-31' })], backed_upside: [], unbacked: [line('d2', 5000)], unpriced: [line('d3', null)] },
  totals: {
    on_contract: { by_currency: { GBP: 100000 }, receipts: [{ id: 'd1', kind: 'deal' }] },
    backed_upside: { by_currency: {}, receipts: [] },
    unbacked: { by_currency: { GBP: 5000 }, receipts: [{ id: 'd2', kind: 'deal' }] },
  }, ...over,
})
const book = (extra = {}) => ({ as_of: '2026-11-14T09:42:00+00:00', state: 'ok', accounts: { a: { name: 'Acme', q1: q1() }, b: { name: 'Beta', q1: q1() } }, ...extra })

function mock(o: { book?: any; health?: any; changes?: any; fail?: boolean }) {
  const f = vi.fn(async (url: string) => {
    if (o.fail) throw new Error('down')
    const body = url.startsWith('/api/book') ? o.book : url.startsWith('/api/health') ? o.health : o.changes
    return { ok: true, json: async () => body }
  })
  vi.stubGlobal('fetch', f)
  return f
}
const ok = { stale: false, last_good_poll: '2026-11-14T09:41:00+00:00' }

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

test('data loaded: both accounts, bands, currency, receipts, as of', async () => {
  mock({ book: book(), health: ok, changes: { n: 1 } })
  render(<App />)
  expect(await screen.findByText('Acme')).toBeInTheDocument()
  expect(screen.getByText('Beta')).toBeInTheDocument()
  expect(screen.getAllByText('On contract')).toHaveLength(2)
  expect(screen.getAllByText('£100,000').length).toBeGreaterThan(0)
  expect(screen.getAllByText('d1').length).toBeGreaterThan(0)
  expect(screen.getByText(/As of .* · live/)).toBeInTheDocument()
  expect(screen.queryByText(/question/i)).toBeNull()
})

test('waiting for first sync: no numbers', async () => {
  mock({ book: { as_of: null, state: 'waiting for first sync', accounts: {} }, health: ok, changes: { n: 0 } })
  render(<App />)
  expect((await screen.findAllByText(/Waiting for first sync/)).length).toBeGreaterThan(0)
  expect(screen.queryByText(/£/)).toBeNull()
})

test('stale: banner with last fetch time', async () => {
  mock({ book: book(), health: { stale: true, last_good_poll: '2026-11-14T09:30:00+00:00' }, changes: { n: 1 } })
  render(<App />)
  expect(await screen.findByRole('alert')).toHaveTextContent(/MCP unreachable. Showing data last fetched/)
})

test('unreachable: banner, nothing shown as current', async () => {
  mock({ fail: true })
  render(<App />)
  expect(await screen.findByRole('alert')).toHaveTextContent(/Can't reach the app/)
})

test('missing later answers: no q2..q5 sections', async () => {
  mock({ book: book(), health: ok, changes: { n: 1 } })
  render(<App />)
  await screen.findByText('Acme')
  expect(screen.queryByText(/Do first|Slipping|People|Not known/)).toBeNull()
})

test('new data: counter moves, refetch, New tag only on changed', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const f = mock({ book: book(), health: ok, changes: { n: 1 } })
  render(<App />)
  await screen.findByText('Acme')
  const changedBook = book({ accounts: { a: { name: 'Acme', q1: q1({ bands: { ...q1().bands, backed_upside: [line('d9', 7000)] } }) }, b: { name: 'Beta', q1: q1() } } })
  f.mockImplementation(async (url: string) => ({ ok: true, json: async () => (url.startsWith('/api/book') ? changedBook : url.startsWith('/api/health') ? ok : { n: 2 }) }))
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
  await waitFor(() => expect(screen.getAllByText('New')).toHaveLength(1))
})

const post = (f: any, u: string) => f.mock.calls.filter((c: any[]) => c[0] === u && c[1]?.method === 'POST')

test('poke on load, errors ignored', async () => {
  const f = mock({ book: book(), health: ok, changes: { n: 1 } })
  render(<App />)
  await screen.findByText('Acme')
  expect(post(f, '/api/poke')).toHaveLength(1)
})

test('resync success: POSTs, disables while in flight, shows progress', async () => {
  const h = { ...ok, resync_at: '2026-11-14T09:45:00+00:00', pending_calls: 3 }
  const f = mock({ book: book(), health: ok, changes: { n: 1 } })
  let release!: () => void
  f.mockImplementation(async (url: string, init?: any) => {
    if (url === '/api/resync') { await new Promise<void>(r => (release = r)); return { ok: true, json: async () => ({ queued: 3 }) } }
    return { ok: true, json: async () => (url.startsWith('/api/book') ? book() : url.startsWith('/api/health') ? h : { n: 1 }) }
  })
  render(<App />)
  await screen.findByText('Acme')
  fireEvent.click(screen.getByRole('button', { name: 'Resync now' }))
  expect(await screen.findByRole('button', { name: 'Resyncing…' })).toBeDisabled()
  await act(async () => release())
  expect(await screen.findByText('Resyncing · 3 calls left (about 3 minutes, 1 call a minute)')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Resync now' })).toBeEnabled()
})

test('resync failure: error line shown', async () => {
  const f = mock({ book: book(), health: ok, changes: { n: 1 } })
  f.mockImplementation(async (url: string) => url === '/api/resync' ? { ok: false, status: 500, json: async () => ({}) }
    : { ok: true, json: async () => (url.startsWith('/api/book') ? book() : url.startsWith('/api/health') ? ok : { n: 1 }) })
  render(<App />)
  await screen.findByText('Acme')
  fireEvent.click(screen.getByRole('button', { name: 'Resync now' }))
  expect(await screen.findByText(/Resync failed \(500\)/)).toBeInTheDocument()
})

test('progress text from health alone; none when no calls pending', async () => {
  mock({ book: book(), health: { ...ok, resync_at: 'x', pending_calls: 1 }, changes: { n: 1 } })
  render(<App />)
  expect(await screen.findByText('Resyncing · 1 call left (about 1 minute, 1 call a minute)')).toBeInTheDocument()
})

const cell = (entries: any[], gap?: string) => ({ status: entries.length ? 'backed' : 'gap', entries, ...(entries.length ? {} : { gap: gap ?? 'not on file' }) })
const q2 = {
  loaded: true,
  deals: [{
    deal: 'd1', title: 'Deal d1',
    roles: {
      decides: cell([{ who: 'Priya Nair', title: 'COO', person_named: true, stands: 'champion', stakeholder: 's1', receipts: [{ id: 'acme/contract.txt', kind: 'record' }, { id: 's1', kind: 'stakeholder' }] }]),
      pays: cell([{ who: 'Acme Finance', paid_invoices: ['INV-1'], stands: 'not on file', receipts: [{ id: 'acme/invoices.json', kind: 'record' }] }]),
      uses: cell([{ who: null, unnamed_logins: 4, sign_ins_last_90_days: 12, gap: 'names not on file', stands: 'not on file', receipts: [{ id: 'acme/users.json', kind: 'record' }] }]),
      could_block: cell([], 'no open blocker or request on file'),
    },
    voices: [],
  }],
  gaps: [{ deal: 'd1', role: 'could_block', why: 'no open blocker or request on file' }],
}
const q4 = {
  today: '2026-11-14', loaded: true, signals_loaded: true,
  items: [
    { kind: 'renewal', level: 'red', deal: 'd1', text: 'Renewal term ends 2027-01-31, 78 days left; open blocker', turns_bad_on: '2026-11-02', receipts: [{ id: 'd1', kind: 'deal' }, { id: 'acme/contract.txt', kind: 'record' }] },
    { kind: 'cold', level: null, deal: null, text: 'Sam Lee: email of 2026-10-20 has no reply, 25 days', turns_bad_on: '2026-11-03', receipts: [{ id: 'acme/emails/1.txt', kind: 'record' }] },
    { kind: 'stuck', level: null, deal: 'd2', text: 'Deadline has no date: go-live', turns_bad_on: 'not on file', receipts: [{ id: 'd2', kind: 'deal' }] },
  ],
  gaps: ['signals not fetched yet'],
}

test('q4: most urgent in lead, ordered list with turns-bad-on and receipts, gaps', async () => {
  mock({ book: book({ accounts: { a: { name: 'Acme', q1: q1(), q4 }, b: { name: 'Beta', q1: q1() } } }), health: ok, changes: { n: 1 } })
  render(<App />)
  await screen.findByText('Acme')
  expect(screen.getAllByText(q4.items[0].text)).toHaveLength(1) // lead only, list collapsed
  fireEvent.click(screen.getByRole('button', { name: /Slipping/ }))
  await waitFor(() => expect(screen.getAllByText(q4.items[0].text)).toHaveLength(2))
  expect(await screen.findByText(/Sam Lee: email/)).toBeInTheDocument()
  expect(screen.getByText('Turns bad on 2026-11-03')).toBeInTheDocument()
  expect(screen.getByText('Turn date not on file')).toBeInTheDocument()
  expect(screen.getByText('acme/emails/1.txt')).toBeInTheDocument()
  expect(screen.getByText(/Not checked: signals not fetched yet/)).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /Slipping/ })).toHaveLength(1) // Beta has no q4
})

test('q2: per-deal power in the expanded row, gaps shown as not on file', async () => {
  mock({ book: book({ accounts: { a: { name: 'Acme', q1: q1(), q2 }, b: { name: 'Beta', q1: q1() } } }), health: ok, changes: { n: 1 } })
  render(<App />)
  await screen.findByText('Acme')
  fireEvent.click(screen.getAllByRole('button', { name: /On contract/ })[0])
  fireEvent.click(await screen.findByRole('button', { name: /Who decides, pays/ }))
  expect(await screen.findByText('Priya Nair, COO')).toBeInTheDocument()
  expect(screen.getByText(/champion/)).toBeInTheDocument()
  expect(screen.getByText('4 unnamed logins')).toBeInTheDocument()
  expect(screen.getByText('s1')).toBeInTheDocument()
  expect(screen.getByText(/not on file: no open blocker/)).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /Who decides, pays/ })).toHaveLength(1) // only d1 has q2
})

test('no q2/q4 keys: no power or slipping sections', async () => {
  mock({ book: book(), health: ok, changes: { n: 1 } })
  render(<App />)
  await screen.findByText('Acme')
  expect(screen.queryByText(/Slipping|Who decides/)).toBeNull()
})
