import type { SiteAudit } from '../src/lib/shared/types'
import { SYSTEM_SIGNATURES, instagramHandle, isSocialUrl, socialKind } from '../src/lib/shared/site'

const MAX_BYTES = 350_000
const TIMEOUT_MS = 8000
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'

const PARKED =
  /(domain (is )?for sale|este dom[ií]nio (est[aá] )?(à|a) venda|domínio à venda|this domain (may be|is) for sale|parked free|hostgator.{0,40}(default|padr)|site em constru[cç][aã]o|em constru[cç][aã]o|under construction|coming soon|index of \/|account suspended|conta suspensa|default web site page|it works!|welcome to nginx)/

async function readLimited(res: Response): Promise<string> {
  if (!res.body) return ''
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done || !value) break
    chunks.push(value)
    total += value.byteLength
  }
  reader.cancel().catch(() => {})
  const buf = new Uint8Array(total)
  let off = 0
  for (const c of chunks) {
    buf.set(c.subarray(0, Math.min(c.byteLength, total - off)), off)
    off += c.byteLength
    if (off >= total) break
  }
  return new TextDecoder('utf-8').decode(buf)
}

function pick(re: RegExp, s: string): string | undefined {
  const m = s.match(re)
  return m?.[1]?.trim()
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

/** Texto visível aproximado do HTML (para a IA ler sem gastar tokens com markup). */
export function visibleText(html: string, max = 6000): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export async function auditSite(rawUrl: string, withText = false): Promise<SiteAudit> {
  const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
  const base: SiteAudit = { url, status: 'pending', systems: [], emails: [], quality: 0, issues: [] }

  if (isSocialUrl(url)) {
    return {
      ...base,
      status: 'social',
      instagram: instagramHandle(url),
      issues: [`Usa ${socialKind(url)} no lugar de um site próprio`],
    }
  }

  const started = Date.now()
  let res: Response
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml', 'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8' },
    })
    clearTimeout(t)
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError'
    return {
      ...base,
      status: 'broken',
      issues: [aborted ? 'Site extremamente lento (não carregou em 8s)' : 'Site fora do ar ou com erro de certificado'],
    }
  }

  const loadMs = Date.now() - started
  const finalUrl = res.url || url
  const server = res.headers.get('server') ?? ''

  if (isSocialUrl(finalUrl)) {
    return { ...base, finalUrl, status: 'social', instagram: instagramHandle(finalUrl), issues: [`O domínio redireciona para ${socialKind(finalUrl)}`] }
  }

  if (res.status === 403 || res.status === 429 || (res.status === 503 && /cloudflare/i.test(server))) {
    return { ...base, finalUrl, httpStatus: res.status, status: 'unknown', issues: ['Site bloqueia verificação automática'] }
  }
  if (res.status >= 400) {
    return { ...base, finalUrl, httpStatus: res.status, status: 'broken', issues: [`Site retorna erro ${res.status}`] }
  }

  const html = await readLimited(res)
  const low = html.toLowerCase()
  const sizeKb = Math.round(html.length / 1024)
  const issues: string[] = []
  let q = 100

  const https = finalUrl.startsWith('https://')
  const mobile = /<meta[^>]+name=["']?viewport/i.test(html)
  const title = pick(/<title[^>]*>([^<]{0,160})<\/title>/i, html)
  const description = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,300})/i, html)

  if (html.length < 600 || PARKED.test(low.slice(0, 60_000))) {
    return {
      ...base, finalUrl, httpStatus: res.status, https, loadMs, sizeKb,
      status: 'broken', quality: 5,
      issues: ['Site em construção, vazio ou domínio parado'],
    }
  }

  const systems = SYSTEM_SIGNATURES.filter((s) => s.re.test(low)).map(({ name, category }) => ({ name, category }))
  const uniqueSystems = systems.filter((s, i) => systems.findIndex((x) => x.name === s.name) === i)
  const builder = uniqueSystems.find((s) => s.category === 'construtor')?.name

  const hasWhatsappLink = /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//.test(low)
  const hasForm = /<form[\s>]/.test(low)
  const emails = Array.from(
    new Set(
      (html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,10}/gi) ?? [])
        .map((e) => e.toLowerCase())
        .filter((e) => !/\.(png|jpe?g|gif|webp|svg|css|js)$/.test(e) && !/sentry|wixpress|example|domain\.com|godaddy|@2x|email\.com|seu@|your@/.test(e)),
    ),
  ).slice(0, 4)
  const instagram = instagramHandle(pick(/(https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.]+)/i, html))
  const facebook = pick(/(https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9_.\-]+)/i, html)

  const years = Array.from(low.matchAll(/(?:©|&copy;|copyright)\s*(?:[^0-9]{0,30})((?:19|20)\d{2})(?:\s*[-–]\s*((?:19|20)\d{2}))?/g))
    .map((m) => Number(m[2] ?? m[1]))
    .filter((y) => y > 1995 && y <= new Date().getFullYear())
  const copyrightYear = years.length ? Math.max(...years) : undefined
  const nowYear = new Date().getFullYear()

  if (!https) { q -= 25; issues.push('Sem HTTPS (navegador mostra "Não seguro")') }
  if (!mobile) { q -= 25; issues.push('Não é adaptado para celular') }
  if (builder && /Wix|Site123|Webnode|Jimdo|Google Sites|Blogspot|GoDaddy|Weebly/.test(builder)) {
    q -= 12; issues.push(`Feito em construtor genérico (${builder})`)
  }
  if (/wixsite\.com|webnode\.|site123\.me|blogspot\.|weebly\.com|godaddysites\.com|sites\.google\.com/.test(finalUrl)) {
    q -= 18; issues.push('Usa domínio gratuito (não tem domínio próprio)')
  }
  if (copyrightYear && copyrightYear <= nowYear - 3) { q -= 12; issues.push(`Site desatualizado (rodapé de ${copyrightYear})`) }
  if (!title || title.length < 4) { q -= 8; issues.push('Sem título de página (péssimo para o Google)') }
  if (!description) { q -= 7; issues.push('Sem descrição para o Google (SEO fraco)') }
  if (!hasWhatsappLink && !hasForm) { q -= 12; issues.push('Sem botão de WhatsApp nem formulário de contato') }
  else if (!hasWhatsappLink) { q -= 5; issues.push('Sem botão direto de WhatsApp') }
  if (loadMs > 4000) { q -= 8; issues.push(`Lento para abrir (${(loadMs / 1000).toFixed(1)}s)`) }
  if (sizeKb < 4) { q -= 10; issues.push('Página quase vazia') }
  if (!uniqueSystems.some((s) => s.category === 'analytics')) { q -= 4; issues.push('Sem Google Analytics / Pixel (não mede visitas)') }
  if (!uniqueSystems.some((s) => ['agenda', 'reserva', 'delivery', 'crm'].includes(s.category))) {
    issues.push('Nenhum sistema de agendamento/reserva/CRM no site')
  }

  const quality = Math.max(0, Math.min(100, q))
  const status = quality >= 75 ? 'good' : quality >= 55 ? 'weak' : 'bad'

  return {
    url, finalUrl, httpStatus: res.status, https, mobile, title, description, builder,
    systems: uniqueSystems, hasWhatsappLink, hasForm, emails, instagram, facebook,
    copyrightYear, sizeKb, loadMs, quality, status, issues,
    textSample: withText ? visibleText(html) : undefined,
  }
}
