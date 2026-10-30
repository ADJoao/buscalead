import { X } from 'lucide-react'
import { useState } from 'react'
import { digits } from '../lib/phone'
import { CURRENCY, NICHES, NICHE_BY_ID, PRICE_TABLE, type PackageId } from '../lib/niches'
import { instagramHandle } from '../lib/shared/site'
import type { Market } from '../lib/shared/types'
import { useStore } from '../lib/store'
import { STAGES, type Lead, type Stage } from '../lib/types'

const DDI: Record<Market, string> = { BR: '55', PT: '351', US: '1' }

function toIntl(phone: string, market: Market): string | undefined {
  const d = digits(phone).replace(/^0+/, '')
  if (d.length < 8) return undefined
  return `+${d.startsWith(DDI[market]) && d.length > 11 ? d : DDI[market] + d}`
}

function url(v: string): string | undefined {
  const t = v.trim()
  if (!t) return undefined
  return t.startsWith('http') ? t : `https://${t}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

/** Formulário para adicionar um lead/cliente à mão ou editar os dados de um existente. */
export function LeadForm({ initial, defaultStage = 'fechado', onClose }: { initial?: Lead; defaultStage?: Stage; onClose: () => void }) {
  const { saveLeads, updateLead, toast, openLead } = useStore()
  const [f, setF] = useState({
    name: initial?.name ?? '',
    nicheId: initial?.nicheId ?? '',
    market: (initial?.market ?? 'BR') as Market,
    city: initial?.city ?? 'Cabo Frio',
    neighborhood: initial?.neighborhood ?? '',
    phone: initial?.phone ?? initial?.phoneIntl ?? '',
    email: initial?.email ?? '',
    instagram: initial?.instagram ?? '',
    website: initial?.website ?? '',
    deliveredSite: initial?.deliveredSite ?? '',
    stage: initial?.stage ?? defaultStage,
    setup: String(initial?.deal.setup ?? ''),
    monthly: String(initial?.deal.monthly ?? ''),
    closedAt: (initial?.deal.closedAt ?? new Date().toISOString()).slice(0, 10),
    notes: initial?.notes ?? '',
  })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!f.name.trim()) return toast('Coloque o nome da empresa.', true)
    setBusy(true)
    const niche = f.nicheId ? NICHE_BY_ID[f.nicheId] : undefined
    const pkg: PackageId = niche?.package ?? 'SITE'
    const [a, b, c, d] = PRICE_TABLE[f.market][pkg]
    const now = new Date().toISOString()
    const ig = instagramHandle(f.instagram) ?? (f.instagram.replace(/^@/, '').trim() || undefined)
    const closedAt = f.stage === 'fechado' ? new Date(`${f.closedAt || todayISO()}T12:00:00`).toISOString() : undefined
    const data: Partial<Lead> = {
      name: f.name.trim(),
      nicheId: f.nicheId || undefined,
      nicheLabel: niche?.label ?? initial?.nicheLabel ?? 'Outro',
      market: f.market,
      city: f.city.trim() || undefined,
      neighborhood: f.neighborhood.trim() || undefined,
      phone: f.phone.trim() || undefined,
      phoneIntl: f.phone.trim() ? toIntl(f.phone, f.market) : undefined,
      email: f.email.trim() || undefined,
      instagram: ig,
      website: url(f.website),
      deliveredSite: url(f.deliveredSite),
      stage: f.stage,
      notes: f.notes,
      deal: {
        setup: f.setup ? Number(f.setup) : undefined,
        monthly: f.monthly ? Number(f.monthly) : undefined,
        closedAt,
      },
    }
    if (f.stage !== 'novo' && !initial?.contactedAt) data.contactedAt = now

    if (initial) {
      await updateLead(initial.id, data, { type: 'nota', text: 'Dados editados' })
      toast('Dados salvos')
    } else {
      const lead = {
        ...data,
        id: `tmp-manual-${Date.now()}`,
        score: 60,
        createdAt: now,
        updatedAt: now,
        reviews: 0,
        photos: 0,
        types: [],
        site: null,
        siteStatus: data.website ? 'unknown' : 'none',
        tier: 'bom',
        reasons: ['Adicionado manualmente'],
        weaknesses: [],
        pkg,
        setupRange: [a, b],
        monthlyRange: [c, d],
        currency: CURRENCY[f.market],
        timeline: [],
      } as Lead
      const [saved] = await saveLeads([lead])
      if (saved) {
        toast(f.stage === 'fechado' ? 'Cliente adicionado' : 'Lead adicionado')
        openLead(saved)
      }
    }
    setBusy(false)
    onClose()
  }

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <form className="modal glass" onSubmit={submit}>
        <div className="row spread">
          <h2 style={{ margin: 0, fontSize: 19, letterSpacing: '-0.02em' }}>{initial ? 'Editar dados' : f.stage === 'fechado' ? 'Adicionar cliente' : 'Adicionar lead'}</h2>
          <button type="button" className="btn icon sm ghost" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>

        <div className="grid g-2 mt" style={{ gap: 12 }}>
          <label className="field" style={{ gridColumn: '1 / -1' }}><span>Nome da empresa *</span>
            <input className="input" autoFocus required value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Pousada Mar Azul" />
          </label>
          <label className="field"><span>Nicho</span>
            <select className="select" value={f.nicheId} onChange={(e) => set('nicheId', e.target.value)}>
              <option value="">Outro</option>
              {NICHES.map((n) => <option key={n.id} value={n.id}>{n.emoji} {n.label}</option>)}
            </select>
          </label>
          <label className="field"><span>Etapa</span>
            <select className="select" value={f.stage} onChange={(e) => set('stage', e.target.value as Stage)}>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="field"><span>Cidade</span><input className="input" value={f.city} onChange={(e) => set('city', e.target.value)} /></label>
          <label className="field"><span>Bairro</span><input className="input" value={f.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} /></label>
          <label className="field"><span>WhatsApp / telefone</span><input className="input" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(22) 99999-9999" /></label>
          <label className="field"><span>País</span>
            <select className="select" value={f.market} onChange={(e) => set('market', e.target.value as Market)}>
              <option value="BR">🇧🇷 Brasil (R$)</option>
              <option value="PT">🇵🇹 Portugal (€)</option>
              <option value="US">🇺🇸 EUA (US$)</option>
            </select>
          </label>
          <label className="field"><span>Instagram</span><input className="input" value={f.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@perfil" /></label>
          <label className="field"><span>E-mail</span><input className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></label>
          <label className="field"><span>Site que ele tinha antes</span><input className="input" value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="Vazio se não tinha" /></label>
          <label className="field"><span>Site que você fez</span><input className="input" value={f.deliveredSite} onChange={(e) => set('deliveredSite', e.target.value)} placeholder="Vazio se ainda não entregou" /></label>
        </div>

        <div className="block mt">
          <h4>Contrato</h4>
          <div className="grid g-3" style={{ gap: 12 }}>
            <label className="field"><span>Setup ({CURRENCY[f.market]})</span>
              <input className="input mono" inputMode="numeric" value={f.setup} onChange={(e) => set('setup', e.target.value.replace(/[^\d]/g, ''))} placeholder="0" />
            </label>
            <label className="field"><span>Mensalidade ({CURRENCY[f.market]})</span>
              <input className="input mono" inputMode="numeric" value={f.monthly} onChange={(e) => set('monthly', e.target.value.replace(/[^\d]/g, ''))} placeholder="0" />
            </label>
            <label className="field"><span>Data de fechamento</span>
              <input className="input" type="date" value={f.closedAt} disabled={f.stage !== 'fechado'} onChange={(e) => set('closedAt', e.target.value)} />
            </label>
          </div>
          <div className="dim mt-s" style={{ fontSize: 12 }}>A data de fechamento define em que mês o setup entra no faturamento e a partir de quando a mensalidade conta.</div>
        </div>

        <label className="field mt"><span>Anotações</span>
          <textarea className="textarea" rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>

        <div className="row mt" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy}>{initial ? 'Salvar' : 'Adicionar'}</button>
        </div>
      </form>
    </>
  )
}
