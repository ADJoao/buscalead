import { ArrowUp, ClipboardCopy, Download, Flame, Plus, Radar, Search, Trash2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LeadForm } from '../components/LeadForm'
import { LeadListHead, LeadRow } from '../components/LeadRow'
import { Empty, ScoreRing, SectionHead, StageTag } from '../components/ui'
import { money } from '../lib/format'
import { claudeBatchPrompt } from '../lib/messages'
import { focusList } from '../lib/priority'
import { siteLabel } from '../lib/scoring'
import { useStore } from '../lib/store'
import { STAGES, type Lead, type Stage } from '../lib/types'

type Sort = 'score' | 'recent' | 'reviews' | 'priority'

function csv(leads: Lead[]): string {
  const cols = ['Nome', 'Nicho', 'Cidade', 'Bairro', 'Telefone', 'E-mail', 'Instagram', 'Site', 'Situação do site', 'Nota', 'Avaliações', 'Score', 'Etapa', 'Setup', 'Mensalidade', 'Maps']
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = leads.map((l) => [
    l.name, l.nicheLabel, l.city, l.neighborhood, l.phoneIntl ?? l.phone, l.email, l.instagram, l.website, siteLabel(l.siteStatus),
    l.rating, l.reviews, l.score, STAGES.find((s) => s.id === l.stage)?.label, l.deal.setup, l.deal.monthly, l.mapsUrl,
  ].map(esc).join(';'))
  return '﻿' + [cols.map(esc).join(';'), ...rows].join('\n')
}

