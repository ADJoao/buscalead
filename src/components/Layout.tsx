import { Columns3, Gem, LayoutDashboard, LogOut, Radar, Search, Settings2, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../lib/store'
import { LeadDrawer } from './LeadDrawer'
import { Toasts } from './ui'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/prospectar', label: 'Buscar leads', icon: Radar },
  { to: '/leads', label: 'Leads', icon: Users, count: true },
  { to: '/pipeline', label: 'Pipeline', icon: Columns3 },
  { to: '/nichos', label: 'Nichos', icon: Gem },
]

export function Layout() {
  const { leads, settings, mode, session, signOut, drawer } = useStore()
  const active = leads.filter((l) => l.stage !== 'perdido').length

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Search size={19} strokeWidth={2.8} /></div>
          <div>
            <div className="brand-name">BuscaLead</div>
            <div className="brand-sub">{settings.agencyName}</div>
          </div>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <n.icon size={18} />
            {n.label}
            {n.count && <span className="count">{active}</span>}
          </NavLink>
        ))}
        <div className="nav-sep" />
        <NavLink to="/config" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings2 size={18} /> Configurações
        </NavLink>
        <div className="sidebar-foot">
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
        <Outlet />
      </main>

      <nav className="mobile-nav">
        {[...NAV, { to: '/config', label: 'Config', icon: Settings2, end: false }].map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <n.icon size={20} />
            {n.label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>

      {drawer && <LeadDrawer />}
      <Toasts />
    </div>
  )
}
