import { NICHE_BY_ID, PRICE_TABLE, CURRENCY, type PackageId } from './niches'
import { isMobile } from './phone'
import type { Market, PlaceResult, SiteAudit, SiteStatus } from './shared/types'
import { socialKind } from './shared/site'
import type { Tier } from './types'

export interface ScoreInput {
  place: PlaceResult
  market: Market
  nicheId?: string
  site: SiteAudit | null
  siteStatus: SiteStatus
}

export interface ScoreResult {
  score: number
  tier: Tier
  reasons: string[]
  weaknesses: string[]
  pkg: PackageId
  setupRange: [number, number]
  monthlyRange: [number, number]
  currency: string
}

export interface FilterRules {
  minReviews: number
  minRating: number
  includeWeakSites: boolean
}

const CHAINS =
  /mc ?donald|burger king|subway|bob'?s|habib|giraffas|spoleto|outback|starbucks|cacau show|botic[aá]rio|natura\b|drogasil|droga raia|pague menos|drogaria s[aã]o paulo|panvel|odontocompany|sorridents|oral sin|odonto ?excellence|amor aos peda|chiquinho|kopenhagen|smart ?fit|bodytech|selfit|bluefit|hapvida|\bdasa\b|sabin|lavoisier|fleury|renner|riachuelo|c&a|magazine luiza|magalu|casas bahia|americanas|carrefour|assa[ií]|atacad[aã]o|p[aã]o de a[cç][uú]car|guanabara|prezunic|supermercados? mundial|zona sul|petz|cobasi|localiza|movida|unidas|hering|chilli beans|[óo]ticas? carol|[óo]ticas? diniz|wizard|fisk|ccaa|\bcna\b|kumon|kfc|domino'?s|pizza hut|china in box|madero|coco bambu|espa[cç]o laser|depyl action|maria depila|the beauty box|ibis\b|novotel|mercure|accor|banco |caixa econ|correios|prefeitura|secretaria|hospital municipal|\bupa\b|\bsesc\b|\bsenac\b|\bsebrae\b/i

const SITE_POINTS: Record<SiteStatus, number> = {
  none: 34, social: 32, broken: 30, bad: 22, unknown: 12, pending: 15, weak: 10, good: 0,
}

export function siteLabel(s: SiteStatus): string {
  return {
    none: 'Sem site', social: 'Só rede social', broken: 'Site quebrado', bad: 'Site ruim',
    weak: 'Site mediano', good: 'Site bom', unknown: 'Site não verificado', pending: 'Verificando…',
  }[s]
}

/** Motivo para tirar o lead da lista (ou null se ele passa). */
export function exclusionReason(p: PlaceResult, siteStatus: SiteStatus, rules: FilterRules, nicheId?: string): string | null {
  const min = Math.min(rules.minReviews, (nicheId && NICHE_BY_ID[nicheId]?.minReviews) || rules.minReviews)
  if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') return 'Fechado'
  if (CHAINS.test(p.name)) return 'Franquia / rede grande'
  if (p.reviews < min) return `Menos de ${min} avaliações`
  if ((p.rating ?? 0) < rules.minRating) return `Nota abaixo de ${rules.minRating.toFixed(1)}`
  if (siteStatus === 'good') return 'Já tem site bom'
  if (siteStatus === 'weak' && !rules.includeWeakSites) return 'Site mediano'
  return null
}

function lowerFirst(t: string): string {
  return t.charAt(0).toLowerCase() + t.slice(1)
}

function pkgFor(nicheId: string | undefined, reviews: number): PackageId {
  const base: PackageId = (nicheId && NICHE_BY_ID[nicheId]?.package) || 'LP'
  const order: PackageId[] = ['LP', 'SITE', 'SISTEMA']
  let i = order.indexOf(base)
  if (reviews < 40) i -= 1 // negócio pequeno: começa menor
  if (reviews >= 300 && i < 2) i += 1 // negócio grande aguenta mais
  return order[Math.max(0, Math.min(2, i))]
}

