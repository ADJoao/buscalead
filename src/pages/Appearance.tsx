import { ArrowUpRight, Check, Coins, MousePointerClick, Palette, PartyPopper, RotateCcw, Sparkles, Volume2, VolumeX, Wallet } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Switch } from '../components/ui'
import { celebrate } from '../lib/fx'
import { play, type SoundName } from '../lib/sound'
import { useStore } from '../lib/store'
import {
  ACCENTS, DEFAULT_APPEARANCE, FONTS, PRESETS, applyAppearance, getAppearance,
  type Appearance, type Background, type ButtonStyle, type Corners, type Density, type FontChoice, type GlassLevel, type Motion,
} from '../lib/theme'

function Opt<T extends string>({ value, cur, onPick, title, sub, children }: { value: T; cur: T; onPick: (v: T) => void; title: string; sub?: string; children?: ReactNode }) {
  return (
    <button type="button" className={`opt ${cur === value ? 'on' : ''}`} onClick={() => onPick(value)} data-sound="toggle">
      {children}
      <b>{title}</b>
      {sub && <span>{sub}</span>}
    </button>
  )
}

const SOUNDS: { id: SoundName; label: string }[] = [
  { id: 'click', label: 'Clique' },
  { id: 'hover', label: 'Passar o mouse' },
  { id: 'toggle', label: 'Selecionar' },
  { id: 'open', label: 'Abrir' },
  { id: 'notify', label: 'Aviso' },
  { id: 'success', label: 'Sucesso' },
  { id: 'money', label: 'Dinheiro' },
  { id: 'error', label: 'Erro' },
]

