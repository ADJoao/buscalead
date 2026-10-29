# BuscaLead

CRM pessoal de prospecção para agência de sites, SEO local e sistemas.

- **Buscar leads** no Google Maps em tempo real (Brasil, EUA e Portugal), com Cabo Frio e Rio de Janeiro em destaque e busca por bairro.
- **Filtro de qualidade automático**: mínimo de 20 avaliações, nota mínima, só empresa aberta, sem franquias. Também tira quem já tem site bom.
- **Raio-X do site**: classifica cada empresa como sem site, só Instagram/Linktree, site quebrado, site ruim ou site bom. Detecta sistemas que ela já usa (Doctoralia, Trinks, iFood, Booking, RD Station, Wix…) e acha e-mail e Instagram.
- **Ranking**: pontuação de 0 a 100, selo **↑ TOP**, pódio **"Faça agora" (Top 1–5)**, seções TOP, Recomendados e Bons.
- **Ticket sugerido** por nicho e por tamanho do negócio (landing page, site + SEO, site + sistema), com setup e mensalidade.
- **Abordagem pronta**: mensagem de WhatsApp (sem "sou criador de sites"), follow-up, e-mail e roteiro de visita. Tem um clique para abrir o WhatsApp com a mensagem.
- **Análise profunda com IA** (Claude), só quando você clica. Tem limite de gasto mensal e mostra o custo de cada análise.
- **Copiar para o Claude**: o mesmo pedido de análise, de graça, para colar no chat do Claude.
- **Dashboard de vendas**: MRR, faturamento, conversão, ticket médio, funil, gráficos e "Foco de hoje".
- **Pipeline** (kanban) e lista de leads com exportação para CSV.

## Custos

| Item | Custo |
| --- | --- |
| Cloudflare Pages (hospedagem) | grátis |
| Supabase (banco + login) | grátis (o projeto "dorme" após 7 dias sem uso; é só reativar no painel) |
| Google Places (busca) | cota grátis mensal do Google (≈ 1.000 buscas/mês; cada busca traz até 20 empresas) |
| Análise com IA | só quando você clica: ≈ R$ 1,00–1,70 por lead (modelo melhor) ou ≈ R$ 0,60–0,85 (econômico) |

## Instalação (uma vez só)

### 1. Supabase (banco de dados e login)

1. Crie uma conta em <https://supabase.com> e clique em **New project**.
2. Abra **SQL Editor > New query**, cole todo o arquivo [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public**.
4. Depois de criar sua conta no app (passo 4), vá em **Authentication > Sign In / Providers** e desligue **Allow new users to sign up**. Assim só você entra.

### 2. Google Places (busca de empresas)

1. Entre em <https://console.cloud.google.com>, crie um projeto e ative o faturamento. O Google exige cartão, mas a cota grátis cobre o uso normal.
2. Em **APIs e serviços > Biblioteca**, ative a **Places API (New)**.
3. Em **APIs e serviços > Credenciais**, clique em **Criar credenciais > Chave de API**.
4. Recomendado: restrinja a chave à **Places API (New)** e crie um **orçamento com alerta** (Faturamento > Orçamentos) de, por exemplo, US$ 5.

### 3. Anthropic (análise com IA, opcional)

1. Crie uma conta em <https://console.anthropic.com>, adicione créditos (US$ 5 já dá para centenas de análises) e gere uma **API key**.
2. Sem essa chave, o resto funciona e o botão **Copiar para o Claude** continua grátis.

### 4. Cloudflare Pages (colocar no ar)

1. Em <https://dash.cloudflare.com>, vá em **Workers & Pages > Create > Pages > Connect to Git** e escolha este repositório.
2. Build command: `npm run build`. Build output directory: `dist`.
3. Em **Settings > Variables and Secrets**, adicione:

| Nome | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL do Supabase |
| `VITE_SUPABASE_ANON_KEY` | chave anon do Supabase |
| `SUPABASE_URL` | Project URL do Supabase (de novo) |
| `SUPABASE_ANON_KEY` | chave anon do Supabase (de novo) |
| `GOOGLE_PLACES_API_KEY` | chave do Google (marque como *secret*) |
| `ANTHROPIC_API_KEY` | chave da Anthropic (marque como *secret*) |

4. Faça um novo deploy. Abra o link, clique em **Primeiro acesso? Criar conta** e entre.
5. Volte no Supabase e desligue o cadastro de novos usuários (passo 1.4).

> As chaves do Google e da Anthropic ficam só no servidor da Cloudflare. Toda rota `/api` exige o seu login, então ninguém consegue usar suas chaves.

## Rodar no computador (opcional)

```bash
npm install
```

```bash
cp .dev.vars.example .dev.vars   # preencha as chaves
cp .env.example .env.local       # preencha o Supabase (ou deixe sem, para o modo local)
```

```bash
npm run build && npm run dev:api   # API (Cloudflare local) na porta 8788
```

```bash
npm run dev                        # app em http://localhost:5173
```

Sem as variáveis do Supabase o app roda em **modo local**: os dados ficam só no navegador. Para a API aceitar chamadas sem login nesse modo, coloque `ALLOW_NO_AUTH=true` no `.dev.vars`.

## Estrutura

```
src/                 app React
  pages/             Dashboard, Buscar leads, Leads, Pipeline, Nichos, Configurações
  lib/niches.ts      nichos, tickets, dores, ganchos (edite aqui sua tabela de preços)
  lib/locations.ts   cidades e bairros
  lib/scoring.ts     pontuação, filtros e TOP
  lib/messages.ts    mensagens de abordagem
functions/api/       rotas da Cloudflare (places, inspect, analyze, status, usage)
server/              lógica do servidor (Google Places, raio-X do site, IA)
supabase/schema.sql  banco de dados
```
