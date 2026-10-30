import type { PlaceResult } from '../src/lib/shared/types'

// Ator "Google Maps Scraper" do Apify (compass/crawler-google-places).
const ACTOR = 'compass~crawler-google-places'
/** Trava de segurança por execução: o Apify interrompe a execução ao passar deste valor (US$). */
const MAX_CHARGE_USD = 1

interface ApifyItem {
  placeId?: string
  title?: string
  address?: string
  neighborhood?: string
  city?: string
  state?: string
  countryCode?: string
  location?: { lat?: number; lng?: number }
  totalScore?: number
  reviewsCount?: number
  website?: string
  phone?: string
  phoneUnformatted?: string
  url?: string
  permanentlyClosed?: boolean
  temporarilyClosed?: boolean
  categoryName?: string
  categories?: string[]
  imagesCount?: number
  searchString?: string
}

function normalize(i: ApifyItem): PlaceResult | null {
  if (!i.placeId || !i.title) return null
  return {
    placeId: i.placeId,
    name: i.title,
    address: i.address ?? '',
    neighborhood: i.neighborhood,
    city: i.city,
    state: i.state,
    country: i.countryCode,
    lat: i.location?.lat,
    lng: i.location?.lng,
    rating: i.totalScore,
    reviews: i.reviewsCount ?? 0,
    website: i.website || undefined,
    phone: i.phone,
    phoneIntl: i.phoneUnformatted,
    mapsUrl: i.url,
    businessStatus: i.permanentlyClosed ? 'CLOSED_PERMANENTLY' : i.temporarilyClosed ? 'CLOSED_TEMPORARILY' : 'OPERATIONAL',
    primaryTypeLabel: i.categoryName,
    types: [i.categoryName, ...(i.categories ?? [])].filter((x): x is string => Boolean(x)).map((x) => x.toLowerCase()),
    photos: i.imagesCount ?? 0,
  }
}

export interface ApifySearch {
  places: (PlaceResult & { searchString?: string })[]
  requests: number
}

/** Busca vários termos numa única execução (mais barato e não estoura a memória do plano grátis). */
export async function searchApify(
  token: string,
  searches: string[],
  opts: { language: string; countryCode: string; maxPerSearch: number },
): Promise<ApifySearch> {
  const url = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&maxTotalChargeUsd=${MAX_CHARGE_USD}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      searchStringsArray: searches,
      maxCrawledPlacesPerSearch: opts.maxPerSearch,
      language: opts.language,
      countryCode: opts.countryCode.toLowerCase(),
      skipClosedPlaces: true,
      scrapePlaceDetailPage: false,
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    if (res.status === 401 || res.status === 403) throw new Error('Apify recusou o token (APIFY_TOKEN). Confira se copiou inteiro.')
    if (res.status === 402) throw new Error('Os créditos do Apify acabaram neste mês.')
    throw new Error(`Apify ${res.status}: ${txt.slice(0, 300)}`)
  }
  const items = (await res.json()) as ApifyItem[]
  const places: ApifySearch['places'] = []
  for (const it of items) {
    const p = normalize(it)
    if (p) places.push({ ...p, searchString: it.searchString })
  }
  return { places, requests: items.length }
}
