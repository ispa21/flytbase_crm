import { useEffect, useRef, useState } from 'react'

/** True when the user asked for less motion, or when there is no matchMedia (tests): then nothing animates. */
export const reducedMotion = () => typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A number that rolls to its new value (600ms ease-out) on mount and whenever the data moves it. The text is always the final figure for assistive tech. */
export function Count({ n, fmt = (x: number) => x.toLocaleString('en-GB') }: { n: number; fmt?: (x: number) => string }) {
  const [shown, setShown] = useState(() => (reducedMotion() ? n : 0))
  const from = useRef(shown)
  useEffect(() => {
    if (reducedMotion()) { setShown(n); return }
    const start = performance.now(), a = from.current
    let raf = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 600)
      const v = a + (n - a) * (1 - Math.pow(1 - p, 4))
      from.current = v
      setShown(p === 1 ? n : v)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [n])
  return <span aria-label={fmt(n)}>{fmt(Math.round(shown))}</span>
}

// ---------- toasts: a module-level bus, so any file can say "saved" without prop drilling ----------
type Toast = { id: number; text: string; tone: 'info' | 'ok' | 'bad'; leaving?: boolean }
const listeners = new Set<(t: Toast) => void>()
let seq = 0
export const toast = (text: string, tone: Toast['tone'] = 'info') => listeners.forEach(l => l({ id: ++seq, text, tone }))

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([])
  useEffect(() => {
    const on = (t: Toast) => {
      setItems(s => [...s.slice(-2), t])
      setTimeout(() => setItems(s => s.map(x => (x.id === t.id ? { ...x, leaving: true } : x))), 4200)
      setTimeout(() => setItems(s => s.filter(x => x.id !== t.id)), 4500)
    }
    listeners.add(on)
    return () => { listeners.delete(on) }
  }, [])
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map(t => (
        <div key={t.id} className={`toast ${t.tone}${t.leaving ? ' leaving' : ''}`}>
          {t.tone === 'ok' && <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path className="tick" d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          {t.text}
        </div>))}
    </div>
  )
}

/** "synced 12s ago", ticking on its own so the rest of the page does not re-render every second. */
export function Ago({ iso }: { iso: string | null | undefined }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  if (!iso) return null
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  return <span className="ago">{s < 90 ? `${s}s ago` : s < 5400 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`}</span>
}
