import { useEffect, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { useData, type PowerDeal, type PowerPerson, type PowerRole } from './api'
import { BandChip, Empty, Failed, Icon, Loading, NotAvailable, NOT_ON_FILE, PageHead, Receipts, day, dealHref, dealKey, shortName, uniq } from './ui'

const ROLES: { k: PowerRole; label: string }[] = [
  { k: 'decides', label: 'Decides' }, { k: 'pays', label: 'Pays' }, { k: 'uses', label: 'Uses' }, { k: 'blocks', label: 'Blocks' }, { k: 'champion', label: 'Champion' },
]
const LEFT: PowerRole[] = ['decides', 'pays'], RIGHT: PowerRole[] = ['champion', 'uses', 'blocks']
const label = (k: PowerRole) => ROLES.find(r => r.k === k)!.label
const REL = ['warm', 'neutral', 'guarded', 'cold']
const relKey = (r?: string | null) => (REL.includes((r ?? '').toLowerCase()) ? (r ?? '').toLowerCase() : 'none')
const relText = (r?: string | null) => (relKey(r) === 'none' ? (r && r !== NOT_ON_FILE ? r : NOT_ON_FILE) : r!.toLowerCase())
const SIDE = { customer: 'Customer', flytbase: 'FlytBase', org: 'Org' } as const
const same = (a: PowerPerson, b: PowerPerson) => (a.id && b.id ? a.id === b.id : a.name === b.name)
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

function useNarrow() {
  const q = '(max-width: 640px)'
  const [n, setN] = useState(() => !!window.matchMedia?.(q).matches)
  useEffect(() => {
    const m = window.matchMedia?.(q)
    if (!m) return
    const f = () => setN(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return n
}

// ---------- layout: wide = lanes left and right of the deal; narrow = one column under it ----------
type Node = { role: PowerRole; p: PowerPerson | null; x: number; y: number; side: 'l' | 'r' }
type Head = { role: PowerRole; x: number; y: number; side: 'l' | 'r'; n: number }
const ROW = 48, GAP = 22
function layout(pd: PowerDeal, narrow: boolean) {
  const nodes: Node[] = [], heads: Head[] = []
  const lanes = (rs: PowerRole[], x: number, side: 'l' | 'r', y0: number) => {
    let y = y0
    for (const role of rs) {
      const ps = pd.roles[role] ?? []
      heads.push({ role, x, y, side, n: ps.length }); y += 12
      for (const p of ps.length ? ps : [null]) { nodes.push({ role, p, x, y: y + ROW / 2, side }); y += ROW }
      y += GAP
    }
    return y
  }
  if (narrow) {
    const H = lanes([...LEFT, ...RIGHT], 40, 'r', 84)
    return { W: 320, H, nodes, heads, box: { x: 12, y: 8, w: 296, h: 48 }, narrow }
  }
  const H = Math.max(lanes(LEFT, 240, 'l', 24), lanes(RIGHT, 560, 'r', 24), 140)
  return { W: 800, H, nodes, heads, box: { x: 290, y: H / 2 - 26, w: 220, h: 52 }, narrow }
}

export function PowerMap({ pd, onPick }: { pd: PowerDeal; onPick: (p: PowerPerson) => void }) {
  const narrow = useNarrow()
  const L = layout(pd, narrow)
  const [tip, setTip] = useState<Node | null>(null)
  const { W, H, box } = L
  const cy = box.y + box.h / 2
  const room = narrow ? 33 : 29 // characters that fit beside a node
  const edge = (n: Node) => narrow ? `M20 ${box.y + box.h} V${n.y} H${n.x - 11}`
    : n.side === 'l' ? `M${n.x + 11} ${n.y} C${n.x + 50} ${n.y} ${box.x - 40} ${cy} ${box.x} ${cy}`
      : `M${n.x - 11} ${n.y} C${n.x - 50} ${n.y} ${box.x + box.w + 40} ${cy} ${box.x + box.w} ${cy}`
  const tx = (n: Node) => (n.side === 'l' ? n.x - 18 : n.x + 18)
  const anchor = (n: { side: 'l' | 'r' }) => (n.side === 'l' ? 'end' : 'start')
  return (
    <figure className="pmap">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Power map for ${pd.deal.title}`}>
        {L.nodes.map((n, i) => <path key={`e${i}`} d={edge(n)} className={`pm-edge${!n.p ? ' none' : n.p.basis === 'inferred' ? ' inf' : ''}`} />)}
        <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="3" className="pm-deal" />
        <text x={box.x + box.w / 2} y={cy + 5} textAnchor="middle" className="pm-deal-t">{clip(pd.deal.title, narrow ? 36 : 28)}</text>
        {L.heads.map(h => (
          <text key={h.role} x={h.side === 'l' ? h.x + 9 : h.x - 9} y={h.y} textAnchor={anchor(h)} className="pm-role">{label(h.role).toUpperCase()}{h.n > 1 ? ` · ${h.n}` : ''}</text>))}
        {L.nodes.map((n, i) => {
          if (!n.p) return (
            <g key={i} role="img" aria-label={`${label(n.role)}: not on file`}>
              <circle cx={n.x} cy={n.y} r="9" className="pm-ghost" />
              <text x={tx(n)} y={n.y + 4} textAnchor={anchor(n)} className="pm-none">not on file</text>
            </g>)
          const p = n.p, w = p.waiting_on?.length ?? 0, inf = p.basis === 'inferred'
          const sub = [p.title, relText(p.relationship), inf ? 'inferred' : ''].filter(Boolean).join(' · ')
          const hit = narrow ? { x: n.x - 14, width: W - n.x + 8 } : n.side === 'l' ? { x: n.x - 246, width: 260 } : { x: n.x - 14, width: 260 }
          const open = () => onPick(p)
          return (
            <g key={i} className="pm-p" role="button" tabIndex={0}
              aria-label={`${p.name}${p.title ? `, ${p.title}` : ''}. ${label(n.role)}. ${relText(p.relationship)}.${inf ? ` Inferred: ${p.why ?? 'no reason given'}.` : ''} Waiting on ${w}.`}
              onClick={open} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
              onMouseEnter={() => setTip(n)} onMouseLeave={() => setTip(null)} onFocus={() => setTip(n)} onBlur={() => setTip(null)}>
              <rect {...hit} y={n.y - 22} height="44" rx="3" className="pm-hit" />
              {inf && <circle cx={n.x} cy={n.y} r="14" className="pm-inf" />}
              <circle cx={n.x} cy={n.y} r="9" className={`pm-dot rel-${relKey(p.relationship)}`} />
              {w > 0 && <g className="pm-badge"><circle cx={n.x + 10} cy={n.y - 10} r="8" /><text x={n.x + 10} y={n.y - 6.5} textAnchor="middle">{w}</text></g>}
              <text x={tx(n)} y={n.y - 1} textAnchor={anchor(n)} className="pm-name">{clip(p.name, room)}</text>
              <text x={tx(n)} y={n.y + 14} textAnchor={anchor(n)} className="pm-sub">{clip(sub, room + 4)}</text>
            </g>)
        })}
      </svg>
      {tip?.p && (
        <div className="chart-tip" role="tooltip" style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }}>
          <b>{tip.p.name}</b>
          <span>{[tip.p.title, relText(tip.p.relationship)].filter(Boolean).join(' · ')}</span>
          {tip.p.basis === 'inferred' && <span>Inferred: {tip.p.why ?? 'no reason given'}</span>}
          {!!tip.p.waiting_on?.length && <span>Waiting on {tip.p.waiting_on.length}</span>}
        </div>)}
      <figcaption>
        <ul className="legend" aria-label="Legend">
          {['warm', 'neutral', 'guarded', 'none'].map(r => <li key={r}><svg className="glyph" width="12" height="12" viewBox="-8 -8 16 16" aria-hidden="true"><circle r="6" className={`pm-dot rel-${r}`} /></svg>{r === 'none' ? NOT_ON_FILE : r}</li>)}
          <li><svg className="glyph" width="16" height="16" viewBox="-9 -9 18 18" aria-hidden="true"><circle r="8" className="pm-inf" /><circle r="4" className="pm-dot rel-neutral" /></svg>inferred</li>
          <li><span className="badge-k" aria-hidden="true">2</span>waiting on</li>
        </ul>
      </figcaption>
    </figure>
  )
}

function PersonPanel({ sel, all, acct, onClose }: { sel: PowerPerson | null; all: PowerDeal[]; acct: string; onClose: () => void }) {
  const occ = sel ? all.flatMap(pd => ROLES.flatMap(r => (pd.roles[r.k] ?? []).filter(p => same(p, sel)).map(p => ({ pd, r, p })))) : []
  const waits = [...new Map(occ.flatMap(o => o.p.waiting_on ?? []).map(w => [`${w.text}|${w.since ?? ''}`, w])).values()]
  return (
    <Dialog.Root open={!!sel} onOpenChange={o => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="scrim" />
        <Dialog.Popup className="drawer">
          {sel && <>
            <div className="row between"><Dialog.Title className="drawer-title">{sel.name}</Dialog.Title><Dialog.Close className="icon-btn" aria-label="Close"><Icon n="close" /></Dialog.Close></div>
            <Dialog.Description className="muted">{[sel.title ?? 'Title not on file', SIDE[sel.side] ?? sel.side].join(' · ')}</Dialog.Description>
            <div className="row">
              <span className="rel-chip"><svg className="glyph" width="12" height="12" viewBox="-8 -8 16 16" aria-hidden="true"><circle r="6" className={`pm-dot rel-${relKey(sel.relationship)}`} /></svg>{relText(sel.relationship)}</span>
              <span className="role-tag">{sel.basis === 'inferred' ? 'inferred' : 'on record'}</span>
            </div>
            {sel.basis === 'inferred' && <p className="small"><span className="label">Why inferred</span><br />{sel.why ?? 'no reason given'}</p>}
            <dl className="dl">
              <dt>Roles</dt>
              <dd><ul className="stack tight">{occ.map((o, i) => <li key={i}><span className="role-tag">{o.r.label}</span> <a className="link" href={dealHref({ acct, key: dealKey(o.pd.deal) })} onClick={onClose}>{o.pd.deal.title}</a></li>)}</ul></dd>
              <dt>Waiting on · {waits.length}</dt>
              <dd>{waits.length ? <ul className="stack tight">{waits.map((w, i) => (
                <li key={i} className="wait"><span>{w.text}</span><span className="muted small mono">{w.since ? `since ${day(w.since)}` : 'since: not on file'}</span><Receipts rs={w.receipts} /></li>))}</ul>
                : <span className="muted">nothing on file</span>}</dd>
              <dt>Receipts</dt><dd><Receipts rs={uniq(occ.flatMap(o => o.p.receipts))} /></dd>
            </dl>
          </>}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** The map plus its person panel. Used by the Power map page and the deal page. */
export function PowerView({ acct, pd, all }: { acct: string; pd: PowerDeal; all: PowerDeal[] }) {
  const [sel, setSel] = useState<PowerPerson | null>(null)
  return <><PowerMap pd={pd} onPick={setSel} /><PersonPanel sel={sel} all={all} acct={acct} onClose={() => setSel(null)} /></>
}

const INFO = <p>Each lane is a role on the deal. Dot colour is the relationship on file; a dashed ring means the person is inferred, not on record. A grey dashed dot means nobody is on file for that role. Click a person for what they are waiting on.</p>

export function PowerPage({ route = [] }: { route?: string[] }) {
  const { book, account, names, unreachable } = useData()
  const [pick, setPick] = useState<string | null>(route[1] && route[2] ? `${route[1]}/${route[2]}` : null)
  const head = <PageHead title="Power map" info={INFO} />
  if (!book) return unreachable ? <Failed what="the power map" /> : <>{head}<Loading /></>
  if (!Object.values(book.accounts).some(a => a.power)) return <>{head}<NotAvailable what="The power map" /></>
  const list = Object.entries(book.accounts).filter(([id]) => account === 'all' || account === id)
    .flatMap(([id, a]) => (a.power?.deals ?? []).map(pd => ({ id, pd, all: a.power!.deals, k: `${id}/${dealKey(pd.deal)}` })))
  if (!list.length) return <>{head}<Empty title="No deals on the power map" /></>
  const sel = list.find(x => x.k === pick) ?? list[0]
  const many = new Set(list.map(x => x.id)).size > 1
  return (
    <>
      {head}
      <div className="picker" role="group" aria-label="Deal">
        {list.map(x => (
          <button key={x.k} type="button" className="pick" aria-pressed={x === sel} onClick={() => setPick(x.k)}>
            {many && <span className="pick-a">{shortName(names[x.id] ?? x.id)}</span>}{x.pd.deal.title}
          </button>))}
      </div>
      <section className="card" aria-label={sel.pd.deal.title}>
        <div className="row between"><h2 className="pm-title"><a className="link" href={dealHref({ acct: sel.id, key: dealKey(sel.pd.deal) })}>{sel.pd.deal.title}</a></h2><BandChip k={sel.pd.deal.band} /></div>
        <PowerView key={sel.k} acct={sel.id} pd={sel.pd} all={sel.all} />
      </section>
    </>
  )
}
