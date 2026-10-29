import { MessageCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { money } from '../lib/format'
import { whatsappMessage } from '../lib/messages'
import { PACKAGES } from '../lib/niches'
import { waLink, waNumber } from '../lib/phone'
import { useStore } from '../lib/store'
import type { Lead } from '../lib/types'
import { CheckBox, ScoreRing, SiteChip, Stars, TierBadge } from './ui'

export function LeadListHead({ third = 'Ticket' }: { third?: string }) {
  return (
    <div className="lrow lhead hide-m">
      <span />
      <span>Score</span>
      <span>Empresa</span>
      <span className="c-city">Cidade</span>
      <span className="c-site">Site</span>
      <span className="c-ticket">{third}</span>
      <span style={{ textAlign: 'right' }}>Contato</span>
    </div>
  )
}

export function LeadRow({
  lead, selected, onSelect, third,
}: { lead: Lead; selected?: boolean; onSelect?: (v: boolean) => void; third?: ReactNode }) {
  const { openLead, updateLead } = useStore()
  const num = waNumber(lead.phoneIntl, lead.phone, lead.market)
  const saved = !lead.id.startsWith('tmp-') && !lead.demo
  return (
    <div className={`lrow ${selected ? 'selected' : ''}`} onClick={() => openLead(lead)}>
      {onSelect ? <CheckBox on={!!selected} onChange={onSelect} /> : <span />}
      <ScoreRing score={lead.score} size={42} />
      <div style={{ minWidth: 0 }}>
        <div className="row" style={{ gap: 8, minWidth: 0 }}>
          <span className="lname">{lead.name}</span>
          {lead.tier === 'top' && <TierBadge tier="top" />}
          {lead.inCrm && <span className="tag">no CRM</span>}
          {lead.ai && <span className="tag violet">IA</span>}
        </div>
        <div className="lmeta">
          {lead.nicheLabel}
          {lead.neighborhood ? ` · ${lead.neighborhood}` : ''}
          <span className="show-m"> · {lead.city}</span>
        </div>
        <div className="row mt-s show-m" style={{ gap: 8 }}>
          <Stars rating={lead.rating} reviews={lead.reviews} />
          <SiteChip status={lead.siteStatus} />
        </div>
      </div>
      <div className="c-city hide-m" style={{ minWidth: 0 }}>
        <div className="lname" style={{ fontWeight: 500 }}>{lead.city}</div>
        <Stars rating={lead.rating} reviews={lead.reviews} />
      </div>
      <div className="c-site hide-m"><SiteChip status={lead.siteStatus} /></div>
      <div className="c-ticket hide-m" style={{ minWidth: 0 }}>
        {third ?? (
          <>
            <div className="mono" style={{ fontWeight: 600 }}>{money(lead.setupRange[0], lead.currency)}+</div>
            <div className="dim" style={{ fontSize: 12 }}>{PACKAGES[lead.pkg].short} · {money(lead.monthlyRange[0], lead.currency)}/mês</div>
          </>
        )}
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
        {num && (
          <a
            className="btn wa icon sm"
            href={waLink(num, whatsappMessage(lead))}
            target="_blank"
            rel="noreferrer"
            title="Abrir WhatsApp com a mensagem pronta"
            onClick={(e) => {
              e.stopPropagation()
              if (saved) updateLead(lead.id, lead.stage === 'novo' ? { stage: 'contatado', contactedAt: new Date().toISOString() } : {}, { type: 'whatsapp', text: 'Mensagem enviada no WhatsApp' })
            }}
          >
            <MessageCircle size={16} />
          </a>
        )}
        <button className="btn sm hide-m" onClick={(e) => { e.stopPropagation(); openLead(lead) }}>Abrir</button>
      </div>
    </div>
  )
}
