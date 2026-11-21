import {
  ArrowDown, ArrowUp, Car, Check, Footprints, Loader2, LocateFixed, MapPin, MessageCircle, Navigation, Plus, Radar, Route,
  Save, Search, Sparkles, Star, Trash2, Undo2, Users, X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RouteMap } from '../components/RouteMap'
import { CheckBox, Empty, ScoreRing, Stars } from '../components/ui'
import { geocode, searchPlacesBatch, serverStatus, type GeoHit, type PlaceHit } from '../lib/api'
import { uid } from '../lib/format'
import { CITIES, MARKET_INFO } from '../lib/locations'
import { waLink, waNumber } from '../lib/phone'
import { NFC_TYPES, buildReviewQueries, prospectToLead, runReviewSearch, type Prospect } from '../lib/reviewSearch'
import {
  directionsTo, fmtKm, fullRouteUrl, km, legKm, loadRoute, minutes, optimize, saveRoute,
  type RouteState, type Stop, type StopStatus,
} from '../lib/route'
import type { Removed, SearchProgress } from '../lib/search'
import type { Market } from '../lib/shared/types'
import { useStore } from '../lib/store'
import type { Lead } from '../lib/types'

const SS_KEY = 'bl.nfcSearch'
const STATUS: { id: StopStatus; label: string; cls: string }[] = [
  { id: 'vendida', label: 'Vendi a placa', cls: 'primary' },
  { id: 'voltar', label: 'Voltar depois', cls: '' },
  { id: 'recusou', label: 'Não quis', cls: 'ghost' },
]

interface SavedSearch {
  prospects: Prospect[]
  removed: Removed[]
  market: Market
}

