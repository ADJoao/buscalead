import { json, type Env } from '../../server/env'

export const onRequestGet: PagesFunction<Env> = async ({ env }) =>
  json({
    google: Boolean(env.GOOGLE_PLACES_API_KEY),
    apify: Boolean(env.APIFY_TOKEN),
    anthropic: Boolean(env.ANTHROPIC_API_KEY),
    supabase: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
  })
