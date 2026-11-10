import { useMemo } from 'react'

export interface WarehouseOccupancyItem {
  id_almacen: number
  nombre: string
  prefijo: string
  totalCapacidadPaletas: number
  paletasEnRack: number
  paletasEnCampo: number
}

interface Props {
  warehouses?: WarehouseOccupancyItem[]
  onSelectWarehouse?: (idAlmacen: number) => void
}

export function WarehouseCapacityChart({ warehouses, onSelectWarehouse }: Props) {
  const defaultWarehouses: WarehouseOccupancyItem[] = useMemo(() => [
    {
      id_almacen: 1,
      nombre: 'Almacén Importaciones (Central)',
      prefijo: 'IMP',
      totalCapacidadPaletas: 120,
      paletasEnRack: 92,
      paletasEnCampo: 6
    },
    {
      id_almacen: 2,
      nombre: 'Almacén Store (Retail)',
      prefijo: 'STO',
      totalCapacidadPaletas: 80,
      paletasEnRack: 46,
      paletasEnCampo: 3
    },
    {
      id_almacen: 3,
      nombre: 'Almacén Abastecimiento',
      prefijo: 'ABA',
      totalCapacidadPaletas: 150,
      paletasEnRack: 132,
      paletasEnCampo: 8
    },
    {
      id_almacen: 4,
      nombre: 'Almacén Construcción y Mantenimiento',
      prefijo: 'CON',
      totalCapacidadPaletas: 90,
      paletasEnRack: 41,
      paletasEnCampo: 0
    }
  ], [])

  const list = warehouses && warehouses.length > 0 ? warehouses : defaultWarehouses

  // Totales generales
  const totalRacks = list.reduce((acc, w) => acc + w.paletasEnRack, 0)
  const totalCampo = list.reduce((acc, w) => acc + w.paletasEnCampo, 0)
  const totalCap = list.reduce((acc, w) => acc + w.totalCapacidadPaletas, 0)
  const ocupacionGlobal = totalCap > 0 ? Math.round(((totalRacks + totalCampo) / totalCap) * 100) : 0

  return (
    <div
      className="panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '20px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        height: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="section-title" style={{ margin: 0, fontSize: '16px', color: 'var(--color-brand-deep)' }}>
              Ocupación y estiba por almacén
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                background: ocupacionGlobal > 90 ? '#FDF2F0' : ocupacionGlobal > 80 ? '#FFFBF0' : '#EAF5ED',
                color: ocupacionGlobal > 90 ? 'var(--color-danger)' : ocupacionGlobal > 80 ? 'var(--color-warning)' : 'var(--color-success)',
                border: `1px solid ${ocupacionGlobal > 90 ? '#F8CECA' : ocupacionGlobal > 80 ? '#FCEAC4' : '#CBE5D3'}`
              }}
            >
              {ocupacionGlobal}% global
            </span>
          </div>
          <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
            Capacidad física en racks vs paletas en piso (zona campo).
          </p>
        </div>
      </div>

      {/* Lista de Barras de Almacén */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
        {list.map((wh) => {
          const pctRack = Math.min(100, Math.round((wh.paletasEnRack / wh.totalCapacidadPaletas) * 100))
          const pctCampo = Math.min(100, Math.round((wh.paletasEnCampo / wh.totalCapacidadPaletas) * 100))
          const pctTotal = Math.min(100, pctRack + pctCampo)

          const isCritical = pctTotal >= 90
          const isWarning = pctTotal >= 80 && !isCritical

          const barColor = isCritical
            ? 'var(--color-danger)'
            : isWarning
            ? 'var(--color-warning)'
            : 'var(--color-brand)'

          return (
            <div
              key={wh.id_almacen}
              onClick={() => onSelectWarehouse && onSelectWarehouse(wh.id_almacen)}
              style={{
                cursor: onSelectWarehouse ? 'pointer' : 'default',
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--color-canvas)',
                border: '1px solid transparent',
                transition: 'border-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (onSelectWarehouse) e.currentTarget.style.borderColor = 'var(--color-border)'
              }}
              onMouseLeave={(e) => {
                if (onSelectWarehouse) e.currentTarget.style.borderColor = 'transparent'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <code style={{ fontSize: '11px', fontWeight: 700, background: 'var(--color-brand-soft)', color: 'var(--color-brand)', padding: '1px 5px', borderRadius: '3px' }}>
                    {wh.prefijo}
                  </code>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {wh.nombre}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {wh.paletasEnCampo > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--color-warning)', fontWeight: 600 }}>
                      ⚠️ {wh.paletasEnCampo} en campo
                    </span>
                  )}
                  <span style={{ fontSize: '12px', fontWeight: 700, color: barColor, minWidth: '38px', textAlign: 'right' }}>
                    {pctTotal}%
                  </span>
                </div>
              </div>

              {/* Barra Stacked: Racks (sólido) + Campo (rayado/suave) */}
              <div style={{ width: '100%', height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                <div
                  style={{
                    width: `${pctRack}%`,
                    height: '100%',
                    background: barColor,
                    transition: 'width 0.3s ease'
                  }}
                  title={`En Rack: ${wh.paletasEnRack} paletas (${pctRack}%)`}
                />
                <div
                  style={{
                    width: `${pctCampo}%`,
                    height: '100%',
                    background: 'var(--color-warning)',
                    opacity: 0.85,
                    transition: 'width 0.3s ease'
                  }}
                  title={`En Zona Campo: ${wh.paletasEnCampo} paletas (${pctCampo}%)`}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                <span>{wh.paletasEnRack} paletas en rack · {wh.paletasEnCampo} en piso</span>
                <span>Capacidad: {wh.totalCapacidadPaletas} pal</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Resumen al pie */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '10px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
        <span>Total estibadas: <strong style={{ color: 'var(--color-text-primary)' }}>{totalRacks} en rack</strong></span>
        <span>Zona de recepción: <strong style={{ color: totalCampo > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>{totalCampo} en campo</strong></span>
      </div>
    </div>
  )
}
