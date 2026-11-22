/**
 * Sons sintetizados na hora (Web Audio), sem arquivo de áudio: leves, curtos e baixos.
 * O navegador só libera o áudio depois do primeiro clique, então nada toca antes disso.
 */
import { getAppearance } from './theme'

export type SoundName = 'click' | 'hover' | 'toggle' | 'success' | 'money' | 'error' | 'open' | 'close' | 'notify' | 'whoosh'

let ctx: AudioContext | null = null
let master: GainNode | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    // compressor suave: evita estalo quando dois sons se somam
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 4
    master.connect(comp).connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface ToneOpts {
  freq: number
  to?: number
  type?: OscillatorType
  at?: number
  attack?: number
  decay: number
  gain: number
  pan?: number
}

function tone(c: AudioContext, o: ToneOpts) {
  const t = c.currentTime + (o.at ?? 0)
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(o.freq, t)
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.decay)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(o.gain, t + (o.attack ?? 0.004))
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.decay)
  let node: AudioNode = g
  if (o.pan && c.createStereoPanner) {
    const p = c.createStereoPanner()
    p.pan.value = o.pan
    g.connect(p)
    node = p
  }
  osc.connect(g)
  node.connect(master!)
  osc.start(t)
  osc.stop(t + o.decay + 0.05)
}

/** Sino: fundamental + parciais inarmônicos, como um sino de metal pequeno. */
function bell(c: AudioContext, freq: number, at: number, gain: number, decay = 0.9, pan = 0) {
  const partials: [number, number, number][] = [[1, 1, 1], [2.0, 0.42, 0.55], [2.76, 0.26, 0.4], [5.4, 0.1, 0.22]]
  for (const [mult, g, d] of partials) tone(c, { freq: freq * mult, at, attack: 0.002, decay: decay * d, gain: gain * g, pan })
}

function noise(c: AudioContext, at: number, dur: number, gain: number, freq: number, q = 1) {
  const t = c.currentTime + at
  const len = Math.ceil(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = q
  const g = c.createGain()
  g.gain.value = gain
  src.connect(f).connect(g).connect(master!)
  src.start(t)
}

const last: Partial<Record<SoundName, number>> = {}

export function play(name: SoundName, opts: { force?: boolean } = {}) {
  const a = getAppearance()
  if (!a.sound && !opts.force) return
  if (name === 'hover' && !a.hoverSound && !opts.force) return
  const now = performance.now()
  const gap = name === 'hover' ? 70 : name === 'click' ? 35 : 120
  if (now - (last[name] ?? 0) < gap) return
  // o aviso de "salvo" não pisa em cima do som de dinheiro/sucesso
  if ((name === 'notify' || name === 'click') && now - Math.max(last.money ?? 0, last.success ?? 0) < 900) return
  last[name] = now
  const c = audio()
  if (!c || !master) return
  master.gain.value = Math.max(0, Math.min(1, a.volume)) * 0.9

  switch (name) {
    case 'click':
      // "tic" curto e seco, tipo tecla de notebook bom
      tone(c, { freq: 1900, to: 1200, type: 'sine', decay: 0.045, gain: 0.07 })
      noise(c, 0, 0.018, 0.05, 4200, 2)
      break
    case 'hover':
      tone(c, { freq: 2600, type: 'sine', decay: 0.03, gain: 0.018 })
      break
    case 'toggle':
      tone(c, { freq: 880, type: 'triangle', decay: 0.06, gain: 0.06 })
      tone(c, { freq: 1320, type: 'sine', at: 0.045, decay: 0.08, gain: 0.05 })
      break
    case 'open':
      tone(c, { freq: 520, to: 880, type: 'sine', decay: 0.14, gain: 0.05 })
      noise(c, 0, 0.12, 0.025, 1800, 0.7)
      break
    case 'close':
      tone(c, { freq: 760, to: 460, type: 'sine', decay: 0.12, gain: 0.045 })
      break
    case 'whoosh':
      noise(c, 0, 0.22, 0.05, 900, 0.5)
      break
    case 'notify':
      bell(c, 1568, 0, 0.05, 0.5)
      break
    case 'success':
      // duas notas subindo (Dó → Sol), limpo e curto
      bell(c, 1046.5, 0, 0.06, 0.55, -0.1)
      bell(c, 1568, 0.09, 0.07, 0.8, 0.1)
      break
    case 'money': {
      // "tchá-tching": a gaveta (ruído) + duas moedinhas + brilho no final
      noise(c, 0, 0.07, 0.09, 3200, 1.2)
      noise(c, 0.05, 0.05, 0.05, 5200, 1.5)
      bell(c, 1975.5, 0.06, 0.09, 1.0, -0.25)
      bell(c, 2637, 0.15, 0.08, 1.3, 0.25)
      tone(c, { freq: 3951, at: 0.24, decay: 0.5, gain: 0.025 })
      tone(c, { freq: 5274, at: 0.3, decay: 0.4, gain: 0.015 })
      break
    }
    case 'error':
      tone(c, { freq: 330, type: 'triangle', decay: 0.16, gain: 0.07 })
      tone(c, { freq: 247, type: 'triangle', at: 0.11, decay: 0.22, gain: 0.07 })
      break
  }
}
