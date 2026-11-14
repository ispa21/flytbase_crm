import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'
import { countLabel, kindOf } from './ui'

const line = (id: string | null, v: number | null, receipts: any[], extra = {}) => ({ id, title: `Deal ${id ?? 'told'}`, value: v, currency: 'GBP', receipts, ...extra })
const q1 = {
  currency: 'GBP',
  bands: {
    on_contract: [line('d1', 100000, [{ id: 'd1', kind: 'deal' }])],
    backed_upside: [line('d2', 4000, [{ id: 'd2', kind: 'deal' }]), line('o1', 45000, [{ id: 'o1', kind: 'offer' }])],
    unbacked: [line(null, null, [{ id: 'A/deal_history.json', kind: 'record' }])],
    unpriced: [],
  },
  totals: { on_contract: { by_currency: { GBP: 100000 }, receipts: [{ id: 'd1', kind: 'deal' }] }, backed_upside: { by_currency: { GBP: 49000 }, receipts: [] }, unbacked: { by_currency: {}, receipts: [] } },
}
const cell = (level: string, label: string, date: string | null = null, receipts = [{ id: 'd1', kind: 'deal' }]) => ({ level, label, date, receipts })
const radar = {
  deals: [
    { deal: { id: 'd1', title: 'Deal d1', band: 'on_contract', value: 100000, currency: 'GBP', kind: 'deal' },
      deadline: cell('red', 'Renewal in 12 days', '2026-11-26', [{ id: 'A/contract.txt', kind: 'record' }]), cold: cell('amber', 'CFO quiet 21 days'), blocked: cell('unknown', '', null, []) },
    { deal: { id: 'd2', title: 'Deal d2', band: 'backed_upside', value: 4000, currency: 'GBP', kind: 'deal' },
      deadline: cell('green', 'No deadline soon'), cold: cell('green', 'Replied 2 days ago'), blocked: cell('red', 'Open blocker') },
  ],
  counts: { deadline: { red: 1, amber: 0, green: 1, unknown: 0 }, cold: { red: 0, amber: 1, green: 1, unknown: 0 }, blocked: { red: 1, amber: 0, green: 0, unknown: 1 } },
}
const P = (o: any) => ({ id: null, title: null, side: 'customer', relationship: 'not on file', basis: 'record', waiting_on: [], receipts: [], ...o })
const priya = P({ id: 's1', name: 'Priya Nair', title: 'COO', relationship: 'warm', receipts: [{ id: 's1', kind: 'stakeholder' }],
  waiting_on: [{ text: 'Revised pricing sheet', since: '2026-10-20', receipts: [{ id: 'A/emails/3.txt', kind: 'record' }] }] })
const power = { deals: [
  { deal: { id: 'd1', title: 'Deal d1', band: 'on_contract' }, gaps: ['pays'],
    roles: { decides: [priya], pays: [], uses: [P({ name: 'Ops team', relationship: 'neutral' })], blocks: [P({ id: 's2', name: 'Sam Lee', relationship: 'guarded', basis: 'inferred', why: 'raised the budget objection' })], champion: [] } },
  { deal: { id: 'd2', title: 'Deal d2', band: 'backed_upside' }, gaps: [], roles: { decides: [], pays: [priya], uses: [], blocks: [], champion: [] } },
] }
const book = (acct: any = {}) => ({ as_of: '2026-11-14T09:42:00+00:00', state: 'ok', accounts: { a: { name: 'Eastern Counties Police', q1, ...acct }, b: { name: 'Aldermoor Water', q1 } } })
const ok = { stale: false, last_good_poll: '2026-11-14T09:41:00+00:00' }
function mock(b: any) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.startsWith('/api/book')) return { ok: true, status: 200, json: async () => b }
    if (url.startsWith('/api/health')) return { ok: true, status: 200, json: async () => ok }
    if (url.startsWith('/api/changes')) return { ok: true, status: 200, json: async () => ({ n: 1 }) }
    return { ok: false, status: 404, json: async () => ({}) }
  }))
}
const main = () => within(screen.getByRole('main'))
beforeEach(() => { window.location.hash = ''; localStorage.clear() })
afterEach(() => vi.unstubAllGlobals())

test('count label: opportunities, offers and told-only items are counted apart', () => {
  const kinds = [...q1.bands.on_contract, ...q1.bands.backed_upside, ...q1.bands.unbacked].map(kindOf)
  expect(countLabel(kinds)).toBe('2 deals · 1 offer · 1 told only')
  expect(kindOf({ id: 'x', receipts: [{ id: 'f1', kind: 'fact', status: 'claim' }] })).toBe('told')
  expect(countLabel([])).toBe('0 deals')
  expect(countLabel(['offer', 'offer'])).toBe('2 offers')
})

