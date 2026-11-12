import { useState, useRef, useEffect, useMemo } from 'react'
import type { Warehouse } from './types'

interface MovementWarehouseSelectorBarProps {
  warehouses: Warehouse[]
  selectedWarehouseId: number | null
  onSelectWarehouse: (warehouseId: number) => void
  activePalletsCount: number
}

export function MovementWarehouseSelectorBar({
  warehouses,
  selectedWarehouseId,
  onSelectWarehouse,
  activePalletsCount
}: MovementWarehouseSelectorBarProps) {
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

  // Conteos por tipo
  const counts = useMemo(() => {
    const total = warehouses.length
    const principal = warehouses.filter((w) => w.tipo === 'PRINCIPAL').length
    const tienda = warehouses.filter((w) => w.tipo === 'TIENDA').length
    const merma = warehouses.filter((w) => w.tipo === 'MERMA').length
    return { total, principal, tienda, merma }
  }, [warehouses])

  // Filtrado de almacenes
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
        {/* Información de la sede de origen seleccionada */}
        <div style={{ flex: '1 1 340px', minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.03em'
              }}
            >
              Sede de origen activa
            </span>
            {selectedWarehouse && (
              <>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
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
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(22, 125, 141, 0.2)'
                    }}
                  >
                    Prefijo: {selectedWarehouse.prefijo_rfid}
                  </span>
                )}
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--color-brand-deep)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 21h18" />
                <path d="M5 21V7l8-4v18" />
                <path d="M19 21V11l-6-4" />
                <path d="M9 9v.01" />
                <path d="M9 12v.01" />
                <path d="M9 15v.01" />
                <path d="M9 18v.01" />
              </svg>
            </div>
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22px',
                  fontWeight: 600,
                  margin: 0,
                  color: 'var(--color-text-primary)',
                  letterSpacing: '0.01em',
                  lineHeight: 1.2
                }}
              >
                {selectedWarehouse?.nombre || 'Seleccionar almacén'}
              </h2>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Capacidad volumétrica: {selectedWarehouse?.capacidad_m3 ? `${Number(selectedWarehouse.capacidad_m3).toLocaleString()} m³` : 'Sin límite definido'}
                {' • '}
                <strong style={{ color: 'var(--color-brand)' }}>{activePalletsCount} paletas físicas</strong> listas para mover
              </div>
            </div>
          </div>
        </div>

        {/* Botón selector de sede */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            className="btn-detail"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-brand)',
              background: 'var(--color-brand-soft)',
              border: '1px solid rgba(22, 125, 141, 0.35)',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m16 3 4 4-4 4" />
              <path d="M20 7H4" />
              <path d="m8 21-4-4 4-4" />
              <path d="M4 17h16" />
            </svg>
            Cambiar sede de origen
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transition: 'transform 0.18s ease',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Menú desplegable */}
          {isOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '380px',
                maxWidth: '92vw',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                zIndex: 100,
                overflow: 'hidden'
              }}
            >
              {/* Buscador */}
              <div style={{ padding: '12px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-canvas)' }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar sede por nombre o prefijo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    background: 'var(--color-surface)',
                    boxSizing: 'border-box'
                  }}
                />

                {/* Filtros rápidos por tipo */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                  {(['ALL', 'PRINCIPAL', 'TIENDA', 'MERMA'] as const).map((t) => {
                    const count =
                      t === 'ALL'
                        ? counts.total
                        : t === 'PRINCIPAL'
                        ? counts.principal
                        : t === 'TIENDA'
                        ? counts.tienda
                        : counts.merma
                    const label =
                      t === 'ALL'
                        ? 'Todas'
                        : t === 'PRINCIPAL'
                        ? 'Principal'
                        : t === 'TIENDA'
                        ? 'Tienda'
                        : 'Merma'
                    const isSelected = typeFilter === t

                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTypeFilter(t)}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: isSelected ? '1px solid var(--color-brand)' : '1px solid var(--color-border)',
                          background: isSelected ? 'var(--color-brand)' : 'var(--color-surface)',
                          color: isSelected ? '#FFFFFF' : 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 600 : 500
                        }}
                      >
                        {label} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Lista de sedes */}
              <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '6px' }}>
                {filteredWarehouses.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                    No se encontraron sedes coincidentes.
                  </div>
                ) : (
                  filteredWarehouses.map((wh) => {
                    const isCurrent = wh.id_almacen === selectedWarehouseId

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
                          width: '100%',
                          padding: '10px 12px',
                          border: 0,
                          borderRadius: '6px',
                          background: isCurrent ? 'var(--color-brand-soft)' : 'transparent',
                          color: isCurrent ? 'var(--color-brand-deep)' : 'var(--color-text-primary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.12s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isCurrent) e.currentTarget.style.background = 'var(--color-canvas)'
                        }}
                        onMouseLeave={(e) => {
                          if (!isCurrent) e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '13.5px' }}>{wh.nombre}</strong>
                            {isCurrent && (
                              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-brand)' }}>
                                (Activa)
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                            <span
                              style={{
                                fontSize: '10.5px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                ...getTipoBadgeStyle(wh.tipo)
                              }}
                            >
                              {formatTipoLabel(wh.tipo)}
                            </span>
                            {wh.prefijo_rfid && (
                              <span style={{ fontFamily: 'monospace', fontSize: '10.5px', color: 'var(--color-text-secondary)' }}>
                                Tag: {wh.prefijo_rfid}
                              </span>
                            )}
                          </div>
                        </div>

                        {wh.capacidad_m3 && (
                          <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                            {Number(wh.capacidad_m3).toLocaleString()} m³
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
