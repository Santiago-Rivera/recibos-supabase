import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ClientesPage({ user, onToast }) {
  const [clientes, setClientes]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [modal, setModal]         = useState(null) // null | 'nuevo' | { cliente }
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({ nombre: '', telefono: '', direccion: '', cedula: '' })

  useEffect(() => { cargarClientes() }, [])

  const cargarClientes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('user_id', user.id)
      .order('nombre')
    if (!error) setClientes(data)
    setLoading(false)
  }

  const abrirNuevo = () => {
    setForm({ nombre: '', telefono: '', direccion: '', cedula: '' })
    setModal('nuevo')
  }

  const abrirEditar = (c) => {
    setForm({ nombre: c.nombre, telefono: c.telefono || '', direccion: c.direccion || '', cedula: c.cedula || '' })
    setModal(c)
  }

  const cerrar = () => setModal(null)

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setSaving(true)

    if (modal === 'nuevo') {
      const { error } = await supabase.from('clientes').insert({
        user_id: user.id,
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        direccion: form.direccion.trim(),
        cedula: form.cedula.trim(),
      })
      if (error) { onToast('Error al guardar cliente', 'error') }
      else { onToast('Cliente creado', 'success'); cerrar(); cargarClientes() }
    } else {
      const { error } = await supabase.from('clientes')
        .update({
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim(),
          direccion: form.direccion.trim(),
          cedula: form.cedula.trim(),
        })
        .eq('id', modal.id)
      if (error) { onToast('Error al actualizar', 'error') }
      else { onToast('Cliente actualizado', 'success'); cerrar(); cargarClientes() }
    }
    setSaving(false)
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este cliente? También se eliminarán sus recibos.')) return
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) onToast('Error al eliminar', 'error')
    else { onToast('Cliente eliminado'); cargarClientes() }
  }

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.telefono || '').includes(busqueda) ||
    (c.cedula || '').includes(busqueda)
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" style={{width:'auto'}} onClick={abrirNuevo}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo cliente
        </button>
      </div>

      <div className="search-wrapper">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input className="search-input" placeholder="Buscar por nombre, teléfono o cédula..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <span className="spinner dark" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p>{busqueda ? 'No se encontraron clientes.' : 'Aún no tienes clientes. ¡Agrega el primero!'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Cédula</th>
                  <th>Dirección</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                    <td className="mono">{c.telefono || '—'}</td>
                    <td style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>{c.cedula || '—'}</td>
                    <td style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>{c.direccion || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Editar" onClick={() => abrirEditar(c)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Eliminar" onClick={() => eliminar(c.id)} style={{ color: 'var(--danger)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && cerrar()}>
          <div className="modal">
            <h2 className="modal-title">{modal === 'nuevo' ? 'Nuevo cliente' : 'Editar cliente'}</h2>
            <form onSubmit={guardar}>
              <div className="field">
                <label>Nombre completo *</label>
                <input value={form.nombre} onChange={e => setForm(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Juan Pérez" required />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Teléfono</label>
                  <input value={form.telefono} onChange={e => setForm(p=>({...p,telefono:e.target.value}))} placeholder="0999000000" />
                </div>
                <div className="field">
                  <label>Cédula</label>
                  <input value={form.cedula} onChange={e => setForm(p=>({...p,cedula:e.target.value}))} placeholder="1234567890" />
                </div>
              </div>
              <div className="field">
                <label>Dirección</label>
                <input value={form.direccion} onChange={e => setForm(p=>({...p,direccion:e.target.value}))} placeholder="Calle, ciudad" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{width:'auto'}} disabled={saving}>
                  {saving ? <span className="spinner" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
