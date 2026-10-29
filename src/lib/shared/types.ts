// Tipos compartilhados entre o app (src) e as Cloudflare Functions (functions/, server/).

export type Market = 'BR' | 'US' | 'PT'

/** Situação do site do lead. Quanto pior o site, melhor o lead pra você. */
export type SiteStatus =
  | 'none' // não tem site
  | 'social' // usa Instagram / Facebook / Linktree / WhatsApp como "site"
  | 'broken' // site fora do ar, em construção, domínio à venda
  | 'bad' // site ruim
  | 'weak' // site mediano
  | 'good' // site bom (removido por padrão)
  | 'unknown' // não deu pra verificar (site bloqueia robôs)
  | 'pending' // ainda verificando

export interface DetectedSystem {
  name: string
  category: 'agenda' | 'crm' | 'marketing' | 'delivery' | 'reserva' | 'chat' | 'ecommerce' | 'analytics' | 'construtor'
}

export interface SiteAudit {
  url: string
  finalUrl?: string
  status: SiteStatus
  httpStatus?: number
  https?: boolean
  mobile?: boolean
  title?: string
  description?: string
  builder?: string
  systems: DetectedSystem[]
  hasWhatsappLink?: boolean
  hasForm?: boolean
  emails: string[]
  instagram?: string
  facebook?: string
  copyrightYear?: number
  sizeKb?: number
  loadMs?: number
  quality: number // 0..100 (só faz sentido quando há site)
  issues: string[]
  textSample?: string
}

/** Empresa como veio do Google Places, já normalizada. */
export interface PlaceResult {
  placeId: string
  name: string
  address: string
  neighborhood?: string
  city?: string
  state?: string
  country?: string
  lat?: number
  lng?: number
  rating?: number
  reviews: number
  website?: string
  phone?: string
  phoneIntl?: string
  mapsUrl?: string
  businessStatus?: string
  primaryType?: string
  primaryTypeLabel?: string
  types: string[]
  photos: number
}

export interface AiAnalysis {
  resumo: string
  nota_oportunidade: number
  pontos_fortes: string[]
  pontos_fracos: string[]
  dores_dos_clientes_dele: string[]
  oportunidades: { titulo: string; descricao: string; impacto: string }[]
  sistemas_detectados: string
  pacote: {
    nome: string
    setup_min: number
    setup_max: number
    mensal_min: number
    mensal_max: number
    moeda: string
    justificativa: string
  }
  entregaveis: string[]
  por_que_pagar_mensalidade: string
  objecoes: { objecao: string; resposta: string }[]
  mensagem_whatsapp: string
  followup_whatsapp: string
  email: { assunto: string; corpo: string }
  roteiro_visita: string[]
  ideia_hero: { headline: string; subheadline: string; cta: string; visual: string }
  contatos_encontrados: { instagram: string; seguidores: string; email: string; outros: string }
}

export interface AiRunMeta {
  model: string
  costUsd: number
  inputTokens: number
  outputTokens: number
  webSearches: number
  at: string
}

export interface AnalyzeRequest {
  model: 'claude-opus-5-5' | 'claude-sonnet-5-5'
  market: Market
  lead: {
    name: string
    placeId?: string
    niche: string
    city?: string
    address?: string
    phone?: string
    website?: string
    instagram?: string
    email?: string
    rating?: number
    reviews?: number
    siteStatus: SiteStatus
    siteIssues: string[]
    systems: string[]
    weaknesses: string[]
    packageHint: string
  }
}

export interface AnalyzeResponse {
  analysis?: AiAnalysis
  meta?: AiRunMeta
  error?: string
}
