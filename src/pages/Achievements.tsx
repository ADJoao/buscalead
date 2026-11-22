import { Flame, Lock, Trophy, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { money, num } from '../lib/format'
import { ACHIEVEMENTS, LEVELS, computeStats, levelOf, xpOf } from '../lib/achievements'
import { useStore } from '../lib/store'

export function Achievements() {
  const { leads, settings } = useStore()
  const s = useMemo(() => computeStats(leads), [leads])
  const xp = xpOf(s)
  const lv = levelOf(xp)
  const done = ACHIEVEMENTS.filter((a) => a.value(s) >= a.goal)
  const money_ = (id: string) => ['mrr1k', 'mrr3k', 'month5k', 'rev10k'].includes(id)

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Trophy size={13} /> Sua evolução</div>
          <h1 className="page-title">Conquistas</h1>
          <p className="page-sub">Cada contato, resposta, placa e cliente vira XP. Tudo calculado a partir do seu CRM.{settings.demoMode && <b className="accent"> (mostrando a demonstração)</b>}</p>
        </div>
      </div>

      <div className="grid ach-top">
        <div className="glass pad glow level-card">
          <div className="level-badge"><span>{lv.n}</span></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="dim" style={{ fontSize: 12 }}>Nível {lv.n}</div>
            <div className="level-name">{lv.name}</div>
            <div className="xp-bar"><i style={{ width: `${Math.round(lv.progress * 100)}%` }} /></div>
            <div className="row spread" style={{ fontSize: 12, marginTop: 6 }}>
              <span className="mono accent">{num(xp)} XP</span>
              <span className="dim">{lv.next ? `faltam ${num(lv.toNext)} XP para ${lv.next}` : 'nível máximo'}</span>
            </div>
          </div>
        </div>
        <div className="glass pad streak-card">
          <Flame size={30} className={s.streak ? 'flame on' : 'flame'} />
          <div>
            <div className="level-name mono">{s.streak} dia{s.streak === 1 ? '' : 's'}</div>
            <div className="dim" style={{ fontSize: 12.5 }}>seguidos prospectando · recorde {s.bestStreak}</div>
          </div>
        </div>
        <div className="glass pad streak-card">
          <Trophy size={28} className="accent" />
          <div>
            <div className="level-name mono">{done.length}/{ACHIEVEMENTS.length}</div>
            <div className="dim" style={{ fontSize: 12.5 }}>conquistas desbloqueadas</div>
          </div>
        </div>
      </div>

      <div className="ach-grid mt">
        {ACHIEVEMENTS.map((a) => {
          const v = a.value(s)
          const ok = v >= a.goal
          const p = Math.min(1, v / a.goal)
          return (
            <div key={a.id} className={`glass ach ${ok ? 'ok' : ''} ${a.rare ? 'rare' : ''}`}>
              <div className="ach-emoji">{ok ? a.emoji : <Lock size={18} />}</div>
              <div style={{ minWidth: 0 }}>
                <b>{a.title}</b>
                <span>{a.desc}</span>
                {!ok && (
                  <>
                    <div className="xp-bar sm"><i style={{ width: `${p * 100}%` }} /></div>
                    <small className="mono dim">{money_(a.id) ? `${money(v)} / ${money(a.goal)}` : `${num(Math.floor(v))} / ${num(a.goal)}`}</small>
                  </>
                )}
                {ok && a.rare && <small className="rare-tag">RARA</small>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="glass pad mt">
        <h3 className="card-title"><Zap size={16} className="accent" /> Como ganhar XP</h3>
        <div className="xp-table">
          {[
            ['Lead salvo', 2], ['Contato feito', 10], ['Resposta', 25], ['Reunião/visita', 50], ['Proposta', 70],
            ['Placa vendida', 120], ['Placa que virou site', 200], ['Cliente fechado', 300], ['Dia prospectando', 15], ['Cada R$ 10 faturados', 1],
          ].map(([k, v]) => <div key={k as string}><span className="muted">{k}</span><b className="mono accent">+{v}</b></div>)}
        </div>
        <div className="levels-row">
          {LEVELS.map((l, i) => (
            <span key={l.name} className={`lv ${i + 1 <= lv.n ? 'on' : ''}`} title={`${num(l.xp)} XP`}>{i + 1}. {l.name}</span>
          ))}
        </div>
      </div>
    </>
  )
}
