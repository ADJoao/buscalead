import { useCallback, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Splash } from './components/Splash'
import { useStore } from './lib/store'
import { Achievements } from './pages/Achievements'
import { Agenda } from './pages/Agenda'
import { Appearance } from './pages/Appearance'
import { Dashboard } from './pages/Dashboard'
import { Leads } from './pages/Leads'
import { Login, NewPassword } from './pages/Login'
import { Niches } from './pages/Niches'
import { Pipeline } from './pages/Pipeline'
import { Proposal } from './pages/Proposal'
import { Prospect } from './pages/Prospect'
import { Routes as RoutesPage } from './pages/Routes'
import { Settings } from './pages/Settings'

export function App() {
  const { mode, session, authReady, loading, settings, recovery, endRecovery, toast } = useStore()
  const [splashDone, setSplashDone] = useState(false)
  const done = useCallback(() => setSplashDone(true), [])
  if (recovery && session) return <NewPassword onDone={() => { endRecovery(); toast('Senha nova salva') }} />
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
          <Route path="rotas" element={<RoutesPage />} />
          <Route path="nichos" element={<Niches />} />
          <Route path="config" element={<Settings />} />
          <Route path="personalizar" element={<Appearance />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="conquistas" element={<Achievements />} />
          <Route path="proposta/:id" element={<Proposal />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
