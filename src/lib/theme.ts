/**
 * Aparência personalizável: cor de destaque, botões, vidro, cantos, fundo, fonte,
 * densidade, efeitos e sons. Tudo vira variável de CSS / atributo no <html>,
 * então a troca é instantânea e não precisa recarregar.
 */
import { useEffect, useState } from 'react'

export type ButtonStyle = 'gradiente' | 'solido' | 'contorno' | 'neon'
export type GlassLevel = 'leve' | 'medio' | 'forte'
export type Corners = 'reto' | 'suave' | 'redondo'
export type Background = 'aurora' | 'grade' | 'pontos' | 'liso'
export type FontChoice = 'geist' | 'jakarta' | 'space' | 'sora'
export type Density = 'compacto' | 'normal' | 'espacoso'
export type Motion = 'completo' | 'suave' | 'nenhum'

export interface Appearance {
  accent: string
  accent2?: string
  buttons: ButtonStyle
  glass: GlassLevel
  corners: Corners
  background: Background
  font: FontChoice
  density: Density
  motion: Motion
  spotlight: boolean
  ripple: boolean
  confetti: boolean
  sound: boolean
  volume: number
  hoverSound: boolean
  brandName?: string
}

export const DEFAULT_APPEARANCE: Appearance = {
  accent: '#b6f23a',
  buttons: 'gradiente',
  glass: 'medio',
  corners: 'suave',
  background: 'aurora',
  font: 'geist',
  density: 'normal',
  motion: 'completo',
  spotlight: true,
  ripple: true,
  confetti: true,
  sound: true,
  volume: 0.5,
  hoverSound: false,
}

export const ACCENTS: { name: string; hex: string }[] = [
  { name: 'Limão', hex: '#b6f23a' },
  { name: 'Menta', hex: '#3ee6a8' },
  { name: 'Ciano', hex: '#38d9f5' },
  { name: 'Azul', hex: '#5b8cff' },
  { name: 'Violeta', hex: '#a78bfa' },
  { name: 'Rosa', hex: '#ff6fb5' },
  { name: 'Coral', hex: '#ff7a59' },
  { name: 'Laranja', hex: '#ffa61a' },
  { name: 'Ouro', hex: '#f5cf4a' },
  { name: 'Gelo', hex: '#e6ecf2' },
]

/** Combinações prontas que mudam tudo de uma vez. */
export const PRESETS: { name: string; desc: string; a: Partial<Appearance> }[] = [
  { name: 'Original', desc: 'Vidro escuro e verde-limão', a: { accent: '#b6f23a', buttons: 'gradiente', glass: 'medio', corners: 'suave', background: 'aurora', font: 'geist' } },
  { name: 'Neon', desc: 'Ciano brilhando, cara de painel futurista', a: { accent: '#38d9f5', buttons: 'neon', glass: 'forte', corners: 'suave', background: 'grade', font: 'space' } },
  { name: 'Executivo', desc: 'Dourado discreto, pra foto de resultado', a: { accent: '#f5cf4a', buttons: 'solido', glass: 'leve', corners: 'reto', background: 'liso', font: 'sora' } },
  { name: 'Sunset', desc: 'Coral quente com cantos arredondados', a: { accent: '#ff7a59', buttons: 'gradiente', glass: 'forte', corners: 'redondo', background: 'aurora', font: 'jakarta' } },
  { name: 'Galáxia', desc: 'Violeta com fundo de pontos', a: { accent: '#a78bfa', buttons: 'neon', glass: 'medio', corners: 'redondo', background: 'pontos', font: 'geist' } },
  { name: 'Minimal', desc: 'Branco gelo, sem brilho, foco total', a: { accent: '#e6ecf2', buttons: 'contorno', glass: 'leve', corners: 'reto', background: 'liso', font: 'geist' } },
]

export const FONTS: Record<FontChoice, { label: string; css: string }> = {
  geist: { label: 'Geist', css: "'Geist', ui-sans-serif, system-ui, sans-serif" },
  jakarta: { label: 'Plus Jakarta', css: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" },
  space: { label: 'Space Grotesk', css: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif" },
  sora: { label: 'Sora', css: "'Sora', ui-sans-serif, system-ui, sans-serif" },
}

const LS = 'bl.appearance'

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(n)) return [182, 242, 58]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const mix = (a: [number, number, number], b: [number, number, number], t: number) => a.map((v, i) => v + (b[i] - v) * t) as [number, number, number]
function luminance([r, g, b]: [number, number, number]) {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export function loadAppearance(): Appearance {
  try {
    const v = localStorage.getItem(LS)
    return v ? { ...DEFAULT_APPEARANCE, ...JSON.parse(v) } : DEFAULT_APPEARANCE
  } catch {
    return DEFAULT_APPEARANCE
  }
}

let current: Appearance = DEFAULT_APPEARANCE
const listeners = new Set<(a: Appearance) => void>()
export const getAppearance = () => current

export function applyAppearance(input: Partial<Appearance>) {
  const a: Appearance = { ...DEFAULT_APPEARANCE, ...input }
  current = a
  try { localStorage.setItem(LS, JSON.stringify(a)) } catch { /* sem armazenamento */ }
  const root = document.documentElement
  const rgb = hexToRgb(a.accent)
  const rgb2 = a.accent2 ? hexToRgb(a.accent2) : mix(rgb, [255, 255, 255], 0.32)
  const light = luminance(rgb) > 0.35
  const ink = light ? mix(rgb, [0, 0, 0], 0.9) : ([255, 255, 255] as [number, number, number])
  const st = root.style
  st.setProperty('--accent', a.accent)
  st.setProperty('--accent-rgb', rgb.join(', '))
  st.setProperty('--accent-2', toHex(...rgb2))
  st.setProperty('--accent-2-rgb', rgb2.map(Math.round).join(', '))
  st.setProperty('--accent-ink', toHex(...ink))
  st.setProperty('--accent-soft', `rgba(${rgb.join(', ')}, 0.12)`)
  st.setProperty('--accent-line', `rgba(${rgb.join(', ')}, 0.35)`)
  st.setProperty('--accent-glow', `rgba(${rgb.join(', ')}, 0.22)`)
  st.setProperty('--series-1', toHex(...mix(rgb, [0, 0, 0], 0.35)))
  const radius = { reto: [8, 6, 7], suave: [20, 12, 11], redondo: [28, 16, 999] }[a.corners]
  st.setProperty('--radius', radius[0] + 'px')
  st.setProperty('--radius-sm', radius[1] + 'px')
  st.setProperty('--btn-radius', radius[2] + 'px')
  const glass = { leve: ['blur(10px) saturate(120%)', '0.03', '0.012'], medio: ['blur(22px) saturate(150%)', '0.055', '0.018'], forte: ['blur(34px) saturate(180%)', '0.085', '0.03'] }[a.glass]
  st.setProperty('--blur', glass[0])
  st.setProperty('--glass-a', glass[1])
  st.setProperty('--glass-b', glass[2])
  st.setProperty('--font', FONTS[a.font].css)
  root.dataset.btn = a.buttons
  root.dataset.bg = a.background
  root.dataset.density = a.density
  root.dataset.motion = a.motion
  root.dataset.spotlight = a.spotlight ? 'on' : 'off'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#060807')
  listeners.forEach((fn) => fn(a))
}

/** Lê a aparência atual e atualiza quando ela muda (para gráficos e mapa, que não leem CSS). */
export function useAppearance(): Appearance {
  const [a, setA] = useState(current)
  useEffect(() => {
    listeners.add(setA)
    setA(current)
    return () => { listeners.delete(setA) }
  }, [])
  return a
}
