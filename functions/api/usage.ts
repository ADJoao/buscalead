import { json, type AuthData, type Env } from '../../server/env'
import { sbFetch } from '../../server/supabaseRest'

export const onRequestGet: PagesFunction<Env, string, AuthData> = async ({ env, data }) => {
  if (!data.token) return json({ monthUsd: 0, count: 0 })
  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)
  const res = await sbFetch(env, data.token, `ai_usage?select=cost_usd&created_at=gte.${start.toISOString()}`)
  if (!res.ok) return json({ monthUsd: 0, count: 0 })
  const rows = (await res.json()) as { cost_usd: number }[]
  return json({ monthUsd: rows.reduce((s, r) => s + Number(r.cost_usd), 0), count: rows.length })
}
