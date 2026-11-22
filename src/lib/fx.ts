/**
 * Efeitos globais: som ao clicar/passar o mouse, ondinha no clique, brilho que segue
 * o cursor nos cartões de vidro e chuva de confete quando entra dinheiro.
 */
import { play, type SoundName } from './sound'
import { getAppearance } from './theme'

const CLICKABLE = 'button, a[href], [role="button"], [role="switch"], .chip, .nav-item, select, summary, input[type="checkbox"], input[type="radio"]'
const HOVERABLE = 'button:not(:disabled), a[href], .chip, .nav-item, [role="button"]'
const RIPPLE = '.btn, .chip, .nav-item, .seg button, .mobile-nav a'

let installed = false

export function installFx() {
  if (installed || typeof document === 'undefined') return
  installed = true

  document.addEventListener(
    'pointerdown',
    (e) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      const el = t.closest<HTMLElement>(CLICKABLE)
      if (el && !(el as HTMLButtonElement).disabled) {
        const s = el.closest<HTMLElement>('[data-sound]')?.dataset.sound as SoundName | 'none' | undefined
        const auto: SoundName = el.matches('[role="switch"], .chip, input[type="checkbox"], input[type="radio"]') ? 'toggle' : 'click'
        if (s !== 'none') play(s ?? auto)
      }
      const a = getAppearance()
      if (a.ripple && a.motion !== 'nenhum') {
        const r = t.closest<HTMLElement>(RIPPLE)
        if (r && !(r as HTMLButtonElement).disabled) ripple(r, e)
      }
    },
    { passive: true },
  )

  let lastHover: Element | null = null
  document.addEventListener(
    'pointerover',
    (e) => {
      if (e.pointerType !== 'mouse') return
      const el = (e.target as HTMLElement | null)?.closest(HOVERABLE) ?? null
      if (el && el !== lastHover) play('hover')
      lastHover = el
    },
    { passive: true },
  )

  // brilho que segue o mouse dentro de qualquer cartão de vidro
  let raf = 0
  let pending: { el: HTMLElement; x: number; y: number } | null = null
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('.glass')
      if (!el) return
      pending = { el, x: e.clientX, y: e.clientY }
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0
          if (!pending) return
          const r = pending.el.getBoundingClientRect()
          pending.el.style.setProperty('--sx', `${pending.x - r.left}px`)
          pending.el.style.setProperty('--sy', `${pending.y - r.top}px`)
        })
    },
    { passive: true },
  )
}

function ripple(el: HTMLElement, e: PointerEvent) {
  const r = el.getBoundingClientRect()
  const size = Math.max(r.width, r.height) * 2.2
  const s = document.createElement('span')
  s.className = 'fx-ripple'
  s.style.width = s.style.height = `${size}px`
  s.style.left = `${e.clientX - r.left - size / 2}px`
  s.style.top = `${e.clientY - r.top - size / 2}px`
  el.appendChild(s)
  setTimeout(() => s.remove(), 650)
}

/* ---------------- confete ---------------- */

interface P {
  x: number; y: number; vx: number; vy: number; r: number; vr: number
  w: number; h: number; color: string; shape: 'rect' | 'coin' | 'dot'; life: number
}

let canvas: HTMLCanvasElement | null = null
let parts: P[] = []
let running = false

function ensureCanvas() {
  if (canvas) return canvas
  canvas = document.createElement('canvas')
  canvas.className = 'fx-confetti'
  document.body.appendChild(canvas)
  const resize = () => {
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = innerWidth * dpr
    canvas.height = innerHeight * dpr
    canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  addEventListener('resize', resize)
  return canvas
}

/**
 * Comemoração. 'money' solta moedinhas douradas junto com o confete na cor do app.
 * origin em coordenadas da tela; sem origin sai dos dois cantos de baixo.
 */
export function celebrate(kind: 'money' | 'success' = 'success', origin?: { x: number; y: number }) {
  const a = getAppearance()
  if (kind === 'money') play('money')
  else play('success')
  if (!a.confetti || a.motion === 'nenhum') return
  ensureCanvas()
  const colors = [a.accent, a.accent, '#ffffff', '#f5cf4a', '#14a090', '#8f70e6']
  const count = a.motion === 'suave' ? 60 : 140
  const spawn = (x: number, y: number, dir: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const ang = (-Math.PI / 2) + dir * (0.25 + Math.random() * 0.55) + (Math.random() - 0.5) * 0.5
      const sp = 9 + Math.random() * 11
      const coin = kind === 'money' && Math.random() < 0.3
      parts.push({
        x, y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
        w: coin ? 9 : 6 + Math.random() * 6, h: coin ? 9 : 3 + Math.random() * 4,
        color: coin ? '#f5cf4a' : colors[(Math.random() * colors.length) | 0],
        shape: coin ? 'coin' : Math.random() < 0.15 ? 'dot' : 'rect',
        life: 1,
      })
    }
  }
  if (origin) {
    spawn(origin.x, origin.y, -1, count / 2)
    spawn(origin.x, origin.y, 1, count / 2)
  } else {
    spawn(0, innerHeight * 0.9, 1, count / 2)
    spawn(innerWidth, innerHeight * 0.9, -1, count / 2)
  }
  if (!running) {
    running = true
    requestAnimationFrame(frame)
  }
}

function frame() {
  const c = canvas?.getContext('2d')
  if (!c || !canvas) return
  c.clearRect(0, 0, innerWidth, innerHeight)
  parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40)
  for (const p of parts) {
    p.vy += 0.32
    p.vx *= 0.985
    p.vy *= 0.985
    p.x += p.vx
    p.y += p.vy
    p.r += p.vr
    p.life -= 0.0055
    c.save()
    c.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6))
    c.translate(p.x, p.y)
    c.rotate(p.r)
    c.fillStyle = p.color
    if (p.shape === 'coin') {
      // moeda girando: elipse que "vira"
      c.scale(Math.abs(Math.cos(p.r * 2)) + 0.15, 1)
      c.beginPath()
      c.arc(0, 0, p.w / 2 + 2, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = 'rgba(0,0,0,.22)'
      c.beginPath()
      c.arc(0, 0, p.w / 2 - 1, 0, Math.PI * 2)
      c.fill()
    } else if (p.shape === 'dot') {
      c.beginPath()
      c.arc(0, 0, p.h / 1.4, 0, Math.PI * 2)
      c.fill()
    } else {
      c.scale(1, Math.cos(p.r * 3))
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
    }
    c.restore()
  }
  if (parts.length) requestAnimationFrame(frame)
  else {
    running = false
    c.clearRect(0, 0, innerWidth, innerHeight)
  }
}
