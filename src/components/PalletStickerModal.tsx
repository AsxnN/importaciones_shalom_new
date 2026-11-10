import { useRef } from 'react'
import { BarcodeSVG } from './BarcodeSVG'

export interface PalletStickerData {
  almacenNombre: string
  empresa?: string
  tagRfid: string
  ordenNumero: string
  sku: string
  productoNombre: string
  cajas: number
  unidades: number
  cajasPorCamada?: number | null
  camadas?: number | null
  pesoTotalKg?: number | null
  pareto?: string | null
  fecha?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  data: PalletStickerData | null
}

export function PalletStickerModal({ isOpen, onClose, data }: Props) {
  const stickerRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !data) return null

  // Normalizar datos
  const empresa = data.empresa || 'SHALOM'
  const almacenNombre = (data.almacenNombre || 'ALMACÉN GENERAL').toUpperCase()
  const paretoText = data.pareto
    ? data.pareto.toUpperCase().includes('CLASE')
      ? data.pareto.toUpperCase()
      : `CLASE ${data.pareto.toUpperCase()}`
    : 'CLASE B'

  // Formato de fecha solo por el día (DD/MM/AAAA)
  let fechaSoloDia = data.fecha || ''
  if (fechaSoloDia) {
    if (fechaSoloDia.includes('T')) {
      fechaSoloDia = fechaSoloDia.split('T')[0]
    }
    if (fechaSoloDia.includes('-')) {
      const parts = fechaSoloDia.split('-')
      if (parts.length === 3) {
        // YYYY-MM-DD -> DD/MM/YYYY
        fechaSoloDia = `${parts[2]}/${parts[1]}/${parts[0]}`
      }
    }
  } else {
    const today = new Date()
    fechaSoloDia = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
  }

  // Estiba
  const estibaText =
    data.cajasPorCamada && data.camadas
      ? `${data.cajasPorCamada} cajas/camada · ${data.camadas} camadas`
      : 'Estiba estándar'

  // Peso
  const pesoText =
    data.pesoTotalKg !== undefined && data.pesoTotalKg !== null && data.pesoTotalKg > 0
      ? `${data.pesoTotalKg.toFixed(1)} kg`
      : 'Estándar'

  // Función para imprimir directamente
  const handlePrint = () => {
    if (!stickerRef.current) return

    const printContents = stickerRef.current.innerHTML

    // Crear un iframe invisible para aislar la impresión térmica
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) return

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Sticker Paleta - ${data.tagRfid}</title>
          <style>
            @page {
              size: 100mm 150mm;
              margin: 4mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #000;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sticker-card {
              border: 2px solid #000;
              border-radius: 4px;
              padding: 16px 20px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              height: 140mm;
              box-sizing: border-box;
            }
            .sticker-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 14px;
              font-weight: 800;
              padding-bottom: 10px;
              border-bottom: 2px solid #000;
              letter-spacing: 0.5px;
            }
            .sticker-body {
              display: flex;
              flex-direction: column;
              gap: 12px;
              padding: 14px 0;
              flex: 1;
            }
            .row-split {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
            }
            .tag-title {
              font-family: monospace;
              font-size: 24px;
              font-weight: 800;
              letter-spacing: 1px;
            }
            .order-title {
              font-size: 14px;
              font-weight: 700;
            }
            .sku-label {
              font-size: 15px;
              font-weight: 800;
            }
            .product-label {
              font-size: 14px;
              font-weight: 600;
              color: #111;
              line-height: 1.3;
            }
            .content-box {
              font-size: 14px;
              font-weight: 700;
            }
            .stack-box {
              font-size: 13px;
              color: #222;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              font-weight: 700;
              padding-top: 4px;
            }
            .sticker-footer {
              padding-top: 10px;
              border-top: 2px solid #000;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `)
    doc.close()

    iframe.contentWindow?.focus()
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 250)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          width: '90%',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="section-title" style={{ margin: 0, fontSize: '18px', color: 'var(--color-brand-deep)' }}>
              Rótulo de Paleta Térmico
            </h2>
            <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
              Vista previa para impresora de etiquetas estándar (10 × 15 cm).
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Vista previa exacta del Sticker */}
        <div
          ref={stickerRef}
          style={{
            background: '#FFFFFF',
            color: '#000000',
            border: '2px solid #000000',
            borderRadius: '4px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
          className="sticker-card"
        >
          {/* Cabecera: Almacén a la izquierda, SHALOM a la derecha */}
          <div
            className="sticker-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              fontWeight: 800,
              paddingBottom: '8px',
              borderBottom: '2px solid #000000',
              letterSpacing: '0.5px'
            }}
          >
            <span>{almacenNombre}</span>
            <span style={{ fontSize: '15px' }}>{empresa}</span>
          </div>

          {/* Cuerpo de Datos */}
          <div
            className="sticker-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '12px 0'
            }}
          >
            {/* TAG RFID y ORDEN */}
            <div className="row-split" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#444', display: 'block' }}>TAG RFID:</span>
                <span className="tag-title" style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 800 }}>
                  {data.tagRfid}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#444', display: 'block' }}>ORDEN:</span>
                <span className="order-title" style={{ fontSize: '13px', fontWeight: 700 }}>
                  {data.ordenNumero}
                </span>
              </div>
            </div>

            {/* SKU y PRODUCTO */}
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#444', display: 'block' }}>SKU:</span>
              <div className="sku-label" style={{ fontSize: '14px', fontWeight: 800 }}>
                {data.sku}
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#444', display: 'block', marginTop: '4px' }}>PRODUCTO:</span>
              <div className="product-label" style={{ fontSize: '13px', fontWeight: 600, color: '#111', lineHeight: '1.25' }}>
                {data.productoNombre}
              </div>
            </div>

            {/* CONTENIDO Y ESTIBA */}
            <div style={{ borderTop: '1px solid #E0E0E0', paddingTop: '8px' }}>
              <div className="content-box" style={{ fontSize: '13px', fontWeight: 700 }}>
                CONTENIDO: {data.cajas} cajas ({data.unidades.toLocaleString('es-PE')} unidades)
              </div>
              <div className="stack-box" style={{ fontSize: '12px', color: '#333', marginTop: '2px' }}>
                ESTIBA: {estibaText}
              </div>
            </div>

            {/* PESO, PARETO Y FECHA */}
            <div
              className="meta-row"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 700,
                borderTop: '1px solid #E0E0E0',
                paddingTop: '8px'
              }}
            >
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#444', display: 'block' }}>PESO:</span>
                <span>{pesoText}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#444', display: 'block' }}>PARETO:</span>
                <span>{paretoText}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#444', display: 'block' }}>FECHA:</span>
                <span>{fechaSoloDia}</span>
              </div>
            </div>
          </div>

          {/* Pie: Código de barras centrado */}
          <div
            className="sticker-footer"
            style={{
              paddingTop: '10px',
              borderTop: '2px solid #000000',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <BarcodeSVG value={data.tagRfid} height={50} moduleWidth={2} showText={true} />
          </div>
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="button secondary" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="button primary"
            onClick={handlePrint}
            style={{
              fontWeight: 600,
              padding: '8px 20px',
              background: 'var(--color-brand-deep)',
              borderColor: 'var(--color-brand-deep)'
            }}
          >
            Imprimir sticker
          </button>
        </div>
      </div>
    </div>
  )
}
