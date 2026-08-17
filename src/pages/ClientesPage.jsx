import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import * as mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { Document, Packer, Table, TableRow, TableCell, TextRun, convertInchesToTwip } from 'docx'
import { saveAs } from 'file-saver'

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export default function ClientesPage({ user, onToast }) {
  const fileInputRef = useRef(null)
  const [clientes, setClientes]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [modal, setModal]         = useState(null) // null | 'nuevo' | 'importar' | 'exportar' | { cliente }
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({ nombre: '', telefono: '', direccion: '', cedula: '', numero_pedido: '' })
  const [importData, setImportData] = useState(null)
  const [columnMapping, setColumnMapping] = useState({})
  const [importingRows, setImportingRows] = useState(false)
  const [exportando, setExportando] = useState(false)

  useEffect(() => { 
    if (user?.id) {
      cargarClientes()
    }
  }, [user?.id])

  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data)
        },
        error: (error) => reject(error)
      })
    })
  }

  const parseXLSX = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const worksheet = workbook.Sheets[workbook.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          resolve(rows)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('Error al leer archivo'))
      reader.readAsArrayBuffer(file)
    })
  }

  const parseWord = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: e.target.result })
          // Parsear tabla simple del Word
          const lines = result.value.split('\n').filter(l => l.trim())
          const rows = lines.map(line => 
            line.split('\t').map(cell => cell.trim()).filter(c => c)
          )
          resolve(rows)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('Error al leer archivo'))
      reader.readAsArrayBuffer(file)
    })
  }

  const parsePDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const rows = []
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map(item => item.str).join(' ')
      
      // Buscar patrones comunes (nombre, teléfono, cédula)
      const lines = pageText.split(/[\n|•\-]/).filter(l => l.trim())
      rows.push(...lines)
    }
    
    return rows.map(r => [r.trim()])
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      let rows = []
      const ext = file.name.split('.').pop().toLowerCase()

      if (ext === 'csv') {
        rows = await parseCSV(file)
      } else if (['xlsx', 'xls'].includes(ext)) {
        rows = await parseXLSX(file)
      } else if (ext === 'docx') {
        rows = await parseWord(file)
      } else if (ext === 'pdf') {
        rows = await parsePDF(file)
      } else {
        onToast('Formato de archivo no soportado', 'error')
        return
      }

      if (rows.length === 0) {
        onToast('El archivo no contiene datos', 'error')
        return
      }

      setImportData({ rows, fileName: file.name })
      setModal('importar')
      
      // Auto-mapeo de columnas por coincidencia de nombre
      const firstRow = rows[0] || []
      const mapping = {}
      const headers = ['Nombre', 'nombre', 'Name', 'Cliente', 'cliente', 'Teléfono', 'telefono', 'Phone', 'Cédula', 'cedula', 'DNI', 'Dirección', 'direccion', 'Address']
      
      firstRow.forEach((col, idx) => {
        const colStr = String(col).toLowerCase()
        if (colStr.includes('nombre') || colStr === 'name' || colStr === 'cliente') mapping[idx] = 'nombre'
        else if (colStr.includes('telefono') || colStr === 'phone' || colStr.includes('teléfono')) mapping[idx] = 'telefono'
        else if (colStr.includes('cedula') || colStr === 'dni') mapping[idx] = 'cedula'
        else if (colStr.includes('direccion') || colStr === 'address') mapping[idx] = 'direccion'
        else if (colStr.includes('pedido') || colStr.includes('order')) mapping[idx] = 'numero_pedido'
      })
      
      setColumnMapping(mapping)
    } catch (error) {
      console.error(error)
      onToast('Error al leer archivo: ' + error.message, 'error')
    }
    
    e.target.value = ''
  }

  const guardarImportados = async () => {
    if (!importData || Object.keys(columnMapping).length === 0) return

    if (!Object.values(columnMapping).includes('nombre')) {
      onToast('Debes mapear una columna como "Nombre" antes de importar', 'error')
      return
    }

    setImportingRows(true)
    const { rows } = importData
    let importados = 0
    let errores = 0
    let vacias = 0

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.every(cell => !String(cell || '').trim())) { vacias++; continue }

      const cliente = {
        nombre: '',
        telefono: '',
        cedula: '',
        direccion: '',
        numero_pedido: '',
        user_id: user.id
      }

      Object.entries(columnMapping).forEach(([colIdx, field]) => {
        if (row[colIdx] !== undefined && row[colIdx] !== null && String(row[colIdx]).trim() !== '') {
          cliente[field] = String(row[colIdx]).trim()
        }
      })

      if (!cliente.nombre) { errores++; continue }

      const { error } = await supabase.from('clientes').insert(cliente)
      if (error) { console.error(error); errores++ }
      else importados++
    }

    setImportingRows(false)
    const detalle = vacias > 0 ? ` (${vacias} fila${vacias !== 1 ? 's' : ''} vacía${vacias !== 1 ? 's' : ''} ignorada${vacias !== 1 ? 's' : ''})` : ''
    onToast(`Importados: ${importados}, Errores: ${errores}${detalle}`, importados > 0 ? 'success' : 'error')
    cargarClientes()
    cerrar()
  }

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
    setForm({ nombre: '', telefono: '', direccion: '', cedula: '', numero_pedido: '' })
    setModal('nuevo')
  }

  const abrirImportar = () => {
    fileInputRef.current?.click()
  }

  const abrirExportar = () => {
    setModal('exportar')
  }

  const exportarCSV = () => {
    setExportando(true)
    try {
      const csv = Papa.unparse(clientes.map(c => ({
        Nombre: c.nombre,
        Teléfono: c.telefono || '',
        Cédula: c.cedula || '',
        Dirección: c.direccion || ''
      })))
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      saveAs(blob, `clientes_${new Date().toISOString().split('T')[0]}.csv`)
      onToast('Clientes exportados a CSV', 'success')
    } catch (error) {
      onToast('Error al exportar CSV', 'error')
    }
    setExportando(false)
    cerrar()
  }

  const exportarExcel = () => {
    setExportando(true)
    try {
      const ws = XLSX.utils.json_to_sheet(clientes.map(c => ({
        Nombre: c.nombre,
        Teléfono: c.telefono || '',
        Cédula: c.cedula || '',
        Dirección: c.direccion || ''
      })))
      
      ws['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 30 }
      ]
      
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
      XLSX.writeFile(wb, `clientes_${new Date().toISOString().split('T')[0]}.xlsx`)
      onToast('Clientes exportados a Excel', 'success')
    } catch (error) {
      onToast('Error al exportar Excel', 'error')
    }
    setExportando(false)
    cerrar()
  }

  const exportarPDF = () => {
    setExportando(true)
    try {
      const doc = new jsPDF()
      const tableColumn = ['Nombre', 'Teléfono', 'Cédula', 'Dirección']
      const tableRows = clientes.map(c => [
        c.nombre,
        c.telefono || '',
        c.cedula || '',
        c.direccion || ''
      ])

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 10,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [51, 102, 77], textColor: 255, fontStyle: 'bold' },
        margin: { top: 10 }
      })

      doc.text('Registro de Clientes', 10, 10)
      doc.save(`clientes_${new Date().toISOString().split('T')[0]}.pdf`)
      onToast('Clientes exportados a PDF', 'success')
    } catch (error) {
      onToast('Error al exportar PDF', 'error')
    }
    setExportando(false)
    cerrar()
  }

  const exportarWord = async () => {
    setExportando(true)
    try {
      const rows = clientes.map(c => 
        new TableRow({
          children: [
            new TableCell({
              children: [new TextRun(c.nombre || '')],
              width: { size: 2000, type: 'dxa' }
            }),
            new TableCell({
              children: [new TextRun(c.telefono || '')],
              width: { size: 1500, type: 'dxa' }
            }),
            new TableCell({
              children: [new TextRun(c.cedula || '')],
              width: { size: 1500, type: 'dxa' }
            }),
            new TableCell({
              children: [new TextRun(c.direccion || '')],
              width: { size: 2000, type: 'dxa' }
            })
          ]
        })
      )

      const table = new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new TextRun({text: 'Nombre', bold: true})],
                width: { size: 2000, type: 'dxa' }
              }),
              new TableCell({
                children: [new TextRun({text: 'Teléfono', bold: true})],
                width: { size: 1500, type: 'dxa' }
              }),
              new TableCell({
                children: [new TextRun({text: 'Cédula', bold: true})],
                width: { size: 1500, type: 'dxa' }
              }),
              new TableCell({
                children: [new TextRun({text: 'Dirección', bold: true})],
                width: { size: 2000, type: 'dxa' }
              })
            ]
          }),
          ...rows
        ]
      })

      const doc = new Document({
        sections: [{
          children: [
            new (require('docx').Paragraph)({
              text: 'Registro de Clientes',
              bold: true,
              size: 24
            }),
            new (require('docx').Paragraph)({ text: '' }),
            table
          ]
        }]
      })

      const blob = await Packer.toBlob(doc)
      saveAs(blob, `clientes_${new Date().toISOString().split('T')[0]}.docx`)
      onToast('Clientes exportados a Word', 'success')
    } catch (error) {
      console.error(error)
      onToast('Error al exportar Word', 'error')
    }
    setExportando(false)
    cerrar()
  }

  const abrirEditar = (c) => {
    setForm({ nombre: c.nombre, telefono: c.telefono || '', direccion: c.direccion || '', cedula: c.cedula || '', numero_pedido: c.numero_pedido || '' })
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
        numero_pedido: form.numero_pedido.trim(),
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
          numero_pedido: form.numero_pedido.trim(),
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

  const filtrados = clientes.filter(c => {
    if (!busqueda.trim()) return true
    const busquedaLower = busqueda.toLowerCase().trim()
    return (
      (c.nombre || '').toLowerCase().includes(busquedaLower) ||
      (c.telefono || '').toLowerCase().includes(busquedaLower) ||
      (c.cedula || '').toLowerCase().includes(busquedaLower) ||
      (c.direccion || '').toLowerCase().includes(busquedaLower)
    )
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{width:'auto'}} onClick={abrirExportar} disabled={clientes.length === 0}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exportar clientes
          </button>
          <button className="btn btn-primary" style={{width:'auto'}} onClick={abrirImportar}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Importar clientes
          </button>
          <button className="btn btn-primary" style={{width:'auto'}} onClick={abrirNuevo}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nuevo cliente
          </button>
        </div>
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
      <input 
        ref={fileInputRef} 
        type="file" 
        accept=".csv,.xlsx,.xls,.docx,.pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {modal && modal !== 'importar' && (
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
              <div className="field">
                <label>Número de pedido</label>
                <input value={form.numero_pedido} onChange={e => setForm(p=>({...p,numero_pedido:e.target.value}))} placeholder="N pedido" />
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

      {/* Modal de Importación */}
      {modal === 'importar' && importData && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && cerrar()}>
          <div className="modal" style={{ maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 className="modal-title">Importar clientes desde {importData.fileName}</h2>
            
            <p style={{ marginBottom: 16, opacity: 0.8 }}>
              Mapea las columnas del archivo con los campos de clientes:
            </p>

            <div style={{ backgroundColor: 'var(--surface-2)', padding: 16, borderRadius: 8, marginBottom: 20, overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    {importData.rows[0]?.map((col, idx) => (
                      <th key={idx} style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <select 
                          value={columnMapping[idx] || ''}
                          onChange={(e) => {
                            const newMapping = { ...columnMapping }
                            if (e.target.value) newMapping[idx] = e.target.value
                            else delete newMapping[idx]
                            setColumnMapping(newMapping)
                          }}
                          style={{
                            padding: 4,
                            borderRadius: 4,
                            border: '1px solid var(--border)',
                            fontSize: 'inherit',
                            width: '100%'
                          }}
                        >
                          <option value="">— Sin mapear</option>
                          <option value="nombre">Nombre *</option>
                          <option value="telefono">Teléfono</option>
                          <option value="cedula">Cédula</option>
                          <option value="direccion">Dirección</option>
                          <option value="numero_pedido">Número de pedido</option>
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importData.rows.slice(1, 6).map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
                          {String(cell || '').substring(0, 30)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {importData.rows.length > 6 && (
                <p style={{ marginTop: 8, opacity: 0.6, fontSize: '0.8rem' }}>
                  ... y {importData.rows.length - 6} filas más
                </p>
              )}
            </div>

            <div style={{ 
              padding: 12, 
              backgroundColor: 'var(--surface-2)', 
              borderRadius: 8, 
              marginBottom: 20,
              display: 'flex',
              gap: 8,
              alignItems: 'center'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontSize: '0.9rem' }}>
                Se importarán {importData.rows.length - 1} cliente{importData.rows.length - 1 !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={cerrar} disabled={importingRows}>
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{width:'auto'}}
                onClick={guardarImportados}
                disabled={importingRows || Object.keys(columnMapping).length === 0}
              >
                {importingRows ? <span className="spinner" /> : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exportación */}
      {modal === 'exportar' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && cerrar()}>
          <div className="modal">
            <h2 className="modal-title">Exportar clientes</h2>
            
            <p style={{ marginBottom: 20, opacity: 0.8 }}>
              Elige el formato en que deseas exportar tus {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}:
            </p>

            <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}
                onClick={exportarCSV}
                disabled={exportando}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                </svg>
                Exportar como CSV
              </button>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}
                onClick={exportarExcel}
                disabled={exportando}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                </svg>
                Exportar como Excel
              </button>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={cerrar} disabled={exportando}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}