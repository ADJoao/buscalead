import type { DetectedSystem } from './types'

/** Hosts que significam "não tem site de verdade" — ótimo sinal de lead. */
const SOCIAL_HOSTS = [
  'instagram.com', 'facebook.com', 'fb.com', 'm.facebook.com', 'linktr.ee', 'linktree.com', 'wa.me',
  'api.whatsapp.com', 'whatsapp.com', 'tiktok.com', 'youtube.com', 'linkin.bio', 'bio.link', 'beacons.ai',
  'taplink.cc', 'taplink.at', 'msha.ke', 'campsite.bio', 'linkbio.co', 'later.com', 'twitter.com', 'x.com',
  'ifood.com.br', 'goo.gl', 'g.page', 'maps.app.goo.gl', 'business.site', 'negocio.site', 'doctoralia.com.br',
  'booksy.com', 'trinks.com', 'linkme.bio', 'solo.to', 'link.me', 'yelp.com', 'tripadvisor.com', 'tripadvisor.com.br',
  'booking.com', 'airbnb.com', 'airbnb.com.br',
]

export function hostOf(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

export function isSocialUrl(url?: string): boolean {
  if (!url) return false
  const h = hostOf(url)
  return SOCIAL_HOSTS.some((s) => h === s || h.endsWith(`.${s}`))
}

export function socialKind(url?: string): string {
  const h = hostOf(url ?? '')
  if (h.includes('instagram')) return 'Instagram'
  if (h.includes('facebook') || h === 'fb.com') return 'Facebook'
  if (h.includes('linktr') || h.includes('bio') || h.includes('taplink') || h.includes('beacons')) return 'Link na bio'
  if (h.includes('whatsapp') || h === 'wa.me') return 'WhatsApp'
  if (h.includes('business.site') || h.includes('negocio.site')) return 'Site grátis do Google (desativado)'
  if (h.includes('ifood')) return 'iFood'
  if (h.includes('doctoralia')) return 'Doctoralia'
  if (h.includes('booking') || h.includes('airbnb')) return 'Booking/Airbnb'
  return 'Rede social'
}

export function instagramHandle(url?: string): string | undefined {
  if (!url) return undefined
  const m = url.match(/instagram\.com\/([A-Za-z0-9_.]{2,30})/i)
  if (!m) return undefined
  const h = m[1].toLowerCase()
  if (['p', 'reel', 'reels', 'explore', 'accounts', 'stories', 'tv', 'share'].includes(h)) return undefined
  return h
}

/** Assinaturas de sistemas que aparecem no HTML do site. */
export const SYSTEM_SIGNATURES: (DetectedSystem & { re: RegExp })[] = [
  // construtores de site
  { name: 'Wix', category: 'construtor', re: /wix\.com|wixstatic|_wixcidx/ },
  { name: 'WordPress', category: 'construtor', re: /wp-content|wp-includes/ },
  { name: 'Elementor', category: 'construtor', re: /elementor/ },
  { name: 'Squarespace', category: 'construtor', re: /squarespace/ },
  { name: 'GoDaddy Builder', category: 'construtor', re: /img1\.wsimg\.com|godaddy/ },
  { name: 'Webnode', category: 'construtor', re: /webnode/ },
  { name: 'Site123', category: 'construtor', re: /site123/ },
  { name: 'Jimdo', category: 'construtor', re: /jimdo/ },
  { name: 'Google Sites', category: 'construtor', re: /sites\.google\.com/ },
  { name: 'Blogspot', category: 'construtor', re: /blogspot\.com|blogger\.com/ },
  { name: 'Hostinger Builder', category: 'construtor', re: /zyrosite|hostinger/ },
  { name: 'Weebly', category: 'construtor', re: /weebly/ },
  { name: 'Webflow', category: 'construtor', re: /webflow/ },
  { name: 'Framer', category: 'construtor', re: /framerusercontent|framer\.com/ },
  // lojas
  { name: 'Shopify', category: 'ecommerce', re: /cdn\.shopify|shopify\.com/ },
  { name: 'Nuvemshop', category: 'ecommerce', re: /nuvemshop|tiendanube/ },
  { name: 'Loja Integrada', category: 'ecommerce', re: /lojaintegrada/ },
  { name: 'Tray', category: 'ecommerce', re: /tray\.com\.br|traycdn/ },
  { name: 'VTEX', category: 'ecommerce', re: /vtex/ },
  // agenda / saúde / beleza
  { name: 'Doctoralia', category: 'agenda', re: /doctoralia/ },
  { name: 'Calendly', category: 'agenda', re: /calendly/ },
  { name: 'Trinks', category: 'agenda', re: /trinks/ },
  { name: 'Booksy', category: 'agenda', re: /booksy/ },
  { name: 'AgendaPro', category: 'agenda', re: /agendapro/ },
  { name: 'Simples Agenda', category: 'agenda', re: /simplesagenda/ },
  { name: 'Clinicorp', category: 'agenda', re: /clinicorp/ },
  { name: 'Simples Dental', category: 'agenda', re: /simplesdental/ },
  { name: 'Feegow', category: 'agenda', re: /feegow/ },
  { name: 'iClinic', category: 'agenda', re: /iclinic/ },
  { name: 'Avec', category: 'agenda', re: /avec\.beauty|salaovip/ },
  { name: 'Tecnofit', category: 'agenda', re: /tecnofit/ },
  { name: 'Next Fit', category: 'agenda', re: /nextfit/ },
  { name: 'EVO (W12)', category: 'agenda', re: /w12app|evo-totem|evoapp/ },
  { name: 'Agendor', category: 'crm', re: /agendor/ },
  // reservas
  { name: 'Omnibees', category: 'reserva', re: /omnibees/ },
  { name: 'Hospedin', category: 'reserva', re: /hospedin/ },
  { name: 'Silbeck', category: 'reserva', re: /silbeck/ },
  { name: 'Letsbook', category: 'reserva', re: /letsbook/ },
  { name: 'Cloudbeds', category: 'reserva', re: /cloudbeds/ },
  { name: 'HBook', category: 'reserva', re: /hbook/ },
  { name: 'Booking.com', category: 'reserva', re: /booking\.com/ },
  { name: 'Airbnb', category: 'reserva', re: /airbnb\./ },
  { name: 'GetYourGuide', category: 'reserva', re: /getyourguide/ },
  // delivery / restaurante
  { name: 'iFood', category: 'delivery', re: /ifood\.com/ },
  { name: 'Anota AI', category: 'delivery', re: /anota\.ai|anotaai/ },
  { name: 'Goomer', category: 'delivery', re: /goomer/ },
  { name: 'Cardápio Web', category: 'delivery', re: /cardapioweb/ },
  { name: 'Saipos', category: 'delivery', re: /saipos/ },
  { name: 'Menudino', category: 'delivery', re: /menudino/ },
  // imobiliária
  { name: 'Kenlo', category: 'crm', re: /kenlo|ingaia/ },
  { name: 'Jetimob', category: 'crm', re: /jetimob/ },
  { name: 'Imoview', category: 'crm', re: /imoview/ },
  { name: 'Vista Software', category: 'crm', re: /vistasoft|vistahost/ },
  { name: 'Union', category: 'crm', re: /unionsistemas|union\.imo/ },
  // CRM / marketing
  { name: 'RD Station', category: 'marketing', re: /rdstation|d335luupugsy2\.cloudfront/ },
  { name: 'HubSpot', category: 'crm', re: /hubspot|hs-scripts/ },
  { name: 'Pipedrive', category: 'crm', re: /pipedrive/ },
  { name: 'Kommo', category: 'crm', re: /kommo|amocrm/ },
  { name: 'Leadster', category: 'marketing', re: /leadster/ },
  { name: 'Meta Pixel', category: 'analytics', re: /fbq\(|connect\.facebook\.net\/[a-z_]+\/fbevents/ },
  { name: 'Google Analytics', category: 'analytics', re: /gtag\(|google-analytics\.com|googletagmanager\.com\/gtag/ },
  { name: 'Google Tag Manager', category: 'analytics', re: /googletagmanager\.com\/gtm/ },
  // chat
  { name: 'JivoChat', category: 'chat', re: /jivosite|jivochat/ },
  { name: 'Tawk.to', category: 'chat', re: /tawk\.to/ },
  { name: 'Octadesk', category: 'chat', re: /octadesk/ },
  { name: 'Blip', category: 'chat', re: /take\.net|blip\.ai/ },
  { name: 'Zenvia', category: 'chat', re: /zenvia/ },
  { name: 'Botão WhatsApp (plugin)', category: 'chat', re: /joinchat|click-to-chat|wa\.me\/|api\.whatsapp\.com/ },
]
