import { useCallback, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Splash } from './components/Splash'
import { useStore } from './lib/store'
import { Dashboard } from './pages/Dashboard'
import { Leads } from './pages/Leads'
import { Login } from './pages/Login'
import { Niches } from './pages/Niches'
import { Pipeline } from './pages/Pipeline'
import { Prospect } from './pages/Prospect'
import { Settings } from './pages/Settings'

export function App() {
  const { mode, session, authReady, loading, settings } = useStore()
  const [splashDone, setSplashDone] = useState(false)
  const done = useCallback(() => setSplashDone(true), [])
  if (authReady && mode === 'supabase' && !session) return <Login />
  const ready = authReady && !loading
  if (!splashDone) return <Splash ready={ready} name={settings.ownerName} onDone={done} />
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
