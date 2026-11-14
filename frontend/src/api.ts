import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export type Receipt = { id: string; kind: string; status?: string }
export type Line = {
  id: string | null; title: string; value: number | null; currency: string | null
  receipts: Receipt[]; renewal_risk?: boolean; term_ends?: string | null; note?: string
}
export type BandKey = 'on_contract' | 'backed_upside' | 'unbacked' | 'unpriced'
export type Q1 = {
  currency: string | null
  bands: Record<BandKey, Line[]>
  totals: Record<Exclude<BandKey, 'unpriced'>, { by_currency: Record<string, number>; receipts: Receipt[] }>
}
export type Entry = {
  who?: string | null; title?: string | null; stands?: string; text?: string; status?: string; role?: string
  gap?: string | null; unnamed_logins?: number; usage_by?: string; paid_invoices?: string[]
  sign_ins_last_90_days?: number; backing?: string; receipts: Receipt[]
}
export type RoleKey = 'decides' | 'pays' | 'uses' | 'could_block'
export type Cell = { status: string; entries: Entry[]; gap?: string }
export type DealPower = { deal: string; title: string; roles: Record<RoleKey, Cell>; voices: Entry[] }
export type Q2 = { loaded: boolean; deals: DealPower[]; gaps: { deal: string; role: string; why: string }[] }
export type RiskItem = {
  kind: string; level: 'red' | 'amber' | null; deal: string | null; text: string; turns_bad_on: string; receipts: Receipt[]
}
export type Q4 = { today: string; loaded: boolean; signals_loaded: boolean; items: RiskItem[]; gaps: string[] }
export type Move = {
  rank: number; kind: string; action: string; why_now: string; owner: string; with?: string; due: string; due_basis?: string
  turns_bad_on?: string; level?: 'red' | 'amber' | null; deal: { id: string; title: string } | null; receipts: Receipt[]
  draft_note: { kind: string; text: string }
}
export type Q3 = { loaded: boolean; moves: Move[] }
// risk radar: one row per deal, three dimensions, each a RAG cell. 'unknown' = not on file, never green.
export type Level = 'red' | 'amber' | 'green' | 'unknown'
export type RagCell = { level: Level; label: string; date: string | null; receipts: Receipt[] }
export type Dim = 'deadline' | 'cold' | 'blocked'
export type RadarDeal = { deal: { id: string | null; title: string; band: BandKey; value: number | null; currency: string | null; kind?: string } } & Record<Dim, RagCell>
export type Radar = { deals: RadarDeal[]; counts?: Record<Dim, Partial<Record<Level, number>>> }
// power map: per deal, who holds each role
export type PowerRole = 'decides' | 'pays' | 'uses' | 'blocks' | 'champion'
export type Waiting = { text: string; since: string | null; receipts: Receipt[] }
export type PowerPerson = {
  id: string | null; name: string; title: string | null; side: 'customer' | 'flytbase' | 'org'; relationship: string
  basis: 'record' | 'inferred'; why?: string; waiting_on?: Waiting[]; receipts: Receipt[]
}
export type PowerDeal = { deal: { id: string | null; title: string; band: BandKey }; roles: Partial<Record<PowerRole, PowerPerson[]>>; gaps?: PowerRole[] }
export type Account = { name: string | null; q1?: Q1; q2?: Q2; q3?: Q3; q4?: Q4; q5?: Q5; radar?: Radar; power?: { deals: PowerDeal[] } }
export type Gap = {
  kind: string; text: string; deals: { id: string; title: string; value: number | null; currency: string }[]
  value_at_stake: number | null; unpriced_deals: number; who_could_fill: string; receipts: Receipt[]
}
export type Q5 = { loaded: boolean; gaps: Gap[] }
export type Changes = {
  since: number
  moved: { account: string; deal: string; title: string; band?: { from: string; to: string }; value?: { from: number | null; to: number | null }; stage?: { from: string | null; to: string | null }; receipts: Receipt[] }[]
  new_deals: { account: string; deal: string; title: string; band: string }[]
  new_signals: { id: string; account?: string | null; title?: string | null; first_seen: number; receipts: Receipt[] }[]
}
export type Book = { as_of: string | null; state: string; accounts: Record<string, Account>; changes?: Changes }
export type Health = {
  stale: boolean; last_good_poll: string | null; resync_at?: string | null; pending_calls?: number; now?: string; reachable?: boolean
  last_error?: { at: string | null; message: string } | null; changes?: number
  fetched?: { tool: string; args?: unknown; fetched_at: string | null; age_s: number }[]
}
export type Person = {
  id: string; account: string; name: string; title?: string | null; org?: string | null; side: 'customer' | 'flytbase'
  role_tags: string[]; standing?: string | null; deals: (string | { id: string; title?: string; role?: string })[]; receipts: Receipt[]
}
export type ActivityKind = 'email' | 'call' | 'request' | 'ticket' | 'signal' | 'invoice'
export type ActivityItem = {
  id: string; account: string; kind: ActivityKind; dated: string | null; title: string; summary?: string | null
  deal: string | null; receipts: Receipt[]
}
export type NoteStatus = 'queued' | 'saved' | 'failed'
export type Note = {
  id: string | number; account: string; deal?: string | null; text: string; status: NoteStatus
  created_at?: string | null; saved_at?: string | null; error?: string | null
}

