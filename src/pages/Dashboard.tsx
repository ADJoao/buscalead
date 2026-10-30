import { ArrowUpRight, BadgeDollarSign, CalendarClock, ChevronLeft, ChevronRight, Flame, Handshake, Percent, Plus, Radar, Repeat, Target, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LeadForm } from '../components/LeadForm'
import { ScoreRing } from '../components/ui'
import { money, num, pct } from '../lib/format'
import { focusList } from '../lib/priority'
import { useStore } from '../lib/store'
import { STAGES, type Lead, type Settings } from '../lib/types'

const ORDER = STAGES.map((s) => s.id)

function toBRL(v: number, currency: string, s: Settings) {
  if (currency === 'USD') return v * s.usdBrl
  if (currency === 'EUR') return v * s.usdBrl * 1.08
  return v
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

interface TipProps {
  active?: boolean
  label?: string
  payload?: { name: string; value: number; color: string; dataKey: string }[]
}
function ChartTip({ active, payload, label }: TipProps) {
  const rows = (payload ?? []).filter((p) => p.dataKey !== 'total' && p.value != null)
  if (!active || !rows.length) return null
  const total = rows.reduce((s, p) => s + p.value, 0)
  return (
    <div className="chart-tip">
      <div className="t">{label}</div>
      {[...rows].reverse().map((p) => (
        <div className="r" key={p.dataKey}>
          <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: p.color, marginRight: 6 }} />{p.name}</span>
          <b>{money(p.value)}</b>
        </div>
      ))}
      <div className="r" style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--border)' }}><span>Total</span><b>{money(total)}</b></div>
    </div>
  )
}

