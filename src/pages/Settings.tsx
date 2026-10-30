import { Bot, CheckCircle2, Database, KeyRound, MapPinned, Sparkles, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Switch } from '../components/ui'
import { AI_COST_USD } from '../components/LeadDrawer'
import { aiUsage, localAiSpend, placesUsage, serverStatus } from '../lib/api'
import { money, num } from '../lib/format'
import { useStore } from '../lib/store'

export function Settings() {
  const { settings, saveSettings, mode } = useStore()
  const [status, setStatus] = useState<{ google: boolean; apify: boolean; anthropic: boolean; supabase: boolean } | null | 'loading'>('loading')
  const [spendUsd, setSpendUsd] = useState<number | null>(null)
  const [form, setForm] = useState(settings)
  useEffect(() => setForm(settings), [settings])

  useEffect(() => {
    serverStatus().then(setStatus)
    if (mode === 'supabase') aiUsage().then((u) => setSpendUsd(u?.monthUsd ?? null))
    else setSpendUsd(localAiSpend())
  }, [mode])

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))
  const dirty = JSON.stringify(form) !== JSON.stringify(settings)
  const spendBrl = (spendUsd ?? 0) * form.usdBrl

  const Item = ({ ok, label, hint }: { ok?: boolean; label: string; hint: string }) => (
    <div className="row" style={{ gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
      {ok ? <CheckCircle2 size={18} style={{ color: 'var(--good)' }} /> : <XCircle size={18} style={{ color: 'var(--bad)' }} />}
      <div><div style={{ fontWeight: 600 }}>{label}</div><div className="dim" style={{ fontSize: 12.5 }}>{hint}</div></div>
    </div>
  )

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-sub">Seus dados, a IA e o limite de gasto.</p>
        </div>
        {dirty && <button className="btn primary" onClick={() => saveSettings(form)}>Salvar alterações</button>}
      </div>

      <div className="grid g-2">
        <div className="glass pad">
          <h3 className="card-title"><KeyRound size={16} /> Conexões</h3>
          <p className="card-sub">As chaves ficam no servidor (Cloudflare), nunca no navegador.</p>
          {status === 'loading' ? <div className="dim">Verificando…</div> : status === null ? (
            <div className="tag amber" style={{ height: 'auto', padding: '8px 10px', whiteSpace: 'normal' }}>
              Servidor não respondeu. Em produção isso é a Cloudflare; em desenvolvimento rode <span className="kbd">npm run dev:api</span>.
            </div>
          ) : (
            <>
              <Item ok={status.apify || status.google} label="Busca de empresas" hint={status.apify ? 'Apify (APIFY_TOKEN)' : status.google ? 'Google Places (GOOGLE_PLACES_API_KEY)' : 'Configure APIFY_TOKEN ou GOOGLE_PLACES_API_KEY'} />
              <Item ok={status.anthropic} label="Anthropic (Claude)" hint="ANTHROPIC_API_KEY: análise profunda" />
              <Item ok={status.supabase && mode === 'supabase'} label="Supabase" hint={mode === 'supabase' ? 'Dados sincronizados entre celular e PC' : 'Modo local: dados só neste navegador'} />
            </>
          )}
        </div>

        <div className="glass pad">
          <h3 className="card-title"><Bot size={16} /> Análise com IA</h3>
          <p className="card-sub">Só roda quando você clica, em um lead por vez.</p>
          <div className="chips">
            <button className={`chip ${form.aiModel === 'claude-opus-5-5' ? 'on' : ''}`} onClick={() => set('aiModel', 'claude-opus-5-5')}>
              <Sparkles size={13} /> Melhor (≈ {money(AI_COST_USD['claude-opus-5-5'] * form.usdBrl)}/lead)
            </button>
            <button className={`chip ${form.aiModel === 'claude-sonnet-5-5' ? 'on' : ''}`} onClick={() => set('aiModel', 'claude-sonnet-5-5')}>
              Econômico (≈ {money(AI_COST_USD['claude-sonnet-5-5'] * form.usdBrl)}/lead)
            </button>
          </div>
          <div className="grid g-2 mt" style={{ gap: 12 }}>
            <label className="field"><span>Limite de gasto por mês (R$)</span>
              <input className="input mono" type="number" min={0} value={form.aiMonthlyLimitBrl} onChange={(e) => set('aiMonthlyLimitBrl', Number(e.target.value))} />
            </label>
            <label className="field"><span>Cotação do dólar (R$)</span>
              <input className="input mono" type="number" step="0.05" value={form.usdBrl} onChange={(e) => set('usdBrl', Number(e.target.value))} />
            </label>
          </div>
          <div className="mt">
            <div className="row spread" style={{ fontSize: 13 }}>
              <span className="muted">Gasto este mês</span>
              <span className="mono">{money(spendBrl)} / {money(form.aiMonthlyLimitBrl)}</span>
            </div>
            <div className="bar mt-s"><i style={{ width: `${Math.min(100, (spendBrl / Math.max(1, form.aiMonthlyLimitBrl)) * 100)}%` }} /></div>
            <div className="dim mt-s" style={{ fontSize: 12 }}>Ao atingir o limite, a análise para sozinha até o mês seguinte.</div>
          </div>
        </div>

        <div className="glass pad">
          <h3 className="card-title">Você e a agência</h3>
          <p className="card-sub">Aparece no dashboard e no roteiro de visita.</p>
          <div className="grid g-2" style={{ gap: 12 }}>
            <label className="field"><span>Seu nome</span><input className="input" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} /></label>
            <label className="field"><span>Nome da agência</span><input className="input" value={form.agencyName} onChange={(e) => set('agencyName', e.target.value)} /></label>
            <label className="field"><span>Meta de MRR (R$/mês)</span><input className="input mono" type="number" value={form.mrrGoal} onChange={(e) => set('mrrGoal', Number(e.target.value))} /></label>
          </div>
        </div>

        <div className="glass pad">
          <h3 className="card-title"><MapPinned size={16} /> Padrões de qualidade da busca</h3>
          <p className="card-sub">Quem não passa é removido da lista.</p>
          <div className="grid g-2" style={{ gap: 12 }}>
            <label className="field"><span>Mínimo de avaliações</span><input className="input mono" type="number" value={form.minReviews} onChange={(e) => set('minReviews', Number(e.target.value))} /></label>
            <label className="field"><span>Nota mínima</span><input className="input mono" type="number" step="0.1" value={form.minRating} onChange={(e) => set('minRating', Number(e.target.value))} /></label>
          </div>
          <div className="col mt">
            <Switch on={form.includeWeakSites} onChange={(v) => set('includeWeakSites', v)} label="Incluir empresas com site mediano" />
            <div className="dim" style={{ fontSize: 12.5 }}>Cota do Google usada este mês: <span className="mono">{num(placesUsage())}</span> requisições (≈ 1.000 grátis).</div>
          </div>
        </div>

        <div className="glass pad">
          <h3 className="card-title"><Database size={16} /> Modo demonstração</h3>
          <p className="card-sub">Mostra dados fictícios para ver o painel cheio. Aparece o selo DEMO e nada é salvo.</p>
          <Switch on={form.demoMode} onChange={(v) => { set('demoMode', v); saveSettings({ demoMode: v }) }} label="Ligar modo demonstração" />
        </div>
      </div>
    </>
  )
}
