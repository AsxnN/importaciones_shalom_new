import { useState, useMemo } from 'react'
import type { PalletRecord } from '../../../types/locations'
import type { PalletFilterType } from '../types'

interface ActivePalletsSubViewProps {
  warehouseName?: string
  pallets: PalletRecord[]
  loading: boolean
  onSelectPalletForOperation: (palletId: string) => void
}

export function ActivePalletsSubView({
  warehouseName,
  pallets,
  loading,
  onSelectPalletForOperation
}: ActivePalletsSubViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<PalletFilterType>('ALL')

  // Conteos para filtros
  const counts = useMemo(() => {
    const total = pallets.length
    const completas = pallets.filter((p) => p.tipo_paleta === 'COMPLETO' && p.producto?.modo_manejo !== 'SERIALIZADO').length
    const puchos = pallets.filter((p) => p.tipo_paleta === 'PUCHO' && p.producto?.modo_manejo !== 'SERIALIZADO').length
    const serializados = pallets.filter((p) => p.producto?.modo_manejo === 'SERIALIZADO').length
    return { total, completas, puchos, serializados }
  }, [pallets])

  // Filtrado reactivo
  const filteredPallets = useMemo(() => {
    let result = pallets

    if (typeFilter === 'COMPLETO') {
      result = result.filter((p) => p.tipo_paleta === 'COMPLETO' && p.producto?.modo_manejo !== 'SERIALIZADO')
    } else if (typeFilter === 'PUCHO') {
      result = result.filter((p) => p.tipo_paleta === 'PUCHO' && p.producto?.modo_manejo !== 'SERIALIZADO')
    } else if (typeFilter === 'SERIALIZADO') {
      result = result.filter((p) => p.producto?.modo_manejo === 'SERIALIZADO')
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (p) =>
          p.uid_tag.toLowerCase().includes(q) ||
          (p.producto?.sku && p.producto.sku.toLowerCase().includes(q)) ||
          (p.producto?.nombre && p.producto.nombre.toLowerCase().includes(q)) ||
          (p.codigo_ubicacion && p.codigo_ubicacion.toLowerCase().includes(q))
      )
    }

    return result
  }, [pallets, typeFilter, searchQuery])

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
            Paletas físicas activas en {warehouseName || 'la sede'}
          </h3>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '13px' }}>
            Directorio de paletas con chip RFID listas para traslado interalmacén o despacho a clientes.
          </p>
        </div>

        {/* Buscador */}
        <div style={{ flex: '0 1 320px', minWidth: '220px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por Tag, SKU, producto o celda..."
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
            { key: 'ALL', label: 'Todas', count: counts.total },
            { key: 'COMPLETO', label: 'Paletas completas', count: counts.completas },
            { key: 'PUCHO', label: 'Puchos sueltos', count: counts.puchos },
            { key: 'SERIALIZADO', label: 'Serializados', count: counts.serializados }
          ] as const
        ).map((item) => {
          const isSelected = typeFilter === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTypeFilter(item.key)}
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

      {/* Estado de carga */}
      {loading ? (
        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <p className="muted" style={{ margin: 0 }}>Cargando paletas físicas activas…</p>
        </div>
      ) : filteredPallets.length === 0 ? (
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
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '14px' }}>
            No se encontraron paletas activas con el filtro seleccionado
          </p>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: '12.5px' }}>
            {searchQuery ? 'Prueba con otro término de búsqueda o limpia los filtros.' : 'No hay paletas físicas en esta categoría.'}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tag RFID</th>
                <th>SKU y Producto</th>
                <th>Tipo de carga</th>
                <th>Cajas</th>
                <th className="num-col">Unidades</th>
                <th>Ubicación física</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredPallets.map((p) => {
                const esSerial = p.producto?.modo_manejo === 'SERIALIZADO'
                const isCompleto = p.tipo_paleta === 'COMPLETO'

                return (
                  <tr key={p.id_etiqueta}>
                    {/* Tag RFID */}
                    <td>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: 'var(--color-brand-deep)',
                          background: 'var(--color-brand-soft)',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          border: '1px solid rgba(22, 125, 141, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 9h16" />
                          <path d="M4 15h16" />
                          <path d="M10 3 8 21" />
                          <path d="M16 3l-2 18" />
                        </svg>
                        {p.uid_tag}
                      </span>
                    </td>

                    {/* SKU y Producto */}
                    <td>
                      <div>
                        <span className="sku-badge" style={{ marginRight: '6px' }}>{p.producto?.sku}</span>
                        <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                          {p.producto?.nombre}
                        </strong>
                      </div>
                    </td>

                    {/* Tipo de Carga */}
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: esSerial
                            ? 'rgba(55, 48, 163, 0.1)'
                            : isCompleto
                            ? 'var(--color-brand-soft)'
                            : 'rgba(188, 121, 31, 0.1)',
                          color: esSerial
                            ? '#3730A3'
                            : isCompleto
                            ? 'var(--color-brand)'
                            : 'var(--color-warning)',
                          border: `1px solid ${
                            esSerial
                              ? 'rgba(55, 48, 163, 0.25)'
                              : isCompleto
                              ? 'rgba(22, 125, 141, 0.25)'
                              : 'rgba(188, 121, 31, 0.28)'
                          }`
                        }}
                      >
                        {esSerial ? 'Serializado' : isCompleto ? 'Paleta completa' : 'Pucho'}
                      </span>
                    </td>

                    {/* Cajas */}
                    <td>
                      <strong style={{ fontSize: '13px' }}>
                        {esSerial ? '1 unid.' : `${p.cantidad_paquetes} cajas`}
                      </strong>
                    </td>

                    {/* Unidades */}
                    <td className="num-col" style={{ fontWeight: 600 }}>
                      {Number(p.cantidad_actual || 0).toLocaleString()} unid.
                    </td>

                    {/* Ubicación Física */}
                    <td>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: p.codigo_ubicacion ? 'var(--color-brand-deep)' : 'var(--color-text-secondary)',
                          background: 'var(--color-canvas)',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          border: '1px solid var(--color-border)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <path d="M3 9h18" />
                          <path d="M9 21V9" />
                        </svg>
                        {p.codigo_ubicacion || 'Zona Campo / Piso'}
                      </span>
                    </td>

                    {/* Acción Rápida */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-detail"
                        onClick={() => onSelectPalletForOperation(String(p.id_etiqueta))}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--color-brand)',
                          borderColor: 'var(--color-brand)'
                        }}
                      >
                        Mover / Despachar ➔
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
