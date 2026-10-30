import { json, type Env } from '../../server/env'
import { searchApify } from '../../server/apify'
import { searchText } from '../../server/places'

interface Body {
  query?: string
  /** várias buscas de uma vez (usado com o Apify) */
  queries?: string[]
  languageCode?: string
  regionCode?: string
  pages?: number
}

// Aceita o Google Places (se tiver chave) ou o Apify. Envia espaços enquanto espera para a conexão não cair.
export const onRequestPost: PagesFunction<Env> = async ({ env, request, waitUntil }) => {
  const body = (await request.json()) as Body
  const queries = (body.queries?.length ? body.queries : body.query ? [body.query] : []).map((q) => q.trim()).filter(Boolean)
  if (!queries.length) return json({ error: 'Busca vazia.' }, 400)
  if (!env.GOOGLE_PLACES_API_KEY && !env.APIFY_TOKEN) {
    return json({ error: 'Nenhuma fonte de busca configurada (APIFY_TOKEN ou GOOGLE_PLACES_API_KEY).' }, 503)
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const enc = new TextEncoder()
  const beat = setInterval(() => writer.write(enc.encode(' ')).catch(() => {}), 8000)

  const work = (async () => {
    try {
      const lang = body.languageCode ?? 'pt-BR'
      const region = body.regionCode ?? 'BR'
      const result = env.APIFY_TOKEN
        ? await searchApify(env.APIFY_TOKEN, queries, { language: lang.split('-')[0], countryCode: region, maxPerSearch: (body.pages ?? 1) * 20 })
        : await searchText(env.GOOGLE_PLACES_API_KEY!, queries[0], { languageCode: lang, regionCode: region, pages: body.pages ?? 3 })
      await writer.write(enc.encode(JSON.stringify({ ...result, provider: env.APIFY_TOKEN ? 'apify' : 'google' })))
    } catch (e) {
      await writer.write(enc.encode(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro na busca' })))
    } finally {
      clearInterval(beat)
      await writer.close().catch(() => {})
    }
  })()
  waitUntil(work)
  return new Response(readable, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}
