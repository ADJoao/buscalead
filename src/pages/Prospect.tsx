import { ArrowUp, ChevronDown, Crosshair, Filter, Loader2, Pickaxe, Radar, Save, Square, Star, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LeadListHead, LeadRow } from '../components/LeadRow'
import { Empty, ScoreRing, SectionHead, SiteChip, Stars, Switch } from '../components/ui'
import { placesUsage } from '../lib/api'
import { money, num } from '../lib/format'
import { CITIES, MARKET_INFO } from '../lib/locations'
import { NICHES, PACKAGES, bestNiches } from '../lib/niches'
import { buildQueries, runSearch, type Removed, type SearchParams, type SearchProgress } from '../lib/search'
import type { Market } from '../lib/shared/types'
import { useStore } from '../lib/store'
import type { Lead } from '../lib/types'

const FREE_QUOTA = 1000
const SS_KEY = 'bl.lastSearch'

interface Saved {
  leads: Lead[]
  removed: Removed[]
  at: string
  title: string
}

export function Prospect() {
  const { settings, realLeads, saveLeads, toast, openLead } = useStore()
  const [mode, setMode] = useState<'target' | 'mine'>('target')
  const [market, setMarket] = useState<Market>('BR')
  const [cityIds, setCityIds] = useState<string[]>(['cabo-frio'])
  const [customCity, setCustomCity] = useState('')
  const [areas, setAreas] = useState<Record<string, string[]>>({})
  const [nicheIds, setNicheIds] = useState<string[]>(['dentista', 'pousada', 'estetica'])
  const [target, setTarget] = useState(50)
  const [minReviews, setMinReviews] = useState(settings.minReviews)
  const [minRating, setMinRating] = useState(settings.minRating)
  const [includeWeak, setIncludeWeak] = useState(settings.includeWeakSites)
  const [allTerms, setAllTerms] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const [progress, setProgress] = useState<SearchProgress | null>(null)
  const [running, setRunning] = useState(false)
  const cancel = useRef({ cancelled: false })
  const [result, setResult] = useState<Saved | null>(() => {
    try {
      const raw = sessionStorage.getItem(SS_KEY)
      return raw ? (JSON.parse(raw) as Saved) : null
    } catch {
      return null
    }
  })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showGood, setShowGood] = useState(false)
  const [recLimit, setRecLimit] = useState(20)
  const [showRemoved, setShowRemoved] = useState(false)
  const [usage, setUsage] = useState(placesUsage())

  const cities = CITIES.filter((c) => c.market === market)
  const lagos = cityIds.some((id) => CITIES.find((c) => c.id === id)?.lagos)

  // modo "minerar": escolhe sozinho os nichos de maior potencial
  useEffect(() => {
    if (mode === 'mine') setNicheIds(bestNiches(lagos).slice(0, 7).map((n) => n.id))
  }, [mode, lagos])

  useEffect(() => {
    setCityIds((ids) => {
      const valid = ids.filter((id) => CITIES.find((c) => c.id === id)?.market === market)
      return valid.length ? valid : [CITIES.find((c) => c.market === market)!.id]
    })
  }, [market])

  const existing = useMemo(() => new Set(realLeads.map((l) => l.placeId).filter(Boolean) as string[]), [realLeads])

  const params: SearchParams = {
    market, cityIds, customCity, areas, nicheIds, depth: 1, allTerms,
    rules: { minReviews, minRating, includeWeakSites: includeWeak }, existingPlaceIds: existing,
  }
  const queries = buildQueries(params)
  // cerca de 25% do que o Google devolve passa nos filtros: calculamos quantas páginas buscar
  const depth = Math.max(1, Math.min(3, Math.ceil(target / 0.25 / Math.max(1, queries.length * 20)))) as 1 | 2 | 3
  const estRequests = queries.length * depth

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  async function start() {
    if (!queries.length) return toast('Escolha ao menos uma cidade e um nicho.', true)
    if (estRequests > 150) return toast('Busca grande demais. Escolha menos bairros/nichos.', true)
    cancel.current = { cancelled: false }
    setRunning(true)
    setSelected(new Set())
    try {
      const out = await runSearch({ ...params, depth }, setProgress, cancel.current)
      const cityNames = [...cityIds.map((id) => CITIES.find((c) => c.id === id)?.name), customCity].filter(Boolean).join(', ')
      const saved: Saved = {
        leads: out.leads, removed: out.removed, at: new Date().toISOString(),
        title: `${nicheIds.length} nicho(s) em ${cityNames}`,
      }
      setResult(saved)
      try { sessionStorage.setItem(SS_KEY, JSON.stringify(saved)) } catch { /* cheio */ }
      setUsage(placesUsage())
      if (out.errors.length) toast(out.errors[0], true)
      else toast(`${out.leads.length} leads qualificados encontrados`)
    } finally {
      setRunning(false)
      setProgress(null)
    }
  }

  const leads = result?.leads.map((l) => (existing.has(l.placeId!) ? { ...l, inCrm: true } : { ...l, inCrm: undefined })) ?? []
  const podium = leads.filter((l) => !l.inCrm).slice(0, 5)
  const podiumIds = new Set(podium.map((l) => l.id))
  const tops = leads.filter((l) => l.tier === 'top' && !podiumIds.has(l.id))
  const recs = leads.filter((l) => l.tier === 'recomendado' && !podiumIds.has(l.id))
  const goods = leads.filter((l) => l.tier === 'bom' && !podiumIds.has(l.id))

  async function saveList(list: Lead[]) {
    const fresh = await saveLeads(list.filter((l) => !l.inCrm))
    toast(fresh.length ? `${fresh.length} lead(s) salvos no CRM` : 'Esses já estavam no CRM')
    setSelected(new Set())
  }

  const removedGroups = useMemo(() => {
    const g = new Map<string, number>()
    for (const r of result?.removed ?? []) g.set(r.reason, (g.get(r.reason) ?? 0) + 1)
    return [...g.entries()].sort((a, b) => b[1] - a[1])
  }, [result])

  const sel = (l: Lead) => ({
    selected: selected.has(l.id),
    onSelect: (v: boolean) => setSelected((s) => { const n = new Set(s); if (v) n.add(l.id); else n.delete(l.id); return n }),
  })

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="pulse" /> Busca em tempo real no Google Maps · grátis</div>
          <h1 className="page-title">Buscar leads</h1>
          <p className="page-sub">Pesquisa, tira o que é ruim e ranqueia os melhores para você abordar.</p>
        </div>
        <div className="glass" style={{ padding: '10px 14px', borderRadius: 14, minWidth: 220 }}>
          <div className="row spread" style={{ fontSize: 12 }}>
            <span className="muted">Cota grátis do Google (mês)</span>
            <span className="mono">{num(usage)}/{num(FREE_QUOTA)}</span>
          </div>
          <div className="bar mt-s"><i style={{ width: `${Math.min(100, (usage / FREE_QUOTA) * 100)}%` }} /></div>
        </div>
      </div>

      <div className="glass pad">
        <div className="row wrap spread" style={{ marginBottom: 18 }}>
          <div className="chips">
            <button className={`chip ${mode === 'target' ? 'on' : ''}`} onClick={() => setMode('target')}><Crosshair size={14} /> Busca direcionada</button>
            <button className={`chip ${mode === 'mine' ? 'on' : ''}`} onClick={() => setMode('mine')}><Pickaxe size={14} /> Minerar os melhores</button>
          </div>
          <div className="chips">
            {(Object.keys(MARKET_INFO) as Market[]).map((m) => (
              <button key={m} className={`chip ${market === m ? 'on' : ''}`} onClick={() => setMarket(m)}>{MARKET_INFO[m].flag} {MARKET_INFO[m].label}</button>
            ))}
          </div>
        </div>

        {mode === 'mine' && (
          <div className="block" style={{ marginBottom: 16, borderColor: 'rgba(182,242,58,.25)', background: 'rgba(182,242,58,.04)' }}>
            <div className="row" style={{ gap: 10 }}><Pickaxe size={16} className="accent" /><b>Modo mineração</b></div>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>
              Escolhi os nichos com maior ticket e maior chance de fechar{lagos ? ', com peso extra para turismo e temporada da Região dos Lagos' : ''}. Pode tirar ou colocar mais abaixo.
            </div>
          </div>
        )}

        <div className="field">
          <span>Onde buscar</span>
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
              <span>Bairros de {c.name} <span className="dim">(opcional: cada bairro vira uma busca e traz mais leads)</span></span>
              <div className="chips">
                <button className={`chip ${chosen.length === c.areas.length ? 'on' : ''}`} onClick={() => setAreas((a) => ({ ...a, [id]: chosen.length === c.areas!.length ? [] : [...c.areas!] }))}>
                  {chosen.length === c.areas.length ? 'Limpar' : 'Todos'}
                </button>
                {c.areas.map((a) => (
                  <button key={a} className={`chip ${chosen.includes(a) ? 'on' : ''}`} onClick={() => setAreas((x) => ({ ...x, [id]: toggle(chosen, a) }))}>{a}</button>
                ))}
              </div>
            </div>
          )
        })}

        <div className="field mt">
          <span>Nichos <span className="dim">(A = ticket alto)</span></span>
          <div className="chips">
            {NICHES.map((n) => (
              <button key={n.id} className={`chip ${nicheIds.includes(n.id) ? 'on' : ''}`} onClick={() => setNicheIds((l) => toggle(l, n.id))}>
                <span>{n.emoji}</span>{n.label}<span className="mono dim" style={{ fontSize: 11 }}>{n.tier}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="row wrap mt" style={{ gap: 16, alignItems: 'flex-end' }}>
          <label className="field" style={{ width: 170 }}>
            <span>Quantos leads quer</span>
            <select className="select" value={target} onChange={(e) => setTarget(Number(e.target.value))}>
              {[10, 20, 50, 100, 200].map((n) => <option key={n} value={n}>{n} leads</option>)}
            </select>
          </label>
          <button className="btn ghost sm" onClick={() => setShowFilters((v) => !v)}><Filter size={14} /> Filtros de qualidade <ChevronDown size={14} /></button>
          <div style={{ flex: 1 }} />
          <div className="dim" style={{ fontSize: 12.5, textAlign: 'right' }}>
            {queries.length} busca(s) × {depth} página(s) ≈ <b className="mono" style={{ color: 'var(--text)' }}>{estRequests}</b> da cota grátis
          </div>
          {running ? (
            <button className="btn lg" onClick={() => { cancel.current.cancelled = true }}><Square size={15} /> Parar</button>
          ) : (
            <button className="btn primary lg" onClick={start} disabled={!queries.length}><Radar size={18} /> Buscar leads</button>
          )}
        </div>

        {showFilters && (
          <div className="grid g-3 mt block" style={{ gap: 16 }}>
            <label className="field"><span>Mínimo de avaliações</span>
              <input className="input mono" type="number" min={0} value={minReviews} onChange={(e) => setMinReviews(Number(e.target.value))} />
            </label>
            <label className="field"><span>Nota mínima</span>
              <select className="select" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
                {[3.8, 4.0, 4.2, 4.4, 4.6].map((r) => <option key={r} value={r}>{r.toFixed(1)}★</option>)}
              </select>
            </label>
            <div className="col" style={{ justifyContent: 'center' }}>
              <Switch on={includeWeak} onChange={setIncludeWeak} label="Incluir sites medianos" />
              <Switch on={allTerms} onChange={setAllTerms} label="Usar todos os termos do nicho" />
            </div>
          </div>
        )}
      </div>

      {running && progress && (
        <div className="glass glow pad mt">
          <div className="row spread">
            <div className="row" style={{ gap: 10 }}>
              <Loader2 size={18} className="spin accent" />
              <b>{progress.phase === 'google' ? 'Buscando no Google Maps' : progress.phase === 'sites' ? 'Avaliando os sites' : 'Ranqueando'}</b>
            </div>
            <span className="mono muted">{progress.found} encontrados</span>
          </div>
          <div className="bar mt"><i style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
          <div className="dim mt-s mono" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{progress.label}</div>
        </div>
      )}

      {!running && !result && (
        <div className="glass mt">
          <Empty icon={<Radar size={34} />} title="Escolha onde e o quê, e aperte Buscar">
            A busca é grátis (cota do Google). O sistema remove quem tem nota baixa, poucas avaliações, site bom e franquias, e ranqueia o resto.
          </Empty>
        </div>
      )}

      {!running && result && (
        <>
          <div className="row wrap spread mt" style={{ gap: 12 }}>
            <div>
              <div style={{ fontWeight: 650, fontSize: 15 }}>
                <span className="accent mono">{leads.length}</span> leads qualificados
                <span className="dim" style={{ fontWeight: 400 }}> · {result.removed.length} removidos · {result.title}</span>
              </div>
            </div>
            <div className="row wrap">
              {selected.size > 0 && (
                <button className="btn sm" onClick={() => saveList(leads.filter((l) => selected.has(l.id)))}><Save size={14} /> Salvar selecionados ({selected.size})</button>
              )}
              <button className="btn primary sm" onClick={() => saveList(leads.filter((l) => l.tier === 'top'))}><ArrowUp size={14} /> Salvar todos os TOP</button>
              <button className="btn ghost sm" onClick={() => { setResult(null); sessionStorage.removeItem(SS_KEY) }}><X size={14} /> Limpar</button>
            </div>
          </div>

          {podium.length > 0 && (
            <>
              <SectionHead icon={<Trophy size={18} className="accent" />} title="Faça agora" sub="Os 5 melhores desta busca. Comece por eles." />
              <div className="podium">
                {podium.map((l, i) => (
                  <div key={l.id} className={`glass hover pod ${i === 0 ? 'first glow' : ''}`} onClick={() => openLead(l)}>
                    <div className="row spread" style={{ alignItems: 'flex-start' }}>
                      <span className="pod-rank">{i + 1}</span>
                      <ScoreRing score={l.score} size={i === 0 ? 54 : 46} />
                    </div>
                    <div>
                      <div className="pod-name">{l.name}</div>
                      <div className="dim" style={{ fontSize: 12.5 }}>{l.nicheLabel} · {l.neighborhood ?? l.city}</div>
                    </div>
                    <div className="row wrap" style={{ gap: 6 }}>
                      <Stars rating={l.rating} reviews={l.reviews} />
                      <SiteChip status={l.siteStatus} />
                    </div>
                    <div className="pod-why">{l.reasons.slice(0, 3).map((r) => <div key={r}>{r}</div>)}</div>
                    <div style={{ marginTop: 'auto' }}>
                      <div className="dim" style={{ fontSize: 11.5 }}>{PACKAGES[l.pkg].short}</div>
                      <div className="mono" style={{ fontWeight: 650 }}>
                        {money(l.setupRange[0], l.currency)}–{money(l.setupRange[1], l.currency)}
                        <span className="accent" style={{ fontWeight: 500, fontSize: 12.5 }}> + {money(l.monthlyRange[0], l.currency)}/mês</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tops.length > 0 && (
            <>
              <SectionHead
                icon={<ArrowUp size={18} className="accent" strokeWidth={3} />}
                title={`TOP: vale a análise profunda (${tops.length})`}
                sub="Sem site ou com site ruim, boa reputação e nicho que paga bem."
              />
              <div className="glass list">
                <LeadListHead />
                {tops.map((l) => <LeadRow key={l.id} lead={l} {...sel(l)} />)}
              </div>
            </>
          )}

          {recs.length > 0 && (
            <>
              <SectionHead title={`Recomendados (${recs.length})`} sub="Bons leads. Aborde depois dos TOP." />
              <div className="glass list">
                <LeadListHead />
                {recs.slice(0, recLimit).map((l) => <LeadRow key={l.id} lead={l} {...sel(l)} />)}
              </div>
              {recs.length > recLimit && <button className="btn sm mt" onClick={() => setRecLimit((n) => n + 30)}>Mostrar mais {Math.min(30, recs.length - recLimit)}</button>}
            </>
          )}

          {goods.length > 0 && (
            <>
              <SectionHead title={`Bons (${goods.length})`} right={<button className="btn xs" onClick={() => setShowGood((v) => !v)}>{showGood ? 'Esconder' : 'Mostrar'}</button>} />
              {showGood && <div className="glass list"><LeadListHead />{goods.map((l) => <LeadRow key={l.id} lead={l} {...sel(l)} />)}</div>}
            </>
          )}

          {result.removed.length > 0 && (
            <>
              <SectionHead title={`Removidos (${result.removed.length})`} sub="O que não passou no filtro de qualidade." right={<button className="btn xs" onClick={() => setShowRemoved((v) => !v)}>{showRemoved ? 'Esconder' : 'Ver'}</button>} />
              <div className="chips">{removedGroups.map(([r, n]) => <span key={r} className="tag">{r}: <b className="mono">{n}</b></span>)}</div>
              {showRemoved && (
                <div className="glass pad mt">
                  <div className="col" style={{ gap: 6 }}>
                    {result.removed.slice(0, 200).map((r, i) => (
                      <div key={i} className="row spread" style={{ fontSize: 13 }}>
                        <span className="muted">{r.name}</span>
                        <span className="dim">{r.reason} · {r.rating?.toFixed(1) ?? '-'}★ ({r.reviews})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
