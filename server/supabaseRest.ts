import type { Env } from './env'

/** Chamadas REST ao Supabase usando o token do próprio usuário (RLS garante que só ele vê os dados). */
export async function sbFetch(env: Env, token: string, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_ANON_KEY ?? '',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

export async function verifyUser(env: Env, token: string): Promise<string | null> {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY ?? '', authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const u = (await res.json()) as { id?: string }
  return u.id ?? null
}
