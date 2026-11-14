import { useCallback, useEffect, useRef, useState } from 'react'

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
export type Account = { name: string | null; q1?: Q1; q2?: Q2; q3?: unknown; q4?: Q4; q5?: unknown }
export type Book = { as_of: string | null; state: string; accounts: Record<string, Account> }
export type Health = { stale: boolean; last_good_poll: string | null; resync_at?: string | null; pending_calls?: number }

const get = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url} ${r.status}`)
  return r.json()
}

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

  const loadBook = useCallback(async () => {
    const b = await get<Book>('/api/book')
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

  const clearChanged = useCallback(() => setChanged(s => (s.size ? new Set() : s)), [])
  return { book, health, unreachable, changed, clearChanged, resync, resyncing, resyncError }
}