export function Dashboard() {
  const { leads, settings, openLead } = useStore()
  const now = new Date()
  const closed = leads.filter((l) => l.stage === 'fechado')
  const mrr = closed.reduce((s, l) => s + toBRL(l.deal.monthly ?? 0, l.currency, settings), 0)
  const sameMonth = (iso?: string) => {
    if (!iso) return false
    const d = new Date(iso)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }
  const closedThisMonth = closed.filter((l) => sameMonth(l.deal.closedAt))
  const contacted = leads.filter((l) => l.stage !== 'novo')
  const conversion = contacted.length ? closed.length / contacted.length : 0
  const avgTicket = closed.length ? closed.reduce((s, l) => s + toBRL(l.deal.setup ?? 0, l.currency, settings), 0) / closed.length : 0
  const pipeline = leads
    .filter((l) => l.stage === 'proposta' || l.stage === 'reuniao' || l.stage === 'respondeu')
    .reduce((s, l) => s + toBRL(l.deal.setup ?? l.setupRange[0], l.currency, settings), 0)
  const goalPct = settings.mrrGoal ? Math.min(1, mrr / settings.mrrGoal) : 0
  const hot = leads.filter((l) => l.tier === 'top' && l.stage === 'novo').length

  // faturamento por mês: mensalidades dos clientes ativos (a partir do mês de fechamento) + setups fechados no mês
  const [view, setView] = useState<'ano' | '12m'>('ano')
  const [chart, setChart] = useState<'barras' | 'linha'>('linha')
  const [year, setYear] = useState(now.getFullYear())
  const [form, setForm] = useState(false)
  const monthRevenue = (d: Date) => {
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    let mensal = 0
    let setup = 0
    let novos = 0
    for (const l of closed) {
      if (!l.deal.closedAt) continue
      const c = new Date(l.deal.closedAt)
      if (c <= end) mensal += toBRL(l.deal.monthly ?? 0, l.currency, settings)
      if (c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear()) {
        setup += toBRL(l.deal.setup ?? 0, l.currency, settings)
        novos++
      }
    }
    return { mensal, setup, novos }
  }
  const monthStarts = view === 'ano'
    ? Array.from({ length: 12 }, (_, i) => new Date(year, i, 1))
    : Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 11 + i, 1))
  const months = monthStarts.map((d) => {
    const future = d > now
    const r = monthRevenue(d)
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      m: view === '12m' && d.getMonth() === 0 ? `${label} ${String(d.getFullYear()).slice(2)}` : label,
      full: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      mensal: future ? null : r.mensal,
      setup: future ? null : r.setup,
      total: future ? null : r.mensal + r.setup,
      novos: r.novos,
    }
  })
  const revenueTotal = months.reduce((s, m) => s + (m.total ?? 0), 0)
  const elapsed = months.filter((m) => m.total !== null).length
  const thisMonth = monthRevenue(new Date(now.getFullYear(), now.getMonth(), 1))
  const yearTotal = Array.from({ length: now.getMonth() + 1 }, (_, i) => monthRevenue(new Date(now.getFullYear(), i, 1)))
    .reduce((s, r) => s + r.mensal + r.setup, 0)
  const [selKey, setSelKey] = useState(`${now.getFullYear()}-${now.getMonth()}`)
  const sel = months.find((m) => m.key === selKey) ?? months.filter((m) => m.total !== null).at(-1) ?? months[0]

  // funil: quantos chegaram pelo menos em cada etapa
  const reached = (stageIdx: number) =>
    leads.filter((l) => {
      const idx = ORDER.indexOf(l.stage)
      return l.stage === 'perdido' ? stageIdx <= 1 : idx >= stageIdx
    }).length
  const funnel = ORDER.slice(0, 6).map((id, i) => ({ id, label: STAGES[i].short, n: reached(i) }))
  const fmax = Math.max(1, funnel[0].n)

  const byNiche = groupCount(leads, (l) => l.nicheLabel).slice(0, 6)
  const byCity = groupCount(leads, (l) => l.city ?? '-').slice(0, 6)
  const focus = focusList(leads, 5)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
          <h1 className="page-title">{greeting()}{settings.ownerName ? `, ${settings.ownerName}` : ''}.</h1>
          <p className="page-sub">
            {hot ? <>Você tem <b className="accent">{hot} leads TOP</b> esperando o primeiro contato.</> : 'Busque leads novos para encher o funil.'}
          </p>
        </div>
        <div className="row">
          {settings.demoMode && <span className="demo-badge">DADOS DE DEMONSTRAÇÃO</span>}
          <button className="btn" onClick={() => setForm(true)}><Plus size={16} /> Adicionar cliente</button>
          <Link to="/prospectar" className="btn primary"><Radar size={16} /> Buscar leads</Link>
        </div>
      </div>

      <div className="grid kpis">
        <Kpi hero icon={<Repeat size={14} />} label="Receita recorrente (MRR)" value={money(mrr)} foot={`${pct(goalPct)} da meta de ${money(settings.mrrGoal)}`} />
        <Kpi icon={<Wallet size={14} />} label="Faturamento do mês" value={money(thisMonth.mensal + thisMonth.setup)} foot={`${money(yearTotal)} no ano de ${now.getFullYear()}`} />
        <Kpi icon={<Handshake size={14} />} label="Clientes ativos" value={num(closed.length)} foot={`+${closedThisMonth.length} este mês`} />
        <Kpi icon={<Percent size={14} />} label="Conversão" value={pct(conversion)} foot={`${closed.length} de ${contacted.length} contatados`} />
        <Kpi icon={<BadgeDollarSign size={14} />} label="Ticket médio (setup)" value={money(avgTicket)} foot={`LTV 12m ≈ ${money(avgTicket + (closed.length ? mrr / closed.length : 0) * 12)}`} />
        <Kpi icon={<Target size={14} />} label="Em negociação" value={money(pipeline, 'BRL', true)} foot="respondeu + reunião + proposta" />
      </div>

      <div className="grid g-main mt">
        <div className="glass pad">
          <div className="row spread wrap" style={{ gap: 10 }}>
            <div>
              <h3 className="card-title">Faturamento</h3>
              <p className="card-sub" style={{ marginBottom: 0 }}>
                {view === 'ano' ? `Ano de ${year}` : 'Últimos 12 meses'} · <b className="mono" style={{ color: 'var(--text)' }}>{money(revenueTotal)}</b>
                {elapsed > 0 && <> · média {money(revenueTotal / elapsed)}/mês</>}
              </p>
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              <div className="seg">
                <button className={view === 'ano' ? 'on' : ''} onClick={() => setView('ano')}>Ano</button>
                <button className={view === '12m' ? 'on' : ''} onClick={() => setView('12m')}>12 meses</button>
              </div>
              {view === 'ano' && (
                <span className="year-nav">
                  <button className="btn icon xs ghost" onClick={() => setYear((y) => y - 1)} aria-label="Ano anterior"><ChevronLeft size={14} /></button>
                  {year}
                  <button className="btn icon xs ghost" disabled={year >= now.getFullYear()} onClick={() => setYear((y) => y + 1)} aria-label="Próximo ano"><ChevronRight size={14} /></button>
                </span>
              )}
              <div className="seg">
                <button className={chart === 'linha' ? 'on' : ''} onClick={() => setChart('linha')}>Linha</button>
                <button className={chart === 'barras' ? 'on' : ''} onClick={() => setChart('barras')}>Barras</button>
              </div>
            </div>
          </div>
          <div className="legend mt-s">
            {chart === 'linha' && <span><i style={{ background: 'var(--text)' }} />Total</span>}
            <span><i style={{ background: 'var(--series-3)' }} />Mensalidades</span>
            <span><i style={{ background: 'var(--series-2)' }} />Setup</span>
          </div>
          <div style={{ height: 260, marginTop: 10, marginLeft: -10 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chart === 'barras' ? (
                <BarChart data={months} barCategoryGap="26%">
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,.06)" />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fill: '#6f7a73', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: '#6f7a73', fontSize: 11, fontFamily: 'Geist Mono' }} tickFormatter={(v: number) => money(v, 'BRL', true)} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,.035)' }} />
                  <Bar dataKey="mensal" name="Mensalidades" stackId="r" fill="var(--series-3)" stroke="#0b0f0d" strokeWidth={1.5} />
                  <Bar dataKey="setup" name="Setup" stackId="r" fill="var(--series-2)" stroke="#0b0f0d" strokeWidth={1.5} radius={[5, 5, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={months}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,.06)" />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fill: '#6f7a73', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: '#6f7a73', fontSize: 11, fontFamily: 'Geist Mono' }} tickFormatter={(v: number) => money(v, 'BRL', true)} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: 'rgba(255,255,255,.18)', strokeDasharray: '3 3' }} />
                  <Line type="monotone" dataKey="total" name="Total" stroke="var(--text)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--text)', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} />
                  <Line type="monotone" dataKey="mensal" name="Mensalidades" stroke="var(--series-3)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="setup" name="Setup" stroke="var(--series-2)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          <div className="row wrap spread mt" style={{ gap: 12, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <label className="row" style={{ gap: 8 }}>
              <span className="muted" style={{ fontSize: 13 }}>Ver mês:</span>
              <select className="select" style={{ width: 'auto', height: 34 }} value={sel.key} onChange={(e) => setSelKey(e.target.value)}>
                {months.filter((m) => m.total !== null).map((m) => <option key={m.key} value={m.key}>{m.full}</option>)}
              </select>
            </label>
            <div className="row wrap" style={{ gap: 22 }}>
              <div><div className="dim" style={{ fontSize: 11.5 }}>Total do mês</div><div className="mono" style={{ fontWeight: 650, fontSize: 16 }}>{money(sel.total ?? 0)}</div></div>
              <div><div className="dim" style={{ fontSize: 11.5 }}>Mensalidades</div><div className="mono" style={{ fontSize: 16 }}>{money(sel.mensal ?? 0)}</div></div>
              <div><div className="dim" style={{ fontSize: 11.5 }}>Setup</div><div className="mono" style={{ fontSize: 16 }}>{money(sel.setup ?? 0)}</div></div>
              <div><div className="dim" style={{ fontSize: 11.5 }}>Novos clientes</div><div className="mono" style={{ fontSize: 16 }}>{sel.novos}</div></div>
            </div>
          </div>
        </div>

        <div className="glass pad glow">
          <h3 className="card-title"><Flame size={16} className="accent" /> Foco de hoje</h3>
          <p className="card-sub">Os 5 leads mais importantes agora, em ordem.</p>
          {focus.length ? focus.map(({ lead, p }, i) => (
            <div key={lead.id} className="focus-item" onClick={() => openLead(lead)}>
              <span className="focus-n">{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <div className="lname">{lead.name}</div>
                <div className="lmeta"><span className="accent">{p.action}</span> · {p.why}</div>
              </div>
              <ScoreRing score={lead.score} size={36} stroke={3.5} />
            </div>
          )) : <div className="dim">Nenhum lead no CRM ainda. <Link to="/prospectar" className="accent">Buscar agora →</Link></div>}
        </div>
      </div>

      <div className="grid g-3 mt">
        <div className="glass pad">
          <h3 className="card-title">Funil de vendas</h3>
          <p className="card-sub">Quantos leads chegaram em cada etapa</p>
          {funnel.map((f, i) => (
            <div key={f.id} className="funnel-row">
              <span className="muted" style={{ fontSize: 13 }}>{f.label}</span>
              <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: '0 6px 6px 0' }}>
                <div className="funnel-bar" style={{ width: `${(f.n / fmax) * 100}%`, opacity: 0.45 + (i / 5) * 0.55 }} />
              </div>
              <span className="mono" style={{ textAlign: 'right', fontSize: 13 }}>
                {f.n}
                {i > 0 && funnel[i - 1].n ? <span className="dim" style={{ fontSize: 11 }}> {pct(f.n / funnel[i - 1].n)}</span> : null}
              </span>
            </div>
          ))}
        </div>

        <BarList title="Leads por nicho" sub="Onde está o seu funil" rows={byNiche} />
        <BarList title="Leads por cidade" sub="Concentração geográfica" rows={byCity} />
      </div>

      <div className="grid g-2 mt top-align">
        <div className="glass pad">
          <div className="row spread">
            <div>
              <h3 className="card-title"><Target size={16} /> Meta de MRR</h3>
              <p className="card-sub">Receita recorrente que entra todo mês</p>
            </div>
            <ScoreRing score={Math.round(goalPct * 100)} size={72} stroke={6} />
          </div>
          <div className="row wrap" style={{ gap: 26 }}>
            <div><div className="dim" style={{ fontSize: 12 }}>Atual</div><div className="price accent">{money(mrr)}</div></div>
            <div><div className="dim" style={{ fontSize: 12 }}>Meta</div><div className="price">{money(settings.mrrGoal)}</div></div>
            <div><div className="dim" style={{ fontSize: 12 }}>Faltam</div><div className="price">{money(Math.max(0, settings.mrrGoal - mrr))}</div></div>
          </div>
          <div className="dim mt-s" style={{ fontSize: 12.5 }}>
            {mrr < settings.mrrGoal && closed.length > 0
              ? (() => {
                  const n = Math.ceil((settings.mrrGoal - mrr) / (mrr / closed.length))
                  return `Faltam ≈ ${n} cliente${n > 1 ? 's' : ''} na sua mensalidade média para bater a meta.`
                })()
              : mrr >= settings.mrrGoal && mrr > 0 ? 'Meta batida. Hora de subir a régua.' : 'Feche o primeiro contrato para começar.'}
          </div>
        </div>

        <div className="glass pad">
          <h3 className="card-title"><CalendarClock size={16} /> Últimos contratos</h3>
          <p className="card-sub">Clientes fechados mais recentes</p>
          {[...closed].sort((a, b) => (b.deal.closedAt ?? '').localeCompare(a.deal.closedAt ?? '')).slice(0, 5).map((l) => (
            <div key={l.id} className="row spread" style={{ padding: '8px 0', borderTop: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => openLead(l)}>
              <div style={{ minWidth: 0 }}>
                <div className="lname">{l.name}</div>
                <div className="lmeta">{l.nicheLabel} · {l.city}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontWeight: 600 }}>{money(l.deal.setup ?? 0, l.currency)}</div>
                <div className="mono accent" style={{ fontSize: 12 }}>+{money(l.deal.monthly ?? 0, l.currency)}/mês</div>
              </div>
            </div>
          ))}
          {!closed.length && <div className="dim">Nenhum contrato fechado ainda.</div>}
        </div>
      </div>
      {form && <LeadForm onClose={() => setForm(false)} />}
    </>
  )
}

function Kpi({ icon, label, value, foot, hero }: { icon: React.ReactNode; label: string; value: string; foot?: string; hero?: boolean }) {
  return (
    <div className={`glass kpi ${hero ? 'hero glow' : ''}`}>
      <div className="kpi-label">{icon}{label}</div>
      <div className="kpi-value">{value}</div>
      {foot && <div className="kpi-foot">{hero && <ArrowUpRight size={12} className="accent" style={{ verticalAlign: -2 }} />} {foot}</div>}
    </div>
  )
}

function groupCount(leads: Lead[], key: (l: Lead) => string) {
  const m = new Map<string, number>()
  for (const l of leads) m.set(key(l), (m.get(key(l)) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

function BarList({ title, sub, rows }: { title: string; sub: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]))
  return (
    <div className="glass pad">
      <h3 className="card-title">{title}</h3>
      <p className="card-sub">{sub}</p>
      <div className="col" style={{ gap: 9 }}>
        {rows.map(([k, v]) => (
          <div key={k} title={`${k}: ${v}`}>
            <div className="row spread" style={{ fontSize: 13, marginBottom: 4 }}>
              <span className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
              <span className="mono">{v}</span>
            </div>
            <div className="bar"><i style={{ width: `${(v / max) * 100}%` }} /></div>
          </div>
        ))}
        {!rows.length && <div className="dim">Sem dados ainda.</div>}
      </div>
    </div>
  )
}
