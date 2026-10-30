import type { Market } from './shared/types'

export type PackageId = 'LP' | 'SITE' | 'SISTEMA'

export interface Niche {
  id: string
  label: string
  emoji: string
  tier: 'A' | 'B' | 'C'
  /** termos de busca no Google Maps por idioma */
  queries: { 'pt-BR': string[]; 'pt-PT': string[]; en: string[] }
  package: PackageId
  /** o sistema que justifica mensalidade mais alta */
  system: string
  /** por que esse nicho paga bem */
  why: string
  /** dores típicas do dono do negócio */
  pains: string[]
  /** o que entregar */
  deliverables: string[]
  /** gancho da mensagem: a situação do cliente final que dói */
  hook: string
  /** palavras-chave de SEO local */
  seo: string[]
  /** forte na Região dos Lagos (Cabo Frio, Búzios, Arraial) */
  lagos?: boolean
  /** cuidado com conselho profissional */
  compliance?: string
}

export const PACKAGES: Record<PackageId, { label: string; short: string }> = {
  LP: { label: 'Landing page de conversão', short: 'Landing page' },
  SITE: { label: 'Site completo + SEO local', short: 'Site + SEO' },
  SISTEMA: { label: 'Site + sistema (agenda/reservas/CRM)', short: 'Site + sistema' },
}

/** Faixas de preço por mercado: [setupMin, setupMax, mensalMin, mensalMax] */
export const PRICE_TABLE: Record<Market, Record<PackageId, [number, number, number, number]>> = {
  BR: { LP: [600, 900, 120, 150], SITE: [1200, 2000, 150, 200], SISTEMA: [2500, 3500, 250, 350] },
  PT: { LP: [350, 600, 40, 60], SITE: [700, 1200, 60, 90], SISTEMA: [1500, 3000, 100, 150] },
  US: { LP: [700, 1200, 50, 90], SITE: [1500, 2500, 90, 150], SISTEMA: [3000, 5000, 150, 300] },
}

export const CURRENCY: Record<Market, string> = { BR: 'BRL', PT: 'EUR', US: 'USD' }

