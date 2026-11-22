import { KeyRound, Search } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [signup, setSignup] = useState(false)

  async function forgot() {
    if (!supabase) return
    if (!email.trim()) return setErr('Digite o seu e-mail acima e clique de novo em "Esqueci minha senha".')
    setBusy(true)
    setErr('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    setErr(error ? error.message : 'Enviei um link para o seu e-mail. Abra, clique no link e crie uma senha nova.')
    setBusy(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setErr('')
    const { error } = signup
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password })
    if (error) setErr(error.message)
    else if (signup) setErr('Conta criada. Se pedir confirmação, confira seu e-mail. Depois de clicar no link, volte aqui e use Entrar.')
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
          {!signup && <button type="button" className="btn ghost sm" onClick={forgot} disabled={busy}>Esqueci minha senha</button>}
          <button type="button" className="btn ghost sm" onClick={() => setSignup((v) => !v)}>{signup ? 'Já tenho conta' : 'Primeiro acesso? Criar conta'}</button>
        </div>
      </form>
    </div>
  )
}

/** Tela que aparece depois de clicar no link de recuperação enviado por e-mail. */
export function NewPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setErr('')
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) setErr(error.message)
    else onDone()
  }

  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form className="glass glow pad" style={{ width: 'min(400px, 100%)', padding: 28 }} onSubmit={submit}>
        <div className="row" style={{ gap: 10, marginBottom: 18 }}><KeyRound size={20} className="accent" /><b style={{ fontSize: 18 }}>Crie uma senha nova</b></div>
        <div className="col" style={{ gap: 12 }}>
          <label className="field"><span>Nova senha (mínimo 6 caracteres)</span>
            <input className="input" type="password" required minLength={6} autoFocus value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </label>
          {err && <div className="tag amber" style={{ height: 'auto', padding: '8px 10px', whiteSpace: 'normal' }}>{err}</div>}
          <button className="btn primary lg block" disabled={busy}>Salvar senha e entrar</button>
        </div>
      </form>
    </div>
  )
}
