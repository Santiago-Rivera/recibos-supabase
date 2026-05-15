import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import VistaRecibo from '../components/VistaRecibo'

const SERIAL_KEY = 'recibo_serial_v2'

function obtenerProximoSerial() {
  const actual = parseInt(localStorage.getItem(SERIAL_KEY) || '0', 10)
  const nuevo  = actual + 1
  localStorage.setItem(SERIAL_KEY, String(nuevo))
  return `REC-${String(nuevo).padStart(4, '0')}`
}

const hoy = () => new Date().toISOString().split('T')[0]

const formVacio = {
  empresa: 'Tiempo para Dios',
  fechaEmision: hoy(),
  saldoAnterior: '', abono: '', saldoActual: '',
  proximoCobro: hoy(), numeroCuotas: '',
  obra: '',
  banco: '', numeroTransaccion: '', fechaPago: hoy(),
  cobrador: 'Oficina de Cobranza Guayaquil',
}

export default function NuevoReciboPage({ user, onToast }) {
  const [form, setForm]               = useState(formVacio)
  const [clienteSeleccionado, setCliente] = useState(null)
  const [busqueda, setBusqueda]       = useState('')
  const [resultados, setResultados]   = useState([])
  const [showDrop, setShowDrop]       = useState(false)
  const [searching, setSearching]     = useState(false)
  const [reciboGenerado, setRecibo]   = useState(null)
  const [saving, setSaving]           = useState(false)
  const [errores, setErrores]         = useState({})
  const [serialManual, setSerialManual] = useState(() => {
    const actual = parseInt(localStorage.getItem(SERIAL_KEY) || '0', 10)
    return `REC-${String(actual + 1).padStart(4, '0')}`
  })
  const dropRef = useRef(null)

  // Cerrar dropdown al click fuera
  useEffect(() => {
    const fn = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // Calcular saldoActual automáticamente
  useEffect(() => {
    const saldoAnterior = parseFloat(form.saldoAnterior) || 0
    const abono = parseFloat(form.abono) || 0
    const resultado = saldoAnterior - abono
    setForm(p => ({ ...p, saldoActual: resultado.toString() }))
  }, [form.saldoAnterior, form.abono])

  // Buscar clientes al escribir
  useEffect(() => {
    if (!busqueda.trim() || clienteSeleccionado) return
    const t = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', user.id)
        .ilike('nombre', `%${busqueda}%`)
        .limit(8)
      setResultados(data || [])
      setShowDrop(true)
      setSearching(false)
    }, 280)
    return () => clearTimeout(t)
  }, [busqueda, user.id])

  const seleccionarCliente = (c) => {
    setCliente(c)
    setBusqueda(c.nombre)
    setShowDrop(false)
    setErrores(p => ({ ...p, cliente: null }))
  }

  const limpiarCliente = () => {
    setCliente(null)
    setBusqueda('')
    setResultados([])
  }

  const actualizarSerial = (nuevoSerial) => {
    // Extraer solo los números del serial (ej: "REC-0005" -> "5")
    const numeros = nuevoSerial.replace(/\D/g, '')
    if (numeros) {
      const numero = parseInt(numeros, 10)
      // Guardar el número anterior en localStorage para que el próximo se incremente desde aquí
      localStorage.setItem(SERIAL_KEY, String(numero - 1))
      // Mostrar el serial formateado
      setSerialManual(`REC-${String(numero).padStart(4, '0')}`)
    }
  }

  const update = (e) => {
    const { name, value } = e.target
    let valorFinal = value
    
    // Normalizar fechas a formato YYYY-MM-DD
    if (name === 'fechaEmision' || name === 'proximoCobro' || name === 'fechaPago') {
      // Si viene en formato DD/MM/YYYY, convertir a YYYY-MM-DD
      if (value && value.includes('/')) {
        const [dia, mes, anio] = value.split('/')
        valorFinal = `${anio}-${mes}-${dia}`
      }
    }
    
    setForm(p => ({ ...p, [name]: valorFinal }))
    if (errores[name]) setErrores(p => ({ ...p, [name]: null }))
  }

  const validar = () => {
    const req = ['empresa','fechaEmision','saldoAnterior','abono','saldoActual','proximoCobro','numeroCuotas','obra','banco','numeroTransaccion','fechaPago','cobrador']
    const errs = {}
    if (!clienteSeleccionado) errs.cliente = 'Selecciona un cliente'
    req.forEach(k => { if (!form[k]?.trim()) errs[k] = 'Requerido' })
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  const validarTransaccionUnica = async () => {
    try {
      // Buscar si el número de transacción ya existe en la base de datos (solo del usuario actual)
      const { data, error } = await supabase
        .from('recibos')
        .select('cliente_id')
        .eq('user_id', user.id)
        .eq('numero_transaccion', form.numeroTransaccion)
        .single()

      if (data) {
        // El número de transacción ya existe, obtener el nombre del cliente
        const { data: cliente } = await supabase
          .from('clientes')
          .select('nombre')
          .eq('id', data.cliente_id)
          .single()

        const nombreCliente = cliente?.nombre || 'desconocido'
        setErrores(p => ({ 
          ...p, 
          numeroTransaccion: `Número de transacción repetido porque ya lo tiene el cliente: ${nombreCliente}` 
        }))
        return false
      }
      return true
    } catch (err) {
      // Si no encuentra nada, la transacción es única (el error es esperado)
      return true
    }
  }

  const handleGenerar = async (e) => {
    e.preventDefault()
    if (!validar()) return
    
    setSaving(true)
    
    // Validar que el número de transacción sea único
    const transaccionUnica = await validarTransaccionUnica()
    if (!transaccionUnica) {
      setSaving(false)
      return
    }

    // Extraer el número del serialManual y guardarlo en localStorage
    const numeros = serialManual.replace(/\D/g, '')
    const numeroSerial = parseInt(numeros, 10)
    localStorage.setItem(SERIAL_KEY, String(numeroSerial))

    const serial = serialManual
    const datos  = { ...form, serial, cliente: clienteSeleccionado.nombre, clienteId: clienteSeleccionado.id }

    // Guardar en Supabase - Desactivado temporalmente
    // const { error } = await supabase.from('recibos').insert({
    //   user_id:            user.id,
    //   cliente_id:         clienteSeleccionado.id,
    //   serial,
    //   empresa:            form.empresa,
    //   fecha_emision:      form.fechaEmision,
    //   saldo_anterior:     form.saldoAnterior,
    //   abono:              form.abono,
    //   saldo_actual:       form.saldoActual,
    //   proximo_cobro:      form.proximoCobro,
    //   numero_cuotas:      form.numeroCuotas,
      obra:               form.obra,
    //  banco:              form.banco,
    //  numero_transaccion: form.numeroTransaccion,
    // fecha_pago:         form.fechaPago,
    // cobrador:           form.cobrador,
    //})

    //if (error) {
    //  onToast('Error al guardar el recibo', 'error')
    //  setSaving(false)
    //  return
    //}

    onToast(`Recibo ${serial} guardado`, 'success')
    setRecibo(datos)
    // Actualizar el siguiente serial
    const siguiente = numeroSerial + 1
    setSerialManual(`REC-${String(siguiente).padStart(4, '0')}`)
    setSaving(false)
  }

  const handleNuevo = () => {
    setRecibo(null)
    setForm(formVacio)
    limpiarCliente()
    // Mostrar el siguiente serial
    const actual = parseInt(localStorage.getItem(SERIAL_KEY) || '0', 10)
    setSerialManual(`REC-${String(actual + 1).padStart(4, '0')}`)
  }

  // ─── Vista del recibo generado ───────────────────
  if (reciboGenerado) {
    return <VistaRecibo datos={reciboGenerado} onVolver={handleNuevo} />
  }

  // ─── Formulario ──────────────────────────────────
  const field = (name, label, type = 'text', placeholder = '') => (
    <div className="field">
      <label>{label}</label>
      <input type={type} name={name} value={form[name]} onChange={update}
        placeholder={placeholder}
        className={errores[name] ? 'err' : ''}
      />
      {errores[name] && <span className="err-msg">{errores[name]}</span>}
    </div>
  )

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="page-header">
        <div>
          <h1>Nuevo Recibo</h1>
          <p>Busca el cliente y llena los datos del pago</p>
        </div>
      </div>

      <form onSubmit={handleGenerar} noValidate>

        {/* Empresa */}
        <div className="card">
          <p className="card-title">Empresa</p>
          <div className="field">
            <label>Nombre de la empresa</label>
            <input name="empresa" value={form.empresa} onChange={update} className={errores.empresa ? 'err' : ''} />
            {errores.empresa && <span className="err-msg">{errores.empresa}</span>}
          </div>
        </div>

        {/* Cliente con búsqueda */}
        <div className="card">
          <p className="card-title">Cliente</p>
          <div className="field">
            <label>Buscar cliente</label>
            <div ref={dropRef} style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <svg style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', pointerEvents:'none' }}
                  width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); if (clienteSeleccionado) limpiarCliente() }}
                  onFocus={() => { if (resultados.length > 0) setShowDrop(true) }}
                  placeholder="Escribe el nombre del cliente..."
                  style={{ paddingLeft: 38, paddingRight: clienteSeleccionado ? 38 : 12 }}
                  className={errores.cliente ? 'err' : ''}
                  autoComplete="off"
                />
                {clienteSeleccionado && (
                  <button type="button" onClick={limpiarCliente}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-2)', fontSize:'1.1rem', lineHeight:1 }}>
                    ×
                  </button>
                )}
              </div>

              {showDrop && !clienteSeleccionado && (
                <div className="search-dropdown">
                  {searching ? (
                    <div className="search-empty"><span className="spinner dark" style={{width:14,height:14}} /></div>
                  ) : resultados.length === 0 ? (
                    <div className="search-empty">Sin resultados. ¿Quieres <a href="#" onClick={e=>{e.preventDefault()}} style={{color:'var(--accent)'}}>crear este cliente</a>?</div>
                  ) : resultados.map(c => (
                    <div key={c.id} className="search-option" onClick={() => seleccionarCliente(c)}>
                      <span className="search-option-name">{c.nombre}</span>
                      <span className="search-option-meta">{c.telefono || ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errores.cliente && <span className="err-msg">{errores.cliente}</span>}
            {clienteSeleccionado && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--accent-lt)', borderRadius: 6, fontSize: '0.82rem', color: 'var(--accent)', display:'flex', gap:6, alignItems:'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {clienteSeleccionado.nombre}
                {clienteSeleccionado.telefono && <span style={{color:'var(--text-2)', marginLeft:4}}>{clienteSeleccionado.telefono}</span>}
              </div>
            )}
          </div>
          <div className="grid-2">
            {field('fechaEmision', 'Fecha de emisión', 'date')}
            <div className="field">
              <label>Número de recibo</label>
              <input type="text" value={serialManual} onChange={e => actualizarSerial(e.target.value)} placeholder="REC-0001" />
            </div>
          </div>
        </div>

        {/* Pago */}
        <div className="card">
          <p className="card-title">Estado de Pago</p>
          <div className="grid-2">
            {field('saldoAnterior', 'Saldo anterior', 'text', '$ 0.00')}
            {field('abono', 'Abono', 'text', '$ 0.00')}
            {field('saldoActual', 'Saldo a esta fecha', 'text', '$ 0.00')}
            {field('proximoCobro', 'Próximo cobro', 'date')}
            {field('numeroCuotas', 'Número de cuotas', 'text', 'Ej: 3 de 12')}
          </div>
        </div>

        {/* Obra */}
        <div className="card">
          <p className="card-title">Artículo / Obra</p>
          <div className="field">
            <label>Descripción de la obra o artículo</label>
            <input name="obra" value={form.obra} onChange={update} placeholder="Ej: Cuadro al óleo 60x80cm" className={errores.obra ? 'err' : ''} />
            {errores.obra && <span className="err-msg">{errores.obra}</span>}
          </div>
        </div>

        {/* Comprobante */}
        <div className="card">
          <p className="card-title">Comprobante de Pago</p>
          <div className="grid-2">
            {field('banco', 'Banco donde pagó')}
            <div className="field">
              <label>N° de transacción</label>
              <input type="text" name="numeroTransaccion" value={form.numeroTransaccion} onChange={update}
                placeholder="N° de transacción"
                className={errores.numeroTransaccion ? 'err' : ''}
              />
              {errores.numeroTransaccion && <span className="err-msg" style={{ color: '#ef4444' }}>{errores.numeroTransaccion}</span>}
            </div>
            {field('fechaPago', 'Fecha de pago', 'date')}
          </div>
        </div>

        {/* Cobrador */}
        <div className="card">
          <p className="card-title">Responsable</p>
          <div className="field">
            <label>Cobrador</label>
            <input name="cobrador" value={form.cobrador} onChange={update} placeholder="Nombre del cobrador" className={errores.cobrador ? 'err' : ''} />
            {errores.cobrador && <span className="err-msg">{errores.cobrador}</span>}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginBottom: 32 }}>
          {saving ? <span className="spinner" /> : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
              </svg>
              Generar recibo
            </>
          )}
        </button>
      </form>
    </div>
  )
}
