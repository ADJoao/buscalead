// Entrada para Cloudflare Workers (tela "Configure your Worker project").
// Reaproveita as mesmas rotas de functions/api, usadas também no Cloudflare Pages.
import * as middleware from '../functions/api/_middleware'
import * as analyze from '../functions/api/analyze'
import * as config from '../functions/api/config'
import * as inspect from '../functions/api/inspect'
import * as places from '../functions/api/places'
import * as status from '../functions/api/status'
import * as usage from '../functions/api/usage'
import { json, type AuthData, type Env } from '../server/env'

type WorkerEnv = Env & { ASSETS: Fetcher }
type Handler = PagesFunction<Env, string, AuthData>

const ROUTES: Record<string, Partial<Record<string, Handler>>> = {
  '/api/analyze': { POST: analyze.onRequestPost },
  '/api/config': { GET: config.onRequestGet as Handler },
  '/api/inspect': { POST: inspect.onRequestPost as Handler },
  '/api/places': { POST: places.onRequestPost as Handler },
  '/api/status': { GET: status.onRequestGet as Handler },
  '/api/usage': { GET: usage.onRequestGet },
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request)

    const handler = ROUTES[url.pathname]?.[request.method]
    if (!handler) return json({ error: 'Rota não encontrada' }, 404)

    const data: AuthData = {}
    const base = {
      request,
      env,
      data,
      params: {},
      functionPath: url.pathname,
      waitUntil: ctx.waitUntil.bind(ctx),
      passThroughOnException: () => ctx.passThroughOnException(),
    }
    const run = () => handler({ ...base, next: () => Promise.resolve(new Response(null, { status: 404 })) } as unknown as EventContext<Env, string, AuthData>)
    return middleware.onRequest({ ...base, next: run } as unknown as EventContext<Env, string, AuthData>)
  },
} satisfies ExportedHandler<WorkerEnv>
