import { useEffect, useMemo, useRef, useState } from 'react'
import './viz.css'
import type { Account, DealPower, Entry, Q4, RoleKey } from './api'
import { describe } from './home'
import { reducedMotion } from './live'
import { BANDS, NOT_ON_FILE, dealValue, type Deal } from './ui'

/* Every drawing here is plain SVG, canvas or HTML, and every mark has a text twin and a "why" list of the records behind it. */

const BAND_VAR = { on_contract: '--contract', backed_upside: '--backed', unbacked: '--unbacked', unpriced: '--unpriced' } as const

// ---------- bars: a thin bar under each priced band, drawn to scale within one currency. Never summed. ----------
export function MiniBar({ acc, band, currency }: { acc: Account; band: 'on_contract' | 'backed_upside' | 'unbacked'; currency: string }) {
  const t = acc.q1?.totals
  if (!t) return null
  const priced = ['on_contract', 'backed_upside', 'unbacked'] as const
  const vals = priced.map(k => t[k]?.by_currency[currency] ?? 0)
  if (vals.filter(v => v > 0).length < 2) return null // a bar only earns its place when it compares two bands
  const n = t[band]?.by_currency[currency] ?? 0
  return <span className="bar-mini" aria-hidden="true" title={`${n.toLocaleString('en-GB')} against the largest band (${Math.max(...vals).toLocaleString('en-GB')}) in this currency`}><i style={{ transform: `scaleX(${n / Math.max(...vals)})`, background: `var(${BAND_VAR[band]})` }} /></span>
}

// ---------- timeline: when each risk turns bad, on a real date axis ----------
const DAY = 86_400_000
const iso = (s: string) => (/^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(s.slice(0, 10)).getTime() : null)
export function RiskTimeline({ q4, deal }: { q4: Q4; deal?: string | null }) {
  const today = iso(q4.today) ?? Date.now()
  const items = (q4.items ?? []).filter(i => !deal || i.deal === deal)
  const dated = items.map(i => ({ i, t: iso(i.turns_bad_on) })).filter((x): x is { i: (typeof items)[number]; t: number } => x.t != null).sort((a, b) => a.t - b.t)
  const undated = items.length - dated.length
  if (!items.length) return null
  const span = Math.max(30, ...dated.map(d => Math.ceil((d.t - today) / DAY) + 5))
  const days = (t: number) => Math.round((t - today) / DAY)
  return (
    <div className="rtl">
      {dated.length > 0 && (
        <div className="rtl-axis" role="img" aria-label={`${dated.length} ${dated.length === 1 ? 'risk turns' : 'risks turn'} bad in the next ${span} days`}>
          <span className="rtl-line" />
          <span className="rtl-end l">Today</span><span className="rtl-end r">+{span} days</span>
          {dated.map((d, n) => {
            const left = Math.min(98, Math.max(2, (days(d.t) / span) * 100))
            return <i key={n} className={`rtl-dot ${d.i.level ?? 'watch'}`} style={{ left: `${left}%`, top: n % 2 ? 34 : 6 }} title={`${d.i.text} (${d.i.turns_bad_on})`} />
          })}
        </div>)}
      {undated > 0 && <p className="muted small">{undated} {undated === 1 ? 'item has' : 'items have'} no turn date on file, so {undated === 1 ? 'it is' : 'they are'} not on the line.</p>}
      <p className="muted small">The line starts today ({q4.today}). A dot sits where a record says the risk turns bad; the list above gives each one with its receipts.</p>
    </div>
  )
}

// ---------- standing meter: where a person stands with you, as recorded ----------
const STAND: Record<string, number> = { warm: 4, ally: 4, neutral: 3, guarded: 2, cold: 1 }
export function StandMeter({ stands }: { stands?: string | null }) {
  const n = stands ? STAND[stands.toLowerCase()] ?? 0 : 0
  const known = n > 0
  return (
    <span className="stand-meter" title={known ? `Recorded standing: ${stands}` : 'Standing not on file'}>
      <span className="segs" aria-hidden="true">{[1, 2, 3, 4].map(i => <i key={i} className={i <= n ? 'on' : ''} />)}</span>
      <span>{known ? stands : <span className="muted">not on file</span>}</span>
    </span>
  )
}

