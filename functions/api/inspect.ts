import { json, type Env } from '../../server/env'
import { auditSite } from '../../server/siteAudit'

// Lotes pequenos: o plano grátis da Cloudflare limita CPU e sub-requisições por chamada.
const MAX_URLS = 6

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  const { urls } = (await request.json()) as { urls: string[] }
  if (!Array.isArray(urls) || urls.length === 0) return json({ audits: {} })
  const list = urls.slice(0, MAX_URLS)
  const results = await Promise.all(list.map((u) => auditSite(u).catch(() => null)))
  const audits: Record<string, unknown> = {}
  list.forEach((u, i) => {
    if (results[i]) audits[u] = results[i]
  })
  return json({ audits })
}
