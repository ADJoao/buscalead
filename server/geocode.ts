// Acha um lugar pelo nome (grátis, OpenStreetMap via Photon e Nominatim)
// ou pelo link do Google Maps (segue o link curto e lê as coordenadas).

export interface GeoHit {
  name: string
  address: string
  lat: number
  lng: number
  source: 'google-link' | 'photon' | 'nominatim'
}

const UA = 'BuscaLead/1.0 (CRM pessoal de prospeccao)'

export function isMapsLink(q: string): boolean {
  return /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/i.test(q.trim())
}

/** Lê nome e coordenadas de uma URL completa do Google Maps. */
export function parseMapsUrl(url: string): GeoHit | null {
  const dec = decodeURIComponent(url)
  const name = dec.match(/\/place\/([^/@?]+)/)?.[1]?.replace(/\+/g, ' ').trim()
  // !3d..!4d.. é o ponto exato do lugar; @lat,lng é o centro da tela
  const pin = dec.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  const at = dec.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  const q = dec.match(/[?&](?:q|ll|query|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
  const m = pin ?? q ?? at
  if (!m) return null
  return { name: name || 'Local do link', address: '', lat: Number(m[1]), lng: Number(m[2]), source: 'google-link' }
}

async function resolveMapsLink(link: string): Promise<GeoHit | null> {
  let url = link.trim()
  for (let i = 0; i < 6; i++) {
    const direct = parseMapsUrl(url)
    if (direct) return direct
    const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': UA } })
    const next = res.headers.get('location')
    if (!next) {
      // algumas páginas trazem a URL final no HTML
      const html = await res.text().catch(() => '')
      const inner = html.match(/https:\/\/www\.google\.[a-z.]+\/maps\/[^"'\s<>]+/)?.[0]
      return inner ? parseMapsUrl(inner.replace(/\\u0026/g, '&')) : null
    }
    url = new URL(next, url).toString()
  }
  return parseMapsUrl(url)
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: { name?: string; street?: string; housenumber?: string; district?: string; city?: string; state?: string }
}

async function photon(q: string, near?: { lat: number; lng: number }): Promise<GeoHit[]> {
  const bias = near ? `&lat=${near.lat}&lon=${near.lng}` : ''
  const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6${bias}`, { headers: { 'user-agent': UA } })
  if (!res.ok) return []
  const data = (await res.json()) as { features?: PhotonFeature[] }
  return (data.features ?? []).map((f) => {
    const p = f.properties
    const street = [p.street, p.housenumber].filter(Boolean).join(', ')
    return {
      name: p.name ?? street ?? q,
      address: [street, p.district, p.city, p.state].filter(Boolean).join(' · '),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      source: 'photon' as const,
    }
  })
}

interface NominatimHit {
  lat: string
  lon: string
  name?: string
  display_name: string
}

async function nominatim(q: string, country: string): Promise<GeoHit[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=6&countrycodes=${country}`,
    { headers: { 'user-agent': UA, 'accept-language': 'pt-BR' } },
  )
  if (!res.ok) return []
  const data = (await res.json()) as NominatimHit[]
  return data.map((h) => ({
    name: h.name || h.display_name.split(',')[0],
    address: h.display_name.split(',').slice(1, 4).join(',').trim(),
    lat: Number(h.lat),
    lng: Number(h.lon),
    source: 'nominatim' as const,
  }))
}

export async function geocode(q: string, opts: { country: string; near?: { lat: number; lng: number } }): Promise<GeoHit[]> {
  if (isMapsLink(q)) {
    const hit = await resolveMapsLink(q).catch(() => null)
    return hit ? [hit] : []
  }
  const [a, b] = await Promise.all([photon(q, opts.near).catch(() => []), nominatim(q, opts.country).catch(() => [])])
  const seen = new Set<string>()
  return [...a, ...b].filter((h) => {
    const key = `${h.lat.toFixed(4)},${h.lng.toFixed(4)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 8)
}
