import { useState } from 'react'

export default function AuthPage({ onSignIn, onSignUp }) {
  const [tab, setTab]       = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [form, setForm]     = useState({ email: '', password: '', nombre: '' })

  const update = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    let result
    if (tab === 'login') {
      result = await onSignIn(form.email, form.password)
    } else {
      if (!form.nombre.trim()) { setError('Ingresa tu nombre.'); setLoading(false); return }
      result = await onSignUp(form.email, form.password, form.nombre)
      if (!result.error) {
        setError('')
        setTab('login')
        setForm(p => ({ ...p, password: '' }))
        setLoading(false)
        return
      }
    }
    if (result.error) setError(result.error.message)
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <path d="M2 10h20"/>
            </svg>
          </span>
          Recibos
        </div>

        <h1 className="auth-title">
          {tab === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
        </h1>
        <p className="auth-sub">
          {tab === 'login' ? 'Ingresa para gestionar tus recibos.' : 'Regístrate para empezar.'}
        </p>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab==='login'?'active':''}`} onClick={()=>{ setTab('login'); setError('') }}>Ingresar</button>
          <button className={`auth-tab ${tab==='register'?'active':''}`} onClick={()=>{ setTab('register'); setError('') }}>Registrarse</button>
        </div>

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <div className="field">
              <label>Nombre completo</label>
              <input name="nombre" type="text" value={form.nombre} onChange={update} placeholder="Tu nombre" required />
            </div>
          )}
          <div className="field">
            <label>Correo electrónico</label>
            <input name="email" type="email" value={form.email} onChange={update} placeholder="correo@ejemplo.com" required />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input name="password" type="password" value={form.password} onChange={update} placeholder="••••••••" required minLength={6} />
          </div>

          {error && (
            <div style={{ fontSize: '0.82rem', color: 'var(--danger)', background: 'var(--danger-lt)', padding: '10px 12px', borderRadius: '6px', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : tab === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>

        {tab === 'register' && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '14px', textAlign: 'center', lineHeight: 1.5 }}>
            Después de registrarte, confirma tu correo antes de ingresar.
          </p>
        )}
      </div>
    </div>
  )
}
