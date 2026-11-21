import { json, type Env } from '../../server/env'
import { geocode } from '../../server/geocode'

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim()
  if (!q) return json({ error: 'Digite o nome da empresa ou cole o link do Google Maps.' }, 400)
  const country = (url.searchParams.get('country') ?? 'br').toLowerCase()
  const [lat, lng] = (url.searchParams.get('near') ?? '').split(',').map(Number)
  const near = Number.isFinite(lat) && Number.isFinite(lng) && url.searchParams.get('near') ? { lat, lng } : undefined
  try {
    return json({ hits: await geocode(q, { country, near }) })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro ao procurar o local' }, 502)
  }
}
