import { useState, useRef, useEffect, useMemo } from 'react'
import type { WarehouseOption } from '../../services/receptionService'

interface Props {
  warehouses: WarehouseOption[]
  selectedWarehouseId: number | null
  onSelectWarehouse: (warehouseId: number) => void
}

export function WarehouseSearchSelector({
  warehouses,
  selectedWarehouseId,
  onSelectWarehouse
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id_almacen === selectedWarehouseId) || warehouses[0] || null
  }, [warehouses, selectedWarehouseId])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Filtro reactivo en tiempo real
  const filteredWarehouses = useMemo(() => {
    if (!searchTerm.trim()) return warehouses
    const q = searchTerm.toLowerCase().trim()
    return warehouses.filter(
      (w) =>
        w.nombre.toLowerCase().includes(q) ||
        (w.prefijo_rfid && w.prefijo_rfid.toLowerCase().includes(q)) ||
        (w.tipo && w.tipo.toLowerCase().includes(q))
    )
  }, [warehouses, searchTerm])

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          padding: '8px 14px',
          cursor: 'pointer',
          fontSize: '13px',
          color: 'var(--color-text-primary)',
          fontWeight: 500,
          boxShadow: 'none',
          transition: 'border-color 0.15s ease'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
          Sede activa:
        </span>
        {selectedWarehouse ? (
          <>
            <span
              style={{
                background: 'var(--color-brand-soft)',
                color: 'var(--color-brand)',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            >
              {selectedWarehouse.prefijo_rfid || 'IMP'}
            </span>
            <span style={{ fontWeight: 600, color: 'var(--color-brand-deep)' }}>
              {selectedWarehouse.nombre}
            </span>
          </>
        ) : (
          <span style={{ color: 'var(--color-text-secondary)' }}>Seleccionar sede</span>
        )}
        <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 1050,
            width: '340px',
            maxWidth: '92vw',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '10px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por nombre, ciudad o prefijo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '13px',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                outline: 'none',
                background: 'var(--color-canvas)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {filteredWarehouses.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                No se encontraron sedes coincidentes.
              </div>
            ) : (
              filteredWarehouses.map((w) => {
                const isSelected = w.id_almacen === selectedWarehouse?.id_almacen
                return (
                  <div
                    key={w.id_almacen}
                    onClick={() => {
                      onSelectWarehouse(w.id_almacen)
                      setIsOpen(false)
                      setSearchTerm('')
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--color-brand-soft)' : 'transparent',
                      borderBottom: '1px solid var(--color-canvas)',
                      transition: 'background 0.1s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--color-canvas)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          background: isSelected ? 'var(--color-brand)' : 'var(--color-canvas)',
                          color: isSelected ? '#FFFFFF' : 'var(--color-text-secondary)',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 5px',
                          borderRadius: '3px'
                        }}
                      >
                        {w.prefijo_rfid || 'IMP'}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500, color: 'var(--color-text-primary)' }}>
                          {w.nombre}
                        </div>
                        {w.tipo && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            Tipo: {w.tipo.charAt(0).toUpperCase() + w.tipo.slice(1).toLowerCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: '12px', color: 'var(--color-brand)', fontWeight: 700 }}>
                        ✓
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div
            style={{
              paddingTop: '8px',
              marginTop: '6px',
              borderTop: '1px solid var(--color-border)',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              textAlign: 'right'
            }}
          >
            {warehouses.length} sedes registradas
          </div>
        </div>
      )}
    </div>
  )
}
