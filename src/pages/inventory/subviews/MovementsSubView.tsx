import { useMemo, useState } from 'react'
import type { Movement } from '../types'

type Props = {
  warehouseName?: string
  movements: Movement[]
}

export function MovementsSubView({ warehouseName, movements }: Props) {
  const [movementSearch, setMovementSearch] = useState('')
  const [movementTypeFilter, setMovementTypeFilter] = useState('ALL')

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (movementTypeFilter !== 'ALL' && m.tipo !== movementTypeFilter) {
        return false
      }
      if (movementSearch) {
        const query = movementSearch.toLowerCase().trim()
        const skuMatch = m.producto?.sku?.toLowerCase().includes(query)
        const nameMatch = m.producto?.nombre?.toLowerCase().includes(query)
        const motivoMatch = m.motivo?.toLowerCase().includes(query)
        if (!skuMatch && !nameMatch && !motivoMatch) return false
      }
      return true
    })
  }, [movements, movementTypeFilter, movementSearch])

  const getTipoStyle = (tipo: string) => {
    if (tipo.includes('SALIDA') || tipo.includes('DESPACHO') || tipo.includes('RETIRO')) {
      return {
        background: 'rgba(179, 64, 42, 0.08)',
        color: 'var(--color-danger)',
        border: '1px solid rgba(179, 64, 42, 0.22)'
      }
    }
    if (tipo.includes('TRANSFERENCIA')) {
      return {
        background: 'var(--color-brand-soft)',
        color: 'var(--color-brand)',
        border: '1px solid rgba(22, 125, 141, 0.25)'
      }
    }
    if (tipo.includes('INGRESO')) {
      return {
        background: 'rgba(47, 125, 79, 0.1)',
        color: 'var(--color-success)',
        border: '1px solid rgba(47, 125, 79, 0.25)'
      }
    }
    return {
      background: 'rgba(55, 48, 163, 0.08)',
      color: '#3730A3',
      border: '1px solid rgba(55, 48, 163, 0.22)'
    }
  }

  return (
    <div className="panel" style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '19px', fontWeight: 600, color: 'var(--color-brand-deep)' }}>
            Movimientos recientes en {warehouseName || 'la sede'}
          </h3>
          <p className="muted" style={{ margin: '3px 0 0', fontSize: '13px' }}>
            Registro cronológico inmutable de entradas, salidas y transferencias en Kardex.
          </p>
        </div>
      </div>

      <div className="table-controls">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <div className="search-group" style={{ flex: '1 1 240px', maxWidth: '380px' }}>
            <input
              type="text"
              placeholder="Buscar por producto o motivo..."
              value={movementSearch}
              onChange={(e) => setMovementSearch(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="mov-type-filter" style={{ fontSize: '12.5px' }}>Tipo de movimiento:</label>
            <select
              id="mov-type-filter"
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              style={{ fontSize: '13px' }}
            >
              <option value="ALL">Todos los tipos</option>
              <option value="INGRESO_COMPLETO">Ingreso completo</option>
              <option value="INGRESO_PUCHO">Ingreso pucho</option>
              <option value="SALIDA">Salida</option>
              <option value="DESPACHO_COMPLETO">Despacho completo</option>
              <option value="RETIRO_PARCIAL">Retiro parcial</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="AJUSTE">Ajuste de inventario</option>
            </select>
          </div>

          {(movementSearch || movementTypeFilter !== 'ALL') && (
            <button
              type="button"
              className="btn-detail"
              onClick={() => {
                setMovementSearch('')
                setMovementTypeFilter('ALL')
              }}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Mostrando {filteredMovements.length} de {movements.length} registros
        </span>
      </div>

      {filteredMovements.length === 0 ? (
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            background: 'var(--color-canvas)',
            borderRadius: '6px',
            border: '1px dashed var(--color-border)',
            marginTop: '12px'
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '14px' }}>
            No se encontraron movimientos registrados con los filtros aplicados
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
                <th className="num-col">Cantidad afectada</th>
                <th>Detalle y motivo</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((m) => {
                const tipoStyle = getTipoStyle(m.tipo)
                return (
                  <tr key={m.id_movimiento}>
                    <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                      {new Date(m.fecha_hora).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          ...tipoStyle
                        }}
                      >
                        {m.tipo}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="sku-badge">{m.producto?.sku}</span>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{m.producto?.nombre}</span>
                      </div>
                    </td>
                    <td className="num-col" style={{ fontWeight: 600, fontSize: '13.5px' }}>
                      {m.cantidad_afectada.toLocaleString()} unid.
                    </td>
                    <td style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.motivo || ''}>
                      {m.motivo ?? '—'}
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
