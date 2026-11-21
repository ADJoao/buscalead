import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { Point, Stop } from '../lib/route'

const CABO_FRIO: [number, number] = [-22.8789, -42.0189]

function stopIcon(n: number, status: Stop['status'], active: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin ${status} ${active ? 'active' : ''}"><span>${n}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

const youIcon = L.divIcon({ className: '', html: '<div class="map-you"><i></i></div>', iconSize: [22, 22], iconAnchor: [11, 11] })

/** Mapa com as paradas numeradas na ordem da rota e a linha ligando uma à outra. */
export function RouteMap({ stops, start, activeId, onSelect }: { stops: Stop[]; start?: Point; activeId?: string; onSelect?: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const fittedFor = useRef('')

  useEffect(() => {
    if (!box.current || map.current) return
    const m = L.map(box.current, { zoomControl: true, attributionControl: true }).setView(CABO_FRIO, 13)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '© OpenStreetMap © CARTO',
    }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()
    const pts: L.LatLngExpression[] = []
    if (start) {
      L.marker([start.lat, start.lng], { icon: youIcon, zIndexOffset: 1000 }).bindTooltip(start.label ?? 'Você', { direction: 'top' }).addTo(g)
      pts.push([start.lat, start.lng])
    }
    stops.forEach((s, i) => {
      const mk = L.marker([s.lat, s.lng], { icon: stopIcon(i + 1, s.status, s.id === activeId), zIndexOffset: s.id === activeId ? 900 : 0 })
        .bindTooltip(`${i + 1}. ${s.name}`, { direction: 'top', offset: [0, -14] })
      if (onSelect) mk.on('click', () => onSelect(s.id))
      mk.addTo(g)
      pts.push([s.lat, s.lng])
    })
    const open = [start, ...stops.filter((s) => s.status === 'pendente' || s.status === 'voltar')].filter(Boolean) as Point[]
    if (open.length > 1) {
      const line = open.map((p) => [p.lat, p.lng] as L.LatLngTuple)
      L.polyline(line, { color: '#b6f23a', weight: 8, opacity: 0.18 }).addTo(g)
      L.polyline(line, { color: '#b6f23a', weight: 3, opacity: 0.95, dashArray: '8 8' }).addTo(g)
    }
    // reenquadra só quando o conjunto de pontos muda (não a cada clique)
    const key = pts.map((p) => (p as number[]).join(',')).join('|')
    if (pts.length && key !== fittedFor.current) {
      fittedFor.current = key
      if (pts.length === 1) m.setView(pts[0], 16)
      else m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 17 })
    }
  }, [stops, start, activeId, onSelect])

  useEffect(() => {
    const s = stops.find((x) => x.id === activeId)
    if (s && map.current) map.current.panTo([s.lat, s.lng])
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={box} className="route-map" />
}
