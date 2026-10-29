import Anthropic from '@anthropic-ai/sdk'
import type { AiAnalysis, AiRunMeta, AnalyzeRequest } from '../src/lib/shared/types'
import type { PlaceDetails } from './places'

// Preços por milhão de tokens (US$) e por busca na web.
const PRICES: Record<string, { in: number; out: number; cacheRead: number }> = {
  'claude-opus-5-5': { in: 4, out: 20, cacheRead: 0.2 },
  'claude-sonnet-5-5': { in: 2, out: 10, cacheRead: 0.2 },
  'claude-opus-4-8': { in: 5, out: 25, cacheRead: 0.5 },
}
const WEB_SEARCH_USD = 0.01

const MARKET_CONTEXT: Record<AnalyzeRequest['market'], string> = {
  BR: `Mercado: Brasil. Moeda BRL. Escreva em português do Brasil, tom de WhatsApp, natural.
Tabela de referência da agência:
- Landing page de conversão: setup R$ 600–900, mensalidade R$ 120–150.
- Site completo + SEO local (Google): setup R$ 1.200–2.000, mensalidade R$ 150–200.
- Site + sistema (agendamento, reservas, catálogo, CRM/painel): setup R$ 2.500–3.500+, mensalidade R$ 250–350.`,
  PT: `Mercado: Portugal. Moeda EUR. Escreva em português europeu (sem gerundismo, trate por "vocês"/"o senhor" conforme o caso).
Tabela de referência:
- Landing page: setup €350–600, mensalidade €40–60.
- Site completo + SEO local: setup €700–1.200, mensalidade €60–90.
- Site + sistema (marcações, reservas, CRM): setup €1.500–3.000, mensalidade €100–150.`,
  US: `Market: United States. Currency USD. Write the outreach messages in English (if the business is clearly Brazilian-owned, write in Brazilian Portuguese instead). The analysis fields can be in Brazilian Portuguese for the agency owner.
Reference pricing:
- Landing page: setup $700–1,200, monthly $50–90.
- Full website + local SEO: setup $1,500–2,500, monthly $90–150.
- Website + system (booking, reservations, CRM): setup $3,000–5,000, monthly $150–300.`,
}

const SYSTEM = `Você é o estrategista comercial de uma agência pequena de sites, SEO local e sistemas (agendamento, reservas, CRM). O dono da agência faz prospecção online (WhatsApp) e presencial (ele mora em Cabo Frio/RJ e visita os negócios).

Seu trabalho: analisar UM negócio local e entregar um plano de abordagem que feche contrato e mantenha a mensalidade.

Princípios:
- O cliente não quer "um site bonito". Ele quer mais clientes, mais agendamentos, menos comissão para plataformas (iFood, Booking, Doctoralia), menos tempo respondendo as mesmas perguntas no WhatsApp. Venda resultado.
- Use fatos concretos do negócio: nota e número de avaliações no Google, o que os clientes elogiam ou reclamam, se tem site, como está o site, se depende de Instagram, que sistemas usa.
- Pacote e ticket precisam caber no tamanho do negócio. Negócio pequeno sem site: landing page. Negócio com volume (muitas avaliações, várias unidades, ticket alto do nicho): site completo ou site + sistema. Justifique a mensalidade com o que ela entrega todo mês (SEO local, atualizações, painel, relatórios, hospedagem, suporte).
- Mensagens de abordagem: NUNCA escreva "sou criador de sites", "sou web designer", "trabalho com sites" ou se apresente pelo serviço. Comece pelo negócio DELE: um elogio verdadeiro e específico (ex: nota 4.8 com 312 avaliações), depois a ferida (o que ele está perdendo hoje, com uma situação concreta do cliente final dele), depois a oferta de MOSTRAR algo pronto ("montei uma prévia de como ficaria a página de vocês"), e termine com uma pergunta de baixo atrito ("posso te mandar a imagem aqui?"). Curta: 3 a 5 linhas, sem emojis em excesso, sem links, sem preço na primeira mensagem.
- Respeite regras de conselhos profissionais (OAB para advogados, CFM/CFO para saúde): nada de promessa de resultado ou "garantia"; para advogados, foco em conteúdo informativo.
- Seja honesto: se o lead for fraco, diga isso na nota_oportunidade e no resumo.

Ferramentas:
- Use web_search (no máximo 3 buscas) para achar o Instagram do negócio e o número aproximado de seguidores, e-mail público e outras informações úteis. Não invente dados: se não achar, escreva "não encontrado".
- No final, chame registrar_analise UMA vez com a análise completa. Essa chamada é obrigatória.`

const str = { type: 'string' } as const
const num = { type: 'number' } as const
const strArr = { type: 'array', items: str } as const
function obj(props: Record<string, unknown>) {
  return { type: 'object', properties: props, required: Object.keys(props), additionalProperties: false }
}

