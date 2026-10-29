import type { Lead } from './types'

export interface Priority {
  value: number
  action: string
  why: string
}

const DAY = 86_400_000

/** Quanto este lead merece sua atenção AGORA. Usado no "Foco de hoje". */
export function priorityOf(lead: Lead, now = Date.now()): Priority | null {
  if (lead.stage === 'fechado' || lead.stage === 'perdido') return null
  let v = lead.score * 0.6
  let action = 'Primeiro contato'
  let why = lead.reasons.slice(0, 2).join(' · ')
  const due = lead.nextActionAt ? new Date(lead.nextActionAt).getTime() <= now : false
  const sinceUpdate = (now - new Date(lead.updatedAt).getTime()) / DAY
  const sinceContact = lead.contactedAt ? (now - new Date(lead.contactedAt).getTime()) / DAY : 0

  switch (lead.stage) {
    case 'respondeu':
      v += 38; action = 'Responder e marcar reunião'; why = 'Ele respondeu: lead quente'
      break
    case 'reuniao':
      v += 32; action = 'Preparar a reunião/visita'; why = 'Mostre a prévia e feche'
      break
    case 'proposta':
      v += sinceUpdate > 3 ? 34 : 18
      action = sinceUpdate > 3 ? 'Cobrar retorno da proposta' : 'Aguardar retorno da proposta'
      why = `Proposta há ${Math.floor(sinceUpdate)} dia(s)`
      break
    case 'contatado':
      if (sinceContact >= 2) { v += 20; action = 'Mandar follow-up'; why = `Sem resposta há ${Math.floor(sinceContact)} dias` }
      else { v -= 12; action = 'Aguardar resposta'; why = 'Contato recente' }
      break
    default:
      if (lead.tier === 'top') v += 10
      if (lead.tier === 'top' && !lead.ai) action = 'Analisar com IA e abordar'
  }
  if (due) { v += 30; action = 'Follow-up agendado para hoje'; why = 'Você marcou esta data' }
  return { value: Math.round(v), action, why }
}

export function focusList(leads: Lead[], n = 5): { lead: Lead; p: Priority }[] {
  return leads
    .map((lead) => ({ lead, p: priorityOf(lead) }))
    .filter((x): x is { lead: Lead; p: Priority } => x.p !== null)
    .sort((a, b) => b.p.value - a.p.value)
    .slice(0, n)
}
