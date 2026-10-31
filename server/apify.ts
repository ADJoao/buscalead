import type { PlaceResult } from '../src/lib/shared/types'

// Ator "Google Maps Scraper" do Apify (compass/crawler-google-places).
const ACTOR = 'compass~crawler-google-places'
const API = 'https://api.apify.com/v2'
/** Trava de segurança por execução: o Apify interrompe a execução ao passar deste valor (US$). */
const MAX_CHARGE_USD = 1
/** Tempo máximo esperando a execução terminar. */
const MAX_WAIT_MS = 9 * 60_000

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

interface ApifyRun {
  id: string
  status: string
  defaultDatasetId: string
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

async function apiError(res: Response): Promise<Error> {
  const txt = await res.text()
  if (res.status === 401 || res.status === 403) return new Error('Apify recusou o token (APIFY_TOKEN). Confira se copiou inteiro.')
  if (res.status === 402) return new Error('Os créditos do Apify acabaram neste ciclo.')
  return new Error(`Apify ${res.status}: ${txt.slice(0, 300)}`)
}

export interface ApifySearch {
  places: (PlaceResult & { searchString?: string })[]
  requests: number
  status: string
}

/**
 * Busca vários termos numa única execução: inicia a execução, acompanha até terminar
 * e lê os resultados (inclusive parciais, se ela parar pelo teto de gasto ou pelo tempo).
 */
export async function searchApify(
  token: string,
  searches: string[],
  opts: { language: string; countryCode: string; maxPerSearch: number },
  api = API,
): Promise<ApifySearch> {
  const t = encodeURIComponent(token)
  const start = await fetch(`${api}/acts/${ACTOR}/runs?token=${t}&maxTotalChargeUsd=${MAX_CHARGE_USD}&waitForFinish=60`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      searchStringsArray: searches,
      maxCrawledPlacesPerSearch: opts.maxPerSearch,
      language: opts.language,
      countryCode: opts.countryCode.toLowerCase(),
      skipClosedPlaces: true,
    }),
  })
  if (!start.ok) throw await apiError(start)
  let run = ((await start.json()) as { data: ApifyRun }).data

  const deadline = Date.now() + MAX_WAIT_MS
  while (['READY', 'RUNNING'].includes(run.status) && Date.now() < deadline) {
    const res = await fetch(`${api}/actor-runs/${run.id}?token=${t}&waitForFinish=60`)
    if (!res.ok) throw await apiError(res)
    run = ((await res.json()) as { data: ApifyRun }).data
  }

  const itemsRes = await fetch(`${api}/datasets/${run.defaultDatasetId}/items?token=${t}&clean=true&format=json`)
  if (!itemsRes.ok) throw await apiError(itemsRes)
  const items = (await itemsRes.json()) as ApifyItem[]

  if (!items.length && run.status !== 'SUCCEEDED') {
    throw new Error(`A busca no Apify terminou como ${run.status} sem resultados. Veja os detalhes em Runs no painel do Apify.`)
  }
  const places: ApifySearch['places'] = []
  for (const it of items) {
    const p = normalize(it)
    if (p) places.push({ ...p, searchString: it.searchString })
  }
  return { places, requests: items.length, status: run.status }
}