test('deals page head counts by kind; account filter shows names and a viewing state', async () => {
  window.location.hash = '#/deals'; mock(book())
  render(<App />)
  expect(await main().findByText('4 deals · 2 offers · 2 told only')).toBeInTheDocument() // both accounts
  expect(screen.getByText('Viewing:')).toHaveTextContent('Viewing: All accounts')
  fireEvent.click(screen.getByRole('button', { name: 'Eastern Counties' }))
  expect(await main().findByText('2 deals · 1 offer · 1 told only')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Eastern Counties' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('Viewing:')).toHaveTextContent('Viewing: Eastern Counties Police')
  expect(screen.getByRole('button', { name: 'Aldermoor' })).toBeInTheDocument()
})

test('radar: not available until the key exists', async () => {
  window.location.hash = '#/radar'; mock(book())
  render(<App />)
  expect(await main().findByText('The risk radar is not available yet')).toBeInTheDocument()
})

test('radar: scope dots link to deals, grid chips open date and receipts, unknown is never green', async () => {
  window.location.hash = '#/radar'; mock(book({ radar }))
  render(<App />)
  const dot = await main().findByRole('link', { name: 'Deal d1. Deadline: Red, Renewal in 12 days' })
  expect(dot).toHaveAttribute('href', '#/deals/a/d1')
  expect(main().getByRole('link', { name: 'Deal d1. Blocked: Not on file, not on file' })).toBeInTheDocument()
  expect(main().queryByRole('link', { name: /Deal d1. Blocked: Green/ })).toBeNull()
  expect(main().getByText('Aldermoor Water')).toBeInTheDocument() // account without the key
  expect(main().getByText('Not available yet')).toBeInTheDocument()
  fireEvent.mouseEnter(dot)
  expect(screen.getByRole('tooltip')).toHaveTextContent('Deal d1')
  const chip = main().getByRole('button', { name: 'Deadline: Red, Renewal in 12 days' })
  fireEvent.click(chip)
  expect(await screen.findByText('26 Nov 2026')).toBeInTheDocument()
  expect(screen.getByText('A/contract.txt')).toBeInTheDocument()
  fireEvent.click(main().getByRole('button', { name: 'Blocked: Not on file, not on file' }))
  expect(await screen.findByText('date not on file')).toBeInTheDocument()
  expect(main().getAllByTitle('1 not on file').length).toBeGreaterThan(0) // counts tile
})

test('home: compact radar only when the key exists, and links to the radar page', async () => {
  mock(book({ radar }))
  render(<App />)
  expect(await main().findByRole('link', { name: 'Open the risk radar' })).toHaveAttribute('href', '#/radar')
  expect(main().getAllByRole('link', { name: 'Open the risk radar' })).toHaveLength(1) // b has no radar
})

test('power: not available until the key exists; g w jumps there', async () => {
  mock(book())
  render(<App />)
  await main().findByText('Eastern Counties Police')
  fireEvent.keyDown(window, { key: 'g' }); fireEvent.keyDown(window, { key: 'w' })
  expect(await main().findByText('The power map is not available yet')).toBeInTheDocument()
})

test('power: picker, ghost roles, inferred why, badge, person panel with waiting on and receipts', async () => {
  window.location.hash = '#/power'; mock(book({ power }))
  render(<App />)
  expect(await main().findByRole('button', { name: 'Deal d1', pressed: true })).toBeInTheDocument()
  expect(main().getByRole('img', { name: 'Pays: not on file' })).toBeInTheDocument()
  expect(main().getByRole('img', { name: 'Champion: not on file' })).toBeInTheDocument()
  const sam = main().getByRole('button', { name: /^Sam Lee\. Blocks\. guarded\. Inferred: raised the budget objection\./ })
  fireEvent.focus(sam)
  expect(screen.getByRole('tooltip')).toHaveTextContent('Inferred: raised the budget objection')
  const p = main().getByRole('button', { name: /^Priya Nair, COO\. Decides\. warm\. Waiting on 1\./ })
  expect(within(p).getByText('1')).toBeInTheDocument() // badge
  fireEvent.click(p)
  const dlg = await screen.findByRole('dialog')
  expect(within(dlg).getByText('Revised pricing sheet')).toBeInTheDocument()
  expect(within(dlg).getByText('since 20 Oct 2026')).toBeInTheDocument()
  expect(within(dlg).getByText('A/emails/3.txt')).toBeInTheDocument()
  expect(within(dlg).getAllByRole('link', { name: /Deal d/ })).toHaveLength(2) // decides d1, pays d2
  fireEvent.click(within(dlg).getByRole('button', { name: 'Close' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  fireEvent.click(main().getByRole('button', { name: 'Deal d2' }))
  expect(await main().findByRole('img', { name: 'Decides: not on file' })).toBeInTheDocument()
})

test('deal page uses the power map when the key exists', async () => {
  window.location.hash = '#/deals/a/d1'; mock(book({ power, radar }))
  render(<App />)
  expect(await main().findByRole('button', { name: /^Priya Nair, COO\. Decides/ })).toBeInTheDocument()
  expect(main().getByRole('button', { name: 'Deciders & payers cold: Amber, CFO quiet 21 days' })).toBeInTheDocument()
})
