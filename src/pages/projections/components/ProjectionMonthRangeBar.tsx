import type { ProjectionTemplate } from '../../../types/projections'

interface ProjectionMonthRangeBarProps {
  activeTemplate: ProjectionTemplate
  activeMonthsInAverage: string[]
  startMonth: string
  endMonth: string
  ignoreZeroMonths: boolean
  isOrderLocked: boolean
  isUpdatingMonthRange: boolean
  onApplyMonthRange: (newStart: string, newEnd: string, newIgnore: boolean) => Promise<void> | void
  onSetQuickMonthPreset: (preset: 'all' | 'quarter' | 'semester') => void
  onOpenAddMonthModal: () => void
}

export function ProjectionMonthRangeBar({
  activeTemplate,
  activeMonthsInAverage,
  startMonth,
  endMonth,
  ignoreZeroMonths,
  isOrderLocked,
  isUpdatingMonthRange,
  onApplyMonthRange,
  onSetQuickMonthPreset,
  onOpenAddMonthModal
}: ProjectionMonthRangeBarProps) {
  if (!activeTemplate?.columnas_meses || activeTemplate.columnas_meses.length === 0) {
    return null
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-brand)'
              }}
            />
            <h3
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-text-primary)'
              }}
            >
              Rango de meses para cálculo de promedio mensual
            </h3>
          </div>
          <p
            style={{
              margin: '3px 0 0 16px',
              fontSize: '13px',
              color: 'var(--color-text-secondary)'
            }}
          >
            Indica de qué mes a qué mes se calculará el consumo promedio de cada producto:
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px',
              borderRadius: '4px',
              background: 'var(--color-brand-soft)',
              color: 'var(--color-brand-deep)',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <span>{activeMonthsInAverage.length} meses en promedio:</span>
            <span style={{ fontWeight: 500, color: 'var(--color-brand)' }}>
              {activeMonthsInAverage.join(', ')}
            </span>
          </div>

          {!isOrderLocked && (
            <button
              type="button"
              className="button secondary button-sm"
              onClick={onOpenAddMonthModal}
              title="Añadir una columna de mes adicional hacia adelante"
              style={{ fontWeight: 600 }}
            >
              + Agregar mes hacia adelante
            </button>
          )}
        </div>
      </div>

      {/* Selectores de Mes Desde / Hasta y Presets */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          paddingTop: '6px',
          borderTop: '1px solid #EEF3F5'
        }}
      >
        {/* Desde mes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Desde:
          </label>
          <select
            value={startMonth}
            onChange={(e) => void onApplyMonthRange(e.target.value, endMonth, ignoreZeroMonths)}
            style={{
              padding: '6px 10px',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              background: 'var(--color-surface)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-primary)'
            }}
          >
            {activeTemplate.columnas_meses.map((m) => (
              <option key={`start_${m}`} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Hasta mes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Hasta:
          </label>
          <select
            value={endMonth}
            onChange={(e) => void onApplyMonthRange(startMonth, e.target.value, ignoreZeroMonths)}
            style={{
              padding: '6px 10px',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              background: 'var(--color-surface)',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-primary)'
            }}
          >
            {activeTemplate.columnas_meses.map((m) => (
              <option key={`end_${m}`} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Presets Rápidos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginRight: '2px' }}>
            Preajustes:
          </span>
          <button
            type="button"
            className="button secondary button-sm"
            onClick={() => onSetQuickMonthPreset('quarter')}
            title="Calcular con los últimos 3 meses históricos"
          >
            Último trimestre
          </button>
          <button
            type="button"
            className="button secondary button-sm"
            onClick={() => onSetQuickMonthPreset('semester')}
            title="Calcular con los últimos 6 meses históricos"
          >
            Último semestre
          </button>
          <button
            type="button"
            className="button secondary button-sm"
            onClick={() => onSetQuickMonthPreset('all')}
            title="Calcular con todo el histórico disponible"
          >
            Todo el histórico
          </button>
        </div>

        {/* Opción ignorar ceros */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={ignoreZeroMonths}
              onChange={(e) =>
                void onApplyMonthRange(startMonth, endMonth, e.target.checked)
              }
            />
            Ignorar meses con consumo cero
          </label>
          {isUpdatingMonthRange && (
            <span style={{ fontSize: '12px', color: 'var(--color-brand)' }}>
              Recalculando...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
