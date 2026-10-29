import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { demoLeads } from './demo'
import { uid } from './format'
import { supabase } from './supabase'
import { DEFAULT_SETTINGS, type Lead, type Settings, type TimelineEvent } from './types'

interface Toast {
  id: number
  text: string
  err?: boolean
}

interface Store {
  mode: 'supabase' | 'local'
  session: Session | null
  authReady: boolean
  loading: boolean
  /** leads exibidos (demonstração quando o modo demo está ligado) */
  leads: Lead[]
  realLeads: Lead[]
  settings: Settings
  saveLeads: (leads: Lead[]) => Promise<Lead[]>
  updateLead: (id: string, patch: Partial<Lead>, event?: Omit<TimelineEvent, 'at'>) => Promise<void>
  deleteLeads: (ids: string[]) => Promise<void>
  saveSettings: (patch: Partial<Settings>) => Promise<void>
  toast: (text: string, err?: boolean) => void
  toasts: Toast[]
  drawer: Lead | null
  openLead: (lead: Lead | null) => void
  signOut: () => Promise<void>
}

const Ctx = createContext<Store | null>(null)

const LS_LEADS = 'bl.leads'
const LS_SETTINGS = 'bl.settings'

function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function lsSet(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* sem armazenamento */
  }
}

interface Row {
  id: string
  place_id: string | null
  stage: Lead['stage']
  score: number
  data: Omit<Lead, 'id' | 'placeId' | 'stage' | 'score' | 'createdAt' | 'updatedAt'>
  created_at: string
  updated_at: string
}

function toRow(l: Lead) {
  const { id, placeId, stage, score, createdAt, updatedAt, inCrm: _inCrm, ...data } = l
  return { id, place_id: placeId ?? null, stage, score, data, created_at: createdAt, updated_at: updatedAt }
}
function fromRow(r: Row): Lead {
  return { ...r.data, id: r.id, placeId: r.place_id ?? undefined, stage: r.stage, score: r.score, createdAt: r.created_at, updatedAt: r.updated_at }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const mode = supabase ? 'supabase' : 'local'
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [loading, setLoading] = useState(true)
  const [realLeads, setRealLeads] = useState<Lead[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [drawer, setDrawer] = useState<Lead | null>(null)
  const toastId = useRef(0)

  const toast = useCallback((text: string, err?: boolean) => {
    const id = ++toastId.current
    setToasts((t) => [...t, { id, text, err }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), err ? 6000 : 3200)
  }, [])

  // sessão
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // carregar dados
  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      if (!supabase) {
        setRealLeads(lsGet<Lead[]>(LS_LEADS, []))
        setSettings({ ...DEFAULT_SETTINGS, ...lsGet<Partial<Settings>>(LS_SETTINGS, {}) })
        setLoading(false)
        return
      }
      if (!session) {
        setLoading(false)
        return
      }
      const [leadsRes, setRes] = await Promise.all([
        supabase.from('leads').select('*').order('score', { ascending: false }),
        supabase.from('user_settings').select('data').maybeSingle(),
      ])
      if (!alive) return
      if (leadsRes.error) toast(`Erro ao carregar leads: ${leadsRes.error.message}`, true)
      setRealLeads(((leadsRes.data ?? []) as Row[]).map(fromRow))
      setSettings({ ...DEFAULT_SETTINGS, ...((setRes.data?.data as Partial<Settings>) ?? {}) })
      setLoading(false)
    }
    load()
    return () => {
      alive = false
    }
  }, [session?.user.id, toast]) // eslint-disable-line react-hooks/exhaustive-deps

  const persistLocal = (next: Lead[]) => lsSet(LS_LEADS, next)

  const saveLeads = useCallback(
    async (incoming: Lead[]) => {
      const existing = new Set(realLeads.map((l) => l.placeId).filter(Boolean))
      const now = new Date().toISOString()
      const fresh = incoming
        .filter((l) => !l.placeId || !existing.has(l.placeId))
        .map((l): Lead => ({
          ...l,
          id: uid(),
          inCrm: undefined,
          demo: undefined,
          createdAt: now,
          updatedAt: now,
          timeline: [{ at: now, type: 'criado', text: `Adicionado ao CRM (pontuação ${l.score})` }],
        }))
      if (!fresh.length) return []
      if (supabase) {
        const { error } = await supabase.from('leads').insert(fresh.map(toRow))
        if (error) {
          toast(`Erro ao salvar: ${error.message}`, true)
          return []
        }
      }
      setRealLeads((prev) => {
        const next = [...fresh, ...prev].sort((a, b) => b.score - a.score)
        if (!supabase) persistLocal(next)
        return next
      })
      return fresh
    },
    [realLeads, toast],
  )

  const updateLead = useCallback(
    async (id: string, patch: Partial<Lead>, event?: Omit<TimelineEvent, 'at'>) => {
      if (id.startsWith('demo-')) {
        toast('Isto é um lead de demonstração.')
        return
      }
      const cur = realLeads.find((l) => l.id === id)
      if (!cur) return
      const now = new Date().toISOString()
      const next: Lead = {
        ...cur,
        ...patch,
        updatedAt: now,
        timeline: event ? [{ ...event, at: now }, ...(patch.timeline ?? cur.timeline)] : patch.timeline ?? cur.timeline,
      }
      setRealLeads((prev) => {
        const list = prev.map((l) => (l.id === id ? next : l))
        if (!supabase) persistLocal(list)
        return list
      })
      setDrawer((d) => (d?.id === id ? next : d))
      if (supabase) {
        const { error } = await supabase.from('leads').update(toRow(next)).eq('id', id)
        if (error) toast(`Erro ao salvar: ${error.message}`, true)
      }
    },
    [realLeads, toast],
  )

  const deleteLeads = useCallback(
    async (ids: string[]) => {
      const set = new Set(ids)
      setRealLeads((prev) => {
        const list = prev.filter((l) => !set.has(l.id))
        if (!supabase) persistLocal(list)
        return list
      })
      if (supabase) {
        const { error } = await supabase.from('leads').delete().in('id', ids)
        if (error) toast(`Erro ao excluir: ${error.message}`, true)
      }
    },
    [toast],
  )

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch }
      setSettings(next)
      if (supabase && session) {
        const { error } = await supabase
          .from('user_settings')
          .upsert({ user_id: session.user.id, data: next, updated_at: new Date().toISOString() })
        if (error) toast(`Erro ao salvar configurações: ${error.message}`, true)
      } else {
        lsSet(LS_SETTINGS, next)
      }
    },
    [settings, session, toast],
  )

  const demo = useMemo(() => (settings.demoMode ? demoLeads() : null), [settings.demoMode])
  const leads = demo ?? realLeads

  const openLead = useCallback(
    (lead: Lead | null) => {
      if (lead && !lead.id.startsWith('tmp-')) {
        setDrawer(leads.find((l) => l.id === lead.id) ?? lead)
      } else setDrawer(lead)
    },
    [leads],
  )

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
    setRealLeads([])
  }, [])

  const value: Store = {
    mode, session, authReady, loading, leads, realLeads, settings,
    saveLeads, updateLead, deleteLeads, saveSettings, toast, toasts, drawer, openLead, signOut,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore fora do provider')
  return s
}
