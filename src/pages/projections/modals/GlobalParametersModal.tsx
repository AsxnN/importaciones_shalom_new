import type React from 'react'

interface GlobalParametersModalProps {
  isOpen: boolean
  onClose: () => void
  formLeadTime: number
  setFormLeadTime: (val: number) => void
  formSeguridadPct: number
  setFormSeguridadPct: (val: number) => void
  formFactorCompra: number
  setFormFactorCompra: (val: number) => void
  formDiasMes: number
  setFormDiasMes: (val: number) => void
  isSaving: boolean
  onSave: (e: React.FormEvent) => Promise<void> | void
}

export function GlobalParametersModal({
  isOpen,
  onClose,
  formLeadTime,
  setFormLeadTime,
  formSeguridadPct,
  setFormSeguridadPct,
  formFactorCompra,
  setFormFactorCompra,
  formDiasMes,
  setFormDiasMes,
  isSaving,
  onSave
}: GlobalParametersModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '540px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--color-text-primary)'
            }}
          >
            Parámetros globales de la proyección
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Reconfigura las variables maestras de tiempo de tránsito, factor de reposición y margen
          de seguridad. Al guardar, toda la matriz grupal se recalculará automáticamente.
        </p>

        <form
          onSubmit={(e) => void onSave(e)}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '4px'
              }}
            >
              Tiempo de tránsito marítimo (Lead time en meses)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              required
              value={formLeadTime}
              onChange={(e) => setFormLeadTime(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '4px'
              }}
            >
              Margen de stock de seguridad (%)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              required
              value={formSeguridadPct}
              onChange={(e) => setFormSeguridadPct(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '4px'
              }}
            >
              Factor de ciclo de compra (Multiplicador de pedido)
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              required
              value={formFactorCompra}
              onChange={(e) => setFormFactorCompra(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '4px'
              }}
            >
              Días promedio por mes
            </label>
            <input
              type="number"
              step="1"
              min="28"
              max="31"
              required
              value={formDiasMes}
              onChange={(e) => setFormDiasMes(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '14px'
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '12px'
            }}
          >
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="button primary" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Aplicar y recalcular matriz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
