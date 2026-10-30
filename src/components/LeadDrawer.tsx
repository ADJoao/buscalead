import {
  ArrowUp, Bot, Calendar, Check, ClipboardCopy, Copy, ExternalLink, Globe, AtSign, Loader2, Mail, MapPin,
  MessageCircle, Phone, Plus, Sparkles, Target, Trash2, TriangleAlert, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { LeadForm } from './LeadForm'
import { analyzeLead, localAiSpend } from '../lib/api'
import { dateBR, money, relTime } from '../lib/format'
import { claudePrompt, emailMessage, followupMessage, visitScript, whatsappMessage } from '../lib/messages'
import { NICHE_BY_ID, PACKAGES } from '../lib/niches'
import { isMobile, waLink, waNumber } from '../lib/phone'
import { useStore } from '../lib/store'
import { STAGES, type Lead, type Stage } from '../lib/types'
import { ScoreRing, SiteChip, StageTag, Stars, TierBadge } from './ui'

type Tab = 'diag' | 'msg' | 'ia' | 'crm'

/** Custo médio estimado de uma análise (US$), para mostrar antes de clicar. */
export const AI_COST_USD = { 'claude-opus-5-5': 0.25, 'claude-sonnet-5-5': 0.13 } as const

async function copy(text: string, toast: (t: string) => void, label = 'Copiado') {
  try {
    await navigator.clipboard.writeText(text)
    toast(label)
  } catch {
    toast('Não consegui copiar. Selecione o texto e copie manualmente.')
  }
}

export function LeadDrawer() {
  const { drawer, openLead } = useStore()
  const [tab, setTab] = useState<Tab>('diag')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && openLead(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openLead])

  if (!drawer) return null
  const lead = drawer
  const saved = !lead.id.startsWith('tmp-')

  return (
    <>
      <div className="overlay" onClick={() => openLead(null)} />
      <aside className="drawer" role="dialog" aria-label={lead.name}>
        <Header lead={lead} saved={saved} />
        <div style={{ padding: '0 24px' }}>
          <div className="tabs">
            {([
              ['diag', 'Diagnóstico'],
              ['msg', 'Abordagem'],
              ['ia', lead.ai ? 'Análise IA ✓' : 'Análise IA'],
              ...(saved ? [['crm', 'CRM']] : []),
            ] as [Tab, string][]).map(([id, label]) => (
              <button key={id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="drawer-body">
          {tab === 'diag' && <Diagnosis lead={lead} />}
          {tab === 'msg' && <Approach lead={lead} saved={saved} />}
          {tab === 'ia' && <AiTab lead={lead} />}
          {tab === 'crm' && saved && <CrmTab lead={lead} />}
        </div>
      </aside>
    </>
  )
}

function Header({ lead, saved }: { lead: Lead; saved: boolean }) {
  const { openLead, saveLeads, toast, updateLead } = useStore()
  const num = waNumber(lead.phoneIntl, lead.phone, lead.market)
  const mobile = isMobile(lead.phoneIntl, lead.market)
  const email = lead.email ?? lead.ai?.analysis.contatos_encontrados.email
  const insta = lead.instagram ?? lead.ai?.analysis.contatos_encontrados.instagram?.replace(/^@/, '')
  const validInsta = insta && !/não encontrado|nao encontrado/i.test(insta)
  const validEmail = email && email.includes('@')

  const markContact = (type: 'whatsapp' | 'email' | 'ligacao', text: string) => {
    if (!saved) return
    const patch: Partial<Lead> = lead.stage === 'novo' ? { stage: 'contatado', contactedAt: new Date().toISOString() } : {}
    updateLead(lead.id, patch, { type, text })
  }

  return (
    <div className="drawer-head">
      <div className="row spread" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 14, alignItems: 'flex-start', minWidth: 0 }}>
          <ScoreRing score={lead.score} size={58} stroke={5} />
          <div style={{ minWidth: 0 }}>
            <div className="row wrap" style={{ gap: 8 }}>
              <TierBadge tier={lead.tier} />
              <SiteChip status={lead.siteStatus} />
              {saved && <StageTag stage={lead.stage} />}
              {lead.demo && <span className="demo-badge">DEMO</span>}
            </div>
            <h2 style={{ margin: '8px 0 2px', fontSize: 21, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{lead.name}</h2>
            <div className="row wrap muted" style={{ gap: 10, fontSize: 13 }}>
              <span>{lead.nicheLabel}</span>
              <span className="dim">•</span>
              <span>{[lead.neighborhood, lead.city].filter(Boolean).join(', ')}</span>
              <span className="dim">•</span>
              <Stars rating={lead.rating} reviews={lead.reviews} />
            </div>
          </div>
        </div>
        <button className="btn icon sm ghost" onClick={() => openLead(null)} aria-label="Fechar"><X size={18} /></button>
      </div>

      <div className="row wrap" style={{ marginTop: 16, gap: 8 }}>
        {!saved && !lead.inCrm && (
          <button
            className="btn primary sm"
            onClick={async () => {
              const [s] = await saveLeads([lead])
              if (s) { toast('Salvo no CRM'); openLead(s) }
            }}
          >
            <Plus size={15} /> Salvar no CRM
          </button>
        )}
        {lead.inCrm && !saved && <span className="tag lime"><Check size={12} /> Já está no CRM</span>}
        {num && (
          <a
            className="btn wa sm"
            href={waLink(num, whatsappMessage(lead))}
            target="_blank"
            rel="noreferrer"
            onClick={() => markContact('whatsapp', 'Mensagem enviada no WhatsApp')}
            title={mobile ? 'Abrir conversa com a mensagem pronta' : 'Número fixo: pode ter WhatsApp Business'}
          >
            <MessageCircle size={15} /> WhatsApp{!mobile && ' (fixo)'}
          </a>
        )}
        {(lead.phoneIntl || lead.phone) && (
          <a className="btn sm" href={`tel:${lead.phoneIntl ?? lead.phone}`} onClick={() => markContact('ligacao', 'Ligação feita')}>
            <Phone size={15} /> {lead.phone ?? lead.phoneIntl}
          </a>
        )}
        {validEmail && (
          <a
            className="btn sm"
            href={`mailto:${email}?subject=${encodeURIComponent(emailMessage(lead).subject)}&body=${encodeURIComponent(emailMessage(lead).body)}`}
            onClick={() => markContact('email', 'E-mail enviado')}
          >
            <Mail size={15} /> E-mail
          </a>
        )}
        {validInsta && (
          <a className="btn sm" href={`https://instagram.com/${insta}`} target="_blank" rel="noreferrer"><AtSign size={15} /> @{insta}</a>
        )}
        {lead.mapsUrl && <a className="btn sm" href={lead.mapsUrl} target="_blank" rel="noreferrer"><MapPin size={15} /> Maps</a>}
        {lead.website && <a className="btn sm" href={lead.website} target="_blank" rel="noreferrer"><Globe size={15} /> {lead.deliveredSite ? 'Site antigo' : 'Site'}</a>}
        {lead.deliveredSite && <a className="btn sm" href={lead.deliveredSite} target="_blank" rel="noreferrer" style={{ borderColor: 'var(--accent-line)', color: 'var(--accent-2)' }}><Globe size={15} /> Site que você fez</a>}
      </div>
    </div>
  )
}

function Diagnosis({ lead }: { lead: Lead }) {
  const niche = lead.nicheId ? NICHE_BY_ID[lead.nicheId] : undefined
  const pkg = PACKAGES[lead.pkg]
  const s = lead.site
  return (
    <>
      <div className="block" style={{ borderColor: 'rgba(182,242,58,.25)', background: 'rgba(182,242,58,.04)' }}>
        <h4><Target size={15} className="accent" /> Proposta recomendada: {pkg.label}</h4>
        <div className="row wrap" style={{ gap: 28 }}>
          <div>
            <div className="dim" style={{ fontSize: 12 }}>Setup</div>
            <div className="price">{money(lead.setupRange[0], lead.currency)}–{money(lead.setupRange[1], lead.currency)}</div>
          </div>
          <div>
            <div className="dim" style={{ fontSize: 12 }}>Mensalidade</div>
            <div className="price accent">{money(lead.monthlyRange[0], lead.currency)}–{money(lead.monthlyRange[1], lead.currency)}<span className="dim" style={{ fontSize: 13 }}>/mês</span></div>
          </div>
        </div>
        {niche && (
          <>
            <p className="muted" style={{ margin: '12px 0 8px', fontSize: 13.5 }}><b style={{ color: 'var(--text)' }}>Sistema que justifica a mensalidade:</b> {niche.system}.</p>
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{niche.why}</p>
          </>
        )}
      </div>

      <div className="block">
        <h4><ArrowUp size={15} className="accent" /> Por que este lead é bom</h4>
        <ul className="bullets">{lead.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      </div>

      <div className="block">
        <h4><TriangleAlert size={15} style={{ color: 'var(--bad)' }} /> Pontos fracos (use na conversa)</h4>
        {lead.weaknesses.length ? (
          <ul className="bullets red">{lead.weaknesses.map((w) => <li key={w}>{w}</li>)}</ul>
        ) : <div className="dim">Nenhum ponto fraco técnico detectado.</div>}
      </div>

      {niche && (
        <div className="block">
          <h4>O que entregar</h4>
          <ul className="bullets">{niche.deliverables.map((d) => <li key={d}>{d}</li>)}</ul>
          <div className="divider" />
          <h4>Dores típicas do dono</h4>
          <ul className="bullets red">{niche.pains.map((d) => <li key={d}>{d.replace('[cidade]', lead.city ?? 'na cidade')}</li>)}</ul>
          {niche.compliance && <div className="tag amber mt-s" style={{ height: 'auto', padding: '6px 10px', whiteSpace: 'normal' }}>⚠ {niche.compliance}</div>}
        </div>
      )}

      {s && lead.siteStatus !== 'social' && (
        <div className="block">
          <h4><Globe size={15} /> Raio-X do site {s.quality ? <span className="tag mono">{s.quality}/100</span> : null}</h4>
          <div className="row wrap" style={{ gap: 6 }}>
            {s.https !== undefined && <span className={`tag ${s.https ? '' : 'red'}`}>{s.https ? 'HTTPS ok' : 'Sem HTTPS'}</span>}
            {s.mobile !== undefined && <span className={`tag ${s.mobile ? '' : 'red'}`}>{s.mobile ? 'Adaptado ao celular' : 'Não adaptado ao celular'}</span>}
            {s.builder && <span className="tag">{s.builder}</span>}
            {s.loadMs ? <span className="tag mono">{(s.loadMs / 1000).toFixed(1)}s</span> : null}
            {s.copyrightYear && <span className="tag mono">© {s.copyrightYear}</span>}
          </div>
          {s.title && <div className="dim mt-s" style={{ fontSize: 12.5 }}>Título: {s.title}</div>}
        </div>
      )}

      <div className="block">
        <h4>Sistemas que já usa</h4>
        {s?.systems.length ? (
          <div className="row wrap" style={{ gap: 6 }}>
            {s.systems.map((x) => <span key={x.name} className={`tag ${['agenda', 'reserva', 'crm', 'delivery'].includes(x.category) ? 'violet' : ''}`}>{x.name}</span>)}
          </div>
        ) : <div className="dim">Nenhum sistema detectado: espaço livre para vender agenda/reserva/CRM.</div>}
      </div>
    </>
  )
}

function Approach({ lead, saved }: { lead: Lead; saved: boolean }) {
  const { toast, updateLead, settings } = useStore()
  const [msg, setMsg] = useState(whatsappMessage(lead))
  const num = waNumber(lead.phoneIntl, lead.phone, lead.market)
  const fu = followupMessage(lead)
  const em = emailMessage(lead)
  useEffect(() => setMsg(whatsappMessage(lead)), [lead])

  return (
    <>
      <div className="block">
        <div className="row spread">
          <h4><MessageCircle size={15} style={{ color: '#6ff0a0' }} /> Primeira mensagem (WhatsApp)</h4>
          {lead.ai && <span className="tag violet"><Sparkles size={11} /> feita pela IA</span>}
        </div>
        <textarea className="textarea msg" rows={11} value={msg} onChange={(e) => setMsg(e.target.value)} style={{ width: '100%' }} />
        <div className="row wrap mt-s">
          {num && (
            <a
              className="btn wa sm"
              href={waLink(num, msg)}
              target="_blank"
              rel="noreferrer"
              onClick={() => saved && updateLead(lead.id, lead.stage === 'novo' ? { stage: 'contatado', contactedAt: new Date().toISOString(), customMessage: msg } : { customMessage: msg }, { type: 'whatsapp', text: 'Mensagem enviada no WhatsApp' })}
            >
              <MessageCircle size={14} /> Enviar no WhatsApp
            </a>
          )}
          <button className="btn sm" onClick={() => copy(msg, toast)}><Copy size={14} /> Copiar</button>
          {saved && msg !== whatsappMessage(lead) && (
            <button className="btn sm" onClick={() => { updateLead(lead.id, { customMessage: msg }); toast('Mensagem salva') }}>Salvar edição</button>
          )}
        </div>
        <div className="dim mt-s" style={{ fontSize: 12 }}>Regra de ouro: não se apresente como "criador de sites". Fale do negócio dele e ofereça mostrar a prévia (o hero).</div>
      </div>

      <div className="block">
        <h4>Follow-up (2 a 3 dias depois)</h4>
        <div className="msg">{fu}</div>
        <div className="row mt-s">
          {num && <a className="btn wa sm" href={waLink(num, fu)} target="_blank" rel="noreferrer" onClick={() => saved && updateLead(lead.id, {}, { type: 'whatsapp', text: 'Follow-up enviado' })}><MessageCircle size={14} /> Enviar</a>}
          <button className="btn sm" onClick={() => copy(fu, toast)}><Copy size={14} /> Copiar</button>
        </div>
      </div>

      <div className="block">
        <h4><Mail size={15} /> E-mail</h4>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{em.subject}</div>
        <div className="muted" style={{ whiteSpace: 'pre-wrap', fontSize: 13.5 }}>{em.body}</div>
        <div className="row mt-s">
          <button className="btn sm" onClick={() => copy(`${em.subject}\n\n${em.body}`, toast)}><Copy size={14} /> Copiar</button>
        </div>
      </div>

      <div className="block">
        <h4><MapPin size={15} /> Roteiro de visita presencial</h4>
        <ul className="bullets num">{visitScript(lead, settings.ownerName).map((s) => <li key={s}>{s}</li>)}</ul>
      </div>
    </>
  )
}

const AI_STEPS = ['Lendo as avaliações do Google…', 'Abrindo o site…', 'Procurando AtSign e seguidores…', 'Mapeando dores e oportunidades…', 'Montando o pacote e o ticket…', 'Escrevendo a mensagem de abordagem…']

function AiTab({ lead }: { lead: Lead }) {
  const { settings, toast, updateLead, saveLeads, openLead, mode } = useStore()
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const a = lead.ai?.analysis
  const estUsd = AI_COST_USD[settings.aiModel]
  const estBrl = estUsd * settings.usdBrl

  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => setStep((s) => Math.min(s + 1, AI_STEPS.length - 1)), 9000)
    return () => clearInterval(t)
  }, [busy])

  async function run() {
    if (lead.demo) return toast('Isto é um lead de demonstração.')
    if (mode === 'local' && localAiSpend() * settings.usdBrl >= settings.aiMonthlyLimitBrl) {
      return toast('Limite mensal de IA atingido. Aumente em Configurações.', true)
    }
    setBusy(true)
    setStep(0)
    try {
      let target = lead
      if (lead.id.startsWith('tmp-')) {
        const [s] = await saveLeads([lead])
        if (!s) throw new Error('Não consegui salvar o lead antes da análise.')
        target = s
      }
      const res = await analyzeLead({
        model: settings.aiModel,
        market: lead.market,
        lead: {
          name: lead.name, placeId: lead.placeId, niche: lead.nicheLabel, city: lead.city, address: lead.address,
          phone: lead.phoneIntl ?? lead.phone, website: lead.website, instagram: lead.instagram, email: lead.email,
          rating: lead.rating, reviews: lead.reviews, siteStatus: lead.siteStatus, siteIssues: lead.site?.issues ?? [],
          systems: lead.site?.systems.map((s) => s.name) ?? [], weaknesses: lead.weaknesses,
          packageHint: `${PACKAGES[lead.pkg].label} (${money(lead.setupRange[0], lead.currency)}–${money(lead.setupRange[1], lead.currency)} + ${money(lead.monthlyRange[0], lead.currency)}–${money(lead.monthlyRange[1], lead.currency)}/mês)`,
        },
      })
      if (!res.analysis || !res.meta) throw new Error(res.error ?? 'Sem resposta')
      if (mode === 'local') localAiSpend(res.meta.costUsd)
      const found = res.analysis.contatos_encontrados
      const patch: Partial<Lead> = { ai: { analysis: res.analysis, meta: res.meta } }
      if (!target.email && found.email.includes('@')) patch.email = found.email
      if (!target.instagram && found.instagram && !/não|nao/i.test(found.instagram)) patch.instagram = found.instagram.replace(/^@/, '').replace(/.*instagram\.com\//, '').replace(/\/$/, '')
      await updateLead(target.id, patch, { type: 'ia', text: `Análise com IA (custo ${money(res.meta.costUsd * settings.usdBrl)})` })
      openLead({ ...target, ...patch })
      toast(`Análise pronta · custou ${money(res.meta.costUsd * settings.usdBrl, 'BRL')}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro na análise', true)
    } finally {
      setBusy(false)
    }
  }

  if (busy) {
    return (
      <div className="glass glow pad" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Loader2 size={30} className="spin accent" />
        <div style={{ fontWeight: 600, marginTop: 14 }}>{AI_STEPS[step]}</div>
        <div className="dim" style={{ fontSize: 12.5, marginTop: 6 }}>Leva de 30 s a 2 min. Pode continuar usando o app.</div>
      </div>
    )
  }

  if (!a) {
    return (
      <>
        <div className="glass glow pad">
          <div className="row" style={{ gap: 10 }}><Bot size={20} className="accent" /><b>Análise profunda com IA</b></div>
          <p className="muted" style={{ fontSize: 13.5, margin: '10px 0 14px' }}>
            Lê as avaliações e o site, procura AtSign, seguidores e e-mail na internet, e monta o plano: dores, oportunidades, pacote com ticket, objeções, mensagem personalizada, roteiro de visita e a ideia do hero.
          </p>
          <div className="row wrap spread">
            <div>
              <div className="dim" style={{ fontSize: 12 }}>Custo estimado</div>
              <div className="price">≈ {money(estBrl, 'BRL')}<span className="dim" style={{ fontSize: 13 }}> · {settings.aiModel === 'claude-opus-5-5' ? 'modelo melhor' : 'modelo econômico'}</span></div>
            </div>
            <button className="btn primary" onClick={run}><Sparkles size={16} /> Fazer análise profunda</button>
          </div>
          {lead.tier !== 'top' && <div className="tag amber mt" style={{ height: 'auto', padding: '6px 10px', whiteSpace: 'normal' }}>Este lead não é TOP. Vale mais gastar a análise nos marcados com ↑ TOP.</div>}
        </div>
        <div className="block mt">
          <h4><ClipboardCopy size={15} /> Alternativa grátis</h4>
          <p className="muted" style={{ fontSize: 13.5, margin: '0 0 10px' }}>Copia um pedido completo: o Claude do seu chat pesquisa a fundo na internet (avaliações, Instagram, concorrentes, dono) e devolve plano, pacote e mensagem. Sem custo de API.</p>
          <button className="btn sm" onClick={() => copy(claudePrompt(lead), toast, 'Prompt copiado: cole no chat do Claude')}><ClipboardCopy size={14} /> Copiar para o Claude</button>
        </div>
      </>
    )
  }

  const p = a.pacote
  return (
    <>
      <div className="block" style={{ borderColor: 'rgba(143,112,230,.3)', background: 'rgba(143,112,230,.05)' }}>
        <div className="row spread">
          <h4><Sparkles size={15} style={{ color: '#c4b5fd' }} /> Resumo</h4>
          <span className="tag mono">Oportunidade {a.nota_oportunidade}/100</span>
        </div>
        <p style={{ margin: 0, fontSize: 14 }}>{a.resumo}</p>
        <div className="row wrap mt-s" style={{ gap: 6 }}>
          {a.contatos_encontrados.instagram && <span className="tag"><AtSign size={11} /> {a.contatos_encontrados.instagram}</span>}
          {a.contatos_encontrados.seguidores && <span className="tag">{a.contatos_encontrados.seguidores} seguidores</span>}
          {a.contatos_encontrados.email && <span className="tag"><Mail size={11} /> {a.contatos_encontrados.email}</span>}
        </div>
        {a.contatos_encontrados.outros && <div className="dim mt-s" style={{ fontSize: 12.5 }}>{a.contatos_encontrados.outros}</div>}
      </div>

      <div className="block" style={{ borderColor: 'rgba(182,242,58,.25)', background: 'rgba(182,242,58,.04)' }}>
        <h4><Target size={15} className="accent" /> {p.nome}</h4>
        <div className="row wrap" style={{ gap: 28 }}>
          <div><div className="dim" style={{ fontSize: 12 }}>Setup</div><div className="price">{money(p.setup_min, p.moeda || lead.currency)}–{money(p.setup_max, p.moeda || lead.currency)}</div></div>
          <div><div className="dim" style={{ fontSize: 12 }}>Mensalidade</div><div className="price accent">{money(p.mensal_min, p.moeda || lead.currency)}–{money(p.mensal_max, p.moeda || lead.currency)}</div></div>
        </div>
        <p className="muted" style={{ fontSize: 13.5, margin: '10px 0 0' }}>{p.justificativa}</p>
        <p className="muted" style={{ fontSize: 13.5, margin: '8px 0 0' }}><b style={{ color: 'var(--text)' }}>Por que pagar a mensalidade:</b> {a.por_que_pagar_mensalidade}</p>
      </div>

      <div className="grid g-2" style={{ gap: 12, marginTop: 12 }}>
        <div className="block" style={{ margin: 0 }}><h4>Pontos fortes</h4><ul className="bullets">{a.pontos_fortes.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div className="block" style={{ margin: 0 }}><h4>Pontos fracos</h4><ul className="bullets red">{a.pontos_fracos.map((x) => <li key={x}>{x}</li>)}</ul></div>
      </div>

      <div className="block mt"><h4>O que os clientes dele sentem</h4><ul className="bullets red">{a.dores_dos_clientes_dele.map((x) => <li key={x}>{x}</li>)}</ul></div>

      <div className="block">
        <h4>Oportunidades</h4>
        <div className="col">
          {a.oportunidades.map((o) => (
            <div key={o.titulo}>
              <div style={{ fontWeight: 600 }}>{o.titulo} <span className="tag lime" style={{ marginLeft: 6 }}>{o.impacto}</span></div>
              <div className="muted" style={{ fontSize: 13.5 }}>{o.descricao}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="block"><h4>Entregáveis</h4><ul className="bullets">{a.entregaveis.map((x) => <li key={x}>{x}</li>)}</ul></div>

      <div className="block">
        <h4>Objeções e respostas</h4>
        <div className="col">
          {a.objecoes.map((o) => (
            <div key={o.objecao}>
              <div style={{ fontWeight: 600 }}>“{o.objecao}”</div>
              <div className="muted" style={{ fontSize: 13.5 }}>{o.resposta}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="block">
        <h4>Ideia do hero (prévia para mostrar)</h4>
        <div className="glass pad" style={{ background: 'linear-gradient(135deg, rgba(182,242,58,.08), rgba(20,160,144,.06))' }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{a.ideia_hero.headline}</div>
          <div className="muted mt-s">{a.ideia_hero.subheadline}</div>
          <span className="btn primary sm mt" style={{ pointerEvents: 'none' }}>{a.ideia_hero.cta}</span>
          <div className="dim mt-s" style={{ fontSize: 12.5 }}>Visual: {a.ideia_hero.visual}</div>
        </div>
        <button className="btn sm mt-s" onClick={() => copy(`Monte o hero de um site para ${lead.name} (${lead.nicheLabel}, ${lead.city}).\nHeadline: ${a.ideia_hero.headline}\nSubheadline: ${a.ideia_hero.subheadline}\nCTA: ${a.ideia_hero.cta}\nVisual: ${a.ideia_hero.visual}`, toast, 'Prompt do hero copiado')}>
          <ClipboardCopy size={14} /> Copiar prompt do hero
        </button>
      </div>

      <div className="row spread dim" style={{ fontSize: 12, marginTop: 10 }}>
        <span>{lead.ai!.meta.model} · {lead.ai!.meta.webSearches} buscas · {dateBR(lead.ai!.meta.at)}</span>
        <span className="row" style={{ gap: 10 }}>
          custo {money(lead.ai!.meta.costUsd * settings.usdBrl)}
          <button className="btn xs" onClick={run}>Refazer</button>
        </span>
      </div>
    </>
  )
}

function CrmTab({ lead }: { lead: Lead }) {
  const { updateLead, deleteLeads, openLead, toast } = useStore()
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(lead.notes)
  const [setup, setSetup] = useState(String(lead.deal.setup ?? lead.setupRange[0]))
  const [monthly, setMonthly] = useState(String(lead.deal.monthly ?? lead.monthlyRange[0]))
  useEffect(() => setNotes(lead.notes), [lead.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const setStage = (stage: Stage) => {
    if (stage === lead.stage) return
    const patch: Partial<Lead> = { stage }
    if (stage === 'fechado') {
      patch.deal = { setup: Number(setup) || lead.setupRange[0], monthly: Number(monthly) || lead.monthlyRange[0], closedAt: new Date().toISOString() }
    }
    if (stage === 'contatado' && !lead.contactedAt) patch.contactedAt = new Date().toISOString()
    updateLead(lead.id, patch, { type: 'etapa', text: `Etapa: ${STAGES.find((s) => s.id === stage)?.label}` })
    if (stage === 'fechado') toast('Contrato fechado! 🎉')
  }

  return (
    <>
      <div className="block">
        <h4>Etapa</h4>
        <div className="chips">
          {STAGES.map((s) => (
            <button key={s.id} className={`chip ${lead.stage === s.id ? 'on' : ''}`} onClick={() => setStage(s.id)}>{s.label}</button>
          ))}
        </div>
      </div>

      <div className="block">
        <h4>Valores do contrato</h4>
        <div className="grid g-2" style={{ gap: 12 }}>
          <label className="field"><span>Setup ({lead.currency})</span>
            <input className="input mono" inputMode="numeric" value={setup} onChange={(e) => setSetup(e.target.value.replace(/[^\d]/g, ''))}
              onBlur={() => updateLead(lead.id, { deal: { ...lead.deal, setup: Number(setup) || undefined } })} />
          </label>
          <label className="field"><span>Mensalidade ({lead.currency})</span>
            <input className="input mono" inputMode="numeric" value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/[^\d]/g, ''))}
              onBlur={() => updateLead(lead.id, { deal: { ...lead.deal, monthly: Number(monthly) || undefined } })} />
          </label>
        </div>
        {lead.stage === 'fechado' && (
          <label className="field mt-s" style={{ maxWidth: 220 }}><span>Data de fechamento</span>
            <input type="date" className="input" value={(lead.deal.closedAt ?? '').slice(0, 10)}
              onChange={(e) => e.target.value && updateLead(lead.id, { deal: { ...lead.deal, closedAt: new Date(`${e.target.value}T12:00:00`).toISOString() } })} />
          </label>
        )}
      </div>

      <div className="block">
        <h4><Calendar size={15} /> Próxima ação</h4>
        <div className="row wrap">
          <input type="date" className="input" style={{ maxWidth: 200 }}
            value={lead.nextActionAt ? lead.nextActionAt.slice(0, 10) : ''}
            onChange={(e) => updateLead(lead.id, { nextActionAt: e.target.value ? new Date(`${e.target.value}T09:00:00`).toISOString() : undefined })} />
          {[2, 3, 7].map((d) => (
            <button key={d} className="btn xs" onClick={() => updateLead(lead.id, { nextActionAt: new Date(Date.now() + d * 86_400_000).toISOString() }, { type: 'nota', text: `Follow-up agendado para daqui a ${d} dias` })}>+{d} dias</button>
          ))}
        </div>
      </div>

      <div className="block">
        <h4>Anotações</h4>
        <textarea className="textarea" rows={4} style={{ width: '100%' }} placeholder="Ex.: falei com a Ana, dona. Pediu para voltar na segunda." value={notes}
          onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== lead.notes && updateLead(lead.id, { notes })} />
        <div className="row wrap mt-s">
          <button className="btn xs" onClick={() => updateLead(lead.id, {}, { type: 'ligacao', text: 'Ligação registrada' })}><Phone size={12} /> Registrar ligação</button>
          <button className="btn xs" onClick={() => updateLead(lead.id, {}, { type: 'visita', text: 'Visita presencial registrada' })}><MapPin size={12} /> Registrar visita</button>
        </div>
      </div>

      <div className="block">
        <h4>Histórico</h4>
        <div className="col" style={{ gap: 8 }}>
          {lead.timeline.map((t, i) => (
            <div key={i} className="row" style={{ gap: 10, fontSize: 13 }}>
              <span className="dim mono" style={{ fontSize: 11.5, width: 70, flex: 'none' }}>{relTime(t.at)}</span>
              <span className="muted">{t.text}</span>
            </div>
          ))}
          {!lead.timeline.length && <div className="dim">Sem histórico.</div>}
        </div>
      </div>

      {editing && <LeadForm initial={lead} onClose={() => setEditing(false)} />}
      <div className="row spread mt">
        <button className="btn sm" onClick={() => setEditing(true)}>Editar dados</button>
        <a className="btn ghost sm" href={lead.mapsUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir no Google Maps</a>
        <button className="btn ghost sm danger" onClick={() => { if (confirm(`Excluir ${lead.name} do CRM?`)) { deleteLeads([lead.id]); openLead(null) } }}>
          <Trash2 size={14} /> Excluir
        </button>
      </div>
    </>
  )
}
