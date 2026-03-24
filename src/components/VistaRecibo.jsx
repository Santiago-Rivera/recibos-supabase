import { useRef } from 'react'
import html2canvas from 'html2canvas'

function fmtFecha(str) {
  if (!str) return ''
  
  // Normalizar si viene en formato DD/MM/YYYY
  let parts = str.split('/')
  if (parts.length === 3 && parts[2].length === 4) {
    // Viene en DD/MM/YYYY, convertir a YYYY-MM-DD
    const [d, m, y] = parts
    str = `${y}-${m}-${d}`
  }
  
  // Ahora procesar formato YYYY-MM-DD
  const [y, m, d] = str.split('-')
  
  // Validar que tenemos los 3 componentes y son válidos
  if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) {
    return '' // Retornar vacío si está mal formado
  }
  
  return `${d}/${m}/${y}`
}

function fmtMonto(val) {
  const n = parseFloat(String(val).replace(/[$\s]/g, ''))
  return isNaN(n) ? val : `$${n.toFixed(2)}`
}

export default function VistaRecibo({ datos, onVolver, volverLabel = '← Nuevo recibo' }) {
  const {
    serial, empresa,
    cliente, fechaEmision,
    saldoAnterior, abono, saldoActual, proximoCobro, numeroCuotas,
    obra,
    banco, numeroTransaccion, fechaPago,
    cobrador,
  } = datos

  const reciboRef = useRef(null)

  const enviarWhatsApp = async () => {
    try {
      // Capturar el recibo como imagen
      const element = reciboRef.current
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        logging: false 
      })
      
      // Convertir canvas a blob
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `recibo-${serial}.png`, { type: 'image/png' })
        
        // Intentar usar la API de Share nativa (funciona muy bien con WhatsApp en móvil)
        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              title: `Recibo ${serial}`,
            })
          } catch (err) {
            console.error('Error al compartir:', err)
            // Si el usuario cancela, solo descargar
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `recibo-${serial}.png`
            link.click()
          }
        } else {
          // En navegadores sin soporte de Share, descargar la imagen y abrir WhatsApp
          const link = document.createElement('a')
          link.href = URL.createObjectURL(blob)
          link.download = `recibo-${serial}.png`
          link.click()
          
          // Abrir WhatsApp Web
          window.open('https://web.whatsapp.com', '_blank')
        }
      })
    } catch (error) {
      console.error('Error al capturar recibo:', error)
    }
  }

  const handleWhatsApp = () => {
    enviarWhatsApp()
  }

  return (
    <div className="recibo-wrap">
      <div className="recibo-actions-bar">
        <button className="btn btn-ghost" onClick={onVolver}>{volverLabel}</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{ width:'auto' }} onClick={() => window.print()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir recibo
          </button>
          <button className="btn-whatsapp" onClick={handleWhatsApp} style={{
            backgroundColor: "#25d366",
            padding: "10px 16px",
            borderRadius: "6px",
            border: "none",
            color: "white",
            fontWeight: "500",
            cursor: "pointer",
            fontSize: "14px",
            transition: "background-color 0.3s"
          }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#1fa857"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#25d366"}>
            WhatsApp
          </button>
        </div>
      </div>

      <div className="recibo-doc" ref={reciboRef}>

        {/* Cabecera */}
        <div className="recibo-head">
          <div className="rec-empresa">
            <h2>{empresa}</h2>
            <p>Tel: 0982392000</p>
          </div>
          <div className="rec-serial-box">
            <div className="rec-serial-label">Recibo N°</div>
            <div className="rec-serial-val">{serial}</div>
          </div>
        </div>

        {/* Cliente */}
        <div className="rec-section">
          <div className="rec-section-title">Cliente</div>
          <div className="rec-row"><span className="k">Nombre</span><span className="v">{cliente}</span></div>
          <div className="rec-row"><span className="k">Fecha de emisión</span><span className="v">{fmtFecha(fechaEmision)}</span></div>
        </div>

        {/* Obra */}
        <div className="rec-section">
          <div className="rec-section-title">Artículo / Obra</div>
          <div className="rec-row"><span className="k">Descripción</span><span className="v">{obra}</span></div>
        </div>

        {/* Pago */}
        <div className="rec-section">
          <div className="rec-section-title">Estado de Pago</div>
          <div className="rec-row"><span className="k">Saldo anterior</span><span className="v">{fmtMonto(saldoAnterior)}</span></div>
          <div className="rec-row hi"><span className="k">Abono realizado</span><span className="v">{fmtMonto(abono)}</span></div>
          <div className="rec-row"><span className="k">Saldo a esta fecha</span><span className="v">{fmtMonto(saldoActual)}</span></div>
          <div className="rec-row hi"><span className="k">Próximo cobro</span><span className="v">{fmtFecha(proximoCobro)}</span></div>
          <div className="rec-row"><span className="k">Cuotas</span><span className="v">{numeroCuotas}</span></div>
        </div>

        {/* Comprobante */}
        <div className="rec-section">
          <div className="rec-section-title">Comprobante de Pago</div>
          <div className="rec-row"><span className="k">Banco</span><span className="v">{banco}</span></div>
          <div className="rec-row"><span className="k">N° de transacción</span><span className="v" style={{ fontFamily:'var(--mono)', fontSize:'0.85rem' }}>{numeroTransaccion}</span></div>
          <div className="rec-row"><span className="k">Fecha de pago</span><span className="v">{fmtFecha(fechaPago)}</span></div>
        </div>

        {/* Cuentas */}
        <div className="rec-cuentas">
          <div className="rec-cuentas-title">Cuentas para depósito</div>
          <div className="rec-banco">
            <div>
              <span className="banco-name">Banco Pichincha</span>
              <span style={{ fontSize:'0.78rem', color:'var(--text-2)' }}> — Cuenta de ahorros</span>
            </div>
            <div className="banco-info">
              <span>5697500100</span>
              <span>A nombre de: Gustavo Rivera</span>
            </div>
          </div>
          <div className="rec-banco">
            <div>
              <span className="banco-name">Banco Guayaquil</span>
              <span style={{ fontSize:'0.78rem', color:'var(--text-2)' }}> — Cuenta de ahorros</span>
            </div>
            <div className="banco-info">
              <span>35605589</span>
              <span>A nombre de: Gustavo Rivera</span>
            </div>
          </div>
        </div>

        {/* Aviso */}
        <div className="rec-aviso">
          Si usted no cancela dentro de la fecha indicada su cuenta tendrá un recargo de 8 dólares
          adicionales favor comunicarse si tiene algún inconveniente para evitar dicho recargo.
          <br /><strong>DIOS LOS BENDIGA</strong>
        </div>

        {/* Footer */}
        <div className="rec-footer">
          <div>Generado el {new Date().toLocaleDateString('es-EC', { day:'2-digit', month:'long', year:'numeric' })}</div>
          <div className="firma-box">
            <div className="firma-line" />
            <div className="firma-name">{cobrador}</div>
            <div style={{ fontSize:'0.75rem', color:'var(--text-2)' }}>Cobrador</div>
          </div>
        </div>
      </div>
    </div>
  )
}
