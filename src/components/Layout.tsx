import { CalendarCheck2, Columns3, Eye, EyeOff, Gem, LayoutDashboard, LogOut, Palette, Radar, Route, Search, Settings2, Trophy, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ACHIEVEMENTS, computeStats, levelOf, xpOf } from '../lib/achievements'
import { celebrate } from '../lib/fx'
import { CommandPalette } from './CommandPalette'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAppearance } from '../lib/theme'
import { useStore } from '../lib/store'
import { LeadDrawer } from './LeadDrawer'
import { Toasts } from './ui'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarCheck2, due: true },
  { to: '/prospectar', label: 'Buscar leads', icon: Radar },
  { to: '/leads', label: 'Leads', icon: Users, count: true },
  { to: '/pipeline', label: 'Pipeline', icon: Columns3 },
  { to: '/rotas', label: 'Rotas', icon: Route },
  { to: '/nichos', label: 'Nichos', icon: Gem },
  { to: '/conquistas', label: 'Conquistas', icon: Trophy },
] as { to: string; label: string; icon: typeof Gem; end?: boolean; count?: boolean; due?: boolean }[]

const MOBILE = ['/', '/agenda', '/prospectar', '/leads', '/pipeline', '/rotas']

const lsGet = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sem armazenamento */ } }

export function Layout() {
  const { leads, realLeads, settings, mode, session, signOut, drawer, toast, loading } = useStore()
  const active = leads.filter((l) => l.stage !== 'perdido').length
  const loc = useLocation()
  const look = useAppearance()
  const [privacy, setPrivacyState] = useState(() => lsGet('bl.private') === '1')
  const setPrivacy = (v: boolean) => { setPrivacyState(v); lsSet('bl.private', v ? '1' : '0') }
  useEffect(() => { document.documentElement.dataset.private = privacy ? 'on' : 'off' }, [privacy])

  const end = new Date(); end.setHours(23, 59, 59, 999)
  const due = leads.filter((l) => l.nextActionAt && l.stage !== 'perdido' && new Date(l.nextActionAt) <= end).length

  // nível e conquistas (só com dados reais, nunca com a demonstração)
  const stats = useMemo(() => computeStats(realLeads), [realLeads])
  const xp = xpOf(stats)
  const lv = levelOf(xp)
  useEffect(() => {
    if (loading) return
    const got = ACHIEVEMENTS.filter((a) => a.value(stats) >= a.goal).map((a) => a.id)
    const seenRaw = lsGet('bl.ach.seen')
    const seen = new Set<string>(seenRaw ? JSON.parse(seenRaw) : got)
    const fresh = got.filter((id) => !seen.has(id))
    lsSet('bl.ach.seen', JSON.stringify([...new Set([...seen, ...got])]))
    if (!seenRaw || !fresh.length) return
    const a = ACHIEVEMENTS.find((x) => x.id === fresh[0])!
    setTimeout(() => {
      celebrate('success')
      toast(`${a.emoji} Conquista desbloqueada: ${a.title}${fresh.length > 1 ? ` (+${fresh.length - 1})` : ''}`)
    }, 1300)
  }, [stats, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Search size={19} strokeWidth={2.8} /></div>
          <div>
            <div className="brand-name">{look.brandName?.trim() || 'BuscaLead'}</div>
            <div className="brand-sub">{settings.agencyName}</div>
          </div>
        </div>
        <div className="side-tools">
          <button className="side-search" onClick={() => window.dispatchEvent(new Event('bl:palette'))}>
            <Search size={15} /> Buscar... <span className="kbd">Ctrl K</span>
          </button>
          <button className={`btn icon sm ${privacy ? 'on-priv' : ''}`} title={privacy ? 'Mostrar valores' : 'Esconder valores (para mostrar a tela a alguém)'} onClick={() => setPrivacy(!privacy)}>
            {privacy ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <n.icon size={18} />
            {n.label}
            {n.count && <span className="count">{active}</span>}
            {n.due && due > 0 && <span className="count due">{due}</span>}
          </NavLink>
        ))}
        <div className="nav-sep" />
        <NavLink to="/personalizar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Palette size={18} /> Personalizar
        </NavLink>
        <NavLink to="/config" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings2 size={18} /> Configurações
        </NavLink>
        <div className="sidebar-foot">
          <NavLink to="/conquistas" className="level-mini" title={`${xp} XP`}>
            <span className="level-badge sm"><span>{lv.n}</span></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>{lv.name}</b>
              <span className="xp-bar sm"><i style={{ width: `${Math.round(lv.progress * 100)}%` }} /></span>
            </span>
            {stats.streak > 0 && <span className="streak-mini" title="dias seguidos prospectando">🔥{stats.streak}</span>}
          </NavLink>
          {settings.demoMode && <span className="demo-badge" style={{ alignSelf: 'flex-start' }}>MODO DEMO</span>}
          <div className="glass" style={{ padding: 12, borderRadius: 14 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="pulse" />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{mode === 'supabase' ? 'Sincronizado' : 'Modo local'}</span>
            </div>
            <div className="dim" style={{ fontSize: 11.5, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {mode === 'supabase' ? session?.user.email : 'Dados só neste navegador'}
            </div>
          </div>
          {mode === 'supabase' && (
            <button className="nav-item" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={signOut}>
              <LogOut size={18} /> Sair
            </button>
          )}
        </div>
      </aside>

      <main className="main">
        <div key={loc.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      <nav className="mobile-nav">
        {[...NAV.filter((n) => MOBILE.includes(n.to)), { to: '/config', label: 'Config', icon: Settings2, end: false }].map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <n.icon size={20} />
            {n.label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>

      {drawer && <LeadDrawer />}
      <Toasts />
      <CommandPalette privacy={privacy} setPrivacy={setPrivacy} />
    </div>
  )
}
