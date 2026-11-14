import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Popover } from '@base-ui/react/popover'
import { DataCtx, useApi, useBook, useData, type ActivityItem, type Person } from './api'
import { AccountsPage } from './accounts'
import { Home } from './home'
import { Ago, ToastHost, toast } from './live'
import { ActivityPage, DealPage, DealsPage, MovesPage, NotesPage, PeoplePage, SyncPage, dealHref } from './pages'
import { Failed, Icon, bandName, dealsOf, when } from './ui'

export { money } from './ui'

const NAV = [
  { path: 'home', label: 'Home', icon: 'home', key: 'h' },
  { path: 'accounts', label: 'Accounts', icon: 'accounts', key: 'c' },
  { path: 'deals', label: 'Deals', icon: 'deals', key: 'd' },
  { path: 'people', label: 'People', icon: 'people', key: 'p' },
  { path: 'activity', label: 'Activity', icon: 'activity', key: 'a' },
  { path: 'moves', label: 'Moves', icon: 'moves', key: 'm' },
  { path: 'notes', label: 'Notes', icon: 'notes', key: 'n' },
  { path: 'sync', label: 'Sync', icon: 'sync', key: 's' },
]
const go = (path: string) => { window.location.hash = `#/${path === 'home' ? '' : path}` }

function useHash() {
  const [h, setH] = useState(window.location.hash)
  useEffect(() => { const f = () => setH(window.location.hash); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f) }, [])
  const parts = h.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  return parts
}

