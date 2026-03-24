import { useState, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import ClientesPage from './pages/ClientesPage'
import NuevoReciboPage from './pages/NuevoReciboPage'
import HistorialPage from './pages/HistorialPage'
import './index.css'

// ─── Toast system ─────────────────────────────────
let toastId = 0

function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type || ''}`}>{t.msg}</div>
      ))}
    </div>
  )
}

// ─── App ──────────────────────────────────────────
export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const [page, setPage]     = useState('nuevo')
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((msg, type = '') => {
    const id = ++toastId
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200)
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'grid', placeItems:'center' }}>
        <span className="spinner dark" style={{ width:28, height:28 }} />
      </div>
    )
  }

  if (!user) {
    return <AuthPage onSignIn={signIn} onSignUp={signUp} />
  }

  const nombre = user.user_metadata?.nombre || user.email

  return (
    <div className="app-layout">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="dot" />
          Recibos
        </div>
        <div className="topbar-right">
          <span className="topbar-user">{nombre}</span>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>Salir</button>
        </div>
      </header>

      <nav className="app-nav">
        <button className={`nav-link ${page==='nuevo'?'active':''}`}     onClick={() => setPage('nuevo')}>Nuevo recibo</button>
        <button className={`nav-link ${page==='clientes'?'active':''}`}  onClick={() => setPage('clientes')}>Clientes</button>
        <button className={`nav-link ${page==='historial'?'active':''}`} onClick={() => setPage('historial')}>Historial</button>
      </nav>

      <main className="app-content">
        {page === 'nuevo'    && <NuevoReciboPage user={user} onToast={addToast} />}
        {page === 'clientes' && <ClientesPage    user={user} onToast={addToast} />}
        {page === 'historial'&& <HistorialPage   user={user} />}
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