const ANALYSIS_SCHEMA = obj({
  resumo: { ...str, description: '2 a 3 frases: quem é o negócio, situação digital e por que vale (ou não) abordar.' },
  nota_oportunidade: { ...num, description: '0 a 100: chance de fechar e manter mensalidade.' },
  pontos_fortes: strArr,
  pontos_fracos: { ...strArr, description: 'Pontos fracos digitais e comerciais concretos.' },
  dores_dos_clientes_dele: { ...strArr, description: 'O que os clientes finais reclamam/precisam (das avaliações).' },
  oportunidades: { type: 'array', items: obj({ titulo: str, descricao: str, impacto: str }) },
  sistemas_detectados: { ...str, description: 'Sistemas que já usa (agenda, reserva, delivery, CRM) ou "nenhum".' },
  pacote: obj({ nome: str, setup_min: num, setup_max: num, mensal_min: num, mensal_max: num, moeda: str, justificativa: str }),
  entregaveis: { ...strArr, description: 'O que entregar: seções, funcionalidades, integrações.' },
  por_que_pagar_mensalidade: str,
  objecoes: { type: 'array', items: obj({ objecao: str, resposta: str }) },
  mensagem_whatsapp: { ...str, description: 'Primeira mensagem, pronta para enviar.' },
  followup_whatsapp: { ...str, description: 'Follow-up para 2 a 3 dias depois, se não responder.' },
  email: obj({ assunto: str, corpo: str }),
  roteiro_visita: { ...strArr, description: 'Passo a passo da visita presencial: abertura, perguntas, demonstração, fechamento.' },
  ideia_hero: obj({ headline: str, subheadline: str, cta: str, visual: str }),
  contatos_encontrados: obj({ instagram: str, seguidores: str, email: str, outros: str }),
})

function leadBlock(req: AnalyzeRequest, details: PlaceDetails | null, siteText: string | undefined): string {
  const l = req.lead
  const lines = [
    `Negócio: ${l.name}`,
    `Nicho: ${l.niche}`,
    `Cidade: ${l.city ?? '-'} | Endereço: ${l.address ?? '-'}`,
    `Google: nota ${l.rating ?? '-'} com ${l.reviews ?? 0} avaliações`,
    `Telefone: ${l.phone ?? '-'} | Site: ${l.website ?? 'NÃO TEM'} | Instagram conhecido: ${l.instagram ?? '-'} | E-mail conhecido: ${l.email ?? '-'}`,
    `Situação do site: ${l.siteStatus}`,
    `Problemas do site: ${l.siteIssues.join('; ') || '-'}`,
    `Sistemas detectados no site: ${l.systems.join(', ') || 'nenhum'}`,
    `Pontos fracos já detectados: ${l.weaknesses.join('; ') || '-'}`,
    `Pacote sugerido pelas regras: ${l.packageHint}`,
  ]
  if (details?.summary) lines.push(`Resumo do Google: ${details.summary}`)
  if (details?.hours?.length) lines.push(`Horários: ${details.hours.join(' | ')}`)
  if (details?.reviews.length) {
    lines.push('Avaliações recentes:')
    for (const r of details.reviews) lines.push(`- (${r.rating}★, ${r.when}) ${r.text.slice(0, 500)}`)
  }
  if (siteText) lines.push(`Texto do site (trecho):\n${siteText}`)
  return lines.join('\n')
}

export async function runAnalysis(
  apiKey: string,
  req: AnalyzeRequest,
  details: PlaceDetails | null,
  siteText: string | undefined,
): Promise<{ analysis: AiAnalysis; meta: AiRunMeta }> {
  const client = new Anthropic({ apiKey })
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    {
      type: 'web_search_20260209',
      name: 'web_search',
      max_uses: 3,
      user_location: {
        type: 'approximate',
        country: req.market,
        city: req.lead.city ?? null,
      },
    },
    {
      name: 'registrar_analise',
      description: 'Registra a análise final do lead. Chame uma única vez, no fim.',
      strict: true,
      input_schema: ANALYSIS_SCHEMA as Anthropic.Beta.BetaTool.InputSchema,
    },
  ]

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: 'user',
      content: `${MARKET_CONTEXT[req.market]}\n\nDados do lead:\n${leadBlock(req, details, siteText)}\n\nAnalise e chame registrar_analise.`,
    },
  ]

  let inputTokens = 0
  let outputTokens = 0
  let cacheRead = 0
  let webSearches = 0
  let servedModel: string = req.model
  let nudged = false

  for (let turn = 0; turn < 5; turn++) {
    const res = await client.beta.messages.create({
      model: req.model,
      max_tokens: 16000,
      system: SYSTEM,
      tools,
      tool_choice: { type: 'auto' },
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages,
    })
    servedModel = res.model
    inputTokens += res.usage.input_tokens + (res.usage.cache_creation_input_tokens ?? 0)
    cacheRead += res.usage.cache_read_input_tokens ?? 0
    outputTokens += res.usage.output_tokens
    webSearches += res.usage.server_tool_use?.web_search_requests ?? 0

    if (res.stop_reason === 'refusal') throw new Error('A IA recusou analisar este lead.')

    const call = res.content.find(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && b.name === 'registrar_analise',
    )
    if (call) {
      const price = PRICES[servedModel] ?? PRICES[req.model]
      const costUsd =
        (inputTokens * price.in + cacheRead * price.cacheRead + outputTokens * price.out) / 1_000_000 +
        webSearches * WEB_SEARCH_USD
      return {
        analysis: call.input as AiAnalysis,
        meta: {
          model: servedModel,
          costUsd: Math.round(costUsd * 10000) / 10000,
          inputTokens: inputTokens + cacheRead,
          outputTokens,
          webSearches,
          at: new Date().toISOString(),
        },
      }
    }

    if (res.stop_reason === 'max_tokens') throw new Error('Resposta da IA cortada. Tente de novo.')
    messages.push({ role: 'assistant', content: res.content })
    if (res.stop_reason === 'pause_turn') continue
    if (nudged) break
    nudged = true
    messages.push({ role: 'user', content: 'Agora chame registrar_analise com a análise completa.' })
  }
  throw new Error('A IA não concluiu a análise. Tente de novo.')
}