/** Shared by every page: the one book, health, and the account filter. */
export type Ctx = {
  book: Book | null; health: Health | null; unreachable: boolean; account: string; mcpDown: boolean
  names: Record<string, string>; asOf: string | null
}
export const DataCtx = createContext<Ctx>({ book: null, health: null, unreachable: false, account: 'all', mcpDown: false, names: {}, asOf: null })
export const useData = () => useContext(DataCtx)

const get = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url} ${r.status}`)
  return r.json()
}

const KEY = 'book.lastSeen'
const nowS = () => Math.floor(Date.now() / 1000)
const readSeen = (): number | null => { try { const v = Number(localStorage.getItem(KEY)); return v > 0 ? v : null } catch { return null } }
const writeSeen = (n: number) => { try { localStorage.setItem(KEY, String(n)) } catch { /* private mode: no memory */ } }

export const POLL_MS = 30_000
export const POKE_MS = 300_000

/** Items (by line id) that are new or differ from the previous book. */
const fingerprint = (b: Book) => {
  const m = new Map<string, string>()
  for (const [aid, a] of Object.entries(b.accounts))
    for (const [band, ls] of Object.entries(a.q1?.bands ?? {}))
      for (const l of ls as Line[]) m.set(`${aid}/${band}/${l.id ?? l.title}`, JSON.stringify(l))
  return m
}

export function useBook() {
  const [book, setBook] = useState<Book | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [unreachable, setUnreachable] = useState(false)
  const [changed, setChanged] = useState<Set<string>>(new Set())
  const prev = useRef<Map<string, string> | null>(null)
  const since = useRef(0)
  const seen = useRef<number | null>(null)
  if (seen.current === null) { seen.current = readSeen(); if (seen.current === null) writeSeen(nowS()) } // first visit: start the clock

  const loadBook = useCallback(async () => {
    const b = await get<Book>(seen.current ? `/api/book?since=${seen.current}` : '/api/book')
    const fp = fingerprint(b)
    if (prev.current) {
      const ch = [...fp].filter(([k, v]) => prev.current!.get(k) !== v).map(([k]) => k)
      if (ch.length) setChanged(s => new Set([...s, ...ch]))
    }
    prev.current = fp
    setBook(b)
  }, [])

  // keep the worker alive while the page is open; failures are ignored
  useEffect(() => {
    const poke = () => { fetch('/api/poke', { method: 'POST' }).catch(() => {}) }
    poke()
    const t = setInterval(poke, POKE_MS)
    return () => clearInterval(t)
  }, [])

  const [resyncing, setResyncing] = useState(false)
  const [resyncError, setResyncError] = useState<string | null>(null)
  const resync = useCallback(async () => {
    setResyncing(true); setResyncError(null)
    try {
      const r = await fetch('/api/resync', { method: 'POST' })
      if (!r.ok) throw new Error(String(r.status))
      setHealth(await get<Health>('/api/health')) // show progress now, not at the next poll
    } catch (e) {
      setResyncError(`Resync failed (${e instanceof Error ? e.message : 'error'}). Try again.`)
    } finally { setResyncing(false) }
  }, [])

  useEffect(() => {
    let dead = false
    const tick = async (first: boolean) => {
      try {
        const [h, c] = await Promise.all([get<Health>('/api/health'), get<{ n: number }>(`/api/changes?since=${since.current}`)])
        if (dead) return
        setHealth(h)
        if (first || c.n !== since.current) await loadBook()
        since.current = c.n
        if (!dead) setUnreachable(false)
      } catch {
        if (!dead) setUnreachable(true) // last data stays, retried next poll
      }
    }
    tick(true)
    const t = setInterval(() => tick(false), POLL_MS)
    return () => { dead = true; clearInterval(t) }
  }, [loadBook])

  const markSeen = useCallback(async () => {
    seen.current = nowS(); writeSeen(seen.current)
    try { await loadBook() } catch { /* next poll retries */ }
  }, [loadBook])

  const clearChanged = useCallback(() => setChanged(s => (s.size ? new Set() : s)), [])
  return { book, markSeen, health, unreachable, changed, clearChanged, resync, resyncing, resyncError }
}

export type Api<T> = { data: T | null; state: 'loading' | 'ok' | 'na' | 'error'; reload: () => void }
/** One GET, reloaded on demand or on an interval. 404 means the backend does not have it yet. */
export function useApi<T>(url: string | null, every?: number): Api<T> {
  const [r, setR] = useState<{ data: T | null; state: Api<T>['state'] }>({ data: null, state: 'loading' })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!url) return
    let dead = false
    const go = async () => {
      try {
        const res = await fetch(url)
        if (dead) return
        if (res.status === 404) return setR({ data: null, state: 'na' })
        if (!res.ok) throw new Error(String(res.status))
        setR({ data: await res.json(), state: 'ok' })
      } catch { if (!dead) setR(p => ({ data: p.data, state: p.data ? 'ok' : 'error' })) }
    }
    go()
    const t = every ? setInterval(go, every) : undefined
    return () => { dead = true; if (t) clearInterval(t) }
  }, [url, every, n])
  return { ...r, reload: useCallback(() => setN(x => x + 1), []) }
}

export async function postNote(n: { account: string; deal?: string | null; text: string; source?: string }): Promise<{ id: string | number; status: NoteStatus }> {
  const r = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(n) })
  if (!r.ok) throw new Error(r.status === 404 ? 'Saving notes is not available yet' : `Save failed (${r.status})`)
  return r.json()
}
