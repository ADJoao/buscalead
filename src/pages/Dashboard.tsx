import { ArrowUpRight, BadgeDollarSign, CalendarClock, Flame, Handshake, Percent, Radar, Repeat, Target, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + p.value, 0)
  return (
    <div className="chart-tip">
      <div className="t">{label}</div>
      {[...payload].reverse().map((p) => (
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
  const setupThisMonth = closedThisMonth.reduce((s, l) => s + toBRL(l.deal.setup ?? 0, l.currency, settings), 0)
  const contacted = leads.filter((l) => l.stage !== 'novo')
  const conversion = contacted.length ? closed.length / contacted.length : 0
  const avgTicket = closed.length ? closed.reduce((s, l) => s + toBRL(l.deal.setup ?? 0, l.currency, settings), 0) / closed.length : 0
  const pipeline = leads
    .filter((l) => l.stage === 'proposta' || l.stage === 'reuniao' || l.stage === 'respondeu')
    .reduce((s, l) => s + toBRL(l.deal.setup ?? l.setupRange[0], l.currency, settings), 0)
  const goalPct = settings.mrrGoal ? Math.min(1, mrr / settings.mrrGoal) : 0
  const hot = leads.filter((l) => l.tier === 'top' && l.stage === 'novo').length

  // faturamento por mês: mensalidades ativas + setups fechados no mês
  const months = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 7 + i, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    let mensal = 0
    let setup = 0
    for (const l of closed) {
      if (!l.deal.closedAt) continue
      const c = new Date(l.deal.closedAt)
      if (c <= end) mensal += toBRL(l.deal.monthly ?? 0, l.currency, settings)
      if (c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear()) setup += toBRL(l.deal.setup ?? 0, l.currency, settings)
    }
    return { m: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), mensal, setup }
  })
  const revenueTotal = months.reduce((s, m) => s + m.mensal + m.setup, 0)

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
          <Link to="/prospectar" className="btn primary"><Radar size={16} /> Buscar leads</Link>
        </div>
      </div>

      <div className="grid kpis">
        <Kpi hero icon={<Repeat size={14} />} label="Receita recorrente (MRR)" value={money(mrr)} foot={`${pct(goalPct)} da meta de ${money(settings.mrrGoal)}`} />
        <Kpi icon={<Wallet size={14} />} label="Faturamento do mês" value={money(mrr + setupThisMonth)} foot={`${money(setupThisMonth)} de setup`} />
        <Kpi icon={<Handshake size={14} />} label="Clientes ativos" value={num(closed.length)} foot={`+${closedThisMonth.length} este mês`} />
        <Kpi icon={<Percent size={14} />} label="Conversão" value={pct(conversion)} foot={`${closed.length} de ${contacted.length} contatados`} />
        <Kpi icon={<BadgeDollarSign size={14} />} label="Ticket médio (setup)" value={money(avgTicket)} foot={`LTV 12m ≈ ${money(avgTicket + (closed.length ? mrr / closed.length : 0) * 12)}`} />
        <Kpi icon={<Target size={14} />} label="Em negociação" value={money(pipeline, 'BRL', true)} foot="respondeu + reunião + proposta" />
      </div>

      <div className="grid g-main mt">
        <div className="glass pad">
          <div className="row spread wrap">
            <div>
              <h3 className="card-title">Faturamento mensal</h3>
              <p className="card-sub" style={{ marginBottom: 0 }}>Últimos 8 meses · {money(revenueTotal)} no período</p>
            </div>
            <div className="legend">
              <span><i style={{ background: 'var(--series-1)' }} />Mensalidades</span>
              <span><i style={{ background: 'var(--series-2)' }} />Setup</span>
            </div>
          </div>
          <div style={{ height: 270, marginTop: 14, marginLeft: -10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fill: '#6f7a73', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: '#6f7a73', fontSize: 11, fontFamily: 'Geist Mono' }} tickFormatter={(v: number) => money(v, 'BRL', true)} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,.035)' }} />
                <Bar dataKey="mensal" name="Mensalidades" stackId="r" fill="var(--series-1)" stroke="#0b0f0d" strokeWidth={1.5} />
                <Bar dataKey="setup" name="Setup" stackId="r" fill="var(--series-2)" stroke="#0b0f0d" strokeWidth={1.5} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
