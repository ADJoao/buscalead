import { useState } from 'react'
import { ScoreRing } from '../components/ui'
import { money } from '../lib/format'
import { useStore } from '../lib/store'
import { STAGES, type Stage } from '../lib/types'

export function Pipeline() {
  const { leads, updateLead, openLead } = useStore()
  const [over, setOver] = useState<Stage | null>(null)

  function drop(stage: Stage, id: string) {
    const l = leads.find((x) => x.id === id)
    if (!l || l.stage === stage) return
    const patch: Parameters<typeof updateLead>[1] = { stage }
    if (stage === 'fechado') patch.deal = { setup: l.deal.setup ?? l.setupRange[0], monthly: l.deal.monthly ?? l.monthlyRange[0], closedAt: new Date().toISOString() }
    if (stage === 'contatado' && !l.contactedAt) patch.contactedAt = new Date().toISOString()
    updateLead(id, patch, { type: 'etapa', text: `Etapa: ${STAGES.find((s) => s.id === stage)?.label}` })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Arraste os cards entre as etapas</div>
          <h1 className="page-title">Pipeline</h1>
        </div>
      </div>
      <div className="kanban">
        {STAGES.map((s) => {
          const items = leads.filter((l) => l.stage === s.id).sort((a, b) => b.score - a.score)
          const total = items.reduce((sum, l) => sum + (l.deal.setup ?? l.setupRange[0]), 0)
          return (
            <div
              key={s.id}
              className={`glass kcol ${over === s.id ? 'drop' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(s.id) }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); drop(s.id, e.dataTransfer.getData('text/plain')) }}
            >
              <div className="row spread" style={{ padding: '2px 4px 6px' }}>
                <b style={{ fontSize: 13.5 }}>{s.label}</b>
                <span className="tag mono">{items.length}</span>
              </div>
              <div className="dim mono" style={{ fontSize: 12, padding: '0 4px' }}>{money(total)}</div>
              {items.map((l) => (
                <div key={l.id} className="kcard" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', l.id)} onClick={() => openLead(l)}>
                  <div className="row spread" style={{ alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="lname" style={{ fontSize: 13.5 }}>{l.name}</div>
                      <div className="lmeta">{l.nicheLabel} · {l.city}</div>
                    </div>
                    <ScoreRing score={l.score} size={32} stroke={3} />
                  </div>
                  <div className="row spread mt-s" style={{ fontSize: 12 }}>
                    <span className="mono">{money(l.deal.setup ?? l.setupRange[0], l.currency)}</span>
                    <span className="mono accent">+{money(l.deal.monthly ?? l.monthlyRange[0], l.currency)}/mês</span>
                  </div>
                  <select
                    className="select show-m mt-s"
                    style={{ height: 32, fontSize: 12.5 }}
                    value={l.stage}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => drop(e.target.value as Stage, l.id)}
                  >
                    {STAGES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </>
  )
}
