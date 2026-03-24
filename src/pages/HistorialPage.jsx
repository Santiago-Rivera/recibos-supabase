import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import VistaRecibo from '../components/VistaRecibo'

function fmtFecha(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

function fmtMonto(val) {
  const n = parseFloat(String(val).replace(/[$\s]/g, ''))
  return isNaN(n) ? val : `$${n.toFixed(2)}`
}

export default function HistorialPage({ user }) {
  const [recibos, setRecibos]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [viendo, setViendo]     = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('recibos')
      .select('*, clientes(nombre, telefono)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setRecibos(data || [])
    setLoading(false)
  }

  const filtrados = recibos.filter(r => {
    const q = busqueda.toLowerCase()
    return (
      (r.clientes?.nombre || '').toLowerCase().includes(q) ||
      r.serial.toLowerCase().includes(q) ||
      (r.obra || '').toLowerCase().includes(q)
    )
  })

  // Convertir recibo de DB a formato del componente VistaRecibo
  const abrirRecibo = (r) => {
    setViendo({
      serial:             r.serial,
      empresa:            r.empresa,
      cliente:            r.clientes?.nombre || '',
      fechaEmision:       r.fecha_emision,
      saldoAnterior:      r.saldo_anterior,
      abono:              r.abono,
      saldoActual:        r.saldo_actual,
      proximoCobro:       r.proximo_cobro,
      numeroCuotas:       r.numero_cuotas,
      obra:               r.obra,
      banco:              r.banco,
      numeroTransaccion:  r.numero_transaccion,
      fechaPago:          r.fecha_pago,
      cobrador:           r.cobrador,
    })
  }

  if (viendo) {
    return <VistaRecibo datos={viendo} onVolver={() => setViendo(null)} volverLabel="← Volver al historial" />
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Historial de Recibos</h1>
          <p>{recibos.length} recibo{recibos.length !== 1 ? 's' : ''} generado{recibos.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="search-wrapper">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input className="search-input" placeholder="Buscar por cliente, serial u obra..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40 }}><span className="spinner dark" /></div>
      ) : filtrados.length === 0 ? (
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
          </svg>
          <p>{busqueda ? 'Sin resultados.' : 'Aún no has generado recibos.'}</p>
        </div>
      ) : (
        filtrados.map(r => (
          <div key={r.id} className="recibo-item" onClick={() => abrirRecibo(r)}>
            <div className="recibo-item-left">
              <h4>{r.clientes?.nombre || 'Cliente'}</h4>
              <p>{r.serial} · {r.obra}</p>
            </div>
            <div className="recibo-item-right">
              <div className="recibo-item-monto">{fmtMonto(r.abono)}</div>
              <div className="recibo-item-fecha">{fmtFecha(r.fecha_emision)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
