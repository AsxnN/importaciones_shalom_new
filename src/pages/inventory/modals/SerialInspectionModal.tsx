import type { UnidadSerializada } from '../../products/types'
import type { ProductOption } from '../types'

type Props = {
  isOpen: boolean
  onClose: () => void
  inspectProd: { product: ProductOption; units: UnidadSerializada[] } | null
  warehouseName?: string
  onToggleUnitState: (unit: UnidadSerializada) => void
  updatingUnitState: boolean
  onOpenEnrollModal: (productId: number) => void
}

export function SerialInspectionModal({
  isOpen,
  onClose,
  inspectProd,
  warehouseName,
  onToggleUnitState,
  updatingUnitState,
  onOpenEnrollModal
}: Props) {
  if (!isOpen || !inspectProd) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Equipos serializados en sede</p>
            <h3>
              [{inspectProd.product.sku}] {inspectProd.product.nombre}
            </h3>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.86rem' }}>
              Almacén: <strong>{warehouseName}</strong> · Total registrados:{' '}
              <strong>{inspectProd.units.length} equipos</strong>
            </p>
          </div>
          <button className="modal-close-btn" type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        {inspectProd.units.length === 0 ? (
          <div
            style={{
              padding: '30px',
              textAlign: 'center',
              background: 'var(--color-canvas)',
              borderRadius: '6px',
              margin: '14px 0'
            }}
          >
            <p className="muted" style={{ margin: '0 0 12px' }}>
              No hay unidades físicas serializadas enroladas con RFID para este producto en este almacén.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onOpenEnrollModal(inspectProd.product.id_producto)
                onClose()
              }}
            >
              + Enrolar primer equipo con chip RFID
            </button>
          </div>
        ) : (
          <div className="table-wrap" style={{ margin: '14px 0', maxHeight: '360px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Número de serie de fábrica</th>
                  <th>Tag RFID asignado</th>
                  <th>Estado operativo</th>
                  <th>Fecha de ingreso</th>
                  <th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {inspectProd.units.map((u) => {
                  const tagUid = u.etiqueta_rfid?.uid_tag || 'Sin Tag'
                  return (
                    <tr key={u.id_unidad}>
                      <td>
                        <strong style={{ color: 'var(--color-brand-deep)' }}>{u.numero_serie}</strong>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            background: 'var(--color-brand-soft)',
                            color: 'var(--color-brand)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.84rem'
                          }}
                        >
                          Tag: {tagUid}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background:
                              u.estado === 'DISPONIBLE' ? 'rgba(47, 125, 79, 0.15)' : 'rgba(188, 121, 31, 0.15)',
                            color: u.estado === 'DISPONIBLE' ? 'var(--color-success)' : 'var(--color-warning)',
                            border: `1px solid ${
                              u.estado === 'DISPONIBLE' ? 'rgba(47, 125, 79, 0.3)' : 'rgba(188, 121, 31, 0.3)'
                            }`
                          }}
                        >
                          {u.estado}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                        {new Date(u.fecha_ingreso).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-detail"
                          disabled={updatingUnitState}
                          onClick={() => onToggleUnitState(u)}
                          title={u.estado === 'DISPONIBLE' ? 'Poner en Mantenimiento' : 'Marcar como Disponible'}
                        >
                          {u.estado === 'DISPONIBLE' ? 'Mantenimiento' : 'Habilitar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onOpenEnrollModal(inspectProd.product.id_producto)
              onClose()
            }}
          >
            + Enrolar otro equipo
          </button>
        </div>
      </div>
    </div>
  )
}
