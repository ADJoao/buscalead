const LOCALE: Record<string, string> = { BRL: 'pt-BR', EUR: 'pt-PT', USD: 'en-US' }

export function money(v: number, currency = 'BRL', compact = false): string {
  return new Intl.NumberFormat(LOCALE[currency] ?? 'pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    notation: compact && Math.abs(v) >= 10000 ? 'compact' : 'standard',
  }).format(v)
}

export function num(v: number): string {
  return new Intl.NumberFormat('pt-BR').format(v)
}

export function pct(v: number): string {
  return `${(v * 100).toFixed(v > 0 && v < 0.1 ? 1 : 0).replace('.', ',')}%`
}

export function relTime(iso?: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  const fut = min < 0
  const a = Math.abs(min)
  const txt = a < 1 ? 'agora' : a < 60 ? `${a} min` : a < 1440 ? `${Math.round(a / 60)} h` : `${Math.round(a / 1440)} d`
  if (txt === 'agora') return txt
  return fut ? `em ${txt}` : `há ${txt}`
}

export function dateBR(iso?: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function uid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
