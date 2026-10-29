import type { Market } from './shared/types'

export function digits(s?: string): string {
  return (s ?? '').replace(/\D/g, '')
}

/** Número no formato do wa.me (só dígitos com DDI). */
export function waNumber(phoneIntl?: string, phone?: string, market: Market = 'BR'): string | undefined {
  let d = digits(phoneIntl)
  if (!d && phone) {
    d = digits(phone).replace(/^0/, '')
    d = (market === 'BR' ? '55' : market === 'PT' ? '351' : '1') + d
  }
  return d.length >= 10 ? d : undefined
}

/** Celular = provável WhatsApp. Fixo pode ter WhatsApp Business, mas é menos certo. */
export function isMobile(phoneIntl?: string, market: Market = 'BR'): boolean {
  const d = digits(phoneIntl)
  if (market === 'BR') return /^55\d{2}9\d{8}$/.test(d)
  if (market === 'PT') return /^3519\d{8}$/.test(d)
  return d.length >= 11 // EUA: não dá pra saber pelo número
}

export function waLink(num: string, text?: string): string {
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
