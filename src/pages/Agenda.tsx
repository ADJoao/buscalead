import { AlarmClock, CalendarCheck2, CalendarClock, Check, ChevronRight, Clock3, MessageCircle, Moon, Sun } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ScoreRing, StageTag } from '../components/ui'
import { followupMessage, whatsappMessage } from '../lib/messages'
import { waLink, waNumber } from '../lib/phone'
import { priorityOf } from '../lib/priority'
import { useStore } from '../lib/store'
import type { Lead } from '../lib/types'

const DAY = 86_400_000
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** Coloca o retorno às 9h do dia escolhido (horário de quem manda mensagem pra comércio). */
function at9(daysFromToday: number) {
  const d = new Date(startOfDay(new Date()) + daysFromToday * DAY)
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

export function Agenda() {
  const { leads, updateLead, openLead, settings, toast } = useStore()
  const today = startOfDay(new Date())
  const [day, setDay] = useState<number | null>(null)

  const open = leads.filter((l) => l.stage !== 'perdido' && !(l.stage === 'fechado' && !l.nfc))
  const scheduled = open.filter((l) => l.nextActionAt).sort((a, b) => a.nextActionAt!.localeCompare(b.nextActionAt!))
  // contatou mas não marcou o próximo passo: é aqui que lead esfria
  const orphans = open.filter((l) => !l.nextActionAt && ['contatado', 'respondeu', 'reuniao', 'proposta'].includes(l.stage)).sort((a, b) => b.score - a.score)

  const week = useMemo(
    () => Array.from({ length: 14 }, (_, i) => {
      const t = today + i * DAY
      return { t, n: scheduled.filter((l) => startOfDay(new Date(l.nextActionAt!)) === t).length }
    }),
    [scheduled, today],
  )
  const late = scheduled.filter((l) => startOfDay(new Date(l.nextActionAt!)) < today)

  const groups: { id: string; title: string; icon: React.ReactNode; tone?: string; items: Lead[] }[] = day !== null
    ? [{ id: 'dia', title: new Date(day).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }), icon: <CalendarClock size={16} />, items: scheduled.filter((l) => startOfDay(new Date(l.nextActionAt!)) === day) }]
    : [
        { id: 'late', title: 'Atrasados', icon: <AlarmClock size={16} />, tone: 'bad', items: late },
        { id: 'today', title: 'Hoje', icon: <Sun size={16} />, tone: 'accent', items: scheduled.filter((l) => startOfDay(new Date(l.nextActionAt!)) === today) },
        { id: 'tomorrow', title: 'Amanhã', icon: <Moon size={16} />, items: scheduled.filter((l) => startOfDay(new Date(l.nextActionAt!)) === today + DAY) },
        { id: 'week', title: 'Próximos 7 dias', icon: <CalendarClock size={16} />, items: scheduled.filter((l) => { const t = startOfDay(new Date(l.nextActionAt!)); return t > today + DAY && t <= today + 7 * DAY }) },
        { id: 'later', title: 'Mais pra frente', icon: <Clock3 size={16} />, items: scheduled.filter((l) => startOfDay(new Date(l.nextActionAt!)) > today + 7 * DAY) },
      ]

  function postpone(l: Lead, days: number) {
    updateLead(l.id, { nextActionAt: at9(days) }, { type: 'nota', text: `Retorno adiado para ${new Date(at9(days)).toLocaleDateString('pt-BR')}` })
    toast(`${l.name}: retorno em ${days === 1 ? '1 dia' : `${days} dias`}`)
  }
  function done(l: Lead) {
    updateLead(l.id, { nextActionAt: undefined }, { type: 'nota', text: 'Retorno feito' })
    toast('Retorno feito. Marque o próximo passo quando ele responder.')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><CalendarCheck2 size={13} /> Retornos</div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-sub">
            {late.length ? <><b style={{ color: 'var(--bad)' }}>{late.length} atrasado{late.length > 1 ? 's' : ''}</b> · </> : null}
            Quem você precisa chamar e quando. Lead que não recebe retorno esfria em 3 dias.
          </p>
        </div>
      </div>

      <div className="glass pad">
        <div className="week-strip">
          <button className={`wday all ${day === null ? 'on' : ''}`} onClick={() => setDay(null)}>
            <span>Tudo</span><b>{scheduled.length}</b>
          </button>
          {week.map((d) => {
            const dt = new Date(d.t)
            return (
              <button key={d.t} className={`wday ${day === d.t ? 'on' : ''} ${d.t === today ? 'today' : ''} ${d.n ? 'has' : ''}`} onClick={() => setDay(day === d.t ? null : d.t)}>
                <span>{d.t === today ? 'hoje' : dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                <b>{dt.getDate()}</b>
                <i>{d.n ? Array.from({ length: Math.min(d.n, 4) }, (_, k) => <em key={k} />) : null}</i>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid g-2 mt" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          {groups.map((g) => (g.items.length || g.id === 'today' || g.id === 'dia') && (
            <div key={g.id} className="glass pad">
              <h3 className="card-title" style={{ color: g.tone === 'bad' ? 'var(--bad)' : undefined }}>
                <span className={g.tone === 'accent' ? 'accent' : undefined}>{g.icon}</span> {g.title}
                <span className="dim mono" style={{ marginLeft: 'auto', fontSize: 12 }}>{g.items.length}</span>
              </h3>
              {!g.items.length && <p className="dim" style={{ margin: '8px 0 0' }}>Nada marcado. Aproveite para buscar leads novos ou passar numa rota.</p>}
              <div className="col" style={{ gap: 4, marginTop: 8 }}>
                {g.items.map((l) => <AgendaRow key={l.id} lead={l} owner={settings.ownerName} onOpen={() => openLead(l)} onDone={() => done(l)} onPostpone={(d) => postpone(l, d)} />)}
              </div>
            </div>
          ))}
        </div>

        <div className="glass pad">
          <h3 className="card-title"><AlarmClock size={16} className="accent" /> Sem próximo passo</h3>
          <p className="card-sub">Você já falou com eles, mas não marcou quando voltar. Escolha um dia.</p>
          {!orphans.length && <p className="dim">Tudo em dia. Nenhum lead esquecido.</p>}
          <div className="col" style={{ gap: 4 }}>
            {orphans.slice(0, 30).map((l) => (
              <div key={l.id} className="agenda-row">
                <ScoreRing score={l.score} size={36} stroke={3} />
                <button className="agenda-main" onClick={() => openLead(l)}>
                  <b>{l.name}</b>
                  <span><StageTag stage={l.stage} /> {l.city}</span>
                </button>
                <div className="row" style={{ gap: 4 }}>
                  <button className="btn xs" onClick={() => postpone(l, 0)}>Hoje</button>
                  <button className="btn xs" onClick={() => postpone(l, 1)}>Amanhã</button>
                  <button className="btn xs" onClick={() => postpone(l, 3)}>+3d</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function AgendaRow({ lead: l, owner, onOpen, onDone, onPostpone }: { lead: Lead; owner: string; onOpen: () => void; onDone: () => void; onPostpone: (d: number) => void }) {
  const p = priorityOf(l)
  const num = waNumber(l.phoneIntl, l.phone, l.market)
  const msg = l.stage === 'contatado' ? followupMessage(l) : whatsappMessage(l, owner)
  const when = new Date(l.nextActionAt!)
  return (
    <div className="agenda-row">
      <div className="agenda-time mono">{when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}<small>{when.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</small></div>
      <button className="agenda-main" onClick={onOpen}>
        <b>{l.name}</b>
        <span>{p?.action ?? 'Retornar'} · {l.nfc?.status === 'vendida' ? 'placa vendida → oferecer site' : l.nicheLabel}</span>
      </button>
      <div className="row" style={{ gap: 4 }}>
        {num && <a className="btn xs wa" href={waLink(num, msg)} target="_blank" rel="noreferrer" title="Abrir WhatsApp com a mensagem pronta"><MessageCircle size={13} /></a>}
        <button className="btn xs" onClick={() => onPostpone(1)} title="Adiar 1 dia">+1d</button>
        <button className="btn xs" onClick={() => onPostpone(7)} title="Adiar 1 semana">+7d</button>
        <button className="btn xs primary" onClick={onDone} title="Marcar como feito"><Check size={13} /></button>
        <ChevronRight size={14} className="dim hide-sm" />
      </div>
    </div>
  )
}
