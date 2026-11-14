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
export type Account = { name: string | null; q1?: Q1; q2?: unknown; q3?: unknown; q4?: unknown; q5?: unknown }
export type Book = { as_of: string | null; state: string; accounts: Record<string, Account> }
export type Health = { stale: boolean; last_good_poll: string | null }

const get = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url} ${r.status}`)
  return r.json()
}

export const POLL_MS = 30_000

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
  return { book, health, unreachable, changed, clearChanged }
}
