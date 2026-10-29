import { NICHE_BY_ID, PACKAGES } from './niches'
import { socialKind } from './shared/site'
import type { Lead } from './types'
import { money } from './format'

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1)
}

function seoTerm(lead: Lead) {
  const n = lead.nicheId ? NICHE_BY_ID[lead.nicheId] : undefined
  return (n?.seo[0] ?? lead.nicheLabel).toLowerCase().replace(/ em cabo frio| em arraial do cabo/i, '')
}

function compliment(lead: Lead, en = false): string {
  const r = lead.rating ?? 0
  if (en) {
    return r >= 4.5
      ? `I saw you have a ${r.toFixed(1)} rating with ${lead.reviews} Google reviews, which is rare for a ${lead.nicheLabel.toLowerCase()} in ${lead.city ?? 'the area'}.`
      : `I saw you have ${lead.reviews} Google reviews, so a lot of people already know you.`
  }
  return r >= 4.5
    ? `Vi que vocês têm nota ${r.toFixed(1).replace('.', ',')} no Google com ${lead.reviews} avaliações. Pouca gente em ${lead.city ?? 'na região'} tem uma reputação assim.`
    : `Vi que vocês já têm ${lead.reviews} avaliações no Google, muita gente já passou por aí.`
}

function wound(lead: Lead, en = false): string {
  const term = seoTerm(lead)
  const city = lead.city ?? (en ? 'town' : 'na cidade')
  const issue = lead.site?.issues[0]
  if (en) {
    switch (lead.siteStatus) {
      case 'none': return `But without a website, people searching "${term} in ${city}" only find you on the map, and most of them pick whoever shows up with a site and online booking.`
      case 'social': return `But everything goes through ${socialKind(lead.website)}, which doesn't show up when someone searches "${term} in ${city}".`
      case 'broken': return `But the website listed on your Google profile isn't loading. I tried it a few minutes ago.`
      default: return `But your website ${issue ? lowerFirst(issue).replace(/^não/, "isn't") : 'is losing visitors'}, and those visitors end up calling a competitor.`
    }
  }
  switch (lead.siteStatus) {
    case 'none': return `Só que, sem site, quem pesquisa "${term} em ${city}" só encontra vocês no mapa, e a maioria escolhe quem aparece com site e agendamento na hora.`
    case 'social': return `Só que todo o caminho até vocês passa pelo ${socialKind(lead.website)}, que não aparece quando alguém pesquisa "${term} em ${city}".`
    case 'broken': return 'Só que o site que está no Google de vocês não abre. Tentei agora há pouco.'
    default: return `Só que o site de vocês hoje ${issue ? lowerFirst(issue) : 'não está convertendo visita em cliente'}, e quem entra acaba falando com o concorrente.`
  }
}

function benefit(lead: Lead, en = false): string {
  const n = lead.nicheId ? NICHE_BY_ID[lead.nicheId] : undefined
  const feat = n ? lowerFirst(n.system.split(' + ')[0]) : en ? 'online booking' : 'contato direto pelo WhatsApp'
  return en ? `with ${feat}` : `com ${feat}`
}

export function whatsappMessage(lead: Lead): string {
  if (lead.customMessage) return lead.customMessage
  if (lead.ai?.analysis.mensagem_whatsapp) return lead.ai.analysis.mensagem_whatsapp
  if (lead.market === 'US') {
    return [
      `Hi! Is this the owner of ${lead.name}?`,
      compliment(lead, true),
      wound(lead, true),
      `I put together a quick preview of how your page could look, ${benefit(lead, true)}. Can I send you the image here?`,
    ].join('\n\n')
  }
  const hi = lead.market === 'PT' ? 'Olá, bom dia!' : 'Oi, tudo bem?'
  return [
    `${hi} Falo com o responsável pela ${lead.name}?`,
    compliment(lead),
    wound(lead),
    `Montei uma prévia de como ficaria a página de vocês, ${benefit(lead)}. Posso te mandar a imagem aqui?`,
  ].join('\n\n')
}

export function followupMessage(lead: Lead): string {
  if (lead.ai?.analysis.followup_whatsapp) return lead.ai.analysis.followup_whatsapp
  if (lead.market === 'US') {
    return `Hi again! Just checking if you saw my message. The preview for ${lead.name} is ready. It's just an image, no strings attached. Want me to send it?`
  }
  return `Oi! Passando só pra saber se você viu minha mensagem. A prévia da ${lead.name} ficou pronta, é só uma imagem, sem compromisso. Te mando?`
}

