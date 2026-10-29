import { inspectSites, placesUsage, searchPlaces } from './api'
import { CITIES, MARKET_INFO, type City } from './locations'
import { NICHE_BY_ID, guessNiche } from './niches'
import { exclusionReason, scoreLead, type FilterRules } from './scoring'
import { instagramHandle, isSocialUrl } from './shared/site'
import type { Market, PlaceResult, SiteAudit, SiteStatus } from './shared/types'
import type { Lead } from './types'

export interface SearchParams {
  market: Market
  cityIds: string[]
  customCity?: string
  areas: Record<string, string[]> // cidade -> bairros escolhidos
  nicheIds: string[]
  depth: 1 | 2 | 3 // páginas por busca (20 resultados cada)
  allTerms: boolean
  rules: FilterRules
  existingPlaceIds: Set<string>
}

export interface SearchQuery {
  text: string
  nicheId: string
  city: string
}

export interface SearchProgress {
  phase: 'google' | 'sites' | 'ranking' | 'done'
  done: number
  total: number
  found: number
  label: string
}

export interface Removed {
  name: string
  reason: string
  rating?: number
  reviews: number
}

export interface SearchOutcome {
  leads: Lead[]
  removed: Removed[]
  googleRequests: number
  errors: string[]
}

export function buildQueries(p: SearchParams): SearchQuery[] {
  const lang = MARKET_INFO[p.market].lang
  const conn = MARKET_INFO[p.market].connector
  const cities: { city: City | { name: string; query: string }; areas: string[] }[] = p.cityIds
    .map((id) => CITIES.find((c) => c.id === id))
    .filter((c): c is City => Boolean(c))
    .map((c) => ({ city: c, areas: p.areas[c.id] ?? [] }))
  if (p.customCity?.trim()) cities.push({ city: { name: p.customCity.trim(), query: p.customCity.trim() }, areas: [] })

  const out: SearchQuery[] = []
  for (const nicheId of p.nicheIds) {
    const n = NICHE_BY_ID[nicheId]
    if (!n) continue
    const terms = p.allTerms ? n.queries[lang] : n.queries[lang].slice(0, 1)
    for (const term of terms) {
      for (const { city, areas } of cities) {
        if (areas.length) for (const a of areas) out.push({ text: `${term} ${conn} ${a}, ${city.query}`, nicheId, city: city.name })
        else out.push({ text: `${term} ${conn} ${city.query}`, nicheId, city: city.name })
      }
    }
  }
  return out
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  let i = 0
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++]
      await fn(item)
    }
  })
  await Promise.all(workers)
}

function initialSiteStatus(p: PlaceResult): SiteStatus {
  if (!p.website) return 'none'
  if (isSocialUrl(p.website)) return 'social'
  return 'pending'
}

