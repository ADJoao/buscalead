/**
 * Nível, XP, sequência de dias e conquistas. Tudo é calculado a partir dos leads
 * (não precisa salvar nada no banco): se o lead existe, a conquista existe.
 */
import { STAGES, isActiveClient, type Lead } from './types'

const DAY = 86_400_000
const dayKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export interface Stats {
  leads: number
  contacted: number
  replied: number
  meetings: number
  proposals: number
  closed: number
  plates: number
  plateToSite: number
  mrr: number
  revenue: number
  bestMonth: number
  bestDayContacts: number
  streak: number
  bestStreak: number
  activeDays: number
  niches: number
  cities: number
  routes: number
}

const ACTIVE_TYPES = new Set(['whatsapp', 'email', 'ligacao', 'visita'])

export function computeStats(leads: Lead[]): Stats {
  const real = leads
  const reached = (l: Lead, stages: Lead['stage'][]) =>
    stages.includes(l.stage) || l.timeline?.some((e) => e.type === 'etapa' && stages.some((s) => e.text === `Etapa: ${STAGES.find((x) => x.id === s)?.label}`))
  const contacted = real.filter((l) => l.contactedAt || l.stage !== 'novo')
  const closed = real.filter((l) => l.stage === 'fechado' || l.deal?.closedAt)
  const plates = real.filter((l) => l.nfc?.status === 'vendida')

  // dias com alguma ação de contato
  const days = new Map<string, number>()
  for (const l of real) {
    for (const e of l.timeline ?? []) if (ACTIVE_TYPES.has(e.type)) days.set(dayKey(e.at), (days.get(dayKey(e.at)) ?? 0) + 1)
    if (l.contactedAt) days.set(dayKey(l.contactedAt), Math.max(1, days.get(dayKey(l.contactedAt)) ?? 0))
  }
  let streak = 0
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  // hoje ainda não conta como quebra: a sequência continua se ontem teve ação
  for (let i = days.has(dayKey(new Date(today).toISOString())) ? 0 : 1; ; i++) {
    if (days.has(dayKey(new Date(today - i * DAY).toISOString()))) streak++
    else break
  }
  const sorted = [...days.keys()].map((k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m, d).getTime() }).sort((a, b) => a - b)
  let best = 0
  let run = 0
  for (let i = 0; i < sorted.length; i++) {
    run = i && sorted[i] - sorted[i - 1] <= DAY * 1.05 ? run + 1 : 1
    best = Math.max(best, run)
  }

  const months = new Map<string, number>()
  const addMonth = (iso: string | undefined, v: number) => {
    if (!iso || !v) return
    const d = new Date(iso)
    const k = `${d.getFullYear()}-${d.getMonth()}`
    months.set(k, (months.get(k) ?? 0) + v)
  }
  let revenue = 0
  for (const l of closed) {
    addMonth(l.deal.closedAt, l.deal.setup ?? 0)
    revenue += l.deal.setup ?? 0
    // mensalidades recebidas até hoje
    if (l.deal.closedAt && l.deal.monthly) {
      const start = new Date(l.deal.closedAt)
      const end = l.deal.canceledAt ? new Date(l.deal.canceledAt) : now
      for (let d = new Date(start.getFullYear(), start.getMonth() + 1, 1); d <= end; d.setMonth(d.getMonth() + 1)) {
        addMonth(d.toISOString(), l.deal.monthly)
        revenue += l.deal.monthly
      }
    }
  }
  for (const l of plates) {
    addMonth(l.nfc!.at, l.nfc!.value ?? 0)
    revenue += l.nfc!.value ?? 0
  }

  return {
    leads: real.length,
    contacted: contacted.length,
    replied: real.filter((l) => reached(l, ['respondeu', 'reuniao', 'proposta', 'fechado'])).length,
    meetings: real.filter((l) => reached(l, ['reuniao', 'proposta', 'fechado'])).length,
    proposals: real.filter((l) => reached(l, ['proposta', 'fechado'])).length,
    closed: closed.length,
    plates: plates.length,
    plateToSite: plates.filter((l) => l.stage === 'fechado').length,
    mrr: real.filter((l) => isActiveClient(l)).reduce((s, l) => s + (l.deal.monthly ?? 0), 0),
    revenue,
    bestMonth: Math.max(0, ...months.values()),
    bestDayContacts: Math.max(0, ...days.values()),
    streak,
    bestStreak: Math.max(best, streak),
    activeDays: days.size,
    niches: new Set(real.map((l) => l.nicheId ?? l.nicheLabel)).size,
    cities: new Set(real.map((l) => l.city).filter(Boolean)).size,
    routes: real.filter((l) => l.nfc).length,
  }
}