export function Routes() {
  const [tab, setTab] = useState<'buscar' | 'rota'>(() => (loadRoute().stops.length ? 'rota' : 'buscar'))
  const [route, setRouteState] = useState<RouteState>(loadRoute)
  const setRoute = useCallback((fn: (r: RouteState) => RouteState) => {
    setRouteState((r) => {
      const next = fn(r)
      saveRoute(next)
      return next
    })
  }, [])

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Star size={12} /> Placa NFC de avaliação</div>
          <h1 className="page-title">Rotas</h1>
          <p className="page-sub">Ache lugares com nota alta e poucas avaliações e visite na ordem que anda menos.</p>
        </div>
        <div className="seg">
          <button className={tab === 'buscar' ? 'on' : ''} onClick={() => setTab('buscar')}>1. Achar lugares</button>
          <button className={tab === 'rota' ? 'on' : ''} onClick={() => setTab('rota')}>2. Minha rota ({route.stops.length})</button>
        </div>
      </div>
      {tab === 'buscar'
        ? <FindPlaces route={route} setRoute={setRoute} goRoute={() => setTab('rota')} />
        : <RoutePlanner route={route} setRoute={setRoute} goFind={() => setTab('buscar')} />}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 1. Achar lugares com poucas avaliações                              */
/* ------------------------------------------------------------------ */

function FindPlaces({ route, setRoute, goRoute }: { route: RouteState; setRoute: (fn: (r: RouteState) => RouteState) => void; goRoute: () => void }) {
  const { realLeads, saveLeads, toast } = useStore()
  const [market, setMarket] = useState<Market>('BR')
  const [cityIds, setCityIds] = useState<string[]>(['cabo-frio'])
  const [customCity, setCustomCity] = useState('')
  const [areas, setAreas] = useState<Record<string, string[]>>({})
  const [terms, setTerms] = useState<string[]>(['restaurante', 'barbearia', 'salão de beleza'])
  const [extraTerm, setExtraTerm] = useState('')
  const [minRating, setMinRating] = useState(4.5)
  const [minReviews, setMinReviews] = useState(5)
  const [maxReviews, setMaxReviews] = useState(200)
  const [perSearch, setPerSearch] = useState(20)
  const [provider, setProvider] = useState<'apify' | 'google'>('apify')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<SearchProgress | null>(null)
  const cancel = useRef({ cancelled: false })
  const [result, setResult] = useState<SavedSearch | null>(() => {
    try {
      const raw = sessionStorage.getItem(SS_KEY)
      return raw ? (JSON.parse(raw) as SavedSearch) : null
    } catch {
      return null
    }
  })
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    serverStatus().then((s) => s && setProvider(s.apify ? 'apify' : 'google'))
  }, [])
  useEffect(() => {
    setCityIds((ids) => {
      const ok = ids.filter((id) => CITIES.find((c) => c.id === id)?.market === market)
      return ok.length ? ok : [CITIES.find((c) => c.market === market)!.id]
    })
  }, [market])

  const existing = useMemo(() => new Set(realLeads.map((l) => l.placeId).filter(Boolean) as string[]), [realLeads])
  const params = { market, cityIds, customCity, areas, terms, minRating, minReviews, maxReviews, perSearch, provider, existingPlaceIds: existing }
  const queries = buildReviewQueries(params)
  const estUsd = queries.length * perSearch * 0.005
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const inRoute = new Set(route.stops.map((s) => s.placeId).filter(Boolean))

  async function start() {
    if (!queries.length) return toast('Escolha ao menos um lugar e um tipo de negócio.', true)
    if (minReviews > maxReviews) return toast('O mínimo de avaliações está maior que o máximo.', true)
    cancel.current = { cancelled: false }
    setRunning(true)
    setSelected(new Set())
    try {
      const out = await runReviewSearch(params, setProgress, cancel.current)
      const saved: SavedSearch = { prospects: out.prospects, removed: out.removed, market }
      setResult(saved)
      try { sessionStorage.setItem(SS_KEY, JSON.stringify(saved)) } catch { /* cheio */ }
      if (out.errors.length) toast(out.errors[0], true)
      else toast(`${out.prospects.length} lugares dentro da régua`)
    } finally {
      setRunning(false)
      setProgress(null)
    }
  }

  function addToRoute(list: Prospect[]) {
    const mk = result?.market ?? market
    const withCoords = list.filter((p) => p.place.lat !== undefined && p.place.lng !== undefined)
    const fresh = withCoords.filter((p) => !inRoute.has(p.place.placeId))
    setRoute((r) => ({
      ...r,
      stops: [
        ...r.stops,
        ...fresh.map((pr): Stop => ({
          id: uid(),
          name: pr.place.name,
          lat: pr.place.lat!,
          lng: pr.place.lng!,
          address: pr.place.address,
          phone: pr.place.phone,
          phoneIntl: pr.place.phoneIntl,
          rating: pr.place.rating,
          reviews: pr.place.reviews,
          placeId: pr.place.placeId,
          mapsUrl: pr.place.mapsUrl,
          status: 'pendente',
          leadId: realLeads.find((l) => l.placeId === pr.place.placeId)?.id,
          draft: prospectToLead(pr, mk),
        })),
      ],
    }))
    const skipped = list.length - fresh.length
    toast(`${fresh.length} adicionado(s) à rota${skipped ? ` · ${skipped} já estava(m) na rota ou sem localização` : ''}`)
    setSelected(new Set())
  }

  async function saveToCrm(list: Prospect[]) {
    const mk = result?.market ?? market
    const fresh = await saveLeads(list.filter((p) => !p.inCrm).map((p) => prospectToLead(p, mk)))
    toast(fresh.length ? `${fresh.length} salvo(s) no CRM` : 'Esses já estavam no CRM')
  }

  const prospects = result?.prospects ?? []
  const picked = prospects.filter((p) => selected.has(p.place.placeId))
  const cities = CITIES.filter((c) => c.market === market)

  return (
    <>
      <div className="glass pad">
        <div className="row wrap spread" style={{ marginBottom: 16 }}>
          <div className="chips">
            {(Object.keys(MARKET_INFO) as Market[]).map((m) => (
              <button key={m} className={`chip ${market === m ? 'on' : ''}`} onClick={() => setMarket(m)}>{MARKET_INFO[m].flag} {MARKET_INFO[m].label}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Onde</span>
          <div className="chips">
            {cities.map((c) => (
              <button key={c.id} className={`chip ${cityIds.includes(c.id) ? 'on' : ''}`} onClick={() => setCityIds((l) => toggle(l, c.id))}>
                {c.favorite && <Star size={12} className="star" fill="currentColor" />}{c.name}
              </button>
            ))}
          </div>
          <input className="input mt-s" style={{ maxWidth: 380 }} placeholder="Outra cidade (ex.: Maricá, RJ)" value={customCity} onChange={(e) => setCustomCity(e.target.value)} />
        </div>

        {cityIds.map((id) => {
          const c = CITIES.find((x) => x.id === id)
          if (!c?.areas) return null
          const chosen = areas[id] ?? []
          return (
            <div key={id} className="field mt">
              <span>Bairros de {c.name} <span className="dim">(opcional: para rota a pé, escolha 1 ou 2 bairros vizinhos)</span></span>
              <div className="chips">
                {c.areas.map((a) => (
                  <button key={a} className={`chip ${chosen.includes(a) ? 'on' : ''}`} onClick={() => setAreas((x) => ({ ...x, [id]: toggle(chosen, a) }))}>{a}</button>
                ))}
              </div>
            </div>
          )
        })}

        <div className="field mt">
          <span>Tipo de negócio <span className="dim">(com balcão e cliente presencial)</span></span>
          <div className="chips">
            {[...new Set([...NFC_TYPES, ...terms])].map((t) => (
              <button key={t} className={`chip ${terms.includes(t) ? 'on' : ''}`} onClick={() => setTerms((l) => toggle(l, t))}>{t}</button>
            ))}
          </div>
          <form className="row mt-s" style={{ maxWidth: 380 }} onSubmit={(e) => { e.preventDefault(); const t = extraTerm.trim().toLowerCase(); if (t) { setTerms((l) => (l.includes(t) ? l : [...l, t])); setExtraTerm('') } }}>
            <input className="input" placeholder="Outro tipo (ex.: floricultura)" value={extraTerm} onChange={(e) => setExtraTerm(e.target.value)} />
            <button className="btn sm" type="submit"><Plus size={14} /></button>
          </form>
        </div>

        <div className="block mt">
          <h4>Régua</h4>
          <div className="col" style={{ gap: 14 }}>
            <label className="range-row">
              <span className="muted" style={{ fontSize: 13 }}>Nota mínima</span>
              <input className="range" type="range" min={4} max={5} step={0.1} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} />
              <b className="mono">{minRating.toFixed(1)}★</b>
            </label>
            <label className="range-row">
              <span className="muted" style={{ fontSize: 13 }}>Mín. avaliações</span>
              <input className="range" type="range" min={0} max={300} step={1} value={minReviews} onChange={(e) => setMinReviews(Number(e.target.value))} />
              <b className="mono">{minReviews}</b>
            </label>
            <label className="range-row">
              <span className="muted" style={{ fontSize: 13 }}>Máx. avaliações</span>
              <input className="range" type="range" min={10} max={1000} step={10} value={maxReviews} onChange={(e) => setMaxReviews(Number(e.target.value))} />
              <b className="mono">{maxReviews}</b>
            </label>
          </div>
          <div className="dim mt-s" style={{ fontSize: 12.5 }}>
            Mostra só lugares com nota de {minRating.toFixed(1)}★ para cima e entre {minReviews} e {maxReviews} avaliações: atendem bem, mas ninguém pede avaliação.
          </div>
        </div>

        <div className="row wrap mt" style={{ gap: 14, alignItems: 'flex-end' }}>
          <label className="field" style={{ width: 170 }}>
            <span>Resultados por busca</span>
            <select className="select" value={perSearch} onChange={(e) => setPerSearch(Number(e.target.value))}>
              {[20, 40, 60].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <div style={{ flex: 1 }} />
          <div className="dim" style={{ fontSize: 12.5, textAlign: 'right' }}>
            {queries.length} busca(s) × até {perSearch} lugares{provider === 'apify' && <> ≈ <b className="mono" style={{ color: 'var(--text)' }}>US$ {estUsd.toFixed(2)}</b> do crédito do Apify</>}
          </div>
          {running
            ? <button className="btn lg" onClick={() => { cancel.current.cancelled = true }}>Parar</button>
            : <button className="btn primary lg" onClick={start} disabled={!queries.length}><Radar size={18} /> Buscar lugares</button>}
        </div>
      </div>

      {running && progress && (
        <div className="glass glow pad mt">
          <div className="row" style={{ gap: 10 }}><Loader2 size={18} className="spin accent" /><b>Buscando no Google Maps</b><span className="dim mono" style={{ marginLeft: 'auto' }}>{progress.found} encontrados</span></div>
          <div className="dim mt-s" style={{ fontSize: 12.5 }}>Com o Apify a busca leva de 1 a 3 minutos.</div>
        </div>
      )}

      {!running && !result && (
        <div className="glass mt"><Empty icon={<MapPin size={34} />} title="Escolha onde e o tipo de negócio">Depois selecione os melhores e mande para a rota.</Empty></div>
      )}

      {!running && result && (
        <>
          <div className="row wrap spread mt" style={{ gap: 10 }}>
            <div style={{ fontWeight: 650 }}>
              <span className="accent mono">{prospects.length}</span> lugares na régua <span className="dim" style={{ fontWeight: 400 }}>· {result.removed.length} fora</span>
            </div>
            <div className="row wrap">
              <button className="btn sm" onClick={() => setSelected(selected.size === prospects.length ? new Set() : new Set(prospects.map((p) => p.place.placeId)))}>
                {selected.size === prospects.length && prospects.length ? 'Limpar seleção' : 'Selecionar todos'}
              </button>
              <button className="btn sm" disabled={!picked.length} onClick={() => saveToCrm(picked)}><Save size={14} /> Salvar no CRM</button>
              <button className="btn primary sm" disabled={!picked.length} onClick={() => { addToRoute(picked); goRoute() }}><Route size={14} /> Adicionar à rota ({picked.length})</button>
            </div>
          </div>
          <div className="glass list mt">
            {prospects.map((p) => {
              const sel = selected.has(p.place.placeId)
              const d = route.start && p.place.lat !== undefined ? km(route.start, { lat: p.place.lat, lng: p.place.lng! }) : null
              return (
                <div key={p.place.placeId} className={`lrow ${sel ? 'selected' : ''}`} style={{ gridTemplateColumns: '28px 44px minmax(0,1fr) auto' }}
                  onClick={() => setSelected((s) => { const n = new Set(s); if (n.has(p.place.placeId)) n.delete(p.place.placeId); else n.add(p.place.placeId); return n })}>
                  <CheckBox on={sel} onChange={(v) => setSelected((s) => { const n = new Set(s); if (v) n.add(p.place.placeId); else n.delete(p.place.placeId); return n })} />
                  <ScoreRing score={p.score} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="lname">{p.place.name}</span>
                      {inRoute.has(p.place.placeId) && <span className="tag lime">na rota</span>}
                      {p.inCrm && <span className="tag">no CRM</span>}
                    </div>
                    <div className="lmeta">{p.place.primaryTypeLabel ?? p.term} · {p.place.neighborhood ?? p.place.city ?? p.city}{d !== null ? ` · ${fmtKm(d)} de você` : ''}</div>
                    <div className="row mt-s" style={{ gap: 10 }}>
                      <Stars rating={p.place.rating} reviews={p.place.reviews} />
                      {p.place.lat === undefined && <span className="tag amber">sem localização</span>}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    {p.place.mapsUrl && <a className="btn icon sm" href={p.place.mapsUrl} target="_blank" rel="noreferrer" title="Abrir no Google Maps"><MapPin size={15} /></a>}
                    <button className="btn sm" onClick={() => addToRoute([p])} disabled={inRoute.has(p.place.placeId)}><Plus size={14} /> Rota</button>
                  </div>
                </div>
              )
            })}
            {!prospects.length && <div className="empty">Ninguém dentro da régua. Aumente o máximo de avaliações ou baixe a nota mínima.</div>}
          </div>
          {result.removed.length > 0 && (
            <div className="chips mt">
              {Object.entries(result.removed.reduce<Record<string, number>>((g, r) => ({ ...g, [r.reason]: (g[r.reason] ?? 0) + 1 }), {}))
                .sort((a, b) => b[1] - a[1])
                .map(([r, n]) => <span key={r} className="tag">{r}: <b className="mono">{n}</b></span>)}
            </div>
          )}
        </>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Montar a rota                                                    */
/* ------------------------------------------------------------------ */

function minimalLead(s: Stop): Lead {
  const now = new Date().toISOString()
  return {
    id: `tmp-manual-${s.id}`, placeId: s.placeId, stage: 'novo', score: 50, createdAt: now, updatedAt: now,
    name: s.name, nicheLabel: 'Outro', market: 'BR', address: s.address, lat: s.lat, lng: s.lng,
    phone: s.phone, phoneIntl: s.phoneIntl, mapsUrl: s.mapsUrl, rating: s.rating, reviews: s.reviews ?? 0, photos: 0, types: [],
    site: null, siteStatus: 'unknown', tier: 'bom', reasons: ['Visitado na rota da placa NFC'], weaknesses: [], pkg: 'SITE',
    setupRange: [1200, 2000], monthlyRange: [150, 200], currency: 'BRL', deal: {}, notes: '', timeline: [],
  }
}

function RoutePlanner({ route, setRoute, goFind }: { route: RouteState; setRoute: (fn: (r: RouteState) => RouteState) => void; goFind: () => void }) {
  const { realLeads, saveLeads, updateLead, toast } = useStore()
  const [activeId, setActiveId] = useState<string>()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<GeoHit[] | null>(null)
  const [gHits, setGHits] = useState<PlaceHit[] | null>(null)
  const [busy, setBusy] = useState<'' | 'geo' | 'apify' | 'loc'>('')
  const [picker, setPicker] = useState(false)
  const stops = route.stops
  const legs = legKm(stops, route.start)
  const openStops = stops.filter((s) => s.status === 'pendente' || s.status === 'voltar')
  const openLegs = legKm(openStops, route.start)
  const totalKm = openLegs.reduce((a, b) => a + b, 0)
  const sold = stops.filter((s) => s.status === 'vendida').length

  function addStop(s: Omit<Stop, 'id' | 'status'>) {
    if (stops.some((x) => (s.placeId && x.placeId === s.placeId) || (Math.abs(x.lat - s.lat) < 1e-5 && Math.abs(x.lng - s.lng) < 1e-5))) {
      toast('Esse lugar já está na rota.')
      return
    }
    setRoute((r) => ({ ...r, stops: [...r.stops, { ...s, id: uid(), status: 'pendente' }] }))
    toast(`${s.name} adicionado à rota`)
  }

  async function findFree(e?: React.FormEvent) {
    e?.preventDefault()
    if (!q.trim()) return
    setBusy('geo')
    setGHits(null)
    try {
      const near = route.start ?? (stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : { lat: -22.8789, lng: -42.0189 })
      const r = await geocode(q.trim(), 'br', near)
      setHits(r)
      if (r.length === 1 && r[0].source === 'google-link') {
        addStop({ name: r[0].name, lat: r[0].lat, lng: r[0].lng, address: r[0].address })
        setQ('')
        setHits(null)
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao procurar', true)
    } finally {
      setBusy('')
    }
  }

  async function findGoogle() {
    if (!q.trim()) return
    setBusy('apify')
    try {
      const term = q.trim().includes(',') ? q.trim() : `${q.trim()} em Cabo Frio, RJ`
      const r = await searchPlacesBatch([term], 'pt-BR', 'BR', 1, 5)
      setGHits(r.places.filter((p) => p.lat !== undefined))
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao procurar', true)
    } finally {
      setBusy('')
    }
  }

  async function addLead(l: Lead) {
    if (l.lat !== undefined && l.lng !== undefined) {
      addStop({ name: l.name, lat: l.lat, lng: l.lng, address: l.address, phone: l.phone, phoneIntl: l.phoneIntl, rating: l.rating, reviews: l.reviews, placeId: l.placeId, mapsUrl: l.mapsUrl, leadId: l.id })
      return
    }
    try {
      const r = await geocode(`${l.name} ${l.address ?? l.city ?? ''}`, 'br')
      const h = r[0] ?? (l.address ? (await geocode(l.address, 'br'))[0] : undefined)
      if (!h) return toast(`Não achei a localização de ${l.name}. Cole o link do Google Maps dele.`, true)
      addStop({ name: l.name, lat: h.lat, lng: h.lng, address: l.address, phone: l.phone, phoneIntl: l.phoneIntl, rating: l.rating, reviews: l.reviews, placeId: l.placeId, mapsUrl: l.mapsUrl, leadId: l.id })
      updateLead(l.id, { lat: h.lat, lng: h.lng })
    } catch {
      toast('Erro ao procurar a localização.', true)
    }
  }

  function locate() {
    if (!navigator.geolocation) return toast('Este navegador não dá acesso à localização.', true)
    setBusy('loc')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRoute((r) => ({ ...r, start: { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Você' } }))
        setBusy('')
        toast('Localização marcada como ponto de partida')
      },
      () => {
        setBusy('')
        toast('Não consegui sua localização. Libere a permissão no navegador.', true)
      },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  async function setStatus(s: Stop, status: StopStatus) {
    const next = s.status === status ? 'pendente' : status
    let leadId = s.leadId
    if (next === 'vendida' || next === 'voltar') {
      const nfc = { status: next, at: new Date().toISOString() } as const
      const note = next === 'vendida' ? 'Comprou a placa NFC de avaliação' : 'Placa NFC: voltar depois'
      if (leadId && realLeads.some((l) => l.id === leadId)) {
        const cur = realLeads.find((l) => l.id === leadId)!
        updateLead(leadId, { nfc, stage: cur.stage === 'novo' ? 'contatado' : cur.stage, contactedAt: cur.contactedAt ?? nfc.at }, { type: 'visita', text: note })
      } else {
        const base = s.draft ?? minimalLead(s)
        const [created] = await saveLeads([{ ...base, nfc, stage: 'contatado', contactedAt: nfc.at, notes: `${note} (${new Date().toLocaleDateString('pt-BR')})` }])
        leadId = created?.id ?? realLeads.find((l) => l.placeId && l.placeId === base.placeId)?.id
        if (leadId && !created) updateLead(leadId, { nfc }, { type: 'visita', text: note })
      }
      toast(next === 'vendida' ? 'Placa vendida! Salvo no CRM para oferecer o site depois.' : 'Marcado para voltar. Está no CRM.')
    } else if (leadId && realLeads.some((l) => l.id === leadId) && next === 'recusou') {
      updateLead(leadId, { nfc: { status: 'recusou', at: new Date().toISOString() } }, { type: 'visita', text: 'Não quis a placa NFC' })
    }
    setRoute((r) => ({ ...r, stops: r.stops.map((x) => (x.id === s.id ? { ...x, status: next, leadId } : x)) }))
  }

  function move(i: number, d: -1 | 1) {
    setRoute((r) => {
      const arr = [...r.stops]
      const j = i + d
      if (j < 0 || j >= arr.length) return r
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...r, stops: arr }
    })
  }

  return (
    <>
      {!stops.length ? (
        <div className="glass">
          <Empty icon={<Route size={34} />} title="Sua rota está vazia">
            Busque lugares na aba 1 e clique em "Adicionar à rota", ou adicione aqui pelo nome, pelo link do Google Maps ou pelos seus leads.
            <div className="row mt" style={{ justifyContent: 'center' }}><button className="btn primary sm" onClick={goFind}><Search size={14} /> Achar lugares</button></div>
          </Empty>
        </div>
      ) : null}

      <div className="grid g-main mt" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 12 }}>
          <div className="row wrap" style={{ gap: 8 }}>
            <div className="seg">
              <button className={route.travel === 'walking' ? 'on' : ''} onClick={() => setRoute((r) => ({ ...r, travel: 'walking' }))}><Footprints size={13} style={{ verticalAlign: -2 }} /> A pé</button>
              <button className={route.travel === 'driving' ? 'on' : ''} onClick={() => setRoute((r) => ({ ...r, travel: 'driving' }))}><Car size={13} style={{ verticalAlign: -2 }} /> Carro</button>
            </div>
            <button className="btn sm" onClick={locate} disabled={busy === 'loc'}>{busy === 'loc' ? <Loader2 size={14} className="spin" /> : <LocateFixed size={14} />} {route.start ? 'Atualizar minha localização' : 'Partir de onde estou'}</button>
            <button className="btn primary sm" disabled={openStops.length < 2} onClick={() => { setRoute((r) => ({ ...r, stops: optimize(r.stops, r.start) })); toast('Rota reorganizada para andar menos') }}><Sparkles size={14} /> Organizar rota</button>
            {openStops.length > 0 && <a className="btn sm" href={fullRouteUrl(openStops, route.travel, route.start)} target="_blank" rel="noreferrer"><Navigation size={14} /> Rota no Google Maps</a>}
          </div>
          <RouteMap stops={stops} start={route.start} activeId={activeId} onSelect={setActiveId} />
          {stops.length > 0 && (
            <div className="row wrap dim" style={{ gap: 14, fontSize: 12.5 }}>
              <span><b className="mono" style={{ color: 'var(--text)' }}>{openStops.length}</b> para visitar</span>
              <span><b className="mono" style={{ color: 'var(--text)' }}>{fmtKm(totalKm)}</b> no total</span>
              <span>≈ <b className="mono" style={{ color: 'var(--text)' }}>{minutes(totalKm, route.travel)} min</b> {route.travel === 'walking' ? 'a pé' : 'de carro'}</span>
              <span><b className="mono accent">{sold}</b> placa(s) vendida(s)</span>
              <span>Distâncias em linha reta, com 30% a mais pelas ruas</span>
            </div>
          )}
          {openStops.length > 10 && <div className="tag amber" style={{ height: 'auto', padding: '6px 10px', whiteSpace: 'normal' }}>O Google Maps abre no máximo 10 paradas de uma vez. Use o botão "Ir" de cada parada para as seguintes.</div>}
        </div>

        <div className="col" style={{ gap: 12 }}>
          <div className="glass pad" style={{ padding: 14 }}>
            <form className="row" onSubmit={findFree}>
              <div className="search-input" style={{ flex: 1 }}>
                <Search size={15} />
                <input className="input" placeholder="Nome da empresa ou link do Google Maps" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <button className="btn sm" disabled={busy === 'geo'}>{busy === 'geo' ? <Loader2 size={14} className="spin" /> : 'Procurar'}</button>
            </form>
            <div className="row wrap mt-s" style={{ gap: 8 }}>
              <button className="btn xs" onClick={() => setPicker(true)}><Users size={12} /> Dos meus leads</button>
              <span className="dim" style={{ fontSize: 11.5 }}>Dica: no Google Maps, toque em Compartilhar e cole o link aqui. É o jeito mais certeiro.</span>
            </div>

            {hits && (
              <div className="col mt" style={{ gap: 6 }}>
                {hits.map((h, i) => (
                  <div key={i} className="row spread" style={{ gap: 8, fontSize: 13 }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="lname" style={{ fontSize: 13 }}>{h.name}</div>
                      <div className="lmeta">{h.address || `${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}`}</div>
                    </div>
                    <button className="btn xs" onClick={() => { addStop({ name: h.name, lat: h.lat, lng: h.lng, address: h.address }); setHits(null); setQ('') }}><Plus size={12} /></button>
                  </div>
                ))}
                {!hits.length && <div className="dim" style={{ fontSize: 12.5 }}>Não achei no mapa aberto (ele conhece poucas lojas pequenas).</div>}
                <button className="btn xs" onClick={findGoogle} disabled={busy === 'apify'} style={{ alignSelf: 'flex-start' }}>
                  {busy === 'apify' ? <Loader2 size={12} className="spin" /> : <MapPin size={12} />} Procurar no Google Maps (Apify, ≈ US$ 0,03)
                </button>
              </div>
            )}
            {gHits && (
              <div className="col mt" style={{ gap: 6 }}>
                {gHits.map((p) => (
                  <div key={p.placeId} className="row spread" style={{ gap: 8, fontSize: 13 }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="lname" style={{ fontSize: 13 }}>{p.name}</div>
                      <div className="lmeta">{p.address} · {p.rating?.toFixed(1) ?? '-'}★ ({p.reviews})</div>
                    </div>
                    <button className="btn xs" onClick={() => { addStop({ name: p.name, lat: p.lat!, lng: p.lng!, address: p.address, phone: p.phone, phoneIntl: p.phoneIntl, rating: p.rating, reviews: p.reviews, placeId: p.placeId, mapsUrl: p.mapsUrl }); setGHits(null); setHits(null); setQ('') }}><Plus size={12} /></button>
                  </div>
                ))}
                {!gHits.length && <div className="dim" style={{ fontSize: 12.5 }}>O Google Maps também não achou. Tente o link do Google Maps.</div>}
              </div>
            )}
          </div>

          {stops.map((s, i) => {
            const num = waNumber(s.phoneIntl, s.phone)
            const done = s.status === 'vendida' || s.status === 'recusou'
            return (
              <div key={s.id}>
                {i > 0 || route.start ? <div className="leg">{fmtKm(legs[i])} · ~{minutes(legs[i], route.travel)} min</div> : null}
                <div className={`stop ${s.status} ${s.id === activeId ? 'active' : ''} ${done ? 'done' : ''}`} onClick={() => setActiveId(s.id)}>
                  <span className="stop-n">{s.status === 'vendida' ? <Check size={15} strokeWidth={3} /> : i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="lname">{s.name}</div>
                    <div className="lmeta">{s.address || `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`}</div>
                    {s.rating !== undefined && <div className="mt-s"><Stars rating={s.rating} reviews={s.reviews} /></div>}
                    <div className="row wrap mt-s" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      {STATUS.map((st) => (
                        <button key={st.id} className={`btn xs ${s.status === st.id ? 'primary' : st.cls === 'ghost' ? 'ghost' : ''}`} onClick={() => setStatus(s, st.id)}>
                          {s.status === st.id && st.id !== 'vendida' ? <Undo2 size={11} /> : null}{st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col" style={{ gap: 6, alignItems: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                    <a className="btn primary xs" href={directionsTo(s, route.travel)} target="_blank" rel="noreferrer"><Navigation size={12} /> Ir</a>
                    {num && <a className="btn wa icon xs" style={{ width: 28 }} href={waLink(num)} target="_blank" rel="noreferrer" title="WhatsApp"><MessageCircle size={13} /></a>}
                    <div className="row" style={{ gap: 2 }}>
                      <button className="btn ghost icon xs" style={{ width: 24 }} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir"><ArrowUp size={12} /></button>
                      <button className="btn ghost icon xs" style={{ width: 24 }} onClick={() => move(i, 1)} disabled={i === stops.length - 1} aria-label="Descer"><ArrowDown size={12} /></button>
                      <button className="btn ghost icon xs danger" style={{ width: 24 }} onClick={() => setRoute((r) => ({ ...r, stops: r.stops.filter((x) => x.id !== s.id) }))} aria-label="Tirar da rota"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {stops.length > 0 && (
            <button className="btn ghost sm danger" style={{ alignSelf: 'flex-start' }} onClick={() => { if (confirm('Limpar a rota inteira? Os leads salvos no CRM continuam lá.')) setRoute((r) => ({ ...r, stops: [] })) }}>
              <Trash2 size={14} /> Limpar rota
            </button>
          )}
        </div>
      </div>

      {picker && <LeadPicker leads={realLeads} onPick={(l) => { addLead(l); setPicker(false) }} onClose={() => setPicker(false)} />}
    </>
  )
}

function LeadPicker({ leads, onPick, onClose }: { leads: Lead[]; onPick: (l: Lead) => void; onClose: () => void }) {
  const [f, setF] = useState('')
  const list = leads.filter((l) => !f || `${l.name} ${l.city ?? ''} ${l.neighborhood ?? ''}`.toLowerCase().includes(f.toLowerCase())).slice(0, 60)
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal glass">
        <div className="row spread">
          <h2 style={{ margin: 0, fontSize: 18 }}>Adicionar dos meus leads</h2>
          <button className="btn icon sm ghost" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <input className="input mt" autoFocus placeholder="Buscar por nome ou bairro" value={f} onChange={(e) => setF(e.target.value)} />
        <div className="col mt" style={{ gap: 4, maxHeight: '55vh', overflowY: 'auto' }}>
          {list.map((l) => (
            <button key={l.id} className="row spread" style={{ textAlign: 'left', background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', color: 'inherit' }} onClick={() => onPick(l)}>
              <span style={{ minWidth: 0 }}>
                <span className="lname" style={{ display: 'block', fontSize: 13.5 }}>{l.name}</span>
                <span className="lmeta">{l.nicheLabel} · {l.neighborhood ?? l.city}</span>
              </span>
              <Plus size={14} />
            </button>
          ))}
          {!list.length && <div className="dim">Nenhum lead encontrado.</div>}
        </div>
      </div>
    </>
  )
}
