import { json, type Env } from '../../server/env'

// Valores públicos (a chave anon do Supabase é feita para o navegador; o RLS protege os dados).
export const onRequestGet: PagesFunction<Env> = async ({ env }) =>
  json({ supabaseUrl: env.SUPABASE_URL ?? null, supabaseAnonKey: env.SUPABASE_ANON_KEY ?? null })
