import { json, type AuthData, type Env } from '../../server/env'
import { verifyUser } from '../../server/supabaseRest'

// Toda rota /api exige login no Supabase. Isso impede que alguém use suas chaves do Google/Anthropic.
export const onRequest: PagesFunction<Env, string, AuthData> = async (ctx) => {
  const { env, request } = ctx
  const supabaseOn = Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY)

  if (!supabaseOn) {
    if (env.ALLOW_NO_AUTH === 'true') return ctx.next()
    return json({ error: 'Servidor sem Supabase configurado (SUPABASE_URL / SUPABASE_ANON_KEY).' }, 503)
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Faça login.' }, 401)
  const userId = await verifyUser(env, token)
  if (!userId) return json({ error: 'Sessão expirada. Entre de novo.' }, 401)
  ctx.data.userId = userId
  ctx.data.token = token
  return ctx.next()
}
