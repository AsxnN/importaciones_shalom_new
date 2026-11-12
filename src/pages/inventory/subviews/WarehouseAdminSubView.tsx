import { useMemo, useState } from 'react'
import type { Warehouse } from '../types'

type Props = {
  warehouses: Warehouse[]
  onNewWarehouse: () => void
  onEditWarehouse: (wh: Warehouse) => void
  onToggleWarehouseActive: (wh: Warehouse) => void
  onDeleteWarehouse: (wh: Warehouse) => void
}

export function WarehouseAdminSubView({
  warehouses,
  onNewWarehouse,
  onEditWarehouse,
  onToggleWarehouseActive,
  onDeleteWarehouse
}: Props) {
  const [whListSearch, setWhListSearch] = useState('')
  const [whListTypeFilter, setWhListTypeFilter] = useState<'ALL' | 'PRINCIPAL' | 'TIENDA' | 'MERMA'>('ALL')

  const filteredWarehouseList = useMemo(() => {
    return warehouses.filter((wh) => {
      if (whListTypeFilter !== 'ALL' && wh.tipo !== whListTypeFilter) {
        return false
      }
      if (whListSearch) {
        const query = whListSearch.toLowerCase().trim()
        const nameMatch = wh.nombre.toLowerCase().includes(query)
        const prefixMatch = wh.prefijo_rfid?.toLowerCase().includes(query)
        if (!nameMatch && !prefixMatch) return false
      }
      return true
    })
  }, [warehouses, whListTypeFilter, whListSearch])

  return (
    <div className="panel" style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600 }}>
            Catálogo y configuración de almacenes
          </h3>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '13.5px' }}>
            Administra las sedes físicas, puntos de venta y áreas de merma de la empresa.
          </p>
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={onNewWarehouse}
          style={{ margin: 0 }}
        >
          + Registrar nuevo almacén
        </button>
      </div>

      <div className="table-controls">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <div className="search-group" style={{ flex: '1 1 240px', maxWidth: '380px' }}>
            <input
              type="text"
              placeholder="Buscar sede por nombre o prefijo..."
              value={whListSearch}
              onChange={(e) => setWhListSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="wh-type-filter">Tipo de sede:</label>
            <select
              id="wh-type-filter"
              value={whListTypeFilter}
              onChange={(e) => setWhListTypeFilter(e.target.value as any)}
            >
              <option value="ALL">Todos los tipos</option>
              <option value="PRINCIPAL">Sede principal</option>
              <option value="TIENDA">Punto de venta / Tienda</option>
              <option value="MERMA">Área de merma</option>
            </select>
          </div>

          {(whListSearch || whListTypeFilter !== 'ALL') && (
            <button
              type="button"
              className="btn-detail"
              onClick={() => {
                setWhListSearch('')
                setWhListTypeFilter('ALL')
              }}
              style={{ padding: '6px 12px' }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Mostrando {filteredWarehouseList.length} de {warehouses.length} sedes
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre del almacén</th>
              <th>Prefijo RFID</th>
              <th>Tipo de sede</th>
              <th className="num-col">Capacidad nominal</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredWarehouseList.map((wh) => (
              <tr key={wh.id_almacen}>
                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>#{wh.id_almacen}</td>
                <td>
                  <strong style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{wh.nombre}</strong>
                </td>
                <td>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: 'var(--color-brand)',
                      background: 'var(--color-brand-soft)',
                      border: '1px solid rgba(22, 125, 141, 0.25)',
                      padding: '2px 7px',
                      borderRadius: '4px'
                    }}
                  >
                    {wh.prefijo_rfid || '—'}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background:
                        wh.tipo === 'PRINCIPAL'
                          ? 'var(--color-brand-soft)'
                          : wh.tipo === 'TIENDA'
                          ? 'var(--color-canvas)'
                          : 'rgba(188, 121, 31, 0.1)',
                      color:
                        wh.tipo === 'PRINCIPAL'
                          ? 'var(--color-brand)'
                          : wh.tipo === 'TIENDA'
                          ? 'var(--color-text-secondary)'
                          : 'var(--color-warning)',
                      border: `1px solid ${
                        wh.tipo === 'PRINCIPAL'
                          ? 'rgba(22, 125, 141, 0.25)'
                          : wh.tipo === 'TIENDA'
                          ? 'var(--color-border)'
                          : 'rgba(188, 121, 31, 0.28)'
                      }`
                    }}
                  >
                    {wh.tipo === 'PRINCIPAL'
                      ? 'Sede principal'
                      : wh.tipo === 'TIENDA'
                      ? 'Punto de venta'
                      : 'Zona de merma'}
                  </span>
                </td>
                <td className="num-col">{wh.capacidad_m3 ? `${wh.capacidad_m3} m³` : 'Sin límite'}</td>
                <td>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: wh.activo ? 'rgba(47, 125, 79, 0.1)' : 'var(--color-canvas)',
                      color: wh.activo ? 'var(--color-success)' : 'var(--color-text-secondary)',
                      border: `1px solid ${wh.activo ? 'rgba(47, 125, 79, 0.28)' : 'var(--color-border)'}`
                    }}
                  >
                    {wh.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-detail"
                      type="button"
                      onClick={() => onEditWarehouse(wh)}
                    >
                      Configurar
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => onToggleWarehouseActive(wh)}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      {wh.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      className="btn-detail-danger"
                      onClick={() => onDeleteWarehouse(wh)}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
