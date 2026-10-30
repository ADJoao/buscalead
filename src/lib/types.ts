import type { PackageId } from './niches'
import type { AiAnalysis, AiRunMeta, Market, SiteAudit, SiteStatus } from './shared/types'

export type Stage = 'novo' | 'contatado' | 'respondeu' | 'reuniao' | 'proposta' | 'fechado' | 'perdido'
export type Tier = 'top' | 'recomendado' | 'bom' | 'fraco'

export const STAGES: { id: Stage; label: string; short: string }[] = [
  { id: 'novo', label: 'Novo', short: 'Novo' },
  { id: 'contatado', label: 'Contatado', short: 'Contato' },
  { id: 'respondeu', label: 'Respondeu', short: 'Resposta' },
  { id: 'reuniao', label: 'Reunião / visita', short: 'Reunião' },
  { id: 'proposta', label: 'Proposta enviada', short: 'Proposta' },
  { id: 'fechado', label: 'Fechado', short: 'Fechado' },
  { id: 'perdido', label: 'Perdido', short: 'Perdido' },
]

export interface TimelineEvent {
  at: string
  type: 'criado' | 'whatsapp' | 'email' | 'ligacao' | 'visita' | 'nota' | 'etapa' | 'ia'
  text: string
}

export interface Lead {
  id: string
  placeId?: string
  stage: Stage
  score: number
  createdAt: string
  updatedAt: string

  name: string
  nicheId?: string
  nicheLabel: string
  market: Market
  city?: string
  neighborhood?: string
  address?: string
  phone?: string
  phoneIntl?: string
  email?: string
  instagram?: string
  website?: string
  mapsUrl?: string
  rating?: number
  reviews: number
  photos: number
  types: string[]

  site: SiteAudit | null
  siteStatus: SiteStatus
  tier: Tier
  reasons: string[]
  weaknesses: string[]
  pkg: PackageId
  setupRange: [number, number]
  monthlyRange: [number, number]
  currency: string

  deal: { setup?: number; monthly?: number; closedAt?: string; canceledAt?: string }
  contactedAt?: string
  nextActionAt?: string
  lostReason?: string
  notes: string
  timeline: TimelineEvent[]
  ai?: { analysis: AiAnalysis; meta: AiRunMeta }
  customMessage?: string
  /** site que você fez para o cliente */
  deliveredSite?: string
  /** resultado de busca que já está salvo no CRM */
  inCrm?: boolean
  demo?: boolean
}

export interface Settings {
  ownerName: string
  agencyName: string
  aiModel: 'claude-opus-5-5' | 'claude-sonnet-5-5'
  aiMonthlyLimitBrl: number
  usdBrl: number
  mrrGoal: number
  minReviews: number
  minRating: number
  includeWeakSites: boolean
  demoMode: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  ownerName: '',
  agencyName: 'Minha agência',
  aiModel: 'claude-opus-5-5',
  aiMonthlyLimitBrl: 50,
  usdBrl: 5.5,
  mrrGoal: 3000,
  minReviews: 20,
  minRating: 4.0,
  includeWeakSites: false,
  demoMode: false,
}

/** Cliente fechado que ainda paga (sem cancelamento, ou cancelamento no futuro). */
export function isActiveClient(l: Lead, at = new Date()): boolean {
  return l.stage === 'fechado' && (!l.deal.canceledAt || new Date(l.deal.canceledAt) > at)
}
