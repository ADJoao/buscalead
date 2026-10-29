import { PRICE_TABLE } from './niches'
import type { Lead, Stage } from './types'

// Dados fictícios só para visualizar o painel. Aparecem com o selo "DEMO" e nunca são salvos.
const NAMES: [string, string, string, number, number][] = [
  ['Clínica Sorriso do Peró', 'dentista', 'Cabo Frio', 4.9, 312],
  ['Pousada Brisa do Forte', 'pousada', 'Cabo Frio', 4.8, 540],
  ['Barco Azul Passeios', 'passeio', 'Arraial do Cabo', 4.9, 1210],
  ['Imobiliária Costa Lagos', 'imobiliaria', 'Cabo Frio', 4.7, 188],
  ['Estética Bella Pele', 'estetica', 'Rio de Janeiro', 4.9, 264],
  ['Odonto Leblon Prime', 'dentista', 'Rio de Janeiro', 4.8, 402],
  ['Fisio Movimento Tijuca', 'clinica', 'Rio de Janeiro', 4.9, 156],
  ['Solar Lagos Energia', 'solar', 'Cabo Frio', 4.8, 97],
  ['Buffet Villa Jardim', 'eventos', 'Rio de Janeiro', 4.7, 233],
  ['Restaurante Maré Alta', 'restaurante', 'Cabo Frio', 4.6, 1890],
  ['Studio Pilates Ogiva', 'academia', 'Cabo Frio', 4.9, 74],
  ['Pet Vida Clínica Vet', 'pet', 'Cabo Frio', 4.8, 351],
  ['Advocacia Moura & Lins', 'advocacia', 'Rio de Janeiro', 4.9, 88],
  ['Planejados Casa Nobre', 'arquitetura', 'Cabo Frio', 4.8, 61],
  ['Pousada Canto das Conchas', 'pousada', 'Arraial do Cabo', 4.7, 420],
  ['Clínica Odonto Braga', 'dentista', 'Cabo Frio', 4.6, 129],
  ['Auto Center Passagem', 'automotivo', 'Cabo Frio', 4.7, 205],
  ['Inglês Já Botafogo', 'escola', 'Rio de Janeiro', 4.9, 142],
  ['Gelo & Ar Climatização', 'servicos', 'Cabo Frio', 4.8, 66],
  ['Harmonize Barra', 'estetica', 'Rio de Janeiro', 4.8, 190],
  ['Pousada Recanto do Sol', 'pousada', 'Búzios', 4.8, 610],
  ['Marmoraria Pedra Fina', 'construcao', 'São Pedro da Aldeia', 4.7, 54],
  ['Vet Amigo Fiel', 'pet', 'Rio de Janeiro', 4.9, 287],
  ['Clínica Viver Bem', 'clinica', 'Cabo Frio', 4.6, 93],
  ['Escuna Paraíso', 'passeio', 'Cabo Frio', 4.8, 760],
  ['Odonto Vila Isabel', 'dentista', 'Rio de Janeiro', 4.7, 118],
  ['Casa de Festas Encanto', 'eventos', 'Cabo Frio', 4.8, 142],
  ['Imóveis Praia do Forte', 'imobiliaria', 'Cabo Frio', 4.6, 77],
]

const LABELS: Record<string, string> = {
  dentista: 'Clínica odontológica', pousada: 'Pousada / hotel', passeio: 'Passeio de barco / turismo',
  imobiliaria: 'Imobiliária / corretor', estetica: 'Clínica de estética', clinica: 'Clínica médica / fisioterapia',
  solar: 'Energia solar', eventos: 'Buffet / casa de festas', restaurante: 'Restaurante', academia: 'Academia / studio',
  pet: 'Pet shop / veterinária', advocacia: 'Escritório de advocacia', arquitetura: 'Arquitetura / planejados',
  automotivo: 'Oficina / estética automotiva', escola: 'Curso / escola de idiomas', servicos: 'Ar-condicionado / piscina / dedetização',
  construcao: 'Marmoraria / vidraçaria / serralheria',
}

const PKG: Record<string, 'LP' | 'SITE' | 'SISTEMA'> = {
  dentista: 'SISTEMA', pousada: 'SISTEMA', passeio: 'SISTEMA', imobiliaria: 'SISTEMA', estetica: 'SISTEMA', clinica: 'SISTEMA',
  solar: 'SISTEMA', eventos: 'SISTEMA', restaurante: 'SISTEMA', academia: 'SITE', pet: 'SISTEMA', advocacia: 'SITE',
  arquitetura: 'SITE', automotivo: 'SITE', escola: 'SITE', servicos: 'LP', construcao: 'LP',
}

const STAGE_PLAN: Stage[] = [
  'fechado', 'fechado', 'fechado', 'fechado', 'fechado', 'fechado', 'fechado', 'fechado', 'fechado',
  'proposta', 'proposta', 'proposta', 'reuniao', 'reuniao', 'respondeu', 'respondeu', 'respondeu',
  'contatado', 'contatado', 'contatado', 'contatado', 'perdido', 'perdido',
  'novo', 'novo', 'novo', 'novo', 'novo',
]

export function demoLeads(): Lead[] {
  const now = Date.now()
  const DAY = 86_400_000
  return NAMES.map(([name, niche, city, rating, reviews], i) => {
    const stage = STAGE_PLAN[i]
    const pkg = PKG[niche]
    const [a, b, c, d] = PRICE_TABLE.BR[pkg]
    const score = Math.min(97, 62 + ((reviews % 37) + (rating >= 4.8 ? 18 : 8)))
    const monthsAgo = stage === 'fechado' ? Math.floor((i * 7) % 8) : 0
    const closedAt = new Date(now - monthsAgo * 30 * DAY - (i % 9) * DAY).toISOString()
    const created = new Date(now - (monthsAgo * 30 + 12 + i) * DAY).toISOString()
    const siteStatus = (['none', 'social', 'none', 'bad', 'social', 'broken'] as const)[i % 6]
    return {
      id: `demo-${i}`,
      stage,
      score,
      createdAt: created,
      updatedAt: new Date(now - (i % 6) * DAY).toISOString(),
      name,
      nicheId: niche,
      nicheLabel: LABELS[niche],
      market: 'BR',
      city,
      neighborhood: undefined,
      address: `${city}, RJ`,
      phone: '(22) 99999-0000',
      phoneIntl: '+55 22 99999-0000',
      rating,
      reviews,
      photos: 8,
      types: [],
      site: null,
      siteStatus,
      tier: score >= 78 ? 'top' : 'recomendado',
      reasons: [siteStatus === 'none' ? 'Sem site' : 'Site fraco', `${reviews} avaliações · ${rating.toFixed(1)}★`],
      weaknesses: [],
      pkg,
      setupRange: [a, b],
      monthlyRange: [c, d],
      currency: 'BRL',
      deal: stage === 'fechado'
        ? { setup: Math.round((a + ((b - a) * (i % 4)) / 3) / 50) * 50, monthly: c + ((d - c) * (i % 3)) / 2, closedAt }
        : stage === 'proposta' ? { setup: b, monthly: d } : {},
      contactedAt: stage === 'novo' ? undefined : new Date(now - ((i % 5) + 1) * DAY).toISOString(),
      notes: '',
      timeline: [],
      demo: true,
    } satisfies Lead
  })
}
