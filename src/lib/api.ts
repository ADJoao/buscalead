import { supabase } from './supabase'
import type { AnalyzeRequest, AnalyzeResponse, PlaceResult, SiteAudit } from './shared/types'

async function authHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = { 'content-type': 'application/json' }
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    if (data.session) h.authorization = `Bearer ${data.session.access_token}`
  }
  return h
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body) })
  const text = await res.text()
  let data: T & { error?: string }
  try {
    data = JSON.parse(text.trim())
  } catch {
    throw new Error(res.ok ? 'Resposta inválida do servidor' : `Servidor indisponível (${res.status}). As funções da Cloudflare estão rodando?`)
  }
  if (!res.ok || data.error) throw new Error(data.error ?? `Erro ${res.status}`)
  return data
}

export type PlaceHit = PlaceResult & { searchString?: string }

export function searchPlaces(query: string, languageCode: string, regionCode: string, pages: number) {
  return post<{ places: PlaceHit[]; requests: number; provider: 'apify' | 'google' }>('/api/places', { query, languageCode, regionCode, pages })
}

export function searchPlacesBatch(queries: string[], languageCode: string, regionCode: string, pages: number) {
  return post<{ places: PlaceHit[]; requests: number; provider: 'apify' | 'google' }>('/api/places', { queries, languageCode, regionCode, pages })
}

export function inspectSites(urls: string[]) {
  return post<{ audits: Record<string, SiteAudit> }>('/api/inspect', { urls })
}

export function analyzeLead(req: AnalyzeRequest) {
  return post<AnalyzeResponse>('/api/analyze', req)
}

export async function serverStatus(): Promise<{ google: boolean; apify: boolean; anthropic: boolean; supabase: boolean } | null> {
  try {
    const res = await fetch('/api/status', { headers: await authHeaders() })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function aiUsage(): Promise<{ monthUsd: number; count: number } | null> {
  try {
    const res = await fetch('/api/usage', { headers: await authHeaders() })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** Uso da cota grátis do Google neste mês (contado neste navegador). */
export function placesUsage(add = 0): number {
  const month = new Date().toISOString().slice(0, 7)
  try {
    const raw = JSON.parse(localStorage.getItem('bl.placesUsage') ?? '{}') as { month?: string; count?: number }
    const count = (raw.month === month ? raw.count ?? 0 : 0) + add
    if (add) localStorage.setItem('bl.placesUsage', JSON.stringify({ month, count }))
    return count
  } catch {
    return 0
  }
}

/** Custo de IA deste mês no modo local (sem Supabase). */
export function localAiSpend(addUsd = 0): number {
  const month = new Date().toISOString().slice(0, 7)
  try {
    const raw = JSON.parse(localStorage.getItem('bl.aiSpend') ?? '{}') as { month?: string; usd?: number }
    const usd = (raw.month === month ? raw.usd ?? 0 : 0) + addUsd
    if (addUsd) localStorage.setItem('bl.aiSpend', JSON.stringify({ month, usd }))
    return usd
  } catch {
    return 0
  }
}
