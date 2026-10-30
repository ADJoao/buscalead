import { ArrowUp, Check, Globe, AtSign, Link2Off, MonitorX, Search, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { siteLabel } from '../lib/scoring'
import type { SiteStatus } from '../lib/shared/types'
import { useStore } from '../lib/store'
import type { Stage, Tier } from '../lib/types'
import { STAGES } from '../lib/types'

export function ScoreRing({ score, size = 46, stroke = 4 }: { score: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = score >= 78 ? 'var(--accent)' : score >= 64 ? '#86c41f' : score >= 50 ? 'var(--warn)' : 'var(--text-3)'
  return (
    <div className="ring" style={{ width: size, height: size }} title={`Pontuação ${score}/100`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
          style={{ filter: score >= 78 ? 'drop-shadow(0 0 6px rgba(182,242,58,.55))' : undefined, transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <span className="val" style={{ fontSize: size * 0.32 }}>{score}</span>
    </div>
  )
}

export function TierBadge({ tier }: { tier: Tier }) {
  if (tier === 'top') return <span className="tier-top"><ArrowUp size={13} strokeWidth={3} /> TOP</span>
  if (tier === 'recomendado') return <span className="tag lime">Recomendado</span>
  if (tier === 'bom') return <span className="tag">Bom</span>
  return <span className="tag">Fraco</span>
}

export function SiteChip({ status }: { status: SiteStatus }) {
  const map: Record<SiteStatus, { cls: string; icon: ReactNode }> = {
    none: { cls: 'green', icon: <Globe size={12} /> },
    social: { cls: 'green', icon: <AtSign size={12} /> },
    broken: { cls: 'green', icon: <Link2Off size={12} /> },
    bad: { cls: 'amber', icon: <MonitorX size={12} /> },
    weak: { cls: 'amber', icon: <MonitorX size={12} /> },
    good: { cls: 'red', icon: <Globe size={12} /> },
    unknown: { cls: '', icon: <Search size={12} /> },
    pending: { cls: '', icon: <Search size={12} /> },
  }
  const m = map[status]
  return <span className={`tag ${m.cls}`}>{m.icon}{siteLabel(status)}</span>
}

export function Stars({ rating, reviews }: { rating?: number; reviews?: number }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <span className="stars"><Star size={12} fill="currentColor" style={{ verticalAlign: -1 }} /> {rating?.toFixed(1) ?? '-'}</span>
      {reviews !== undefined && <span className="dim mono" style={{ fontSize: 12 }}>({reviews})</span>}
    </span>
  )
}

export function StageTag({ stage, canceled }: { stage: Stage; canceled?: boolean }) {
  if (stage === 'fechado' && canceled) return <span className="tag red">Cancelado</span>
  const cls: Record<Stage, string> = {
    novo: '', contatado: 'blue', respondeu: 'violet', reuniao: 'amber', proposta: 'amber', fechado: 'lime', perdido: 'red',
  }
  return <span className={`tag ${cls[stage]}`}>{STAGES.find((s) => s.id === stage)?.label}</span>
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <label className="row" style={{ cursor: 'pointer', gap: 10 }}>
      <span className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on} />
      {label && <span onClick={() => onChange(!on)}>{label}</span>}
    </label>
  )
}

export function CheckBox({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <span
      className={`check ${on ? 'on' : ''}`}
      role="checkbox"
      aria-checked={on}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!on)
      }}
    >
      {on && <Check size={12} strokeWidth={3.5} />}
    </span>
  )
}

export function SectionHead({ icon, title, right, sub }: { icon?: ReactNode; title: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="section-h">
      {icon}
      <div>
        <h2>{title}</h2>
        {sub && <div className="dim" style={{ fontSize: 12.5 }}>{sub}</div>}
      </div>
      <div className="line" />
      {right}
    </div>
  )
}

export function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.err ? 'err' : ''}`}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: t.err ? 'var(--bad)' : 'var(--accent)', flex: 'none' }} />
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>{children}</div>
    </div>
  )
}
