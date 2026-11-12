import { useState, useMemo } from 'react'
import type { MovementLog, HistoryFilterType } from '../types'

interface MovementHistorySubViewProps {
  movements: MovementLog[]
  onInspectMovement: (movement: MovementLog) => void
}

export function MovementHistorySubView({
  movements,
  onInspectMovement
}: MovementHistorySubViewProps) {
  const [filterType, setFilterType] = useState<HistoryFilterType>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Conteos
  const counts = useMemo(() => {
    const total = movements.length
    const internal = movements.filter((m) => m.destino_almacen !== null).length
    const outside = movements.filter((m) => m.destino_almacen === null && (m.tipo === 'DESPACHO_COMPLETO' || m.tipo === 'RETIRO_PARCIAL')).length
    return { total, internal, outside }
  }, [movements])

  // Filtrado reactivo
  const filteredMovements = useMemo(() => {
    let result = movements

    if (filterType === 'INTERNAL') {
      result = result.filter((m) => m.destino_almacen !== null)
    } else if (filterType === 'OUTSIDE') {
      result = result.filter((m) => m.destino_almacen === null && (m.tipo === 'DESPACHO_COMPLETO' || m.tipo === 'RETIRO_PARCIAL'))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (m) =>
          (m.producto?.sku && m.producto.sku.toLowerCase().includes(q)) ||
          (m.producto?.nombre && m.producto.nombre.toLowerCase().includes(q)) ||
          (m.etiqueta_rfid?.uid_tag && m.etiqueta_rfid.uid_tag.toLowerCase().includes(q)) ||
          (m.motivo && m.motivo.toLowerCase().includes(q)) ||
          (m.destino?.nombre && m.destino.nombre.toLowerCase().includes(q))
      )
    }

    return result
  }, [movements, filterType, searchQuery])

  return (
    <div className="panel" style={{ padding: '20px' }}>
      {/* Cabecera del panel */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '19px',
              fontWeight: 600,
              color: 'var(--color-brand-deep)',
              margin: 0
            }}
          >
            Historial de transferencias y salidas de Kardex
          </h3>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '13px' }}>
            Registro inmutable de trazabilidad de paletas y cargas en la bitácora operacional.
          </p>
        </div>

        {/* Buscador */}
        <div style={{ flex: '0 1 320px', minWidth: '220px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por SKU, producto, Tag o motivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', fontSize: '13px', padding: '8px 12px' }}
          />
        </div>
      </div>

      {/* Filtros rápidos por tipo */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginRight: '4px' }}>
          Filtrar:
        </span>
        {(
          [
            { key: 'ALL', label: 'Todos los registros', count: counts.total },
            { key: 'INTERNAL', label: 'Entre sedes', count: counts.internal },
            { key: 'OUTSIDE', label: 'Salidas definitivas', count: counts.outside }
          ] as const
        ).map((item) => {
          const isSelected = filterType === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilterType(item.key)}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: isSelected ? 600 : 500,
                border: isSelected ? '1px solid var(--color-brand)' : '1px solid var(--color-border)',
                background: isSelected ? 'var(--color-brand)' : 'var(--color-surface)',
                color: isSelected ? '#FFFFFF' : 'var(--color-text-primary)',
                transition: 'all 0.12s ease'
              }}
            >
              {item.label} ({item.count})
            </button>
          )
        })}

        {searchQuery && (
          <button
            type="button"
            className="btn-detail"
            onClick={() => setSearchQuery('')}
            style={{ fontSize: '11px', padding: '3px 8px' }}
          >
            Limpiar búsqueda
          </button>
        )}
      </div>

      {filteredMovements.length === 0 ? (
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            background: 'var(--color-canvas)',
            borderRadius: '6px',
            border: '1px dashed var(--color-border)'
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '14px' }}>
            No hay movimientos registrados con los filtros seleccionados
          </p>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: '12.5px' }}>
            {searchQuery ? 'Prueba con otro término de búsqueda o cambia la categoría.' : 'Aún no se han ejecutado movimientos en este período.'}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Tipo de movimiento</th>
                <th>Producto y SKU</th>
                <th>Tag RFID</th>
                <th className="num-col">Cantidad</th>
                <th>Destino</th>
                <th>Motivo registrado</th>
                <th style={{ textAlign: 'right' }}>Auditoría</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((m) => {
                const isOutside = m.destino_almacen === null && (m.tipo === 'DESPACHO_COMPLETO' || m.tipo === 'RETIRO_PARCIAL')
                const isTransfer = m.destino_almacen !== null

                return (
                  <tr key={m.id_movimiento}>
                    {/* Fecha y Hora */}
                    <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                      {new Date(m.fecha_hora).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    {/* Tipo de Movimiento */}
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: isOutside
                            ? 'rgba(179, 64, 42, 0.08)'
                            : isTransfer
                            ? 'var(--color-brand-soft)'
                            : 'rgba(55, 48, 163, 0.1)',
                          color: isOutside
                            ? 'var(--color-danger)'
                            : isTransfer
                            ? 'var(--color-brand)'
                            : '#3730A3',
                          border: `1px solid ${
                            isOutside
                              ? 'rgba(179, 64, 42, 0.25)'
                              : isTransfer
                              ? 'rgba(22, 125, 141, 0.25)'
                              : 'rgba(55, 48, 163, 0.25)'
                          }`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {isOutside ? (
                          <>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                              <polyline points="16 17 21 12 16 7" />
                              <line x1="21" x2="9" y1="12" y2="12" />
                            </svg>
                            Salida externa
                          </>
                        ) : isTransfer ? (
                          <>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="m16 3 4 4-4 4" />
                              <path d="M20 7H4" />
                              <path d="m8 21-4-4 4-4" />
                              <path d="M4 17h16" />
                            </svg>
                            Transferencia
                          </>
                        ) : (
                          m.tipo
                        )}
                      </span>
                    </td>

                    {/* Producto */}
                    <td>
                      <div>
                        <span className="sku-badge" style={{ marginRight: '6px' }}>{m.producto?.sku || 'N/A'}</span>
                        <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                          {m.producto?.nombre}
                        </strong>
                      </div>
                    </td>

                    {/* Tag RFID */}
                    <td>
                      {m.etiqueta_rfid?.uid_tag ? (
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--color-brand)',
                            background: 'var(--color-brand-soft)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid rgba(22, 125, 141, 0.2)'
                          }}
                        >
                          {m.etiqueta_rfid.uid_tag}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>—</span>
                      )}
                    </td>

                    {/* Cantidad */}
                    <td className="num-col" style={{ fontWeight: 600 }}>
                      <span style={{ color: isOutside ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                        {isOutside ? '-' : ''}{Number(m.cantidad_afectada).toLocaleString()} unid.
                      </span>
                    </td>

                    {/* Destino */}
                    <td>
                      {isOutside ? (
                        <span style={{ color: 'var(--color-danger)', fontWeight: 600, fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" x2="9" y1="12" y2="12" />
                          </svg>
                          Fuera de la empresa
                        </span>
                      ) : m.destino?.nombre ? (
                        <span style={{ color: 'var(--color-brand)', fontWeight: 600, fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          ➔ {m.destino.nombre}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Interno</span>
                      )}
                    </td>

                    {/* Motivo */}
                    <td style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.motivo || ''}>
                      {m.motivo || '—'}
                    </td>

                    {/* Acción */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-detail"
                        onClick={() => onInspectMovement(m)}
                        style={{ padding: '3px 8px', fontSize: '11.5px' }}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
