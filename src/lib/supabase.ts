import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** null = modo local (dados só neste navegador). */
export let supabase: SupabaseClient | null = null

/**
 * Lê a URL e a chave pública do Supabase. Primeiro das variáveis de build (VITE_*),
 * senão do servidor (/api/config), assim basta configurar as variáveis na Cloudflare.
 */
export async function initSupabase(): Promise<void> {
  let url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  let key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !key) {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const cfg = (await res.json()) as { supabaseUrl?: string; supabaseAnonKey?: string }
        url = cfg.supabaseUrl
        key = cfg.supabaseAnonKey
      }
    } catch {
      /* sem servidor: modo local */
    }
  }
  if (url && key) supabase = createClient(url, key)
}
