import type { PlaceResult } from '../src/lib/shared/types'

const FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.addressComponents', 'places.location',
  'places.rating', 'places.userRatingCount', 'places.websiteUri', 'places.nationalPhoneNumber',
  'places.internationalPhoneNumber', 'places.googleMapsUri', 'places.businessStatus', 'places.primaryType',
  'places.primaryTypeDisplayName', 'places.types', 'places.photos', 'nextPageToken',
].join(',')

interface RawPlace {
  id: string
  displayName?: { text: string }
  formattedAddress?: string
  addressComponents?: { longText: string; shortText: string; types: string[] }[]
  location?: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
  websiteUri?: string
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  googleMapsUri?: string
  businessStatus?: string
  primaryType?: string
  primaryTypeDisplayName?: { text: string }
  types?: string[]
  photos?: unknown[]
}

function comp(p: RawPlace, type: string, short = false): string | undefined {
  const c = p.addressComponents?.find((a) => a.types.includes(type))
  return c ? (short ? c.shortText : c.longText) : undefined
}

function normalize(p: RawPlace): PlaceResult {
  return {
    placeId: p.id,
    name: p.displayName?.text ?? 'Sem nome',
    address: p.formattedAddress ?? '',
    neighborhood: comp(p, 'sublocality_level_1') ?? comp(p, 'sublocality') ?? comp(p, 'neighborhood'),
    city: comp(p, 'administrative_area_level_2') ?? comp(p, 'locality'),
    state: comp(p, 'administrative_area_level_1', true),
    country: comp(p, 'country', true),
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    rating: p.rating,
    reviews: p.userRatingCount ?? 0,
    website: p.websiteUri,
    phone: p.nationalPhoneNumber,
    phoneIntl: p.internationalPhoneNumber,
    mapsUrl: p.googleMapsUri,
    businessStatus: p.businessStatus,
    primaryType: p.primaryType,
    primaryTypeLabel: p.primaryTypeDisplayName?.text,
    types: p.types ?? [],
    photos: p.photos?.length ?? 0,
  }
}

export async function searchText(
  apiKey: string,
  query: string,
  opts: { languageCode: string; regionCode: string; pages: number },
): Promise<{ places: PlaceResult[]; requests: number }> {
  const out: PlaceResult[] = []
  let pageToken: string | undefined
  let requests = 0
  for (let page = 0; page < Math.min(3, Math.max(1, opts.pages)); page++) {
    const body: Record<string, unknown> = {
      textQuery: query,
      languageCode: opts.languageCode,
      regionCode: opts.regionCode,
      pageSize: 20,
    }
    if (pageToken) body.pageToken = pageToken
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELDS },
      body: JSON.stringify(body),
    })
    requests++
    if (!res.ok) {
      const txt = await res.text()
      if (page === 0) throw new Error(`Google Places ${res.status}: ${txt.slice(0, 300)}`)
      break
    }
    const data = (await res.json()) as { places?: RawPlace[]; nextPageToken?: string }
    out.push(...(data.places ?? []).map(normalize))
    pageToken = data.nextPageToken
    if (!pageToken) break
  }
  return { places: out, requests }
}

export interface PlaceDetails {
  reviews: { rating: number; text: string; when: string }[]
  summary?: string
  hours?: string[]
}

export async function placeDetails(apiKey: string, placeId: string, languageCode: string): Promise<PlaceDetails> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${languageCode}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'reviews,editorialSummary,regularOpeningHours.weekdayDescriptions',
    },
  })
  if (!res.ok) return { reviews: [] }
  const d = (await res.json()) as {
    reviews?: { rating: number; text?: { text: string }; relativePublishTimeDescription?: string }[]
    editorialSummary?: { text: string }
    regularOpeningHours?: { weekdayDescriptions?: string[] }
  }
  return {
    reviews: (d.reviews ?? []).map((r) => ({ rating: r.rating, text: r.text?.text ?? '', when: r.relativePublishTimeDescription ?? '' })),
    summary: d.editorialSummary?.text,
    hours: d.regularOpeningHours?.weekdayDescriptions,
  }
}
