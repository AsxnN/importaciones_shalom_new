import type React from 'react'

interface AddMonthModalProps {
  isOpen: boolean
  onClose: () => void
  newMonthName: string
  setNewMonthName: (val: string) => void
  isAdding: boolean
  onAdd: (e: React.FormEvent) => Promise<void> | void
}

export function AddMonthModal({
  isOpen,
  onClose,
  newMonthName,
  setNewMonthName,
  isAdding,
  onAdd
}: AddMonthModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '420px' }}>
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
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-text-primary)'
            }}
          >
            Agregar nueva columna de mes
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

        <form
          onSubmit={(e) => void onAdd(e)}
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
              Nombre del mes (ej. AGO, SET, OCT)
            </label>
            <input
              type="text"
              required
              placeholder="Ej. AGO"
              value={newMonthName}
              onChange={(e) => setNewMonthName(e.target.value.toUpperCase())}
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
              marginTop: '8px'
            }}
          >
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="button primary" disabled={isAdding}>
              {isAdding ? 'Agregando...' : 'Agregar columna'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
