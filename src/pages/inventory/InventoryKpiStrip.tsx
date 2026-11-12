type Props = {
  summary: {
    totalPaletas: number
    totalPuchos: number
    totalCajasPuchos: number
    totalUnidades: number
    itemsCount: number
  }
  activePalletsCount: number
  warehouseName?: string
}

export function InventoryKpiStrip({ summary, activePalletsCount, warehouseName }: Props) {
  return (
    <section
      className="indicator-strip"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}
      aria-label="Indicadores clave de existencias"
    >
      <div className="indicator-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="indicator-label">Paletas completas</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '12px',
              background: 'var(--color-brand-soft)',
              color: 'var(--color-brand)',
              border: '1px solid var(--color-border)'
            }}
          >
            Activas
          </span>
        </div>
        <div className="indicator-value">{summary.totalPaletas}</div>
        <span className="indicator-context">
          {activePalletsCount} física(s) con chip RFID activo
        </span>
      </div>

      <div className="indicator-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="indicator-label">Paletas pucho</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '12px',
              background: summary.totalPuchos > 0 ? 'rgba(188, 121, 31, 0.1)' : 'var(--color-canvas)',
              color: summary.totalPuchos > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)',
              border: `1px solid ${summary.totalPuchos > 0 ? 'rgba(188, 121, 31, 0.28)' : 'var(--color-border)'}`
            }}
          >
            Cajas sueltas
          </span>
        </div>
        <div className="indicator-value">{summary.totalPuchos}</div>
        <span className="indicator-context">
          {summary.totalCajasPuchos} caja(s) pendientes de unificar
        </span>
      </div>

      <div className="indicator-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="indicator-label">Total unidades en stock</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '12px',
              background: 'rgba(47, 125, 79, 0.1)',
              color: 'var(--color-success)',
              border: '1px solid rgba(47, 125, 79, 0.28)'
            }}
          >
            Disponible
          </span>
        </div>
        <div className="indicator-value">{summary.totalUnidades.toLocaleString()}</div>
        <span className="indicator-context">
          Inventario registrado en esta sede
        </span>
      </div>

      <div className="indicator-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="indicator-label">Artículos con existencias</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '12px',
              background: 'var(--color-canvas)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)'
            }}
          >
            Catálogo
          </span>
        </div>
        <div className="indicator-value">{summary.itemsCount}</div>
        <span className="indicator-context">
          SKUs activos en {warehouseName || 'la sede'}
        </span>
      </div>
    </section>
  )
}