function useTheme() {
  const [t, setT] = useState<'light' | 'dark'>(() => {
    try { const v = localStorage.getItem('book.theme'); if (v === 'light' || v === 'dark') return v } catch { /* no memory */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => { document.documentElement.dataset.theme = t; try { localStorage.setItem('book.theme', t) } catch { /* private mode */ } }, [t])
  return [t, () => setT(x => (x === 'light' ? 'dark' : 'light'))] as const
}

// ---------- command palette + global search ----------
type Hit = { key: string; group: string; label: string; sub?: string; to: string }
function Palette({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const { book } = useData()
  const ppl = useApi<{ people: Person[] }>(open ? '/api/people' : null)
  const act = useApi<{ items: ActivityItem[] }>(open ? '/api/activity' : null)
  const [q, setQ] = useState(''); const [i, setI] = useState(0)
  useEffect(() => { if (open) { setQ(''); setI(0) } }, [open])
  const hits = useMemo<Hit[]>(() => {
    const s = q.trim().toLowerCase()
    const pages: Hit[] = NAV.map(n => ({ key: `p${n.path}`, group: 'Go to', label: n.label, to: n.path }))
    if (!s) return pages
    const has = (...v: (string | null | undefined)[]) => v.join(' ').toLowerCase().includes(s)
    return [
      ...pages.filter(p => has(p.label)),
      ...dealsOf(book).filter(d => has(d.title, d.id)).slice(0, 6).map(d => ({ key: `d${d.acct}${d.key}`, group: 'Deals', label: d.title, sub: `${d.acct.toUpperCase()} · ${bandName(d.band)}`, to: dealHref(d).slice(2) })),
      ...(ppl.data?.people ?? []).filter(p => has(p.name, p.title, p.org)).slice(0, 5).map(p => ({ key: `u${p.id}`, group: 'People', label: p.name, sub: `${p.account.toUpperCase()} · ${p.title ?? p.org ?? ''}`, to: 'people' })),
      ...(act.data?.items ?? []).filter(a => has(a.title, a.summary)).slice(0, 5).map(a => ({ key: `a${a.id}`, group: 'Activity', label: a.title, sub: `${a.kind} · ${a.account.toUpperCase()}`, to: 'activity' })),
    ]
  }, [q, book, ppl.data, act.data])
  const pick = (h?: Hit) => { if (!h) return; setOpen(false); go(h.to) }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI(x => Math.min(x + 1, hits.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI(x => Math.max(x - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(hits[i]) }
  }
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="scrim" />
        <Dialog.Popup className="palette">
          <Dialog.Title className="sr-only">Search and commands</Dialog.Title>
          <div className="palette-in"><Icon n="search" />
            <input autoFocus role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={hits[i] ? `opt-${hits[i].key}` : undefined}
              aria-label="Search deals, people, activity" placeholder="Search deals, people, activity, or jump to a page" value={q} onChange={e => { setQ(e.target.value); setI(0) }} onKeyDown={onKey} /></div>
          <ul id="palette-list" role="listbox" className="palette-list">
            {hits.map((h, n) => (
              <li key={h.key} id={`opt-${h.key}`} role="option" aria-selected={n === i} className={n === i ? 'on' : ''} onMouseMove={() => setI(n)} onClick={() => pick(h)}>
                <span className="grp">{h.group}</span><span className="grow">{h.label}</span>{h.sub && <span className="muted small">{h.sub}</span>}
              </li>))}
            {!hits.length && <li className="muted palette-none">Nothing matches "{q}".</li>}
          </ul>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ---------- bell ----------
function Bell({ onSeen }: { onSeen: () => void }) {
  const { book, names } = useData()
  const c = book?.changes
  const n = c ? c.moved.length + c.new_deals.length + c.new_signals.length : 0
  return (
    <Popover.Root>
      <Popover.Trigger className="icon-btn bell" aria-label={`What changed, ${n} ${n === 1 ? 'item' : 'items'}`}><Icon n="bell" />{n > 0 && <span className="badge" aria-hidden="true">{n}</span>}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end">
          <Popover.Popup className="popup bell-pop">
            {!c || !n ? <p className="muted">Nothing changed since you last looked.</p> : (
              <ul className="stack tight">
                {c.new_signals.slice(0, 4).map(s => <li key={s.id}><span className="rtag">New signal</span> {s.title ?? s.id}</li>)}
                {c.moved.slice(0, 4).map(m => <li key={m.account + m.deal}><span className="rtag">Moved</span> {m.title} <span className="muted">· {names[m.account] ?? m.account}</span>{m.band && <span className="muted">, {bandName(m.band.from)} to {bandName(m.band.to)}</span>}</li>)}
                {c.new_deals.slice(0, 4).map(d => <li key={d.account + d.deal}><span className="rtag">New deal</span> {d.title}</li>)}
              </ul>)}
            <div className="row"><a className="link" href="#/" onClick={() => document.dispatchEvent(new Event('pointerdown'))}>See all on Home</a>{n > 0 && <button type="button" className="btn ghost" onClick={onSeen}>Clear</button>}</div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

export default function App() {
  const { book, markSeen, health, unreachable, changed, clearChanged, resync, resyncing, resyncError } = useBook()
  const parts = useHash()
  const [theme, toggleTheme] = useTheme()
  const [account, setAccount] = useState('all')
  const [palette, setPalette] = useState(false)
  const [nav, setNav] = useState(false)
  const [note, setNote] = useState('')
  const gPending = useRef(0)
  useEffect(() => { setNote(changed.size ? `${changed.size} ${changed.size === 1 ? 'item' : 'items'} changed` : '') }, [changed])
  const seenN = useRef(0)
  useEffect(() => { if (changed.size > seenN.current) toast(`${changed.size} ${changed.size === 1 ? 'item' : 'items'} changed since the last sync`); seenN.current = changed.size }, [changed])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(o => !o); return }
      const el = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable) return
      if (e.key === 'g') { gPending.current = Date.now(); return }
      if (Date.now() - gPending.current < 1200) {
        const t = NAV.find(n => n.key === e.key)
        gPending.current = 0
        if (t) go(t.path)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => { setNav(false); document.getElementById('main')?.focus({ preventScroll: true }) }, [parts.join('/')])

  const asOf = when(book?.as_of ?? null)
  const accounts = Object.entries(book?.accounts ?? {})
  const names = Object.fromEntries(accounts.map(([id, a]) => [id, a.name ?? id]))
  const mcpDown = unreachable || !!health?.stale
  const banner = unreachable
    ? `Can't reach the app. Showing data${asOf ? ` as of ${asOf}` : ' (none yet)'}.`
    : health?.stale
      ? `MCP unreachable. Showing data last fetched ${when(health.last_good_poll) ?? 'never (no successful fetch yet)'}.`
      : null
  const left = health?.resync_at ? health.pending_calls ?? 0 : 0
  const progress = left > 0 ? `Resyncing · ${left} ${left === 1 ? 'call' : 'calls'} left (about ${left} ${left === 1 ? 'minute' : 'minutes'}, 1 call a minute)` : null
  const route = parts[0] ?? 'home'
  const ctx = { book, health, unreachable, account, mcpDown, names, asOf: book?.as_of ?? null }

  const links = (cls: string) => NAV.map(n => (
    <a key={n.path} href={`#/${n.path === 'home' ? '' : n.path}`} className={`${cls}${route === n.path ? ' active' : ''}`} aria-current={route === n.path ? 'page' : undefined}>
      <Icon n={n.icon} /><span>{n.label}</span><kbd className="hint">g {n.key}</kbd>
    </a>))

  let page
  if (route === 'deals' && parts[1] && parts[2]) page = <DealPage acct={parts[1]} k={parts[2]} />
  else if (route === 'accounts') page = <AccountsPage route={parts} />
  else if (route === 'deals') page = <DealsPage />
  else if (route === 'people') page = <PeoplePage />
  else if (route === 'activity') page = <ActivityPage />
  else if (route === 'moves') page = <MovesPage />
  else if (route === 'notes') page = <NotesPage />
  else if (route === 'sync') page = <SyncPage health={health} progress={progress} resync={resync} resyncing={resyncing} resyncError={resyncError} />
  else if (!book && unreachable) page = <Failed what="the book" />
  else page = <Home book={book} changed={changed} names={names} markSeen={markSeen} account={account} />

  return (
    <DataCtx.Provider value={ctx}>
      <div className="shell" onPointerDown={clearChanged}>
        <a className="skip" href="#main" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus() }}>Skip to content</a>
        <aside className="side" aria-label="Primary">
          <div className="brand">Book<b>Tool</b></div>
          <nav className="nav">{links('nav-link')}</nav>
          <p className="side-foot muted small">Keys: g then h d p a m n s. ⌘K searches.</p>
        </aside>
        <div className="content">
          <header className={`bar${banner ? ' stale' : ''}`}>
            <button type="button" className="icon-btn menu-btn" aria-label="Open navigation" onClick={() => setNav(true)}><Icon n="menu" /></button>
            <button type="button" className="search" onClick={() => setPalette(true)} aria-label="Search deals, people, activity"><Icon n="search" size={16} /><span>Search</span><kbd>⌘K</kbd></button>
            <div className="seg acct" role="group" aria-label="Account filter">
              {['all', ...accounts.map(([id]) => id)].map(id => (
                <button key={id} type="button" aria-pressed={account === id} title={id === 'all' ? 'All accounts' : names[id]} onClick={() => setAccount(id)}>{id === 'all' ? 'All' : id.toUpperCase()}</button>))}
            </div>
            <span className="chip" title={book?.as_of ?? undefined}><i className="dot" aria-hidden="true" />{banner ? `Stale${asOf ? ` · as of ${asOf}` : ''}` : asOf ? `As of ${asOf} · live` : 'Waiting for first sync'}{!banner && asOf && <Ago iso={health?.last_good_poll} />}</span>
            <Bell onSeen={markSeen} />
            <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}><Icon n={theme === 'dark' ? 'sun' : 'moon'} /></button>
            <button type="button" className="btn resync" onClick={resync} disabled={resyncing}>{resyncing ? 'Resyncing…' : 'Resync now'}</button>
          </header>
          {banner && <div className="banner" role="alert">{banner}</div>}
          {route !== 'sync' && progress && <div className="banner info" role="status">{progress}</div>}
          {route !== 'sync' && resyncError && <div className="banner" role="alert">{resyncError}</div>}
          <div className="sr-only" role="status" aria-live="polite">{note}</div>
          <main id="main" tabIndex={-1}>{page}</main>
          <ToastHost />
        </div>
        <Dialog.Root open={nav} onOpenChange={setNav}>
          <Dialog.Portal>
            <Dialog.Backdrop className="scrim" />
            <Dialog.Popup className="drawer left">
              <div className="row between"><Dialog.Title className="drawer-title">Book Tool</Dialog.Title><Dialog.Close className="icon-btn" aria-label="Close navigation"><Icon n="close" /></Dialog.Close></div>
              <nav className="nav">{links('nav-link')}</nav>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
        <Palette open={palette} setOpen={setPalette} />
      </div>
    </DataCtx.Provider>
  )
}
