import { CalendarCheck2, Columns3, CornerDownLeft, Eye, EyeOff, Gem, LayoutDashboard, Palette, Radar, Route, Search, Settings2, Trophy, Users, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { play } from '../lib/sound'
import { useStore } from '../lib/store'
import { PRESETS, applyAppearance, getAppearance } from '../lib/theme'
import type { Lead } from '../lib/types'

interface Item {
  id: string
  label: string
  hint?: string
  icon: ReactNode
  group: string
  run: () => void
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Busca rápida: Ctrl+K (ou /) em qualquer tela. Acha lead, abre tela, troca tema. */
export function CommandPalette({ privacy, setPrivacy }: { privacy: boolean; setPrivacy: (v: boolean) => void }) {
  const { leads, openLead, saveSettings } = useStore()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const nav = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === '/' && !typing && !open) {
        e.preventDefault()
        setOpen(true)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('bl:palette', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('bl:palette', onOpen)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      play('open')
      setQ('')
      setSel(0)
      setTimeout(() => input.current?.focus(), 10)
    }
  }, [open])

  const close = () => setOpen(false)
  const go = (to: string) => () => { nav(to); close() }

  const items = useMemo<Item[]>(() => {
    const a = getAppearance()
    const pages: Item[] = [
      { id: 'p-dash', label: 'Dashboard', icon: <LayoutDashboard size={16} />, group: 'Ir para', run: go('/') },
      { id: 'p-agenda', label: 'Agenda de retornos', icon: <CalendarCheck2 size={16} />, group: 'Ir para', run: go('/agenda') },
      { id: 'p-busca', label: 'Buscar leads', icon: <Radar size={16} />, group: 'Ir para', run: go('/prospectar') },
      { id: 'p-leads', label: 'Leads', icon: <Users size={16} />, group: 'Ir para', run: go('/leads') },
      { id: 'p-pipe', label: 'Pipeline', icon: <Columns3 size={16} />, group: 'Ir para', run: go('/pipeline') },
      { id: 'p-rotas', label: 'Rotas (placa NFC)', icon: <Route size={16} />, group: 'Ir para', run: go('/rotas') },
      { id: 'p-nichos', label: 'Nichos', icon: <Gem size={16} />, group: 'Ir para', run: go('/nichos') },
      { id: 'p-conq', label: 'Conquistas', icon: <Trophy size={16} />, group: 'Ir para', run: go('/conquistas') },
      { id: 'p-pers', label: 'Personalizar', icon: <Palette size={16} />, group: 'Ir para', run: go('/personalizar') },
      { id: 'p-conf', label: 'Configurações', icon: <Settings2 size={16} />, group: 'Ir para', run: go('/config') },
    ]
    const actions: Item[] = [
      { id: 'a-priv', label: privacy ? 'Mostrar valores' : 'Esconder valores (modo privacidade)', icon: privacy ? <Eye size={16} /> : <EyeOff size={16} />, group: 'Ações', run: () => { setPrivacy(!privacy); close() } },
      { id: 'a-sound', label: a.sound ? 'Desligar sons' : 'Ligar sons', icon: a.sound ? <VolumeX size={16} /> : <Volume2 size={16} />, group: 'Ações', run: () => { const next = { ...a, sound: !a.sound }; applyAppearance(next); saveSettings({ appearance: next }); close() } },
      ...PRESETS.map((p) => ({
        id: `t-${p.name}`, label: `Tema ${p.name}`, hint: p.desc, group: 'Tema',
        icon: <i className="cp-dot" style={{ background: p.a.accent }} />,
        run: () => { const next = { ...getAppearance(), ...p.a }; applyAppearance(next); saveSettings({ appearance: next }); close() },
      })),
    ]
    const leadItems: Item[] = leads.map((l: Lead) => ({
      id: `l-${l.id}`, label: l.name, hint: [l.nicheLabel, l.city, l.phone].filter(Boolean).join(' · '), group: 'Leads',
      icon: <span className="cp-score mono">{l.score}</span>,
      run: () => { openLead(l); close() },
    }))
    return [...pages, ...actions, ...leadItems]
  }, [leads, privacy]) // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    const t = norm(q.trim())
    if (!t) return items.filter((i) => i.group !== 'Leads').concat(items.filter((i) => i.group === 'Leads').slice(0, 5))
    const words = t.split(/\s+/)
    return items
      .map((i) => {
        const hay = norm(`${i.label} ${i.hint ?? ''} ${i.group}`)
        if (!words.every((w) => hay.includes(w))) return null
        const score = (norm(i.label).startsWith(t) ? 3 : 0) + (norm(i.label).includes(t) ? 2 : 0) + (i.group === 'Leads' ? 1 : 0)
        return { i, score }
      })
      .filter((x): x is { i: Item; score: number } => Boolean(x))
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map((x) => x.i)
  }, [q, items])

  useEffect(() => setSel(0), [q])
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  if (!open) return null

  let lastGroup = ''
  return (
    <>
      <div className="overlay cp-overlay" onClick={close} />
      <div className="cp glass" role="dialog" aria-label="Busca rápida">
        <div className="cp-input">
          <Search size={18} className="dim" />
          <input
            ref={input}
            value={q}
            placeholder="Buscar lead, tela, tema..."
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close()
              else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); play('hover', { force: true }) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); play('hover', { force: true }) }
              else if (e.key === 'Enter' && results[sel]) { play('click'); results[sel].run() }
            }}
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="cp-list" ref={list}>
          {!results.length && <div className="dim" style={{ padding: 20, textAlign: 'center' }}>Nada encontrado para "{q}"</div>}
          {results.map((r, idx) => {
            const head = r.group !== lastGroup ? r.group : null
            lastGroup = r.group
            return (
              <div key={r.id}>
                {head && <div className="cp-group">{head}</div>}
                <button data-i={idx} className={`cp-item ${idx === sel ? 'on' : ''}`} onMouseEnter={() => setSel(idx)} onClick={r.run}>
                  <span className="cp-ico">{r.icon}</span>
                  <span className="cp-text"><b>{r.label}</b>{r.hint && <small>{r.hint}</small>}</span>
                  {idx === sel && <CornerDownLeft size={14} className="dim" />}
                </button>
              </div>
            )
          })}
        </div>
        <div className="cp-foot dim"><span><span className="kbd">↑</span><span className="kbd">↓</span> navegar</span><span><span className="kbd">Enter</span> abrir</span><span><span className="kbd">Ctrl</span>+<span className="kbd">K</span> abre de qualquer tela</span></div>
      </div>
    </>
  )
}
