import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { StoreProvider } from './lib/store'
import { installFx } from './lib/fx'
import { initSupabase } from './lib/supabase'
import { applyAppearance, loadAppearance } from './lib/theme'
import './styles.css'

// aparência salva neste aparelho entra antes de tudo (até na tela de abertura)
applyAppearance(loadAppearance())
installFx()

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
