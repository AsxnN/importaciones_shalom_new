import { useEffect, useState, type FormEvent } from 'react'
import type { Warehouse } from '../types'

export function generateWarehousePrefix(name: string): string {
  if (!name || !name.trim()) return ''
  const clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
  const words = clean.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) {
    return words[0].substring(0, 3).toUpperCase()
  }
  return words.map((w) => w.substring(0, 3).toUpperCase()).join('')
}

type Props = {
  isOpen: boolean
  onClose: () => void
  editingWh: Warehouse | null
  onSaveWarehouse: (payload: {
    nombre: string
    tipo: 'PRINCIPAL' | 'TIENDA' | 'MERMA'
    capacidad_m3: number | null
    activo: boolean
    prefijo_rfid: string
  }) => Promise<void> | void
  saving: boolean
}

export function WarehouseCrudModal({ isOpen, onClose, editingWh, onSaveWarehouse, saving }: Props) {
  const [whNombre, setWhNombre] = useState('')
  const [whPrefijo, setWhPrefijo] = useState('')
  const [whPrefijoCustom, setWhPrefijoCustom] = useState(false)
  const [whTipo, setWhTipo] = useState<'PRINCIPAL' | 'TIENDA' | 'MERMA'>('PRINCIPAL')
  const [whCapacidad, setWhCapacidad] = useState('100')
  const [whActivo, setWhActivo] = useState(true)

  useEffect(() => {
    if (isOpen) {
      if (editingWh) {
        setWhNombre(editingWh.nombre)
        setWhPrefijo(editingWh.prefijo_rfid || generateWarehousePrefix(editingWh.nombre))
        setWhPrefijoCustom(Boolean(editingWh.prefijo_rfid))
        setWhTipo(editingWh.tipo)
        setWhCapacidad(editingWh.capacidad_m3 ? String(editingWh.capacidad_m3) : '100')
        setWhActivo(editingWh.activo)
      } else {
        setWhNombre('')
        setWhPrefijo('')
        setWhPrefijoCustom(false)
        setWhTipo('PRINCIPAL')
        setWhCapacidad('200')
        setWhActivo(true)
      }
    }
  }, [isOpen, editingWh])

  if (!isOpen) return null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const cleanNombre = whNombre.trim()
    if (!cleanNombre) return

    const cleanPrefijo = (whPrefijo.trim() || generateWarehousePrefix(cleanNombre)).toUpperCase()

    void onSaveWarehouse({
      nombre: cleanNombre,
      tipo: whTipo,
      capacidad_m3: whCapacidad ? Math.max(1, Number(whCapacidad)) : null,
      activo: whActivo,
      prefijo_rfid: cleanPrefijo
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Gestión de infraestructura</p>
            <h3>{editingWh ? `Editar Almacén: ${editingWh.nombre}` : 'Registrar Nuevo Almacén o Sede'}</h3>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.86rem' }}>
              Define las especificaciones de capacidad y propósito logístico del almacén.
            </p>
          </div>
          <button className="modal-close-btn" type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <label style={{ display: 'grid', gap: '6px', fontWeight: 700, fontSize: '0.88rem' }}>
              Nombre del Almacén / Sede
              <input
                type="text"
                value={whNombre}
                onChange={(e) => {
                  const val = e.target.value
                  setWhNombre(val)
                  if (!whPrefijoCustom) {
                    setWhPrefijo(generateWarehousePrefix(val))
                  }
                }}
                placeholder="Ej. Almacén Callao, Tienda Breña, etc."
                required
              />
            </label>

            <label style={{ display: 'grid', gap: '6px', fontWeight: 700, fontSize: '0.88rem' }}>
              Código / Prefijo RFID Oficial
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={whPrefijo}
                  maxLength={10}
                  onChange={(e) => {
                    setWhPrefijoCustom(true)
                    setWhPrefijo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  }}
                  placeholder="Ej. IMP, STO, ABA, CON"
                  style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}
                  required
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    setWhPrefijo(generateWarehousePrefix(whNombre))
                    setWhPrefijoCustom(false)
                  }}
                  title="Regenerar con las 3 primeras letras de cada palabra"
                >
                  Generar prefijo
                </button>
              </div>
              <span className="muted" style={{ fontSize: '0.8rem', fontWeight: 400 }}>
                Se genera automáticamente tomando las 3 primeras letras de cada palabra. Se usará para los correlativos
                de paletas (ej. {whPrefijo || 'ALM'}00001).
              </span>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <label style={{ display: 'grid', gap: '6px', fontWeight: 700, fontSize: '0.88rem' }}>
                Tipo de Almacén
                <select
                  value={whTipo}
                  onChange={(e) => setWhTipo(e.target.value as any)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)'
                  }}
                  required
                >
                  <option value="PRINCIPAL">Principal (Hub logístico / Central)</option>
                  <option value="TIENDA">Tienda (Punto de venta / Despacho)</option>
                  <option value="MERMA">Merma (Zona de descarte y averías)</option>
                </select>
              </label>

              <label style={{ display: 'grid', gap: '6px', fontWeight: 700, fontSize: '0.88rem' }}>
                Capacidad Máxima (m³)
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={whCapacidad}
                  onChange={(e) => setWhCapacidad(e.target.value)}
                  placeholder="Ej. 500"
                  required
                />
              </label>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: '6px 0' }}>
              <input
                type="checkbox"
                checked={whActivo}
                onChange={(e) => setWhActivo(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-brand)' }}
              />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Sede operativa activa</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button className="btn-secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Guardando almacén…' : editingWh ? 'Actualizar almacén' : 'Crear almacén'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
