import type { Lead } from './types'

export type StopStatus = 'pendente' | 'vendida' | 'voltar' | 'recusou'
export type Travel = 'walking' | 'driving'

export interface Stop {
  id: string
  name: string
  lat: number
  lng: number
  address?: string
  phone?: string
  phoneIntl?: string
  rating?: number
  reviews?: number
  placeId?: string
  mapsUrl?: string
  status: StopStatus
  /** lead já salvo no CRM */
  leadId?: string
  /** dados do lead para salvar no CRM quando você vender a placa */
  draft?: Lead
}

export interface Point {
  lat: number
  lng: number
  label?: string
}

export interface RouteState {
  stops: Stop[]
  start?: Point
  travel: Travel
}

const KEY = 'bl.route'

export function loadRoute(): RouteState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const r = JSON.parse(raw) as Partial<RouteState>
      return { stops: r.stops ?? [], start: r.start, travel: r.travel ?? 'walking' }
    }
  } catch {
    /* sem armazenamento */
  }
  return { stops: [], travel: 'walking' }
}

export function saveRoute(r: RouteState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r))
  } catch {
    /* sem armazenamento */
  }
}

/** Distância em linha reta (km). */
export function km(a: Point, b: Point): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function pathKm(start: Point | undefined, order: Point[]): number {
  let total = 0
  let prev = start
  for (const p of order) {
    if (prev) total += km(prev, p)
    prev = p
  }
  return total
}

function nearestNeighbor<T extends Point>(start: Point, pts: T[]): T[] {
  const left = [...pts]
  const out: T[] = []
  let cur = start
  while (left.length) {
    let bi = 0
    for (let i = 1; i < left.length; i++) if (km(cur, left[i]) < km(cur, left[bi])) bi = i
    cur = left.splice(bi, 1)[0]
    out.push(cur as T)
  }
  return out
}

/** Melhora a ordem invertendo trechos enquanto o caminho total diminuir (2-opt). */
function twoOpt<T extends Point>(start: Point | undefined, order: T[]): T[] {
  let best = order
  let bestLen = pathKm(start, best)
  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const cand = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)]
        const len = pathKm(start, cand)
        if (len + 1e-9 < bestLen) {
          best = cand
          bestLen = len
          improved = true
        }
      }
    }
  }
  return best
}

/**
 * Ordem que anda menos. Com ponto de partida (sua localização), começa por ele.
 * Sem partida, testa começar por cada parada e fica com o caminho mais curto.
 * As paradas já resolvidas (vendida/recusou) vão para o fim, na ordem em que estavam.
 */
export function optimize(stops: Stop[], start?: Point): Stop[] {
  const open = stops.filter((s) => s.status === 'pendente' || s.status === 'voltar')
  const done = stops.filter((s) => s.status === 'vendida' || s.status === 'recusou')
  if (open.length < 2) return [...open, ...done]
  let best: Stop[] = []
  let bestLen = Infinity
  const starts: (Point | undefined)[] = start ? [start] : open.map((s) => s)
  for (const st of starts) {
    const order = start ? twoOpt(start, nearestNeighbor(start, open)) : twoOpt(undefined, nearestNeighbor(st!, open))
    const len = pathKm(start, order)
    if (len < bestLen) {
      best = order
      bestLen = len
    }
  }
  return [...best, ...done]
}

export function legKm(stops: Stop[], start?: Point): number[] {
  return stops.map((s, i) => {
    const prev = i === 0 ? start : stops[i - 1]
    return prev ? km(prev, s) : 0
  })
}

/** Tempo estimado (min) a partir da distância em linha reta, com 30% a mais pelas curvas das ruas. */
export function minutes(distKm: number, travel: Travel): number {
  const speed = travel === 'walking' ? 4.5 : 22
  return Math.max(1, Math.round(((distKm * 1.3) / speed) * 60))
}

export function fmtKm(d: number): string {
  return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1).replace('.', ',')} km`
}

/** Abre o Google Maps já com o caminho até uma parada. */
export function directionsTo(s: Stop, travel: Travel): string {
  const p = new URLSearchParams({ api: '1', travelmode: travel })
  if (s.placeId) {
    p.set('destination', s.name)
    p.set('destination_place_id', s.placeId)
  } else {
    p.set('destination', `${s.lat},${s.lng}`)
  }
  return `https://www.google.com/maps/dir/?${p}`
}

/** Rota completa no Google Maps (o Google aceita até 9 paradas no meio do caminho). */
export function fullRouteUrl(stops: Stop[], travel: Travel, start?: Point): string {
  const pts = stops.slice(0, 10)
  const p = new URLSearchParams({ api: '1', travelmode: travel })
  if (start) p.set('origin', `${start.lat},${start.lng}`)
  const last = pts[pts.length - 1]
  p.set('destination', `${last.lat},${last.lng}`)
  const mids = pts.slice(0, -1).map((s) => `${s.lat},${s.lng}`)
  if (mids.length) p.set('waypoints', mids.join('|'))
  return `https://www.google.com/maps/dir/?${p}`
}

/** Página da empresa no Google Maps (usa o link salvo, o código do lugar, ou procura pelo nome e endereço). */
export function placeUrl(s: { name: string; address?: string; lat?: number; lng?: number; placeId?: string; mapsUrl?: string }): string {
  if (s.mapsUrl) return s.mapsUrl
  const p = new URLSearchParams({ api: '1', query: [s.name, s.address].filter(Boolean).join(' ') || `${s.lat},${s.lng}` })
  if (s.placeId) p.set('query_place_id', s.placeId)
  return `https://www.google.com/maps/search/?${p}`
}

/** Pesquisa no Google (para ver avaliações, site e Instagram). */
export function googleSearchUrl(s: { name: string; address?: string }): string {
  const city = (s.address ?? '').split(',').slice(-3, -1).join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(`${s.name} ${city}`.trim())}`
}