export const NICHES: Niche[] = [
  {
    id: 'dentista', label: 'Clínica odontológica', emoji: '🦷', tier: 'A',
    queries: { 'pt-BR': ['clínica odontológica', 'dentista'], 'pt-PT': ['clínica dentária'], en: ['dentist', 'dental clinic'] },
    package: 'SISTEMA', system: 'Agendamento online + página por tratamento + lembrete automático no WhatsApp',
    why: 'Tratamentos de R$ 2 mil a R$ 30 mil (implante, lente, invisalign). Um paciente novo paga o site inteiro.',
    pains: ['Paciente pesquisa "implante dentário em [cidade]" e cai no concorrente', 'Secretária perde tempo respondendo preço e horário', 'Faltas e horários vagos na agenda'],
    deliverables: ['Página para cada tratamento (implante, lente, clareamento, ortodontia)', 'Agendamento online integrado ao WhatsApp', 'Galeria de casos dentro das regras do CFO', 'SEO local por tratamento + Google Meu Negócio'],
    hook: 'quem procura "implante dentário" no Google hoje e quer marcar na hora',
    seo: ['implante dentário', 'lente de contato dental', 'dentista perto de mim', 'clareamento dental'],
    compliance: 'CFO: sem promessa de resultado e sem preço/promoção agressiva',
  },
  {
    id: 'estetica', label: 'Clínica de estética', emoji: '✨', tier: 'A',
    queries: { 'pt-BR': ['clínica de estética', 'harmonização facial'], 'pt-PT': ['clínica de estética'], en: ['med spa', 'aesthetic clinic'] },
    package: 'SISTEMA', system: 'Agendamento de avaliação + CRM de pacientes + venda de pacotes',
    why: 'Procedimentos recorrentes e caros (botox, harmonização, laser). Cliente que volta todo mês.',
    pains: ['Depende 100% do Instagram e do algoritmo', 'Muita gente pergunta preço e some', 'Não sabe de onde vêm os clientes'],
    deliverables: ['Landing por procedimento com agendamento de avaliação', 'CRM simples de pacientes e retornos', 'Página de pacotes', 'Pixel e Google Ads prontos'],
    hook: 'quem vê o Instagram de vocês, quer agendar uma avaliação e não encontra um caminho rápido',
    seo: ['harmonização facial', 'botox', 'limpeza de pele', 'depilação a laser'],
  },
  {
    id: 'pousada', label: 'Pousada / hotel', emoji: '🏝️', tier: 'B', lagos: true,
    queries: { 'pt-BR': ['pousada', 'hotel'], 'pt-PT': ['alojamento local', 'guest house'], en: ['boutique hotel', 'bed and breakfast'] },
    // Pesquisa (out/2026): já existem sistemas baratos e famosos para pousada (Hospedin, Omnibees, Silbeck),
    // então o produto certo é o site oficial ligado ao motor de reservas que ela já usa, e não um sistema próprio.
    package: 'SITE', system: 'Site oficial com reserva direta (ligado ao motor de reservas que ela já usa, ou WhatsApp + Pix no CNPJ)',
    why: 'Booking cobra de 15% a 18% e o Airbnb uns 16% por reserva. Cada hóspede que reserva direto devolve essa margem. Mas a temporada é forte: no inverno o dono aperta custos, então mensalidade baixa e bem justificada.',
    pains: ['Paga de 15% a 18% de comissão ao Booking em cada reserva', 'Hóspede acha a pousada no Booking, procura no Google e não acha um site oficial para reservar direto', 'Com tanto golpe de pousada falsa, quem só atende por Instagram e pede Pix parece suspeito'],
    deliverables: ['Site oficial com fotos dos quartos e avaliações', 'Botão de reserva ligado ao motor de reservas que ela já usa (ou WhatsApp + Pix no CNPJ)', 'Selo de confiança: CNPJ, endereço, mapa e link para as avaliações do Google', 'SEO "pousada em [cidade]" e versão em espanhol'],
    hook: 'o hóspede que acha vocês no Booking, procura no Google para reservar direto e não encontra um site oficial',
    seo: ['pousada em Cabo Frio', 'pousada pé na areia', 'pousada barata'],
  },
  {
    id: 'passeio', label: 'Passeio de barco / turismo', emoji: '⛵', tier: 'B', lagos: true,
    queries: { 'pt-BR': ['passeio de barco', 'agência de turismo receptivo'], 'pt-PT': ['passeio de barco', 'tours'], en: ['boat tour', 'tour operator'] },
    package: 'SISTEMA', system: 'Reserva online com pagamento antecipado + site em 3 idiomas',
    why: 'Turista decide no celular, na véspera. Quem aparece primeiro com reserva fácil leva.',
    pains: ['Turista estrangeiro não entende o atendimento só por WhatsApp', 'No-show de reservas sem sinal', 'Perde vendas para quem está nos sites de passeio'],
    deliverables: ['Site em PT/EN/ES com os roteiros', 'Reserva com pagamento antecipado', 'Avaliações do Google e TripAdvisor no site', 'SEO "passeio de barco em [cidade]"'],
    hook: 'o turista que pesquisa "passeio de barco" na noite anterior e reserva com quem tem pagamento online',
    seo: ['passeio de barco Arraial do Cabo', 'passeio de escuna', 'buggy Cabo Frio'],
  },
  {
    id: 'imobiliaria', label: 'Imobiliária / corretor', emoji: '🏠', tier: 'C', lagos: true,
    queries: { 'pt-BR': ['imobiliária'], 'pt-PT': ['imobiliária', 'mediação imobiliária'], en: ['real estate agency'] },
    package: 'SISTEMA', system: 'Catálogo de imóveis com filtros + CRM de leads + aluguel por temporada',
    why: 'Uma comissão de venda paga anos de mensalidade. Na Região dos Lagos, temporada é dinheiro rápido.',
    pains: ['Imóveis só em grupos de WhatsApp e portais caros (ZAP, VivaReal)', 'Leads de interessados se perdem', 'Proprietários querem ver o imóvel bem anunciado'],
    deliverables: ['Catálogo próprio com filtros (bairro, quartos, preço)', 'Página de temporada com calendário', 'CRM de interessados', 'Captação de imóveis de proprietários'],
    hook: 'quem procura "casa para alugar em [cidade]" e cai nos portais, onde vocês disputam com todo mundo',
    seo: ['casa para alugar temporada', 'apartamento à venda', 'imobiliária em Cabo Frio'],
  },
  {
    id: 'advocacia', label: 'Escritório de advocacia', emoji: '⚖️', tier: 'A',
    queries: { 'pt-BR': ['escritório de advocacia', 'advogado'], 'pt-PT': ['escritório de advogados'], en: ['law firm', 'attorney'] },
    package: 'SITE', system: 'Site por área de atuação + conteúdo informativo para SEO + triagem de casos',
    why: 'Honorários altos. Um caso novo paga o projeto todo.',
    pains: ['Cliente procura "advogado trabalhista em [cidade]" e não acha o escritório', 'Depende de indicação', 'Recebe consultas fora da área de atuação'],
    deliverables: ['Página por área (trabalhista, família, previdenciário…)', 'Artigos informativos para o Google', 'Formulário de triagem do caso', 'Botão de WhatsApp por área'],
    hook: 'quem pesquisa "advogado [área] em [cidade]" com um problema urgente',
    seo: ['advogado trabalhista', 'advogado de família', 'advogado previdenciário'],
    compliance: 'OAB (Provimento 205/2021): sem mercantilização, sem promessa de resultado, foco informativo',
  },
  {
    id: 'clinica', label: 'Clínica médica / fisioterapia', emoji: '🩺', tier: 'A',
    queries: { 'pt-BR': ['clínica de fisioterapia', 'clínica médica'], 'pt-PT': ['clínica de fisioterapia', 'clínica médica'], en: ['physical therapy clinic', 'medical clinic'] },
    package: 'SISTEMA', system: 'Agendamento online + página por especialidade + lembretes',
    why: 'Pacientes recorrentes (sessões semanais). Agenda cheia = receita previsível.',
    pains: ['Agenda com buracos', 'Telefone ocupado e ligações perdidas', 'Paciente não sabe quais convênios atendem'],
    deliverables: ['Agendamento por especialidade', 'Página de convênios', 'Lembrete automático', 'SEO local'],
    hook: 'o paciente que tenta ligar, dá ocupado e marca em outra clínica',
    seo: ['fisioterapia', 'pilates clínico', 'ortopedista'],
    compliance: 'CFM/COFFITO: sem antes e depois e sem promessa de cura',
  },
  {
    id: 'solar', label: 'Energia solar', emoji: '☀️', tier: 'B',
    queries: { 'pt-BR': ['energia solar', 'instalação de painel solar'], 'pt-PT': ['painéis solares', 'energia solar'], en: ['solar installer'] },
    package: 'SISTEMA', system: 'Simulador de economia na conta de luz + captação de leads + CRM',
    why: 'Ticket de R$ 15–40 mil por instalação. Um único lead fechado paga o sistema por anos.',
    pains: ['Leads caros e frios', 'Muito orçamento que não fecha', 'Concorrência de empresas grandes com marketing pesado'],
    deliverables: ['Simulador "quanto você economiza" com captura do lead', 'Galeria de instalações', 'CRM de orçamentos', 'Página de financiamento'],
    hook: 'quem recebe a conta de luz alta, pesquisa "energia solar" e preenche o simulador do concorrente',
    seo: ['energia solar residencial', 'placa solar preço', 'energia solar financiamento'],
  },
  {
    id: 'arquitetura', label: 'Arquitetura / planejados', emoji: '📐', tier: 'A',
    queries: { 'pt-BR': ['móveis planejados', 'escritório de arquitetura'], 'pt-PT': ['gabinete de arquitetura', 'móveis por medida'], en: ['architect', 'custom cabinets'] },
    package: 'SITE', system: 'Portfólio + orçamento guiado + CRM de projetos',
    why: 'Projetos de R$ 10–80 mil. O portfólio é o que vende.',
    pains: ['Portfólio espalhado no Instagram', 'Orçamentos de curiosos tomando tempo', 'Clientes de alto padrão esperam um site profissional'],
    deliverables: ['Portfólio por ambiente', 'Orçamento guiado (qualifica o cliente)', 'Depoimentos', 'SEO "móveis planejados em [cidade]"'],
    hook: 'o cliente de alto padrão que pede indicação, procura vocês no Google e não encontra o portfólio',
    seo: ['móveis planejados', 'cozinha planejada', 'arquiteto'],
  },
  {
    id: 'eventos', label: 'Buffet / casa de festas', emoji: '🎉', tier: 'B',
    queries: { 'pt-BR': ['buffet', 'casa de festas', 'espaço para eventos'], 'pt-PT': ['quinta para eventos', 'catering'], en: ['event venue', 'catering'] },
    package: 'SISTEMA', system: 'Agenda de datas disponíveis + orçamento online + CRM de festas',
    why: 'Eventos de R$ 5–50 mil. Quem responde orçamento primeiro fecha.',
    pains: ['Mesmas perguntas sobre data, capacidade e preço', 'Orçamentos esquecidos', 'Fotos espalhadas'],
    deliverables: ['Calendário de datas', 'Orçamento por número de convidados', 'Galeria de eventos', 'Follow-up automático'],
    hook: 'a noiva que manda mensagem para 5 buffets e fecha com o que responde com orçamento primeiro',
    seo: ['buffet de casamento', 'espaço para festas', 'buffet infantil'],
  },
  {
    id: 'escola', label: 'Curso / escola de idiomas', emoji: '🎓', tier: 'B',
    queries: { 'pt-BR': ['escola de inglês', 'curso profissionalizante'], 'pt-PT': ['escola de línguas', 'centro de explicações'], en: ['language school', 'tutoring center'] },
    package: 'SITE', system: 'Página de matrícula + aula experimental + CRM de alunos',
    why: 'Mensalidade recorrente do aluno. Cada matrícula vale meses de receita.',
    pains: ['Concorrência das franquias', 'Interessado que pede info e some', 'Matrícula ainda no papel'],
    deliverables: ['Página de cada curso', 'Agendamento de aula experimental', 'Matrícula online', 'SEO local'],
    hook: 'os pais que pesquisam "curso de inglês perto de mim" e acabam na franquia',
    seo: ['curso de inglês', 'autoescola', 'reforço escolar'],
  },
  {
    id: 'restaurante', label: 'Restaurante', emoji: '🍽️', tier: 'C', lagos: true,
    queries: { 'pt-BR': ['restaurante'], 'pt-PT': ['restaurante'], en: ['restaurant'] },
    package: 'SISTEMA', system: 'Cardápio digital + pedido direto no WhatsApp (sem a comissão do iFood) + reservas',
    why: 'O iFood leva 12–27% de cada pedido. Pedido direto é margem que volta.',
    pains: ['Comissão alta do iFood', 'Cardápio em PDF ou só em foto no Instagram', 'Turista não acha o cardápio nem os horários'],
    deliverables: ['Cardápio digital com fotos', 'Pedido direto via WhatsApp/Pix', 'Reserva de mesa', 'Página em inglês/espanhol para turistas'],
    hook: 'o cliente fiel que pede pelo iFood e deixa 20% do pedido lá',
    seo: ['restaurante em Cabo Frio', 'frutos do mar', 'delivery'],
  },
  {
    id: 'academia', label: 'Academia / studio', emoji: '🏋️', tier: 'C',
    queries: { 'pt-BR': ['studio de pilates', 'academia', 'crossfit'], 'pt-PT': ['estúdio de pilates', 'ginásio'], en: ['pilates studio', 'gym'] },
    package: 'SITE', system: 'Aula experimental com agendamento + planos + CRM de alunos',
    why: 'Recorrência. Cada aluno novo rende mensalidade por meses.',
    pains: ['Aula experimental que não vira matrícula', 'Concorrência de redes baratas', 'Grade de horários só no story'],
    deliverables: ['Agendamento de aula experimental', 'Grade de horários', 'Planos e matrícula', 'SEO local'],
    hook: 'quem pesquisa "pilates perto de mim" e quer marcar uma aula experimental hoje',
    seo: ['pilates', 'academia perto de mim', 'personal trainer'],
  },
  {
    id: 'pet', label: 'Pet shop / veterinária', emoji: '🐾', tier: 'B',
    queries: { 'pt-BR': ['clínica veterinária', 'pet shop banho e tosa'], 'pt-PT': ['clínica veterinária'], en: ['veterinary clinic', 'pet grooming'] },
    package: 'SISTEMA', system: 'Agendamento de banho e tosa/consulta + lembrete de vacina',
    why: 'Serviço recorrente (banho quinzenal, vacinas). O tutor é fiel.',
    pains: ['Agenda por WhatsApp desorganizada', 'Tutor esquece retorno e vacina', 'Emergência: quem aparece primeiro no Google leva'],
    deliverables: ['Agendamento online', 'Lembrete de vacina e retorno', 'Página de emergência 24h (se tiver)', 'SEO local'],
    hook: 'o tutor que precisa de veterinário urgente e liga para o primeiro que aparece no Google',
    seo: ['veterinário 24h', 'banho e tosa', 'pet shop'],
  },
  {
    id: 'automotivo', label: 'Oficina / estética automotiva', emoji: '🚗', tier: 'B',
    queries: { 'pt-BR': ['oficina mecânica', 'estética automotiva', 'auto center'], 'pt-PT': ['oficina automóvel'], en: ['auto repair shop', 'car detailing'] },
    package: 'SITE', system: 'Orçamento online com foto + agendamento de serviço',
    why: 'Serviços de R$ 500 a R$ 5 mil, cliente que volta.',
    pains: ['Cliente desconfia de oficina sem presença online', 'Orçamento demora', 'Concorrência das redes'],
    deliverables: ['Pedido de orçamento com foto', 'Agendamento', 'Avaliações em destaque', 'SEO por serviço'],
    hook: 'o motorista que pesquisa "oficina de confiança" e escolhe pela avaliação e pelo site',
    seo: ['oficina mecânica', 'polimento', 'troca de óleo'],
  },
  {
    id: 'servicos', label: 'Ar-condicionado / piscina / dedetização', emoji: '🛠️', tier: 'B', lagos: true,
    queries: { 'pt-BR': ['instalação de ar condicionado', 'manutenção de piscina', 'dedetizadora'], 'pt-PT': ['ar condicionado instalação', 'manutenção de piscinas'], en: ['hvac contractor', 'pool service'] },
    package: 'LP', system: 'Orçamento rápido + contratos de manutenção recorrente',
    why: 'Na praia, todo mundo precisa no verão. Contrato de manutenção é recorrência.',
    pains: ['Some no inverno, lota no verão', 'Cliente acha pelo Google e liga para o primeiro', 'Sem contratos de manutenção'],
    deliverables: ['Landing com orçamento rápido', 'Plano de manutenção mensal', 'Área atendida (bairros)', 'SEO local'],
    hook: 'quem pesquisa "instalação de ar condicionado" no primeiro calor do ano',
    seo: ['instalação de ar condicionado', 'limpeza de piscina', 'dedetização'],
  },
  {
    id: 'urgencia', label: 'Desentupidora / chaveiro / guincho', emoji: '🚨', tier: 'B',
    queries: { 'pt-BR': ['desentupidora', 'chaveiro 24 horas', 'guincho'], 'pt-PT': ['desentupimentos', 'serralheiro 24 horas', 'reboque'], en: ['plumber emergency', 'locksmith 24 hour', 'towing service'] },
    package: 'SITE', system: 'Site de SEO local por bairro + botão de ligar/WhatsApp (tira a dependência do Google Ads)',
    why: 'Busca de urgência: quem aparece primeiro no Google leva. Chamado de R$ 120 a R$ 800, e contratos mensais com condomínios e restaurantes (caixa de gordura). O setor tem muita reclamação de preço abusivo, então empresa honesta com site e orçamento fechado ganha confiança. Em cidade pequena, o volume de busca é menor: teste antes.',
    pains: ['Quem procura com urgência liga para o primeiro que aparece no Google', 'Cliente tem medo de golpe e preço abusivo no setor, e escolhe quem passa confiança', 'Não tem contratos fixos com condomínios e restaurantes, vive só de emergência'],
    deliverables: ['Página por serviço e por bairro atendido', 'Botão de ligar e de WhatsApp fixo no celular', 'Avaliações do Google em destaque', 'Ficha do Google otimizada'],
    hook: 'quem está com o problema agora, pesquisa no Google e liga para o primeiro número que aparece',
    seo: ['desentupidora 24 horas', 'chaveiro perto de mim', 'guincho 24h'],
  },
  {
    id: 'beleza', label: 'Salão de beleza / barbearia', emoji: '💈', tier: 'C',
    queries: { 'pt-BR': ['salão de beleza', 'barbearia'], 'pt-PT': ['cabeleireiro', 'barbearia'], en: ['hair salon', 'barbershop'] },
    package: 'LP', system: 'Agendamento online próprio (sem taxa de app)',
    why: 'Volume alto, ticket menor. Bom quando ainda agenda tudo no WhatsApp.',
    pains: ['Agenda no WhatsApp tomando o dia', 'Faltas sem aviso', 'Paga taxa de app de agendamento'],
    deliverables: ['Landing com agendamento', 'Tabela de serviços', 'Galeria', 'Lembrete automático'],
    hook: 'a cliente que quer marcar às 23h e só consegue no dia seguinte',
    seo: ['salão de beleza', 'barbearia', 'manicure'],
  },
  {
    id: 'contabilidade', label: 'Contabilidade', emoji: '📊', tier: 'C',
    queries: { 'pt-BR': ['escritório de contabilidade'], 'pt-PT': ['contabilista'], en: ['accounting firm', 'tax preparer'] },
    package: 'SITE', system: 'Captação de MEI / abertura de empresa + área do cliente',
    why: 'Honorário mensal recorrente por cliente.',
    pains: ['Perde clientes para contabilidades online', 'Dono de MEI não sabe que eles atendem', 'Atendimento só por telefone'],
    deliverables: ['Páginas de serviço (abrir empresa, MEI, IR)', 'Simulador de custo', 'Formulário de contato', 'SEO local'],
    hook: 'quem quer abrir empresa, pesquisa no Google e acaba numa contabilidade online',
    seo: ['abrir empresa', 'contador MEI', 'imposto de renda'],
  },
  {
    id: 'otica', label: 'Ótica', emoji: '👓', tier: 'C',
    queries: { 'pt-BR': ['ótica'], 'pt-PT': ['ótica'], en: ['optical store', 'optometrist'] },
    package: 'LP', system: 'Catálogo de armações + agendamento de exame',
    why: 'Ticket médio bom e cliente recorrente a cada 1–2 anos.',
    pains: ['Concorrência de redes', 'Catálogo só no Instagram'],
    deliverables: ['Catálogo', 'Agendamento de exame de vista', 'SEO local'],
    hook: 'quem pesquisa "ótica perto de mim" e compara antes de sair de casa',
    seo: ['ótica', 'exame de vista', 'óculos de grau'],
  },
  {
    id: 'construcao', label: 'Marmoraria / vidraçaria / serralheria', emoji: '🧱', tier: 'A',
    queries: { 'pt-BR': ['marmoraria', 'vidraçaria', 'serralheria'], 'pt-PT': ['marmorista', 'vidraceiro'], en: ['countertop fabricator', 'glass company'] },
    package: 'SITE', system: 'Portfólio de obras + orçamento com fotos e medidas',
    why: 'Serviços de R$ 2–20 mil. Cliente compara 3 orçamentos.',
    pains: ['Orçamentos que não voltam', 'Portfólio desorganizado', 'Concorrência por preço'],
    deliverables: ['Orçamento com envio de medidas', 'Galeria de trabalhos', 'SEO por serviço'],
    hook: 'quem está reformando, pede 3 orçamentos e fecha com quem passa mais confiança',
    seo: ['bancada de granito', 'box de vidro', 'portão de alumínio'],
  },
]

