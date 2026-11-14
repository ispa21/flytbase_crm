import { fireEvent, render, screen, waitFor, act, within } from '@testing-library/react'
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

beforeEach(() => { window.location.hash = '' })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

test('data loaded: both accounts, bands, currency, receipts, as of', async () => {
  mock({ book: book(), health: ok, changes: { n: 1 } })
  render(<App />)
  expect(await within(screen.getByRole('main')).findByText('Acme')).toBeInTheDocument()
  expect(within(screen.getByRole('main')).getByText('Beta')).toBeInTheDocument()
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
  await within(screen.getByRole('main')).findByText('Acme')
  expect(within(screen.getByRole('main')).queryByText(/Do first|Slipping|People|Not known/)).toBeNull()
})

test('new data: counter moves, refetch, New tag only on changed', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const f = mock({ book: book(), health: ok, changes: { n: 1 } })
  render(<App />)
  await within(screen.getByRole('main')).findByText('Acme')
  const changedBook = book({ accounts: { a: { name: 'Acme', q1: q1({ bands: { ...q1().bands, backed_upside: [line('d9', 7000)] } }) }, b: { name: 'Beta', q1: q1() } } })
  f.mockImplementation(async (url: string) => ({ ok: true, json: async () => (url.startsWith('/api/book') ? changedBook : url.startsWith('/api/health') ? ok : { n: 2 }) }))
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
  await waitFor(() => expect(screen.getAllByText('New')).toHaveLength(1))
})

const post = (f: any, u: string) => f.mock.calls.filter((c: any[]) => c[0] === u && c[1]?.method === 'POST')

test('poke on load, errors ignored', async () => {
  const f = mock({ book: book(), health: ok, changes: { n: 1 } })
  render(<App />)
  await within(screen.getByRole('main')).findByText('Acme')
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
  await within(screen.getByRole('main')).findByText('Acme')
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
  await within(screen.getByRole('main')).findByText('Acme')
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
  await within(screen.getByRole('main')).findByText('Acme')
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
  await within(screen.getByRole('main')).findByText('Acme')
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
  await within(screen.getByRole('main')).findByText('Acme')
  expect(screen.queryByText(/Slipping|Who decides/)).toBeNull()
})

const gap = (text: string, deals: any[], who = 'not on file', extra = {}) => ({
  kind: 'power', text, deals, value_at_stake: deals.reduce((s, d) => s + (d.value ?? 0), 0) || null,
  unpriced_deals: deals.filter(d => d.value == null).length, who_could_fill: who, receipts: [{ id: 'd1', kind: 'deal' }], ...extra,
})
const q5 = {
  loaded: true,
  gaps: [
    gap('Small gap', [{ id: 'd2', title: 'Deal d2', value: 5000, currency: 'GBP' }]),
    gap('Big gap', [{ id: 'd1', title: 'Deal d1', value: 100000, currency: 'GBP' }, { id: 'd9', title: 'Deal d9', value: 7, currency: 'USD' }], 'Priya Nair'),
    gap('No deal gap', [], 'not on file', { value_at_stake: null }),
  ],
}

test('q5: gaps ordered by value, per-currency, who could fill, receipts on demand; absent key = nothing', async () => {
  mock({ book: book({ accounts: { a: { name: 'Acme', q1: q1(), q5 }, b: { name: 'Beta', q1: q1() } } }), health: ok, changes: { n: 1 } })
  render(<App />)
  await within(screen.getByRole('main')).findByText('Acme')
  expect(screen.getAllByText('Not known yet')).toHaveLength(1)
  const heads = screen.getAllByRole('button', { name: /gap/ }).map(b => b.textContent)
  expect(heads.map(h => h!.match(/Big|Small|No deal/)![0])).toEqual(['Big', 'Small', 'No deal'])
  expect(heads[0]).toContain('£100,000 · $7') // never summed across currencies
  fireEvent.click(screen.getByRole('button', { name: /Big gap/ }))
  expect(await screen.findByText('Priya Nair')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /No deal gap/ }))
  expect(await screen.findByText('Not on file')).toBeInTheDocument()
  expect(screen.getByText(/No single deal/)).toBeInTheDocument()
})

const changes = (o = {}) => ({ since: 1, moved: [], new_deals: [], new_signals: [], ...o })

test('what changed: requests since=<stored>, lists items, mark as seen updates storage and refetches', async () => {
  localStorage.setItem('book.lastSeen', '1000')
  const full = changes({
    new_signals: [{ id: 'sig-1', account: 'a', title: 'Renewal email', first_seen: 5, receipts: [{ id: 'sig-1', kind: 'signal' }] }],
    moved: [{ account: 'b', deal: 'd2', title: 'Deal d2', band: { from: 'unbacked', to: 'on_contract' }, receipts: [{ id: 'd2', kind: 'deal' }] }],
    new_deals: [{ account: 'a', deal: 'd7', title: 'Deal d7', band: 'unpriced' }],
  })
  const f = mock({ book: book({ changes: full }), health: ok, changes: { n: 1 } })
  render(<App />)
  expect(await screen.findByText('Renewal email')).toBeInTheDocument()
  expect(f.mock.calls.some(c => c[0] === '/api/book?since=1000')).toBe(true)
  expect(screen.getByText(/Unbacked to On contract/)).toBeInTheDocument()
  expect(screen.getByText('d7')).toBeInTheDocument()
  f.mockImplementation(async (url: string) => ({ ok: true, json: async () => (url.startsWith('/api/book') ? book({ changes: changes() }) : url.startsWith('/api/health') ? ok : { n: 1 }) }))
  fireEvent.click(screen.getByRole('button', { name: 'Mark as seen' }))
  expect(await screen.findByText('Nothing changed since you last looked.')).toBeInTheDocument()
  expect(Number(localStorage.getItem('book.lastSeen'))).toBeGreaterThan(1000)
})

test('what changed: no key = no strip; storage failure does not break the page', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  mock({ book: book(), health: ok, changes: { n: 1 } })
  render(<App />)
  await within(screen.getByRole('main')).findByText('Acme')
  expect(screen.queryByText('What changed')).toBeNull()
  vi.restoreAllMocks()
})