export async function runSearch(
  params: SearchParams,
  onProgress: (p: SearchProgress) => void,
  signal: { cancelled: boolean },
): Promise<SearchOutcome> {
  const queries = buildQueries(params)
  const found = new Map<string, { place: PlaceResult; nicheId: string; city: string }>()
  const errors: string[] = []
  let googleRequests = 0
  let done = 0
  const lang = MARKET_INFO[params.market].lang
  const region = MARKET_INFO[params.market].region

  onProgress({ phase: 'google', done: 0, total: queries.length, found: 0, label: 'Buscando no Google Maps…' })
  await pool(queries, 3, async (q) => {
    if (signal.cancelled) return
    try {
      const r = await searchPlaces(q.text, lang, region, params.depth)
      googleRequests += r.requests
      placesUsage(r.requests)
      for (const p of r.places) if (!found.has(p.placeId)) found.set(p.placeId, { place: p, nicheId: q.nicheId, city: q.city })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!errors.includes(msg)) errors.push(msg)
    }
    done++
    onProgress({ phase: 'google', done, total: queries.length, found: found.size, label: q.text })
  })

  // 1º filtro (antes de abrir sites): reputação, franquias, fechados
  const removed: Removed[] = []
  const candidates: { place: PlaceResult; nicheId: string; city: string; siteStatus: SiteStatus }[] = []
  for (const f of found.values()) {
    const siteStatus = initialSiteStatus(f.place)
    const reason = exclusionReason(f.place, siteStatus === 'pending' ? 'unknown' : siteStatus, params.rules)
    if (reason) removed.push({ name: f.place.name, reason, rating: f.place.rating, reviews: f.place.reviews })
    else candidates.push({ ...f, siteStatus })
  }

  // 2º: abre os sites para ver se são ruins
  const toInspect = Array.from(new Set(candidates.filter((c) => c.siteStatus === 'pending').map((c) => c.place.website!)))
  const audits: Record<string, SiteAudit> = {}
  const batches: string[][] = []
  for (let i = 0; i < toInspect.length; i += 6) batches.push(toInspect.slice(i, i + 6))
  let sitesDone = 0
  onProgress({ phase: 'sites', done: 0, total: toInspect.length, found: candidates.length, label: 'Abrindo os sites para avaliar…' })
  await pool(batches, 4, async (batch) => {
    if (signal.cancelled) return
    try {
      const r = await inspectSites(batch)
      Object.assign(audits, r.audits)
    } catch {
      /* site não verificado vira "unknown" */
    }
    sitesDone += batch.length
    onProgress({ phase: 'sites', done: sitesDone, total: toInspect.length, found: candidates.length, label: batch[0] })
  })

  onProgress({ phase: 'ranking', done: 0, total: 1, found: candidates.length, label: 'Ranqueando os melhores…' })
  const now = new Date().toISOString()
  const leads: Lead[] = []
  for (const c of candidates) {
    const site = c.place.website && c.siteStatus === 'pending' ? audits[c.place.website] ?? null : null
    const siteStatus: SiteStatus = c.siteStatus === 'pending' ? site?.status ?? 'unknown' : c.siteStatus
    const reason = exclusionReason(c.place, siteStatus, params.rules)
    if (reason) { removed.push({ name: c.place.name, reason, rating: c.place.rating, reviews: c.place.reviews }); continue }

    const nicheId = guessNiche(c.place.types, c.place.name) ?? c.nicheId
    const sc = scoreLead({ place: c.place, market: params.market, nicheId, site, siteStatus })
    if (sc.tier === 'fraco') { removed.push({ name: c.place.name, reason: 'Pontuação baixa', rating: c.place.rating, reviews: c.place.reviews }); continue }

    const p = c.place
    leads.push({
      id: `tmp-${p.placeId}`,
      placeId: p.placeId,
      stage: 'novo',
      score: sc.score,
      createdAt: now,
      updatedAt: now,
      name: p.name,
      nicheId,
      nicheLabel: NICHE_BY_ID[nicheId]?.label ?? p.primaryTypeLabel ?? 'Outro',
      market: params.market,
      city: p.city ?? c.city,
      neighborhood: p.neighborhood,
      address: p.address,
      phone: p.phone,
      phoneIntl: p.phoneIntl,
      email: site?.emails[0],
      instagram: site?.instagram ?? instagramHandle(p.website),
      website: p.website,
      mapsUrl: p.mapsUrl,
      rating: p.rating,
      reviews: p.reviews,
      photos: p.photos,
      types: p.types,
      site: site ?? (siteStatus === 'social' ? { url: p.website!, status: 'social', systems: [], emails: [], quality: 0, issues: [] } : null),
      siteStatus,
      tier: sc.tier,
      reasons: sc.reasons,
      weaknesses: sc.weaknesses,
      pkg: sc.pkg,
      setupRange: sc.setupRange,
      monthlyRange: sc.monthlyRange,
      currency: sc.currency,
      deal: {},
      notes: '',
      timeline: [],
      inCrm: params.existingPlaceIds.has(p.placeId) || undefined,
    })
  }
  leads.sort((a, b) => b.score - a.score || b.reviews - a.reviews)
  onProgress({ phase: 'done', done: 1, total: 1, found: leads.length, label: 'Pronto' })
  return { leads, removed, googleRequests, errors }
}