export const NICHE_BY_ID = Object.fromEntries(NICHES.map((n) => [n.id, n])) as Record<string, Niche>

/** Nichos ordenados pelo potencial (para o modo "Minerar os melhores"). */
export function bestNiches(lagos = false): Niche[] {
  const tierScore = { A: 3, B: 2, C: 1 }
  return [...NICHES].sort((a, b) => {
    const sa = tierScore[a.tier] * 10 + (a.package === 'SISTEMA' ? 4 : a.package === 'SITE' ? 2 : 0) + (lagos && a.lagos ? 6 : 0)
    const sb = tierScore[b.tier] * 10 + (b.package === 'SISTEMA' ? 4 : b.package === 'SITE' ? 2 : 0) + (lagos && b.lagos ? 6 : 0)
    return sb - sa
  })
}

/** Tenta descobrir o nicho de um lugar pelo tipo do Google. */
export function guessNiche(types: string[], name: string): string | undefined {
  const t = new Set(types)
  const n = name.toLowerCase()
  if (t.has('dentist') || t.has('dental_clinic') || /odonto|dent/.test(n)) return 'dentista'
  if (t.has('lodging') || t.has('hotel') || t.has('inn') || t.has('bed_and_breakfast') || /pousada|hotel|hostel/.test(n)) return 'pousada'
  if (t.has('real_estate_agency') || /imobili|imóveis|imoveis/.test(n)) return 'imobiliaria'
  if (t.has('lawyer') || /advoca|advogad|law/.test(n)) return 'advocacia'
  if (t.has('veterinary_care') || t.has('pet_store') || /pet|veterin/.test(n)) return 'pet'
  if (t.has('beauty_salon') || t.has('hair_salon') || t.has('barber_shop') || /barbear|salão|salao|cabelei/.test(n)) return 'beleza'
  if (t.has('spa') || t.has('skin_care_clinic') || /estétic|estetic|harmoniza/.test(n)) return 'estetica'
  if (t.has('physiotherapist') || t.has('doctor') || t.has('medical_clinic') || /fisio|clínica|clinica/.test(n)) return 'clinica'
  if (t.has('restaurant') || t.has('food')) return 'restaurante'
  if (t.has('gym') || t.has('fitness_center') || /pilates|academia|crossfit/.test(n)) return 'academia'
  if (t.has('car_repair') || t.has('car_wash') || /oficina|auto|mecânic/.test(n)) return 'automotivo'
  if (t.has('accounting') || /contab/.test(n)) return 'contabilidade'
  if (/desentup|chaveiro|guincho|reboque/.test(n) || t.has('locksmith') || t.has('plumber')) return 'urgencia'
  if (/solar/.test(n)) return 'solar'
  if (/planejad|arquitet/.test(n)) return 'arquitetura'
  if (/buffet|festa|evento/.test(n)) return 'eventos'
  if (/passeio|barco|escuna|turismo|tour/.test(n) || t.has('tour_agency') || t.has('travel_agency')) return 'passeio'
  if (/ótica|otica/.test(n)) return 'otica'
  if (/escola|curso|idioma|inglês|autoescola/.test(n) || t.has('school')) return 'escola'
  return undefined
}