export function emailMessage(lead: Lead): { subject: string; body: string } {
  if (lead.ai?.analysis.email) return { subject: lead.ai.analysis.email.assunto, body: lead.ai.analysis.email.corpo }
  const term = seoTerm(lead)
  if (lead.market === 'US') {
    return {
      subject: `${lead.name}: people searching "${term}" can't find you`,
      body: `Hi,\n\n${compliment(lead, true)}\n\n${wound(lead, true)}\n\nI made a preview of a page for ${lead.name}, ${benefit(lead, true)}. Would you like me to send it over? It's just an image, so you can see the idea before anything else.\n\nBest,`,
    }
  }
  return {
    subject: `${lead.name}: quem pesquisa "${term}" não está achando vocês`,
    body: `Olá,\n\n${compliment(lead)}\n\n${wound(lead)}\n\nMontei uma prévia de uma página para a ${lead.name}, ${benefit(lead)}. Posso te enviar? É só uma imagem, pra você ver a ideia antes de qualquer conversa.\n\nAbraço,`,
  }
}

export function visitScript(lead: Lead, ownerName: string): string[] {
  if (lead.ai?.analysis.roteiro_visita?.length) return lead.ai.analysis.roteiro_visita
  const n = lead.nicheId ? NICHE_BY_ID[lead.nicheId] : undefined
  const pkg = PACKAGES[lead.pkg]
  return [
    `Abertura: "Oi, eu sou ${ownerName || '[seu nome]'}, aqui de ${lead.city ?? 'perto'}. Vi a ${lead.name} no Google com ${lead.reviews} avaliações e quis passar pessoalmente." (Não diga que faz sites, fale do negócio dele.)`,
    'Pergunta 1: "Hoje, a maioria dos clientes novos chega por onde: indicação, Instagram ou Google?"',
    `Pergunta 2: "Quantas mensagens por dia vocês respondem só perguntando ${n?.id === 'pousada' ? 'disponibilidade e preço' : 'preço e horário'}?"`,
    `Ferida: ${n?.pains[0] ?? 'mostre o que ele perde hoje sem presença no Google'}.`,
    'Mostre a prévia (o hero) no celular, com o nome e as fotos dele. Deixe ele segurar o celular.',
    `Proposta: ${pkg.label}. Setup de ${money(lead.setupRange[0], lead.currency)} a ${money(lead.setupRange[1], lead.currency)} + ${money(lead.monthlyRange[0], lead.currency)}/mês (hospedagem, SEO, ajustes e suporte).`,
    'Fechamento: "Consigo colocar no ar em 7 a 10 dias. Fechamos com 50% de entrada e o resto na entrega?"',
  ]
}

/** Prompt pronto pra colar no chat do Claude (sem custo de API). */
export function claudePrompt(lead: Lead): string {
  const n = lead.nicheId ? NICHE_BY_ID[lead.nicheId] : undefined
  return `Analise este lead para a minha agência (sites, SEO local e sistemas de agendamento/reserva/CRM). Pesquise o Instagram e os seguidores dele e procure e-mail público.

Me entregue: resumo, pontos fortes, pontos fracos, dores dos clientes dele, oportunidades, pacote recomendado com setup e mensalidade (minha tabela: LP R$600–900 + R$120–150/mês; site + SEO R$1.200–2.000 + R$150–200/mês; site + sistema R$2.500–3.500+ + R$250–350/mês), entregáveis, por que vale a mensalidade, objeções com respostas, mensagem de WhatsApp (sem dizer que sou criador de sites: elogio específico, ferida, ofereço mostrar uma prévia, pergunta de baixo atrito), follow-up, e-mail, roteiro de visita presencial e ideia do hero (headline, subheadline, CTA, visual).

DADOS
Negócio: ${lead.name}
Nicho: ${lead.nicheLabel}${n ? ` (ticket ${n.tier}, sistema sugerido: ${n.system})` : ''}
Cidade: ${lead.city ?? '-'} · ${lead.address ?? ''}
Google: ${lead.rating ?? '-'}★ com ${lead.reviews} avaliações · ${lead.mapsUrl ?? ''}
Telefone: ${lead.phoneIntl ?? lead.phone ?? '-'}
Site: ${lead.website ?? 'NÃO TEM'} (situação: ${lead.siteStatus})
Problemas do site: ${lead.site?.issues.join('; ') || '-'}
Sistemas detectados: ${lead.site?.systems.map((s) => s.name).join(', ') || 'nenhum'}
Instagram: ${lead.instagram ?? '-'} · E-mail: ${lead.email ?? '-'}
Pontos fracos detectados: ${lead.weaknesses.join('; ') || '-'}
Pontuação no meu CRM: ${lead.score}/100`
}
