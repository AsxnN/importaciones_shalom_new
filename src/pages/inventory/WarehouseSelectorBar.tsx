import { useState, useRef, useEffect, useMemo } from 'react'

export interface Warehouse {
  id_almacen: number
  nombre: string
  tipo: 'PRINCIPAL' | 'TIENDA' | 'MERMA'
  capacidad_m3: number | null
  activo: boolean
  prefijo_rfid?: string | null
}

interface WarehouseSelectorBarProps {
  warehouses: Warehouse[]
  selectedWarehouseId: number | null
  onSelectWarehouse: (warehouseId: number) => void
  onNewWarehouse: () => void
  onEditWarehouse: (warehouse: Warehouse) => void
  summary: {
    totalVolumenM3: number
    pctOcupado: number
    totalPaletas: number
    totalPuchos: number
    totalUnidades: number
    itemsCount: number
  }
}

export function WarehouseSelectorBar({
  warehouses,
  selectedWarehouseId,
  onSelectWarehouse,
  onNewWarehouse,
  onEditWarehouse,
  summary
}: WarehouseSelectorBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PRINCIPAL' | 'TIENDA' | 'MERMA'>('ALL')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id_almacen === selectedWarehouseId) || warehouses[0] || null
  }, [warehouses, selectedWarehouseId])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      setTimeout(() => searchInputRef.current?.focus(), 40)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Conteos por tipo de sede para los filtros rápidos
  const counts = useMemo(() => {
    const total = warehouses.length
    const principal = warehouses.filter((w) => w.tipo === 'PRINCIPAL').length
    const tienda = warehouses.filter((w) => w.tipo === 'TIENDA').length
    const merma = warehouses.filter((w) => w.tipo === 'MERMA').length
    return { total, principal, tienda, merma }
  }, [warehouses])

  // Filtrado de almacenes en tiempo real (nombre, prefijo RFID, tipo)
  const filteredWarehouses = useMemo(() => {
    let result = warehouses

    if (typeFilter !== 'ALL') {
      result = result.filter((w) => w.tipo === typeFilter)
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      result = result.filter((w) => {
        const name = w.nombre.toLowerCase()
        const prefix = (w.prefijo_rfid || '').toLowerCase()
        const tipo = (w.tipo || '').toLowerCase()
        const id = String(w.id_almacen)
        return name.includes(q) || prefix.includes(q) || tipo.includes(q) || id.includes(q)
      })
    }

    return result
  }, [warehouses, searchTerm, typeFilter])

  const formatTipoLabel = (tipo: string) => {
    if (tipo === 'PRINCIPAL') return 'Sede principal'
    if (tipo === 'TIENDA') return 'Punto de venta'
    if (tipo === 'MERMA') return 'Zona de merma'
    return tipo
  }

  const getTipoBadgeStyle = (tipo: string) => {
    if (tipo === 'PRINCIPAL') {
      return {
        background: 'var(--color-brand-soft)',
        color: 'var(--color-brand)',
        border: '1px solid rgba(22, 125, 141, 0.25)'
      }
    }
    if (tipo === 'MERMA') {
      return {
        background: 'rgba(188, 121, 31, 0.1)',
        color: 'var(--color-warning)',
        border: '1px solid rgba(188, 121, 31, 0.28)'
      }
    }
    return {
      background: 'var(--color-canvas)',
      color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border)'
    }
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: 'none',
        position: 'relative'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        {/* Información de la sede seleccionada */}
        <div style={{ flex: '1 1 340px', minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.03em'
              }}
            >
              Sede activa
            </span>
            {selectedWarehouse && (
              <>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    ...getTipoBadgeStyle(selectedWarehouse.tipo)
                  }}
                >
                  {formatTipoLabel(selectedWarehouse.tipo)}
                </span>
                {selectedWarehouse.prefijo_rfid && (
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--color-brand)',
                      background: 'var(--color-brand-soft)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(22, 125, 141, 0.2)'
                    }}
                  >
                    Tag: {selectedWarehouse.prefijo_rfid}
                  </span>
                )}
                {!selectedWarehouse.activo && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--color-danger)',
                      background: 'rgba(179, 64, 42, 0.1)',
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    Inactivo
                  </span>
                )}
              </>
            )}
          </div>

          <h3
            style={{
              margin: '0 0 6px 0',
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--color-brand-deep)',
              letterSpacing: '-0.01em',
              lineHeight: 1.2
            }}
          >
            {selectedWarehouse ? selectedWarehouse.nombre : 'Sin almacén seleccionado'}
          </h3>

          {/* Medidor de ocupación de la sede */}
          {selectedWarehouse && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '180px',
                  height: '5px',
                  background: 'var(--color-border)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, summary.pctOcupado)}%`,
                    height: '100%',
                    background: summary.pctOcupado > 85 ? 'var(--color-danger)' : 'var(--color-brand)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                Capacidad:{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>
                  {summary.totalVolumenM3} m³
                </strong>{' '}
                /{' '}
                {selectedWarehouse.capacidad_m3 ? `${selectedWarehouse.capacidad_m3} m³` : '500 m³'}{' '}
                ({summary.pctOcupado}%)
              </span>
            </div>
          )}
        </div>

        {/* Acciones de selección y configuración de sede */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Botón selector desplegable con buscador */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setIsOpen((prev) => !prev)
                setSearchTerm('')
                setTypeFilter('ALL')
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13.5px',
                fontWeight: 600,
                padding: '8px 14px',
                borderColor: isOpen ? 'var(--color-brand)' : 'var(--color-border)',
                background: isOpen ? 'var(--color-brand-soft)' : 'var(--color-surface)',
                color: isOpen ? 'var(--color-brand)' : 'var(--color-text-primary)'
              }}
              title="Abrir buscador y selector de almacenes"
            >
              <span>Cambiar sede ({warehouses.length} registradas)</span>
              <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginLeft: '2px' }}>
                {isOpen ? '▲' : '▼'}
              </span>
            </button>

            {/* Ventana flotante de búsqueda rápida y selección */}
            {isOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  zIndex: 1050,
                  width: '420px',
                  maxWidth: '92vw',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {/* Cabecera del desplegable */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                    Seleccionar sede operativa
                  </strong>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-secondary)',
                      fontSize: '16px',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      lineHeight: 1
                    }}
                    title="Cerrar selector"
                  >
                    ✕
                  </button>
                </div>

                {/* Campo de búsqueda rápida */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    padding: '0 10px',
                    background: 'var(--color-canvas)'
                  }}
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre, prefijo RFID o tipo..."
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      padding: '8px 0',
                      fontSize: '13px',
                      background: 'transparent',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Filtros rápidos por tipo de sede */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('ALL')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: `1px solid ${typeFilter === 'ALL' ? 'var(--color-brand)' : 'var(--color-border)'}`,
                      background: typeFilter === 'ALL' ? 'var(--color-brand)' : 'var(--color-canvas)',
                      color: typeFilter === 'ALL' ? '#FFFFFF' : 'var(--color-text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    Todos ({counts.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('PRINCIPAL')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: `1px solid ${typeFilter === 'PRINCIPAL' ? 'var(--color-brand)' : 'var(--color-border)'}`,
                      background: typeFilter === 'PRINCIPAL' ? 'var(--color-brand)' : 'var(--color-canvas)',
                      color: typeFilter === 'PRINCIPAL' ? '#FFFFFF' : 'var(--color-text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    Principales ({counts.principal})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('TIENDA')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: `1px solid ${typeFilter === 'TIENDA' ? 'var(--color-brand)' : 'var(--color-border)'}`,
                      background: typeFilter === 'TIENDA' ? 'var(--color-brand)' : 'var(--color-canvas)',
                      color: typeFilter === 'TIENDA' ? '#FFFFFF' : 'var(--color-text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    Tiendas ({counts.tienda})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('MERMA')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: `1px solid ${typeFilter === 'MERMA' ? 'var(--color-brand)' : 'var(--color-border)'}`,
                      background: typeFilter === 'MERMA' ? 'var(--color-brand)' : 'var(--color-canvas)',
                      color: typeFilter === 'MERMA' ? '#FFFFFF' : 'var(--color-text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    Merma ({counts.merma})
                  </button>
                </div>

                {/* Lista interactiva de almacenes con scroll suave */}
                <div
                  style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {filteredWarehouses.length === 0 ? (
                    <div
                      style={{
                        padding: '24px 16px',
                        textAlign: 'center',
                        color: 'var(--color-text-secondary)',
                        fontSize: '13px'
                      }}
                    >
                      No se encontraron almacenes con los filtros actuales.
                    </div>
                  ) : (
                    filteredWarehouses.map((wh) => {
                      const isSelected = wh.id_almacen === selectedWarehouseId
                      return (
                        <button
                          key={wh.id_almacen}
                          type="button"
                          onClick={() => {
                            onSelectWarehouse(wh.id_almacen)
                            setIsOpen(false)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            background: isSelected ? 'var(--color-brand-soft)' : 'var(--color-surface)',
                            border: 'none',
                            borderBottom: '1px solid var(--color-border)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background-color 0.1s ease',
                            width: '100%'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#EDF5F7'
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-surface)'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              {wh.prefijo_rfid && (
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    color: 'var(--color-brand)',
                                    background: 'var(--color-brand-soft)',
                                    border: '1px solid rgba(22, 125, 141, 0.25)',
                                    padding: '1px 5px',
                                    borderRadius: '3px'
                                  }}
                                >
                                  {wh.prefijo_rfid}
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  ...getTipoBadgeStyle(wh.tipo)
                                }}
                              >
                                {formatTipoLabel(wh.tipo)}
                              </span>
                              {!wh.activo && (
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    color: 'var(--color-text-secondary)',
                                    fontStyle: 'italic'
                                  }}
                                >
                                  (Inactivo)
                                </span>
                              )}
                            </div>
                            <strong
                              style={{
                                display: 'block',
                                fontSize: '13.5px',
                                color: isSelected ? 'var(--color-brand-deep)' : 'var(--color-text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {wh.nombre}
                            </strong>
                            <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                              Capacidad: {wh.capacidad_m3 ?? '—'} m³
                            </span>
                          </div>

                          {isSelected ? (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: 'var(--color-brand)',
                                background: '#FFFFFF',
                                border: '1px solid var(--color-brand)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                flexShrink: 0
                              }}
                            >
                              Seleccionado
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '11.5px',
                                color: 'var(--color-brand)',
                                flexShrink: 0
                              }}
                            >
                              Elegir
                            </span>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>

                {/* Pie del desplegable con acceso directo a crear nueva sede */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '4px',
                    borderTop: '1px solid var(--color-border)',
                    fontSize: '12px'
                  }}
                >
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {filteredWarehouses.length} de {warehouses.length} sedes disponibles
                  </span>
                  <button
                    type="button"
                    className="btn-detail"
                    onClick={() => {
                      setIsOpen(false)
                      onNewWarehouse()
                    }}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      color: 'var(--color-brand)'
                    }}
                  >
                    + Registrar nueva sede
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Configurar sede actual */}
          {selectedWarehouse && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onEditWarehouse(selectedWarehouse)}
              style={{ fontSize: '13px', padding: '8px 12px' }}
              title="Modificar nombre, capacidad o prefijo RFID de esta sede"
            >
              Configurar sede
            </button>
          )}

          {/* Crear nueva sede */}
          <button
            type="button"
            className="btn-secondary"
            onClick={onNewWarehouse}
            style={{ fontSize: '13px', padding: '8px 12px' }}
            title="Crear un nuevo almacén, tienda o área de merma"
          >
            + Nueva sede
          </button>
        </div>
      </div>
    </div>
  )
}