export function xpOf(s: Stats): number {
  return Math.round(
    s.leads * 2 + s.contacted * 10 + s.replied * 25 + s.meetings * 50 + s.proposals * 70 +
    s.closed * 300 + s.plates * 120 + s.plateToSite * 200 + s.activeDays * 15 + s.revenue / 10,
  )
}

export const LEVELS = [
  { xp: 0, name: 'Começando' },
  { xp: 150, name: 'Prospector' },
  { xp: 500, name: 'Caçador de leads' },
  { xp: 1200, name: 'Vendedor de rua' },
  { xp: 2500, name: 'Closer' },
  { xp: 4500, name: 'Dono do funil' },
  { xp: 7500, name: 'Máquina de vendas' },
  { xp: 12000, name: 'Rei da Região dos Lagos' },
  { xp: 20000, name: 'Lenda' },
]

export function levelOf(xp: number) {
  let i = 0
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++
  const cur = LEVELS[i]
  const next = LEVELS[i + 1]
  return {
    n: i + 1,
    name: cur.name,
    next: next?.name,
    progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1,
    toNext: next ? next.xp - xp : 0,
  }
}

export interface Achievement {
  id: string
  emoji: string
  title: string
  desc: string
  goal: number
  value: (s: Stats) => number
  rare?: boolean
}

const A = (id: string, emoji: string, title: string, desc: string, goal: number, value: (s: Stats) => number, rare?: boolean): Achievement => ({ id, emoji, title, desc, goal, value, rare })

export const ACHIEVEMENTS: Achievement[] = [
  A('lead1', '🎯', 'Primeiro alvo', 'Salvar o primeiro lead no CRM', 1, (s) => s.leads),
  A('lead50', '🗂️', 'Carteira cheia', 'Ter 50 leads no CRM', 50, (s) => s.leads),
  A('lead200', '🏛️', 'Banco de ouro', 'Ter 200 leads no CRM', 200, (s) => s.leads),
  A('contact1', '👋', 'Quebrou o gelo', 'Fazer o primeiro contato', 1, (s) => s.contacted),
  A('contact25', '📣', 'Sem medo de falar', 'Contatar 25 negócios', 25, (s) => s.contacted),
  A('contact100', '📡', 'Radar ligado', 'Contatar 100 negócios', 100, (s) => s.contacted),
  A('day10', '⚡', 'Dia produtivo', 'Fazer 10 contatos no mesmo dia', 10, (s) => s.bestDayContacts),
  A('reply5', '💬', 'Eles responderam', 'Receber 5 respostas', 5, (s) => s.replied),
  A('meet1', '🤝', 'Cara a cara', 'Marcar a primeira reunião ou visita', 1, (s) => s.meetings),
  A('prop5', '📄', 'Proposta na mesa', 'Enviar 5 propostas', 5, (s) => s.proposals),
  A('close1', '💰', 'Primeiro cliente', 'Fechar o primeiro site', 1, (s) => s.closed),
  A('close5', '🏆', 'Agência de verdade', 'Fechar 5 clientes', 5, (s) => s.closed),
  A('close15', '👑', 'Carteira de respeito', 'Fechar 15 clientes', 15, (s) => s.closed, true),
  A('plate1', '📲', 'Primeira placa', 'Vender a primeira placa NFC', 1, (s) => s.plates),
  A('plate10', '🛣️', 'Rei da rua', 'Vender 10 placas NFC', 10, (s) => s.plates),
  A('plate2site', '🔁', 'Placa virou site', 'Transformar um cliente da placa em cliente de site', 1, (s) => s.plateToSite, true),
  A('mrr1k', '📈', 'Mil por mês', 'Chegar a R$ 1.000 de receita recorrente', 1000, (s) => s.mrr),
  A('mrr3k', '🚀', 'Salário de adulto', 'Chegar a R$ 3.000 de receita recorrente', 3000, (s) => s.mrr, true),
  A('month5k', '💎', 'Mês de R$ 5 mil', 'Faturar R$ 5.000 em um mês', 5000, (s) => s.bestMonth, true),
  A('rev10k', '🏦', 'Primeiros 10 mil', 'Somar R$ 10.000 faturados', 10000, (s) => s.revenue, true),
  A('streak3', '🔥', 'Pegando ritmo', '3 dias seguidos prospectando', 3, (s) => s.bestStreak),
  A('streak7', '🌋', 'Semana em chamas', '7 dias seguidos prospectando', 7, (s) => s.bestStreak, true),
  A('niches5', '🧭', 'Explorador', 'Ter leads de 5 nichos diferentes', 5, (s) => s.niches),
  A('cities3', '🗺️', 'Além de Cabo Frio', 'Ter leads em 3 cidades', 3, (s) => s.cities),
]

export function unlocked(s: Stats) {
  return ACHIEVEMENTS.filter((a) => a.value(s) >= a.goal)
}
