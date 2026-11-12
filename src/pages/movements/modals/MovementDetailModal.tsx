import type { MovementLog } from '../types'

interface MovementDetailModalProps {
  movement: MovementLog | null
  onClose: () => void
}

export function MovementDetailModal({ movement, onClose }: MovementDetailModalProps) {
  if (!movement) return null

  const isOutside = movement.destino_almacen === null && (movement.tipo === 'DESPACHO_COMPLETO' || movement.tipo === 'RETIRO_PARCIAL')
  const isTransfer = movement.destino_almacen !== null

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="movement-detail-title">
      <div className="modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Cabecera del modal */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-brand)',
                  background: 'var(--color-brand-soft)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid rgba(22, 125, 141, 0.25)'
                }}
              >
                Kardex ID #{movement.id_movimiento}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: isOutside ? 'rgba(179, 64, 42, 0.08)' : isTransfer ? 'var(--color-brand-soft)' : 'rgba(55, 48, 163, 0.1)',
                  color: isOutside ? 'var(--color-danger)' : isTransfer ? 'var(--color-brand)' : '#3730A3',
                  border: `1px solid ${isOutside ? 'rgba(179, 64, 42, 0.25)' : isTransfer ? 'rgba(22, 125, 141, 0.25)' : 'rgba(55, 48, 163, 0.25)'}`
                }}
              >
                {isOutside ? 'Salida definitiva fuera de sede' : isTransfer ? 'Transferencia interalmacén' : movement.tipo}
              </span>
            </div>
            <h3 id="movement-detail-title" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--color-text-primary)' }}>
              Detalle de auditoría de movimiento
            </h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar modal">
            ✕
          </button>
        </div>

        {/* Cuerpo del modal con fichas estructuradas */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Ficha 1: Producto y Unidades */}
          <div
            style={{
              background: 'var(--color-canvas)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '14px 16px'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
              Artículo y cantidad operada
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span className="sku-badge" style={{ marginRight: '6px' }}>{movement.producto?.sku || 'N/A'}</span>
                <strong style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  {movement.producto?.nombre || 'Producto no especificado'}
                </strong>
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: isOutside ? 'var(--color-danger)' : 'var(--color-brand)'
                }}
              >
                {Number(movement.cantidad_afectada).toLocaleString()} unid.
              </div>
            </div>
          </div>

          {/* Ficha 2: Trazabilidad de Sedes y Chip RFID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {/* Destino / Ubicación */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '12px 14px'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block' }}>
                Destino operativo
              </span>
              <div style={{ marginTop: '4px', fontSize: '13.5px', fontWeight: 600 }}>
                {isOutside ? (
                  <span style={{ color: 'var(--color-danger)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" x2="9" y1="12" y2="12" />
                    </svg>
                    Fuera de la empresa (Venta / Despacho)
                  </span>
                ) : movement.destino?.nombre ? (
                  <span style={{ color: 'var(--color-brand)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m16 3 4 4-4 4" />
                      <path d="M20 7H4" />
                      <path d="m8 21-4-4 4-4" />
                      <path d="M4 17h16" />
                    </svg>
                    {movement.destino.nombre}
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-text-secondary)' }}>Operación interna de almacén</span>
                )}
              </div>
            </div>

            {/* Tag RFID */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '12px 14px'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block' }}>
                Chip RFID involucrado
              </span>
              <div style={{ marginTop: '4px' }}>
                {movement.etiqueta_rfid?.uid_tag ? (
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--color-brand)',
                      background: 'var(--color-brand-soft)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(22, 125, 141, 0.2)'
                    }}
                  >
                    {movement.etiqueta_rfid.uid_tag}
                  </span>
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Sin chip tag asignado</span>
                )}
              </div>
            </div>
          </div>

          {/* Ficha 3: Justificación, Motivo y Fecha */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '12px 14px'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block' }}>
              Motivo y justificación asentada
            </span>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.45 }}>
              {movement.motivo || 'Sin motivo adicional especificado'}
            </p>

            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                Fecha y hora de registro:
              </span>
              <strong style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>
                {new Date(movement.fecha_hora).toLocaleString('es-PE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </strong>
            </div>
          </div>
        </div>

        {/* Pie del modal */}
        <div className="modal-footer">
          <button type="button" className="btn-detail" onClick={onClose}>
            Cerrar detalle
          </button>
        </div>
      </div>
    </div>
  )
}
