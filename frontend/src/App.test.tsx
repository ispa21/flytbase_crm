import { render, screen, waitFor, act } from '@testing-library/react'
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
