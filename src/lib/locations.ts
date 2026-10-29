import type { Market } from './shared/types'

export interface City {
  id: string
  name: string
  /** texto usado na busca do Google */
  query: string
  market: Market
  favorite?: boolean
  lagos?: boolean
  /** bairros para cobrir cidades grandes (cada bairro vira uma busca) */
  areas?: string[]
}

export const CITIES: City[] = [
  {
    id: 'cabo-frio', name: 'Cabo Frio', query: 'Cabo Frio, RJ', market: 'BR', favorite: true, lagos: true,
    areas: ['Centro', 'Passagem', 'Braga', 'Algodoal', 'Palmeiras', 'Portinho', 'Jardim Excelsior', 'Peró', 'Ogiva', 'São Cristóvão', 'Vila Nova', 'Tamoios'],
  },
  {
    id: 'rio', name: 'Rio de Janeiro (capital)', query: 'Rio de Janeiro, RJ', market: 'BR', favorite: true,
    areas: [
      'Copacabana', 'Ipanema', 'Leblon', 'Botafogo', 'Flamengo', 'Laranjeiras', 'Lagoa', 'Gávea', 'Centro', 'Tijuca',
      'Vila Isabel', 'Méier', 'Barra da Tijuca', 'Recreio dos Bandeirantes', 'Jacarepaguá', 'Freguesia (Jacarepaguá)',
      'Campo Grande', 'Ilha do Governador', 'Madureira', 'Penha', 'Bangu', 'Grajaú',
    ],
  },
  { id: 'buzios', name: 'Armação dos Búzios', query: 'Armação dos Búzios, RJ', market: 'BR', lagos: true },
  { id: 'arraial', name: 'Arraial do Cabo', query: 'Arraial do Cabo, RJ', market: 'BR', lagos: true },
  { id: 'spa', name: 'São Pedro da Aldeia', query: 'São Pedro da Aldeia, RJ', market: 'BR', lagos: true },
  { id: 'iguaba', name: 'Iguaba Grande', query: 'Iguaba Grande, RJ', market: 'BR', lagos: true },
  { id: 'araruama', name: 'Araruama', query: 'Araruama, RJ', market: 'BR', lagos: true },
  { id: 'rio-ostras', name: 'Rio das Ostras', query: 'Rio das Ostras, RJ', market: 'BR', lagos: true },
  { id: 'macae', name: 'Macaé', query: 'Macaé, RJ', market: 'BR' },
  { id: 'niteroi', name: 'Niterói', query: 'Niterói, RJ', market: 'BR' },
  { id: 'petropolis', name: 'Petrópolis', query: 'Petrópolis, RJ', market: 'BR' },
  { id: 'sao-paulo', name: 'São Paulo', query: 'São Paulo, SP', market: 'BR', areas: ['Pinheiros', 'Moema', 'Vila Mariana', 'Tatuapé', 'Santana', 'Itaim Bibi', 'Perdizes', 'Santo Amaro'] },
  { id: 'campinas', name: 'Campinas', query: 'Campinas, SP', market: 'BR' },
  { id: 'curitiba', name: 'Curitiba', query: 'Curitiba, PR', market: 'BR' },
  { id: 'floripa', name: 'Florianópolis', query: 'Florianópolis, SC', market: 'BR' },
  { id: 'bc', name: 'Balneário Camboriú', query: 'Balneário Camboriú, SC', market: 'BR' },
  { id: 'bh', name: 'Belo Horizonte', query: 'Belo Horizonte, MG', market: 'BR' },
  { id: 'poa', name: 'Porto Alegre', query: 'Porto Alegre, RS', market: 'BR' },
  { id: 'brasilia', name: 'Brasília', query: 'Brasília, DF', market: 'BR' },
  { id: 'goiania', name: 'Goiânia', query: 'Goiânia, GO', market: 'BR' },
  { id: 'vitoria', name: 'Vitória', query: 'Vitória, ES', market: 'BR' },
  { id: 'salvador', name: 'Salvador', query: 'Salvador, BA', market: 'BR' },
  { id: 'recife', name: 'Recife', query: 'Recife, PE', market: 'BR' },
  { id: 'fortaleza', name: 'Fortaleza', query: 'Fortaleza, CE', market: 'BR' },

  { id: 'miami', name: 'Miami', query: 'Miami, FL', market: 'US' },
  { id: 'orlando', name: 'Orlando', query: 'Orlando, FL', market: 'US' },
  { id: 'fort-lauderdale', name: 'Fort Lauderdale', query: 'Fort Lauderdale, FL', market: 'US' },
  { id: 'pompano', name: 'Pompano Beach', query: 'Pompano Beach, FL', market: 'US' },
  { id: 'boca', name: 'Boca Raton', query: 'Boca Raton, FL', market: 'US' },
  { id: 'boston', name: 'Boston', query: 'Boston, MA', market: 'US' },
  { id: 'framingham', name: 'Framingham', query: 'Framingham, MA', market: 'US' },
  { id: 'newark', name: 'Newark', query: 'Newark, NJ', market: 'US' },
  { id: 'nyc', name: 'Nova York', query: 'New York, NY', market: 'US' },
  { id: 'danbury', name: 'Danbury', query: 'Danbury, CT', market: 'US' },
  { id: 'atlanta', name: 'Atlanta', query: 'Atlanta, GA', market: 'US' },
  { id: 'houston', name: 'Houston', query: 'Houston, TX', market: 'US' },

  { id: 'lisboa', name: 'Lisboa', query: 'Lisboa, Portugal', market: 'PT' },
  { id: 'porto', name: 'Porto', query: 'Porto, Portugal', market: 'PT' },
  { id: 'braga', name: 'Braga', query: 'Braga, Portugal', market: 'PT' },
  { id: 'coimbra', name: 'Coimbra', query: 'Coimbra, Portugal', market: 'PT' },
  { id: 'faro', name: 'Faro', query: 'Faro, Portugal', market: 'PT' },
  { id: 'albufeira', name: 'Albufeira', query: 'Albufeira, Portugal', market: 'PT' },
  { id: 'cascais', name: 'Cascais', query: 'Cascais, Portugal', market: 'PT' },
  { id: 'setubal', name: 'Setúbal', query: 'Setúbal, Portugal', market: 'PT' },
  { id: 'aveiro', name: 'Aveiro', query: 'Aveiro, Portugal', market: 'PT' },
  { id: 'leiria', name: 'Leiria', query: 'Leiria, Portugal', market: 'PT' },
  { id: 'funchal', name: 'Funchal (Madeira)', query: 'Funchal, Madeira', market: 'PT' },
]

export const MARKET_INFO: Record<Market, { label: string; flag: string; lang: 'pt-BR' | 'pt-PT' | 'en'; region: string; connector: string }> = {
  BR: { label: 'Brasil', flag: '🇧🇷', lang: 'pt-BR', region: 'BR', connector: 'em' },
  US: { label: 'Estados Unidos', flag: '🇺🇸', lang: 'en', region: 'US', connector: 'in' },
  PT: { label: 'Portugal', flag: '🇵🇹', lang: 'pt-PT', region: 'PT', connector: 'em' },
}