export function Leads() {
  const { leads, deleteLeads, toast, openLead } = useStore()
  const [q, setQ] = useState('')
  const [stage, setStage] = useState<Stage | 'all' | 'active'>('active')
  const [city, setCity] = useState('all')
  const [onlyTop, setOnlyTop] = useState(false)
  const [sort, setSort] = useState<Sort>('priority')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [form, setForm] = useState<null | 'fechado' | 'novo'>(null)

  const cities = useMemo(() => [...new Set(leads.map((l) => l.city).filter(Boolean) as string[])].sort(), [leads])
  const focus = useMemo(() => focusList(leads, 5), [leads])
  const prio = useMemo(() => new Map(focusList(leads, leads.length).map((x) => [x.lead.id, x.p.value])), [leads])

  const list = leads
    .filter((l) => (stage === 'all' ? true : stage === 'active' ? l.stage !== 'perdido' && l.stage !== 'fechado' : l.stage === stage))
    .filter((l) => city === 'all' || l.city === city)
    .filter((l) => !onlyTop || l.tier === 'top')
    .filter((l) => !q || `${l.name} ${l.nicheLabel} ${l.neighborhood} ${l.city}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) =>
      sort === 'score' ? b.score - a.score
        : sort === 'reviews' ? b.reviews - a.reviews
          : sort === 'recent' ? b.createdAt.localeCompare(a.createdAt)
            : (prio.get(b.id) ?? -1) - (prio.get(a.id) ?? -1))

  const counts = Object.fromEntries(STAGES.map((s) => [s.id, leads.filter((l) => l.stage === s.id).length]))

  function exportCsv() {
    const blob = new Blob([csv(list)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!leads.length) {
    return (
      <>
        <div className="page-head"><div><h1 className="page-title">Leads</h1></div></div>
        <div className="glass"><Empty icon={<Users size={34} />} title="Nenhum lead no CRM ainda">
          Faça uma busca e salve os melhores. <Link to="/prospectar" className="accent">Buscar leads →</Link>
          <div className="row mt" style={{ justifyContent: 'center' }}>
            <button className="btn primary sm" onClick={() => setForm('fechado')}><Plus size={14} /> Adicionar cliente</button>
            <button className="btn sm" onClick={() => setForm('novo')}><Plus size={14} /> Adicionar lead</button>
          </div>
        </Empty></div>
        {form && <LeadForm defaultStage={form} onClose={() => setForm(null)} />}
      </>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">CRM</div>
          <h1 className="page-title">Leads</h1>
          <p className="page-sub">{leads.length} no CRM · {leads.filter((l) => l.tier === 'top').length} TOP · {counts.fechado ?? 0} clientes</p>
        </div>
        <div className="row">
          <button className="btn sm" onClick={() => setForm('novo')}><Plus size={14} /> Lead</button>
          <button className="btn sm" onClick={() => setForm('fechado')}><Plus size={14} /> Cliente</button>
          <button
            className="btn sm"
            title="Copia um pedido de pesquisa profunda para colar no chat do Claude. Sem custo de API."
            onClick={async () => {
              const pick = selected.size ? leads.filter((l) => selected.has(l.id)).slice(0, 10) : focus.map((x) => x.lead)
              try {
                await navigator.clipboard.writeText(claudeBatchPrompt(pick))
                toast(`Pedido com ${pick.length} lead(s) copiado: cole no chat do Claude`)
              } catch {
                toast('Não consegui copiar.', true)
              }
            }}
          >
            <ClipboardCopy size={14} /> {selected.size ? `Copiar ${Math.min(selected.size, 10)} para o Claude` : 'Copiar Top 5 para o Claude'}
          </button>
          <button className="btn sm" onClick={exportCsv}><Download size={14} /> Exportar CSV</button>
          <Link to="/prospectar" className="btn primary sm"><Radar size={14} /> Buscar mais</Link>
        </div>
      </div>

      {focus.length > 0 && (
        <>
          <SectionHead icon={<Flame size={18} className="accent" />} title="Ranking: faça agora" sub="Prioridade calculada pela pontuação, etapa e follow-ups vencidos." />
          <div className="podium" style={{ marginBottom: 8 }}>
            {focus.map(({ lead, p }, i) => (
              <div key={lead.id} className={`glass hover pod ${i === 0 ? 'first glow' : ''}`} onClick={() => openLead(lead)}>
                <div className="row spread" style={{ alignItems: 'flex-start' }}>
                  <span className="pod-rank">{i + 1}</span>
                  <ScoreRing score={lead.score} size={44} />
                </div>
                <div className="pod-name">{lead.name}</div>
                <div className="row wrap" style={{ gap: 6 }}><StageTag stage={lead.stage} /></div>
                <div style={{ fontSize: 13 }}><span className="accent" style={{ fontWeight: 600 }}>{p.action}</span><div className="dim" style={{ fontSize: 12 }}>{p.why}</div></div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="glass pad mt" style={{ padding: 14 }}>
        <div className="row wrap" style={{ gap: 10 }}>
          <div className="search-input" style={{ flex: '1 1 220px' }}>
            <Search size={15} />
            <input className="input" placeholder="Buscar por nome, nicho, bairro…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select" style={{ width: 'auto' }} value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
            <option value="active">Em andamento</option>
            <option value="all">Todas as etapas</option>
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label} ({counts[s.id] ?? 0})</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="all">Todas as cidades</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="priority">Ordenar: prioridade</option>
            <option value="score">Ordenar: pontuação</option>
            <option value="reviews">Ordenar: avaliações</option>
            <option value="recent">Ordenar: mais recentes</option>
          </select>
          <button className={`chip ${onlyTop ? 'on' : ''}`} onClick={() => setOnlyTop((v) => !v)}><ArrowUp size={13} /> Só TOP</button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="row mt" style={{ gap: 8 }}>
          <span className="muted">{selected.size} selecionado(s)</span>
          <button className="btn sm danger" onClick={() => { if (confirm(`Excluir ${selected.size} lead(s)?`)) { deleteLeads([...selected]); setSelected(new Set()); toast('Excluídos') } }}><Trash2 size={14} /> Excluir</button>
        </div>
      )}

      <div className="glass list mt">
        <LeadListHead third="Etapa / valor" />
        {list.map((l) => (
          <LeadRow
            key={l.id}
            lead={l}
            selected={selected.has(l.id)}
            onSelect={(v) => setSelected((s) => { const n = new Set(s); if (v) n.add(l.id); else n.delete(l.id); return n })}
            third={
              <div className="col" style={{ gap: 4, alignItems: 'flex-start' }}>
                <StageTag stage={l.stage} canceled={!!l.deal.canceledAt} />
                <span className="dim mono" style={{ fontSize: 12 }}>{money(l.deal.setup ?? l.setupRange[0], l.currency)}</span>
              </div>
            }
          />
        ))}
        {!list.length && <div className="empty">Nada com esses filtros.</div>}
      </div>
      {form && <LeadForm defaultStage={form} onClose={() => setForm(null)} />}
    </>
  )
}
