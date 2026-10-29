import type { AnalyzeRequest } from '../../src/lib/shared/types'
import { runAnalysis } from '../../server/analyze'
import { json, type AuthData, type Env } from '../../server/env'
import { placeDetails } from '../../server/places'
import { auditSite } from '../../server/siteAudit'
import { sbFetch } from '../../server/supabaseRest'

const MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5'] as const
const LANG = { BR: 'pt-BR', PT: 'pt-PT', US: 'en' } as const

async function monthSpendUsd(env: Env, token: string): Promise<number> {
  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)
  const res = await sbFetch(env, token, `ai_usage?select=cost_usd&created_at=gte.${start.toISOString()}`)
  if (!res.ok) return 0
  const rows = (await res.json()) as { cost_usd: number }[]
  return rows.reduce((s, r) => s + Number(r.cost_usd), 0)
}

async function monthlyLimitUsd(env: Env, token: string): Promise<number | null> {
  const res = await sbFetch(env, token, 'user_settings?select=data')
  if (!res.ok) return null
  const rows = (await res.json()) as { data: { aiMonthlyLimitBrl?: number; usdBrl?: number } }[]
  const s = rows[0]?.data
  if (!s?.aiMonthlyLimitBrl) return null
  return s.aiMonthlyLimitBrl / (s.usdBrl || 5.5)
}

export const onRequestPost: PagesFunction<Env, string, AuthData> = async ({ env, request, data, waitUntil }) => {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'Chave da Anthropic não configurada (ANTHROPIC_API_KEY).' }, 503)
  const req = (await request.json()) as AnalyzeRequest
  if (!MODELS.includes(req.model)) req.model = 'claude-opus-5-5'
  if (!req.lead?.name) return json({ error: 'Lead inválido.' }, 400)

  if (data.token) {
    const [spent, limit] = await Promise.all([monthSpendUsd(env, data.token), monthlyLimitUsd(env, data.token)])
    if (limit !== null && spent >= limit) {
      return json({ error: `Limite mensal de IA atingido (US$ ${spent.toFixed(2)}). Aumente em Configurações.` }, 402)
    }
  }

  // A análise pode levar 1–2 min. Mandamos espaços enquanto isso para a conexão não cair, e o JSON no fim.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const enc = new TextEncoder()
  const beat = setInterval(() => writer.write(enc.encode(' ')).catch(() => {}), 8000)

  const work = (async () => {
    try {
      const [details, site] = await Promise.all([
        req.lead.placeId && env.GOOGLE_PLACES_API_KEY
          ? placeDetails(env.GOOGLE_PLACES_API_KEY, req.lead.placeId, LANG[req.market]).catch(() => null)
          : Promise.resolve(null),
        req.lead.website && ['bad', 'weak', 'good', 'unknown'].includes(req.lead.siteStatus)
          ? auditSite(req.lead.website, true).catch(() => null)
          : Promise.resolve(null),
      ])
      const result = await runAnalysis(env.ANTHROPIC_API_KEY!, req, details, site?.textSample)
      if (data.token) {
        await sbFetch(env, data.token, 'ai_usage', {
          method: 'POST',
          headers: { prefer: 'return=minimal' },
          body: JSON.stringify({
            lead_name: req.lead.name,
            model: result.meta.model,
            input_tokens: result.meta.inputTokens,
            output_tokens: result.meta.outputTokens,
            web_searches: result.meta.webSearches,
            cost_usd: result.meta.costUsd,
          }),
        }).catch(() => {})
      }
      await writer.write(enc.encode(JSON.stringify(result)))
    } catch (e) {
      await writer.write(enc.encode(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro na análise' })))
    } finally {
      clearInterval(beat)
      await writer.close().catch(() => {})
    }
  })()

  waitUntil(work)
  return new Response(readable, {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