export function Appearance() {
  const { settings, saveSettings, toast } = useStore()
  const [a, setA] = useState<Appearance>(() => ({ ...getAppearance(), ...(settings.appearance ?? {}) }))
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saveRef = useRef(saveSettings)
  const pending = useRef<Appearance | null>(null)
  saveRef.current = saveSettings

  // aplica na hora e salva na conta (sincroniza com o celular) depois de um respiro
  function update(patch: Partial<Appearance>) {
    setA((prev) => {
      const next = { ...prev, ...patch }
      applyAppearance(next)
      pending.current = next
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, 700)
      return next
    })
  }
  function flush() {
    clearTimeout(timer.current)
    if (pending.current) saveRef.current({ appearance: pending.current })
    pending.current = null
  }
  // saiu da tela antes do salvamento automático: salva na hora
  useEffect(() => () => flush(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const preset = PRESETS.find((p) => Object.entries(p.a).every(([k, v]) => a[k as keyof Appearance] === v))

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Palette size={13} /> Seu app, do seu jeito</div>
          <h1 className="page-title">Personalizar</h1>
          <p className="page-sub">Cada mudança aparece na hora e fica salva na sua conta, no computador e no celular.</p>
        </div>
        <button className="btn" onClick={() => { update(DEFAULT_APPEARANCE); toast('Voltou para o visual original') }}>
          <RotateCcw size={15} /> Voltar ao original
        </button>
      </div>

      <div className="ap-grid">
        <div>
          <section className="glass pad ap-section">
            <h3 className="card-title"><Sparkles size={16} className="accent" /> Temas prontos</h3>
            <p className="card-sub">Muda tudo de uma vez. Depois você ajusta o que quiser abaixo.</p>
            <div className="opt-grid">
              {PRESETS.map((p) => (
                <button key={p.name} type="button" className={`opt preset ${preset?.name === p.name ? 'on' : ''}`} onClick={() => update(p.a)} data-sound="toggle">
                  <div className="dots">
                    <i style={{ background: p.a.accent }} />
                    <i style={{ background: p.a.accent, opacity: 0.45 }} />
                    <i style={{ background: '#1a201c', border: '1px solid rgba(255,255,255,.15)' }} />
                  </div>
                  <b style={{ fontFamily: FONTS[p.a.font ?? 'geist'].css }}>{p.name}</b>
                  <span>{p.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="glass pad ap-section">
            <h3 className="card-title">Cor principal</h3>
            <p className="card-sub">Botões, gráfico, destaques, brilho e o mapa usam essa cor.</p>
            <div className="swatches">
              {ACCENTS.map((c) => (
                <button key={c.hex} type="button" title={c.name} className={`swatch ${a.accent.toLowerCase() === c.hex ? 'on' : ''}`} style={{ ['--c' as string]: c.hex }} onClick={() => update({ accent: c.hex })} data-sound="toggle">
                  {a.accent.toLowerCase() === c.hex && <Check size={16} strokeWidth={3} />}
                </button>
              ))}
              <label className={`swatch swatch-custom ${ACCENTS.some((c) => c.hex === a.accent.toLowerCase()) ? '' : 'on'}`} title="Escolher qualquer cor" style={{ ['--c' as string]: a.accent }}>
                <input type="color" value={a.accent} onChange={(e) => update({ accent: e.target.value })} />
              </label>
              <span className="mono dim" style={{ fontSize: 12 }}>{a.accent.toUpperCase()}</span>
            </div>
          </section>

          <section className="glass pad ap-section">
            <h3 className="card-title">Botões e formas</h3>
            <div className="ap-label">Estilo do botão principal</div>
            <div className="opt-grid">
              {([
                ['gradiente', 'Gradiente', 'brilho de vidro'],
                ['solido', 'Sólido', 'cor chapada'],
                ['contorno', 'Contorno', 'só a borda'],
                ['neon', 'Neon', 'brilhando'],
              ] as [ButtonStyle, string, string][]).map(([v, t, s]) => (
                <Opt key={v} value={v} cur={a.buttons} onPick={(x) => update({ buttons: x })} title={t} sub={s}>
                  <div className="mini" data-mini={v} style={miniBtn(v, a.accent)}>Fechar</div>
                </Opt>
              ))}
            </div>
            <div className="ap-label">Cantos</div>
            <div className="opt-grid">
              {([['reto', 'Retos', 'sério, executivo'], ['suave', 'Suaves', 'o original'], ['redondo', 'Redondos', 'botões em pílula']] as [Corners, string, string][]).map(([v, t, s]) => (
                <Opt key={v} value={v} cur={a.corners} onPick={(x) => update({ corners: x })} title={t} sub={s}>
                  <div className="mini" style={{ border: '1.5px solid var(--border-2)', borderRadius: v === 'reto' ? 4 : v === 'suave' ? 10 : 999 }} />
                </Opt>
              ))}
            </div>
            <div className="ap-label">Vidro dos cartões</div>
            <div className="opt-grid">
              {([['leve', 'Leve', 'mais limpo'], ['medio', 'Médio', 'o original'], ['forte', 'Forte', 'mais fosco e brilhante']] as [GlassLevel, string, string][]).map(([v, t, s]) => (
                <Opt key={v} value={v} cur={a.glass} onPick={(x) => update({ glass: x })} title={t} sub={s} />
              ))}
            </div>
          </section>

          <section className="glass pad ap-section">
            <h3 className="card-title">Fundo, letra e espaço</h3>
            <div className="ap-label">Fundo</div>
            <div className="opt-grid">
              {([['aurora', 'Aurora', 'luzes se mexendo devagar'], ['grade', 'Grade', 'linhas de painel'], ['pontos', 'Pontos', 'galáxia discreta'], ['liso', 'Liso', 'sem distração']] as [Background, string, string][]).map(([v, t, s]) => (
                <Opt key={v} value={v} cur={a.background} onPick={(x) => update({ background: x })} title={t} sub={s}>
                  <div className="mini" style={miniBg(v, a.accent)} />
                </Opt>
              ))}
            </div>
            <div className="ap-label">Fonte</div>
            <div className="opt-grid">
              {(Object.keys(FONTS) as FontChoice[]).map((f) => (
                <Opt key={f} value={f} cur={a.font} onPick={(x) => update({ font: x })} title={FONTS[f].label}>
                  <div className="mini" style={{ fontFamily: FONTS[f].css, fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>R$ 1.250</div>
                </Opt>
              ))}
            </div>
            <div className="ap-label">Espaço entre as coisas</div>
            <div className="opt-grid">
              {([['compacto', 'Compacto', 'cabe mais na tela'], ['normal', 'Normal', 'o original'], ['espacoso', 'Espaçoso', 'letra maior']] as [Density, string, string][]).map(([v, t, s]) => (
                <Opt key={v} value={v} cur={a.density} onPick={(x) => update({ density: x })} title={t} sub={s} />
              ))}
            </div>
            <div className="ap-label">Nome no topo do menu</div>
            <input className="input" style={{ maxWidth: 320 }} placeholder="BuscaLead" value={a.brandName ?? ''} maxLength={22} onChange={(e) => update({ brandName: e.target.value })} />
          </section>

          <section className="glass pad ap-section">
            <h3 className="card-title"><MousePointerClick size={16} className="accent" /> Efeitos</h3>
            <div className="ap-label">Movimento</div>
            <div className="opt-grid">
              {([['completo', 'Completo', 'tudo animado'], ['suave', 'Suave', 'menos movimento'], ['nenhum', 'Nenhum', 'parado, mais leve']] as [Motion, string, string][]).map(([v, t, s]) => (
                <Opt key={v} value={v} cur={a.motion} onPick={(x) => update({ motion: x })} title={t} sub={s} />
              ))}
            </div>
            <div className="mt">
              <div className="ap-toggle"><div>Brilho seguindo o mouse<small>A borda do cartão acende onde o cursor está</small></div><Switch on={a.spotlight} onChange={(v) => update({ spotlight: v })} /></div>
              <div className="ap-toggle"><div>Ondinha no clique<small>Um pulso de luz sai do ponto onde você clicou</small></div><Switch on={a.ripple} onChange={(v) => update({ ripple: v })} /></div>
              <div className="ap-toggle">
                <div>Chuva de confete quando entra dinheiro<small>Ao fechar um cliente ou vender uma placa</small></div>
                <div className="row" style={{ gap: 10 }}>
                  <button className="btn xs" data-sound="none" onClick={(e) => celebrate('money', { x: e.clientX, y: e.clientY })}><PartyPopper size={13} /> Testar</button>
                  <Switch on={a.confetti} onChange={(v) => update({ confetti: v })} />
                </div>
              </div>
            </div>
          </section>

          <section className="glass pad ap-section">
            <h3 className="card-title">{a.sound ? <Volume2 size={16} className="accent" /> : <VolumeX size={16} />} Sons</h3>
            <p className="card-sub">Sons curtos e baixos, feitos na hora pelo navegador. Nada toca antes do seu primeiro clique.</p>
            <div className="ap-toggle"><div>Sons ligados</div><Switch on={a.sound} onChange={(v) => { update({ sound: v }); if (v) setTimeout(() => play('success'), 30) }} /></div>
            <label className="range-row" style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <span className="muted" style={{ fontSize: 13 }}>Volume</span>
              <input className="range" type="range" min={0.05} max={1} step={0.05} value={a.volume} disabled={!a.sound} onChange={(e) => update({ volume: Number(e.target.value) })} onPointerUp={() => play('click')} />
              <b className="mono">{Math.round(a.volume * 100)}%</b>
            </label>
            <div className="ap-toggle"><div>Som ao passar o mouse<small>Bem sutil. Vem desligado porque alguns acham demais.</small></div><Switch on={a.hoverSound} onChange={(v) => update({ hoverSound: v })} /></div>
            <div className="ap-label">Ouvir cada som</div>
            <div className="sound-row">
              {SOUNDS.map((s) => (
                <button key={s.id} className="btn sm" data-sound="none" disabled={!a.sound} onClick={(e) => (s.id === 'money' ? celebrate('money', { x: e.clientX, y: e.clientY }) : play(s.id, { force: s.id === 'hover' }))}>
                  {s.id === 'money' ? <Coins size={14} /> : <Volume2 size={14} />} {s.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="ap-preview">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Prévia</div>
          <div className="glass kpi tilt hero glow" style={{ marginBottom: 14 }}>
            <div className="kpi-label"><Wallet size={14} /> Faturamento do mês</div>
            <div className="kpi-value">R$ 4.380</div>
            <div className="kpi-foot"><ArrowUpRight size={12} className="accent" style={{ verticalAlign: -2 }} /> 73% da meta</div>
          </div>
          <div className="glass pad">
            <h3 className="card-title">Clínica Bella Pele</h3>
            <p className="card-sub">Estética · Cabo Frio · 4,9★ (23)</p>
            <div className="chips" style={{ marginBottom: 14 }}>
              <span className="chip on">Sem site</span>
              <span className="chip">Instagram</span>
              <span className="tier-top">TOP</span>
            </div>
            <input className="input" placeholder="Anotação rápida..." style={{ marginBottom: 12 }} />
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button className="btn primary" data-sound="none" onClick={(e) => celebrate('money', { x: e.clientX, y: e.clientY })}><Coins size={15} /> Fechei!</button>
              <button className="btn">Proposta</button>
              <button className="btn ghost">Depois</button>
            </div>
            <div className="ap-toggle" style={{ marginTop: 14 }}><div>Exemplo de chave</div><Switch on={a.spotlight} onChange={(v) => update({ spotlight: v })} /></div>
          </div>
          <p className="dim" style={{ fontSize: 12, marginTop: 10 }}>Clique em "Fechei!" para ver e ouvir o efeito de dinheiro entrando.</p>
        </aside>
      </div>
    </>
  )
}

function miniBtn(v: ButtonStyle, c: string): React.CSSProperties {
  if (v === 'solido') return { background: c, color: '#0b1200' }
  if (v === 'contorno') return { border: `1.5px solid ${c}`, color: c }
  if (v === 'neon') return { border: `1px solid ${c}`, color: c, boxShadow: `0 0 14px -2px ${c}, inset 0 0 10px ${c}55`, textShadow: `0 0 8px ${c}` }
  return { background: `linear-gradient(180deg, ${c}, ${c}cc)`, color: '#0b1200', boxShadow: `0 6px 18px -8px ${c}` }
}

function miniBg(v: Background, c: string): React.CSSProperties {
  if (v === 'grade') return { background: `linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px) 0 0/10px 10px, linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px) 0 0/10px 10px, #070a08` }
  if (v === 'pontos') return { background: `radial-gradient(rgba(255,255,255,.25) 1px, transparent 1.3px) 0 0/8px 8px, #070a08` }
  if (v === 'liso') return { background: '#0a0d0b', border: '1px solid var(--border)' }
  return { background: `radial-gradient(60% 80% at 80% 0%, ${c}55, transparent 70%), radial-gradient(60% 80% at 0% 100%, #14a09055, transparent 70%), #070a08` }
}
