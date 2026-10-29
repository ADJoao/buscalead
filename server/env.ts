export interface Env {
  GOOGLE_PLACES_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
  ALLOW_NO_AUTH?: string
}

export type AuthData = {
  userId?: string
  token?: string
  [key: string]: unknown
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
