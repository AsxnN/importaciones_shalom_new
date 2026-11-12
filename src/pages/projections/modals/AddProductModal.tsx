import type React from 'react'

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  newProductName: string
  setNewProductName: (val: string) => void
  newProductStock: number
  setNewProductStock: (val: number) => void
  isAdding: boolean
  onAdd: (e: React.FormEvent) => Promise<void> | void
}

export function AddProductModal({
  isOpen,
  onClose,
  newProductName,
  setNewProductName,
  newProductStock,
  setNewProductStock,
  isAdding,
  onAdd
}: AddProductModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '440px' }}>
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
            Agregar producto a la proyección
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
              Nombre del producto o suministro *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. CINTA DE EMBALAJE 3 PULGADAS"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
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
              Stock inicial disponible
            </label>
            <input
              type="number"
              min="0"
              value={newProductStock}
              onChange={(e) => setNewProductStock(Number(e.target.value))}
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
              {isAdding ? 'Guardando...' : 'Agregar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