// ---------- hero: one dot per deal, in the lane of the band the evidence puts it in ----------
const LANES = ['on_contract', 'backed_upside', 'unbacked', 'unpriced'] as const
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295 }
type Tip = { x: number; y: number; d: Deal }
export function SignalField({ deals }: { deals: Deal[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  const pts = useMemo(() => deals.map(d => ({ d, lane: LANES.indexOf(d.band), a: hash(d.acct + d.key), b: hash(d.key + d.acct + 'y') })), [deals])
  const hit = useRef<{ x: number; y: number; d: Deal }[]>([])
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return // jsdom: no canvas, the text twin below carries everything
    let raf = 0, w = 0, h = 0
    const size = () => {
      const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1
      w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const frame = (t: number) => {
      const css = getComputedStyle(cv), v = (n: string) => css.getPropertyValue(n).trim()
      ctx.clearRect(0, 0, w, h)
      ctx.font = '600 11px Geist, system-ui, sans-serif'; ctx.textAlign = 'center'
      LANES.forEach((k, i) => {
        const x0 = (w / 4) * i
        if (i > 0) { ctx.strokeStyle = v('--line'); ctx.setLineDash(i === 2 ? [3, 4] : []); ctx.beginPath(); ctx.moveTo(x0, 12); ctx.lineTo(x0, h - 28); ctx.stroke(); ctx.setLineDash([]) }
        ctx.fillStyle = v('--muted'); ctx.fillText(BANDS.find(b => b.key === k)!.label.toUpperCase(), x0 + w / 8, h - 8)
      })
      hit.current = []
      for (const p of pts) {
        const lw = w / 4, drift = reducedMotion() ? 0 : 1
        const x = lw * p.lane + lw * (0.2 + 0.6 * p.a) + Math.sin(t / 1400 + p.a * 9) * 5 * drift
        const y = 28 + (h - 76) * p.b + Math.cos(t / 1700 + p.b * 9) * 5 * drift
        const col = v(BAND_VAR[p.d.band])
        if (p.d.risk === 'red') {
          const k = reducedMotion() ? 0.5 : (Math.sin(t / 380) + 1) / 2
          ctx.strokeStyle = v('--red'); ctx.globalAlpha = 0.65 - 0.5 * k; ctx.lineWidth = 2
          ctx.beginPath(); ctx.arc(x, y, 13 + 9 * k, 0, 7); ctx.stroke(); ctx.globalAlpha = 1
        }
        ctx.fillStyle = p.d.band === 'unpriced' ? v('--card') : col
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(p.d.band === 'unpriced' ? [3, 3] : [])
        ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill(); ctx.stroke(); ctx.setLineDash([])
        ctx.fillStyle = p.d.band === 'unpriced' ? col : v('--card'); ctx.fillText(p.d.acct.toUpperCase(), x, y + 4)
        hit.current.push({ x, y, d: p.d })
      }
      if (!reducedMotion()) raf = requestAnimationFrame(frame)
    }
    size(); raf = requestAnimationFrame(frame)
    const ro = new ResizeObserver(() => { size(); if (reducedMotion()) raf = requestAnimationFrame(frame) })
    ro.observe(cv)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [pts])
  const near = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top
    return hit.current.find(p => (p.x - x) ** 2 + (p.y - y) ** 2 < 18 ** 2)
  }
  const counts = LANES.map(k => pts.filter(p => p.d.band === k).length)
  const reds = deals.filter(d => d.risk === 'red').length
  return (
    <section className="field" aria-label="The book at a glance">
      <div className="field-wrap">
        <canvas ref={ref} aria-hidden="true" onMouseMove={e => { const p = near(e); setTip(p ? { x: p.x, y: p.y, d: p.d } : null); e.currentTarget.style.cursor = p ? 'pointer' : 'default' }}
          onMouseLeave={() => setTip(null)} onClick={e => { const p = near(e); if (p) window.location.hash = `#/deals/${p.d.acct}/${encodeURIComponent(p.d.key)}` }} />
        {tip && <div className="field-tip" style={{ left: tip.x, top: tip.y }}><b>{tip.d.title}</b><span>{tip.d.acct.toUpperCase()} · {BANDS.find(b => b.key === tip.d.band)!.label}{dealValue(tip.d) ? ` · ${dealValue(tip.d)}` : ''}</span></div>}
      </div>
      <p className="field-key">One dot per deal, placed in the band its evidence supports. Letter is the account. A pulsing ring means a red risk is on file. <b>{counts.join(' · ')}</b> deals across the four bands{reds ? `, ${reds} flagged red` : ''}. Click a dot to open the deal.</p>
      <ul className="sr-only">{deals.map(d => <li key={d.acct + d.key}><a href={`#/deals/${d.acct}/${encodeURIComponent(d.key)}`}>{d.title}, {BANDS.find(b => b.key === d.band)!.label}</a></li>)}</ul>
    </section>
  )
}

// ---------- power map: the people around one deal, by the role they hold ----------
const STAND_VAR: Record<string, string> = { warm: '--contract', ally: '--contract', neutral: '--backed', guarded: '--amber', cold: '--red' }
const ROLE_POS: { k: RoleKey; label: string; left: boolean; top: boolean }[] = [
  { k: 'decides', label: 'Decides', left: true, top: true }, { k: 'pays', label: 'Pays', left: false, top: true },
  { k: 'uses', label: 'Uses', left: true, top: false }, { k: 'could_block', label: 'Could block', left: false, top: false },
]
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
export function PowerMap({ p }: { p: DealPower }) {
  const cx = 320, cy = 170
  const summary = ROLE_POS.map(r => `${r.label}: ${(p.roles[r.k]?.entries ?? []).map(describe).join(', ') || 'not on file'}`).join('. ')
  return (
    <figure className="pmap">
      <svg viewBox="0 0 640 340" role="img" aria-label={`Power map. ${summary}`}>
        <rect x={cx - 96} y={cy - 22} width="192" height="44" rx="10" className="pm-deal" />
        <text x={cx} y={cy + 4} textAnchor="middle" className="pm-deal-t">{clip(p.title, 28)}</text>
        {ROLE_POS.map(r => {
          const entries: Entry[] = p.roles[r.k]?.entries ?? []
          const shown = entries.slice(0, 3)
          const y0 = r.top ? 56 : 226
          const dx = r.left ? 150 : 490
          const side = r.left ? 'end' : 'start'
          return (
            <g key={r.k}>
              <text x={r.left ? dx - 12 : dx + 12} y={y0 - 24} textAnchor={side} className="pm-role">{r.label.toUpperCase()}</text>
              {(shown.length ? shown : [null]).map((e, i) => {
                const y = y0 + i * 30
                const col = e?.stands ? `var(${STAND_VAR[e.stands.toLowerCase()] ?? '--muted'})` : 'var(--muted)'
                return (
                  <g key={i} className="pm-node" style={{ animationDelay: `${120 + i * 70}ms` }}>
                    <path d={`M${dx} ${y} C ${r.left ? 240 : 400} ${y}, ${r.left ? 230 : 410} ${cy}, ${r.left ? cx - 96 : cx + 96} ${cy}`} pathLength="1" className={`pm-edge${e ? '' : ' none'}`} />
                    <circle cx={dx} cy={y} r="7" fill={e ? col : 'var(--card)'} stroke={col} strokeWidth="2" strokeDasharray={e ? undefined : '3 3'} />
                    <text x={r.left ? dx - 14 : dx + 14} y={y + 4} textAnchor={side} className={e ? 'pm-name' : 'pm-none'}>{e ? clip(describe(e), 30) : NOT_ON_FILE}</text>
                    {e?.stands && e.stands !== NOT_ON_FILE && <text x={r.left ? dx - 14 : dx + 14} y={y + 17} textAnchor={side} className="pm-stand">{e.stands}</text>}
                    <title>{e ? describe(e) : `${r.label}: ${NOT_ON_FILE}`}</title>
                  </g>)
              })}
              {entries.length > 3 && <text x={r.left ? dx - 14 : dx + 14} y={y0 + 3 * 30 + 4} textAnchor={side} className="pm-none">+{entries.length - 3} more below</text>}
            </g>)
        })}
      </svg>
      <figcaption className="muted small">Lines run from each person to the deal. Dot colour is where they stand with you (warm, neutral, guarded, cold); a dashed dot means nobody is on file for that role. The table below lists every entry with its receipts.</figcaption>
    </figure>
  )
}
