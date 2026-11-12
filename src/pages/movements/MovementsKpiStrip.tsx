import type { MovementsSummary } from './types'

interface MovementsKpiStripProps {
  summary: MovementsSummary
  activeWarehouseName?: string
}

export function MovementsKpiStrip({ summary, activeWarehouseName }: MovementsKpiStripProps) {
  return (
    <section
      className="indicator-strip"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}
      aria-label="Indicadores operativos de movimientos y transferencias"
    >
      {/* Tarjeta 1: Paletas disponibles en sede */}
      <div className="indicator-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="indicator-label">Paletas físicas en sede</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '12px',
              background: 'var(--color-brand-soft)',
              color: 'var(--color-brand)',
              border: '1px solid rgba(22, 125, 141, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            </svg>
            Disponibles
          </span>
        </div>
        <div className="indicator-value">{summary.totalPaletas.toLocaleString()}</div>
        <span className="indicator-context">
          Cargas activas en {activeWarehouseName || 'esta sede'}
        </span>
      </div>

      {/* Tarjeta 2: Traslados entre sedes */}
      <div className="indicator-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="indicator-label">Traslados entre sedes</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '12px',
              background: 'rgba(22, 125, 141, 0.1)',
              color: 'var(--color-brand)',
              border: '1px solid rgba(22, 125, 141, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m16 3 4 4-4 4" />
              <path d="M20 7H4" />
              <path d="m8 21-4-4 4-4" />
              <path d="M4 17h16" />
            </svg>
            Interalmacén
          </span>
        </div>
        <div className="indicator-value">{summary.totalTransferencias.toLocaleString()}</div>
        <span className="indicator-context">
          Movimientos procesados en la red
        </span>
      </div>

      {/* Tarjeta 3: Salidas y despachos exteriores */}
      <div className="indicator-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="indicator-label">Salidas definitivas</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '12px',
              background: summary.totalSalidas > 0 ? 'rgba(179, 64, 42, 0.08)' : 'var(--color-canvas)',
              color: summary.totalSalidas > 0 ? 'var(--color-danger)' : 'var(--color-text-secondary)',
              border: `1px solid ${summary.totalSalidas > 0 ? 'rgba(179, 64, 42, 0.22)' : 'var(--color-border)'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            Despachos
          </span>
        </div>
        <div className="indicator-value">{summary.totalSalidas.toLocaleString()}</div>
        <span className="indicator-context">
          Ventas, clientes o mermas fuera de sede
        </span>
      </div>

      {/* Tarjeta 4: Total de unidades operadas */}
      <div className="indicator-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="indicator-label">Unidades movilizadas</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '12px',
              background: 'rgba(47, 125, 79, 0.1)',
              color: 'var(--color-success)',
              border: '1px solid rgba(47, 125, 79, 0.28)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Kardex activo
          </span>
        </div>
        <div className="indicator-value">{summary.totalUnidadesMovidas.toLocaleString()}</div>
        <span className="indicator-context">
          Artículos registrados en bitácora
        </span>
      </div>
    </section>
  )
}
