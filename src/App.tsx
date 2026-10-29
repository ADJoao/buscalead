import { Loader2 } from 'lucide-react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useStore } from './lib/store'
import { Dashboard } from './pages/Dashboard'
import { Leads } from './pages/Leads'
import { Login } from './pages/Login'
import { Niches } from './pages/Niches'
import { Pipeline } from './pages/Pipeline'
import { Prospect } from './pages/Prospect'
import { Settings } from './pages/Settings'

export function App() {
  const { mode, session, authReady, loading } = useStore()
  if (!authReady || (loading && (mode === 'local' || session))) {
    return <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}><Loader2 className="spin accent" /></div>
  }
  if (mode === 'supabase' && !session) return <Login />
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="prospectar" element={<Prospect />} />
          <Route path="leads" element={<Leads />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="nichos" element={<Niches />} />
          <Route path="config" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
