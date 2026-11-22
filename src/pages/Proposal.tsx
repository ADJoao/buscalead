import { ArrowLeft, Check, Copy, FileText, Printer, Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { money } from '../lib/format'
import { NICHE_BY_ID, PACKAGES, PRICE_TABLE, type PackageId } from '../lib/niches'
import { waLink, waNumber } from '../lib/phone'
import { useStore } from '../lib/store'

const DELIVER: Record<PackageId, string[]> = {
  LP: ['Página única feita para converter visita em contato', 'Botão de WhatsApp em destaque, com mensagem pronta', 'Versão perfeita no celular (onde está 80% do público)', 'Ligação com o Google Maps e as avaliações', 'Domínio próprio (.com.br) e certificado de segurança'],
  SITE: ['Site completo com páginas por serviço', 'SEO local: aparecer no Google para quem procura na cidade', 'Botão de WhatsApp e formulário de contato', 'Integração com Google Maps, Instagram e avaliações', 'Domínio próprio, certificado de segurança e e-mail profissional'],
  SISTEMA: ['Site completo com páginas por serviço', 'Sistema de agendamento/pedidos online', 'Painel para acompanhar clientes e retornos', 'SEO local + Google Meu Negócio otimizado', 'Domínio, segurança, e-mail profissional e treinamento'],
}
const DAYS: Record<PackageId, number> = { LP: 7, SITE: 15, SISTEMA: 30 }
const MONTHLY = ['Hospedagem rápida e segura', 'Domínio e certificado renovados', 'Alterações de texto, foto e preço', 'Suporte direto no WhatsApp', 'Relatório mensal de visitas e contatos']

const mid = (a: number, b: number) => Math.round((a + b) / 2 / 50) * 50

export function Proposal() {
  const { id } = useParams()
  const { leads, settings, saveSettings, updateLead, toast } = useStore()
  const lead = leads.find((l) => l.id === id)
  const niche = lead?.nicheId ? NICHE_BY_ID[lead.nicheId] : undefined

  const [pkg, setPkg] = useState<PackageId>(lead?.pkg ?? 'SITE')
  const table = PRICE_TABLE[lead?.market ?? 'BR']
  const [setup, setSetup] = useState(0)
  const [monthly, setMonthly] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const [phone, setPhone] = useState(settings.ownerPhone ?? '')
  const [validity, setValidity] = useState(7)
  const [discount, setDiscount] = useState(false)

  useEffect(() => {
    if (!lead) return
    const t = table[pkg]
    const isLeadPkg = pkg === lead.pkg
    setSetup(lead.deal.setup ?? (isLeadPkg ? mid(lead.setupRange[0], lead.setupRange[1]) : mid(t[0], t[1])))
    setMonthly(lead.deal.monthly ?? (isLeadPkg ? mid(lead.monthlyRange[0], lead.monthlyRange[1]) : mid(t[2], t[3])))
  }, [pkg, lead?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const problems = useMemo(() => {
    if (!lead) return []
    const out = [...lead.weaknesses]
    if (lead.rating && lead.rating >= 4.5) out.push(`Vocês têm nota ${lead.rating.toFixed(1).replace('.', ',')} no Google${lead.reviews ? ` com ${lead.reviews} avaliações` : ''}: a reputação já existe, falta um lugar que transforme isso em cliente`)
    return out.slice(0, 5)
  }, [lead])

  if (!lead) {
    return (
      <div className="prop-wrap">
        <p>Lead não encontrado. <Link to="/leads" className="accent">Voltar aos leads</Link></p>
      </div>
    )
  }

  const cur = lead.currency || 'BRL'
  const deliver = niche?.deliverables?.length ? [...niche.deliverables.slice(0, 4), ...DELIVER[pkg].slice(-1)] : DELIVER[pkg]
  const today = new Date()
  const until = new Date(today.getTime() + validity * 86_400_000)
  const first = settings.ownerName?.split(' ')[0] || 'Eu'
  const setupFinal = discount ? Math.round(setup * 0.9) : setup
  const num = waNumber(lead.phoneIntl, lead.phone, lead.market)

  const text = [
    `*Proposta para ${lead.name}*`,
    '',
    `*${PACKAGES[pkg].label}*`,
    ...deliver.map((d) => `✅ ${d}`),
    '',
    `💰 Investimento: ${money(setupFinal, cur)}${discount ? ` (de ${money(setup, cur)}, 10% para fechar até ${until.toLocaleDateString('pt-BR')})` : ''}`,
    `🔁 Manutenção: ${money(monthly, cur)}/mês (hospedagem, domínio, alterações e suporte)`,
    `⏱️ Entrega em até ${DAYS[pkg]} dias`,
    '',
    `Proposta válida até ${until.toLocaleDateString('pt-BR')}. Posso começar essa semana?`,
  ].join('\n')

  function markSent() {
    updateLead(lead!.id, { stage: ['novo', 'contatado', 'respondeu', 'reuniao'].includes(lead!.stage) ? 'proposta' : lead!.stage, nextActionAt: new Date(Date.now() + 2 * 86_400_000).toISOString() }, { type: 'etapa', text: `Etapa: Proposta enviada (${PACKAGES[pkg].short}, ${money(setupFinal, cur)} + ${money(monthly, cur)}/mês)` })
    toast('Marcado como proposta enviada. Retorno em 2 dias na Agenda.')
  }

  return (
    <div className="prop-wrap">
      <aside className="prop-side glass pad no-print">
        <Link to="/leads" className="btn ghost sm" style={{ alignSelf: 'flex-start' }}><ArrowLeft size={15} /> Voltar</Link>
        <h2 style={{ margin: '12px 0 4px', fontSize: 18 }}><FileText size={17} className="accent" style={{ verticalAlign: -3 }} /> Proposta</h2>
        <p className="dim" style={{ fontSize: 12.5, marginTop: 0 }}>Ajuste aqui. O documento ao lado muda junto.</p>

        <div className="field mt"><span>Pacote</span>
          <div className="seg">
            {(['LP', 'SITE', 'SISTEMA'] as PackageId[]).map((p) => <button key={p} className={pkg === p ? 'on' : ''} onClick={() => setPkg(p)}>{PACKAGES[p].short}</button>)}
          </div>
        </div>
        <div className="row mt-s" style={{ gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span>Valor ({cur})</span><input className="input" type="number" value={setup} onChange={(e) => setSetup(Number(e.target.value))} /></label>
          <label className="field" style={{ flex: 1 }}><span>Mensal</span><input className="input" type="number" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} /></label>
        </div>
        <p className="dim" style={{ fontSize: 11.5, margin: '6px 0 0' }}>Faixa sugerida: {money(table[pkg][0], cur)}–{money(table[pkg][1], cur)} + {money(table[pkg][2], cur)}–{money(table[pkg][3], cur)}/mês</p>
        <label className="field mt-s"><span>Validade (dias)</span><input className="input" type="number" min={1} value={validity} onChange={(e) => setValidity(Math.max(1, Number(e.target.value)))} /></label>
        <label className="field mt-s"><span>Seu WhatsApp (aparece no rodapé)</span>
          <input className="input" placeholder="(22) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => phone !== (settings.ownerPhone ?? '') && saveSettings({ ownerPhone: phone })} />
        </label>
        <div className="col mt" style={{ gap: 8 }}>
          <label className="row" style={{ gap: 8, cursor: 'pointer', fontSize: 13 }}><input type="checkbox" checked={discount} onChange={(e) => setDiscount(e.target.checked)} /> 10% de desconto se fechar na validade</label>
          <label className="row" style={{ gap: 8, cursor: 'pointer', fontSize: 13 }}><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Mostrar os 3 pacotes para comparar</label>
        </div>

        <div className="col mt" style={{ gap: 8 }}>
          <button className="btn primary" onClick={() => window.print()}><Printer size={15} /> Salvar em PDF / imprimir</button>
          <button className="btn" onClick={() => navigator.clipboard.writeText(text).then(() => toast('Resumo copiado. Cole no WhatsApp.'))}><Copy size={15} /> Copiar resumo para WhatsApp</button>
          {num && <a className="btn wa" href={waLink(num, text)} target="_blank" rel="noreferrer"><Send size={15} /> Enviar resumo no WhatsApp</a>}
          <button className="btn ghost" onClick={markSent}><Check size={15} /> Marcar como proposta enviada</button>
        </div>
        <p className="dim" style={{ fontSize: 11.5, marginTop: 10 }}>No PDF: na janela de impressão, escolha "Salvar como PDF" e desmarque "Cabeçalhos e rodapés".</p>
      </aside>

      <article className="prop-doc">
        <header className="pd-head">
          <div>
            <div className="pd-brand">{settings.agencyName || 'Minha agência'}</div>
            <div className="pd-date">{today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
          </div>
          <div className="pd-tag">PROPOSTA</div>
        </header>

        <section className="pd-hero">
          <small>Preparada para</small>
          <h1>{lead.name}</h1>
          <p>{[lead.nicheLabel, [lead.neighborhood, lead.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>
        </section>

        {problems.length > 0 && (
          <section className="pd-sec">
            <h2>O que eu encontrei</h2>
            <ul className="pd-list warn">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            {niche?.hook && <p className="pd-note">Pense em {niche.hook}: hoje essa pessoa encontra o concorrente antes de encontrar vocês.</p>}
          </section>
        )}

        <section className="pd-sec">
          <h2>O que eu vou entregar</h2>
          <div className="pd-pkg">{PACKAGES[pkg].label}</div>
          <ul className="pd-list ok">{deliver.map((d) => <li key={d}>{d}</li>)}</ul>
        </section>

        {showAll ? (
          <section className="pd-sec">
            <h2>Opções</h2>
            <div className="pd-plans">
              {(['LP', 'SITE', 'SISTEMA'] as PackageId[]).map((p) => {
                const on = p === pkg
                const s = on ? setupFinal : mid(table[p][0], table[p][1])
                const m = on ? monthly : mid(table[p][2], table[p][3])
                return (
                  <div key={p} className={`pd-plan ${on ? 'on' : ''}`}>
                    {on && <span className="pd-rec">RECOMENDADO</span>}
                    <b>{PACKAGES[p].short}</b>
                    <div className="pd-price">{money(s, cur)}</div>
                    <small>+ {money(m, cur)}/mês</small>
                    <small>entrega em {DAYS[p]} dias</small>
                  </div>
                )
              })}
            </div>
          </section>
        ) : (
          <section className="pd-sec pd-invest">
            <div>
              <h2>Investimento</h2>
              <div className="pd-big">{money(setupFinal, cur)}</div>
              {discount && <div className="pd-old">de {money(setup, cur)} · 10% fechando até {until.toLocaleDateString('pt-BR')}</div>}
              <small>pagamento único · 50% para começar e 50% na entrega</small>
            </div>
            <div>
              <h2>Manutenção</h2>
              <div className="pd-big sm">{money(monthly, cur)}<span>/mês</span></div>
              <small>sem fidelidade · cancela quando quiser</small>
            </div>
          </section>
        )}

        <section className="pd-sec pd-two">
          <div>
            <h2>A mensalidade inclui</h2>
            <ul className="pd-list ok">{MONTHLY.map((d) => <li key={d}>{d}</li>)}</ul>
          </div>
          <div>
            <h2>Como funciona</h2>
            <ol className="pd-steps">
              <li><b>Aprovação</b><span>Você aprova a proposta e envia o material (logo, fotos, textos).</span></li>
              <li><b>Criação</b><span>Em até {DAYS[pkg]} dias te mostro o site pronto para ajustes.</span></li>
              <li><b>No ar</b><span>Publico, ligo no Google e acompanho os primeiros contatos com você.</span></li>
            </ol>
          </div>
        </section>

        <footer className="pd-foot">
          <div>
            <b>{settings.ownerName || first}</b> · {settings.agencyName}
            {phone && <> · WhatsApp {phone}</>}
          </div>
          <div>Proposta válida até {until.toLocaleDateString('pt-BR')}</div>
        </footer>
      </article>
    </div>
  )
}
