import { placesUsage, searchPlaces, searchPlacesBatch } from './api'
import { CITIES, MARKET_INFO } from './locations'
import { NICHE_BY_ID, guessNiche } from './niches'
import { isChain, scoreLead } from './scoring'
import type { Removed, SearchProgress } from './search'
import { instagramHandle, isSocialUrl } from './shared/site'
import type { Market, PlaceResult } from './shared/types'
import type { Lead } from './types'

/** Tipos de negócio com atendimento no balcão, bons para placa de avaliação. */
export const NFC_TYPES = [
  'restaurante', 'pizzaria', 'hamburgueria', 'lanchonete', 'padaria', 'cafeteria', 'açaí', 'sorveteria',
  'barbearia', 'salão de beleza', 'manicure', 'clínica de estética', 'pet shop', 'academia', 'ótica',
  'loja de roupas', 'loja de calçados', 'farmácia', 'mercado', 'oficina mecânica', 'lava jato', 'dentista',
]

export interface ReviewParams {
  market: Market
  cityIds: string[]
  customCity?: string
  areas: Record<string, string[]>
  terms: string[]
  minRating: number
  minReviews: number
  maxReviews: number
  perSearch: number
  provider: 'apify' | 'google'
  existingPlaceIds: Set<string>
}

export interface Prospect {
  place: PlaceResult
  term: string
  city: string
  score: number
  inCrm?: boolean
}

interface Q {
  text: string
  term: string
  city: string
}

export function buildReviewQueries(p: ReviewParams): Q[] {
  const conn = MARKET_INFO[p.market].connector
  const places: { name: string; query: string; areas: string[] }[] = p.cityIds
    .map((id) => CITIES.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({ name: c.name, query: c.query, areas: p.areas[c.id] ?? [] }))
  if (p.customCity?.trim()) places.push({ name: p.customCity.trim(), query: p.customCity.trim(), areas: [] })
  const out: Q[] = []
  for (const term of p.terms) {
    for (const c of places) {
      if (c.areas.length) for (const a of c.areas) out.push({ text: `${term} ${conn} ${a}, ${c.query}`, term, city: c.name })
      else out.push({ text: `${term} ${conn} ${c.query}`, term, city: c.name })
    }
  }
  return out
}

/**
 * Nota alta e poucas avaliações = o dono já atende bem, mas ninguém pede avaliação.
 * Quanto maior a nota e menos avaliações (dentro da régua), melhor para a placa.
 */
function prospectScore(p: PlaceResult, maxReviews: number): number {
  const r = p.rating ?? 0
  const ratingPart = Math.max(0, Math.min(1, (r - 4) / 1)) * 55
  const roomPart = Math.max(0, 1 - p.reviews / Math.max(1, maxReviews)) * 35
  const contact = p.phoneIntl || p.phone ? 10 : 0
  return Math.round(ratingPart + roomPart + contact)
}

export async function runReviewSearch(
  params: ReviewParams,
  onProgress: (p: SearchProgress) => void,
  signal: { cancelled: boolean },
): Promise<{ prospects: Prospect[]; removed: Removed[]; errors: string[] }> {
  const queries = buildReviewQueries(params)
  const lang = MARKET_INFO[params.market].lang
  const region = MARKET_INFO[params.market].region
  const found = new Map<string, { place: PlaceResult; term: string; city: string }>()
  const errors: string[] = []
  onProgress({ phase: 'google', done: 0, total: queries.length, found: 0, label: 'Buscando no Google Maps…' })

  if (params.provider === 'apify') {
    try {
      const r = await searchPlacesBatch(queries.map((q) => q.text), lang, region, 1, params.perSearch)
      placesUsage(r.requests)
      for (const p of r.places) {
        if (found.has(p.placeId)) continue
        const q = queries.find((x) => x.text === p.searchString) ?? queries[0]
        found.set(p.placeId, { place: p, term: q.term, city: q.city })
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
    }
  } else {
    let done = 0
    for (const q of queries) {
      if (signal.cancelled) break
      try {
        const r = await searchPlaces(q.text, lang, region, Math.ceil(params.perSearch / 20))
        placesUsage(r.requests)
        for (const p of r.places) if (!found.has(p.placeId)) found.set(p.placeId, { place: p, term: q.term, city: q.city })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!errors.includes(msg)) errors.push(msg)
      }
      onProgress({ phase: 'google', done: ++done, total: queries.length, found: found.size, label: q.text })
    }
  }

  const prospects: Prospect[] = []
  const removed: Removed[] = []
  for (const f of found.values()) {
    const p = f.place
    const rating = p.rating ?? 0
    const reason =
      p.businessStatus && p.businessStatus !== 'OPERATIONAL' ? 'Fechado'
        : isChain(p.name) ? 'Franquia / rede grande'
          : rating < params.minRating ? `Nota abaixo de ${params.minRating.toFixed(1)}`
            : p.reviews < params.minReviews ? `Menos de ${params.minReviews} avaliações`
              : p.reviews > params.maxReviews ? `Mais de ${params.maxReviews} avaliações`
                : null
    if (reason) {
      removed.push({ name: p.name, reason, rating: p.rating, reviews: p.reviews })
      continue
    }
    prospects.push({ ...f, score: prospectScore(p, params.maxReviews), inCrm: params.existingPlaceIds.has(p.placeId) || undefined })
  }
  prospects.sort((a, b) => b.score - a.score || (b.place.rating ?? 0) - (a.place.rating ?? 0))
  onProgress({ phase: 'done', done: 1, total: 1, found: prospects.length, label: 'Pronto' })
  return { prospects, removed, errors }
}

/** Transforma um lugar da busca em lead do CRM (para vender o site depois). */
export function prospectToLead(pr: Prospect, market: Market): Lead {
  const p = pr.place
  const nicheId = guessNiche(p.types, p.name)
  const siteStatus = !p.website ? 'none' : isSocialUrl(p.website) ? 'social' : 'unknown'
  const sc = scoreLead({ place: p, market, nicheId, site: null, siteStatus })
  const now = new Date().toISOString()
  return {
    id: `tmp-${p.placeId}`,
    placeId: p.placeId,
    stage: 'novo',
    score: sc.score,
    createdAt: now,
    updatedAt: now,
    name: p.name,
    nicheId,
    nicheLabel: (nicheId && NICHE_BY_ID[nicheId]?.label) || p.primaryTypeLabel || pr.term,
    market,
    city: p.city ?? pr.city,
    neighborhood: p.neighborhood,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    phone: p.phone,
    phoneIntl: p.phoneIntl,
    instagram: instagramHandle(p.website),
    website: p.website,
    mapsUrl: p.mapsUrl,
    rating: p.rating,
    reviews: p.reviews,
    photos: p.photos,
    types: p.types,
    site: null,
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
  }
}
