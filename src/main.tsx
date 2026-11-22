import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { StoreProvider } from './lib/store'
import { initSupabase } from './lib/supabase'
import './styles.css'

initSupabase().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <StoreProvider>
        <App />
      </StoreProvider>
    </StrictMode>,
  )
})

// Deixa o app instalável (Adicionar à tela inicial).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined))
}
