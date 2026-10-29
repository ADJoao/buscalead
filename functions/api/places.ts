import { json, type Env } from '../../server/env'
import { searchText } from '../../server/places'

interface Body {
  query: string
  languageCode?: string
  regionCode?: string
  pages?: number
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (!env.GOOGLE_PLACES_API_KEY) return json({ error: 'Chave do Google Places não configurada (GOOGLE_PLACES_API_KEY).' }, 503)
  const body = (await request.json()) as Body
  if (!body.query?.trim()) return json({ error: 'Busca vazia.' }, 400)
  try {
    const result = await searchText(env.GOOGLE_PLACES_API_KEY, body.query.trim(), {
      languageCode: body.languageCode ?? 'pt-BR',
      regionCode: body.regionCode ?? 'BR',
      pages: body.pages ?? 3,
    })
    return json(result)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro no Google Places' }, 502)
  }
}
