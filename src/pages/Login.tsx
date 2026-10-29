import { Search } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [signup, setSignup] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setErr('')
    const { error } = signup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (error) setErr(error.message)
    else if (signup) setErr('Conta criada. Se pedir confirmação, confira seu e-mail e depois entre.')
    setBusy(false)
  }

  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form className="glass glow pad" style={{ width: 'min(400px, 100%)', padding: 28 }} onSubmit={submit}>
        <div className="brand" style={{ padding: '0 0 22px' }}>
          <div className="brand-mark"><Search size={19} strokeWidth={2.8} /></div>
          <div><div className="brand-name">BuscaLead</div><div className="brand-sub">Seu CRM de prospecção</div></div>
        </div>
        <div className="col" style={{ gap: 12 }}>
          <label className="field"><span>E-mail</span><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          <label className="field"><span>Senha</span><input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signup ? 'new-password' : 'current-password'} /></label>
          {err && <div className="tag amber" style={{ height: 'auto', padding: '8px 10px', whiteSpace: 'normal' }}>{err}</div>}
          <button className="btn primary lg block" disabled={busy}>{signup ? 'Criar conta' : 'Entrar'}</button>
          <button type="button" className="btn ghost sm" onClick={() => setSignup((v) => !v)}>{signup ? 'Já tenho conta' : 'Primeiro acesso? Criar conta'}</button>
        </div>
      </form>
    </div>
  )
}
