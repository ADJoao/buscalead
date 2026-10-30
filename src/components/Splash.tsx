import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

const STEPS = ['Conectando', 'Carregando seus leads', 'Montando o painel']

/**
 * Tela de abertura: mostra o carregamento e, quando os dados chegam,
 * o "Boa tarde, João." no centro antes de abrir o app.
 */
export function Splash({ ready, name, onDone }: { ready: boolean; name?: string; onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [minDone, setMinDone] = useState(false)
  const [hello, setHello] = useState(false)
  const [out, setOut] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 450)
    const m = setTimeout(() => setMinDone(true), 900)
    return () => {
      clearInterval(t)
      clearTimeout(m)
    }
  }, [])

  // dados prontos: mostra a saudação, segura um pouco e sai
  useEffect(() => {
    if (ready && minDone) setHello(true)
  }, [ready, minDone])

  useEffect(() => {
    if (!hello) return
    const a = setTimeout(() => setOut(true), 1500)
    const b = setTimeout(onDone, 2050)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [hello, onDone])

  const first = name?.trim().split(/\s+/)[0]
  const pct = hello ? 100 : Math.min(85, 25 + step * 30)

  return (
    <div className={`splash ${out ? 'out' : ''}`} onClick={() => hello && onDone()} role="status" aria-live="polite">
      <div className="splash-inner">
        <div className="splash-logo">
          <span className="orbit" />
          <span className="orbit two" />
          {!hello && <span className="ping" />}
          <div className="core"><Search size={30} strokeWidth={2.8} /></div>
        </div>
        <div className="splash-hello">{hello && <span key="h">{greeting()}{first ? `, ${first}` : ''}.</span>}</div>
        <div className="splash-sub">{hello ? 'Seu funil está pronto.' : ''}</div>
        <div className="col" style={{ alignItems: 'center', gap: 10 }}>
          <div className="splash-bar"><i style={{ width: `${pct}%` }} /></div>
          <div className="splash-status">{hello ? 'Tudo pronto' : `${STEPS[step]}…`}</div>
        </div>
      </div>
    </div>
  )
}