export function scoreLead({ place: p, market, nicheId, site, siteStatus }: ScoreInput): ScoreResult {
  const niche = nicheId ? NICHE_BY_ID[nicheId] : undefined
  const reasons: string[] = []
  const weaknesses: string[] = []
  let s = SITE_POINTS[siteStatus]

  // site
  if (siteStatus === 'none') {
    reasons.push('Sem site')
    weaknesses.push(`Não tem site: quem pesquisa "${niche?.seo[0] ?? niche?.label.toLowerCase() ?? 'o serviço'}" no Google não encontra a empresa fora do Maps`)
  } else if (siteStatus === 'social') {
    reasons.push(`Só ${socialKind(p.website)}`)
    weaknesses.push(`Usa ${socialKind(p.website)} como site: depende do algoritmo e não aparece no Google`)
  } else if (siteStatus === 'broken') {
    reasons.push('Site quebrado')
    weaknesses.push('O site cadastrado no Google está fora do ar: o cliente clica e desiste')
  } else if (siteStatus === 'bad' || siteStatus === 'weak') {
    reasons.push(siteStatus === 'bad' ? 'Site ruim' : 'Site mediano')
  }
  for (const issue of site?.issues ?? []) if (!weaknesses.includes(issue)) weaknesses.push(issue)

  // reputação
  const r = p.reviews
  s += r >= 400 ? 22 : r >= 150 ? 21 : r >= 80 ? 17 : r >= 40 ? 13 : r >= 20 ? 8 : 0
  const rating = p.rating ?? 0
  s += rating >= 4.8 ? 12 : rating >= 4.6 ? 10 : rating >= 4.4 ? 8 : rating >= 4.2 ? 5 : rating >= 4 ? 2 : 0
  reasons.push(`${r} avaliações · ${rating.toFixed(1)}★`)
  if (r > 1500) s -= 5

  const noOwnSite = siteStatus === 'none' || siteStatus === 'social' || siteStatus === 'broken'
  if (noOwnSite && r >= 40) {
    weaknesses.push(`Demanda comprovada (${r} avaliações), mas nenhum canal próprio para transformar essa fama em contato, agendamento ou venda`)
  }
  if (noOwnSite && rating >= 4.6) {
    weaknesses.push(`Nota ${rating.toFixed(1)} que o cliente só vê dentro do Maps: não aparece nas pesquisas comuns do Google, onde ele decide`)
  }
  if (siteStatus === 'social') {
    weaknesses.push('Depende de uma plataforma que não é dele: se o algoritmo ou a conta mudar, perde o canal de vendas')
  }
  if (rating > 0 && rating < 4.5) weaknesses.push(`Nota ${rating.toFixed(1)}: abaixo dos melhores concorrentes (4,7+). Dá pra trabalhar avaliações e reputação`)
  if (p.photos < 4) weaknesses.push('Poucas fotos no Google Maps: o cliente compara pelo visual e escolhe quem mostra mais')

  // contato
  const mobile = isMobile(p.phoneIntl, market)
  if (mobile) { s += 8; reasons.push('WhatsApp direto') }
  else if (p.phoneIntl || p.phone) {
    s += 4
    weaknesses.push('Só telefone fixo no Google: o cliente não consegue chamar no WhatsApp com um toque')
  } else { s -= 10; weaknesses.push('Sem telefone no Google: o cliente não tem como falar com a empresa') }

  // o que o nicho mais perde sem sistema
  const hasSystem = site?.systems.some((x) => ['agenda', 'reserva', 'delivery', 'crm'].includes(x.category))
  if (niche && !hasSystem && niche.package !== 'LP') {
    weaknesses.push(`Sem ${lowerFirst(niche.system.split(' + ')[0])}: ${lowerFirst(niche.pains[0]).replace('[cidade]', p.city ?? 'a cidade')}`)
  }

  // nicho
  s += niche ? { A: 20, B: 13, C: 7 }[niche.tier] : 8
  if (niche?.tier === 'A') reasons.push('Nicho de ticket alto')

  // já usa sistema?
  const sys = site?.systems.filter((x) => ['agenda', 'reserva', 'delivery', 'crm'].includes(x.category)) ?? []
  if (sys.length) {
    s -= 4
    weaknesses.push(`Já usa ${sys.map((x) => x.name).join(', ')} (vender integração/site em volta, não substituir)`)
  }

  const score = Math.max(0, Math.min(100, Math.round(s)))
  const tier: Tier = score >= 78 ? 'top' : score >= 64 ? 'recomendado' : score >= 50 ? 'bom' : 'fraco'
  const pkg = pkgFor(nicheId, r)
  const [a, b, c, d] = PRICE_TABLE[market][pkg]
  return {
    score, tier, reasons, weaknesses, pkg,
    setupRange: [a, b], monthlyRange: [c, d], currency: CURRENCY[market],
  }
}
