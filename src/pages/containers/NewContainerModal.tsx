import { useState, type FormEvent } from 'react'
import type { NewContainerPayload } from '../../types/containers'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (payload: NewContainerPayload) => Promise<{ success: boolean; error?: string }>
}

export function NewContainerModal({ isOpen, onClose, onSave }: Props) {
  const [numeroContenedor, setNumeroContenedor] = useState('')
  const [placaCamion, setPlacaCamion] = useState('')
  const [empresaTransporte, setEmpresaTransporte] = useState('')
  const [nombreConductor, setNombreConductor] = useState('')
  const [telefonoConductor, setTelefonoConductor] = useState('')

  // Hora de llegada (formato HH:MM local)
  const now = new Date()
  const initialTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const [horaLlegadaTime, setHoraLlegadaTime] = useState(initialTime)

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleReset = () => {
    setNumeroContenedor('')
    setPlacaCamion('')
    setEmpresaTransporte('')
    setNombreConductor('')
    setTelefonoConductor('')
    setHoraLlegadaTime(initialTime)
    setErrorMsg(null)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!numeroContenedor.trim()) {
      setErrorMsg('El número de contenedor es obligatorio.')
      return
    }
    if (!placaCamion.trim()) {
      setErrorMsg('La placa del camión es obligatoria.')
      return
    }
    if (!horaLlegadaTime.trim()) {
      setErrorMsg('La hora de llegada es obligatoria.')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    const today = new Date().toISOString().split('T')[0]
    const fullHoraLlegadaContenedor = `${today}T${horaLlegadaTime}:00`

    const payload: NewContainerPayload = {
      numero_contenedor: numeroContenedor.trim().toUpperCase(),
      placa_camion: placaCamion.trim().toUpperCase(),
      empresa_transporte: empresaTransporte.trim(),
      nombre_conductor: nombreConductor.trim(),
      telefono_conductor: telefonoConductor.trim(),
      hora_llegada_contenedor: fullHoraLlegadaContenedor,
      tipo_personal: 'PROPIO',
      fotos: []
    }

    const res = await onSave(payload)
    setSaving(false)

    if (!res.success) {
      setErrorMsg(res.error || 'Error al guardar el contenedor.')
    } else {
      handleReset()
      onClose()
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', margin: 0, color: 'var(--color-brand-deep)' }}>
              Registrar llegada de contenedor
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Ingrese los datos de garita del contenedor y transporte para crear el registro en patio.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={handleClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: '#fdf2f2',
              border: '1px solid var(--color-danger)',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '14px',
              color: 'var(--color-danger)',
              fontSize: '13px'
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '5px' }}>
                  Número del contenedor *
                </label>
                <input
                  type="text"
                  placeholder="Ej: MSCU-982145-2"
                  value={numeroContenedor}
                  onChange={(e) => setNumeroContenedor(e.target.value.toUpperCase())}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '14px',
                    background: 'var(--color-surface)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '5px' }}>
                  Placa del camión / tracto *
                </label>
                <input
                  type="text"
                  placeholder="Ej: D3F-821"
                  value={placaCamion}
                  onChange={(e) => setPlacaCamion(e.target.value.toUpperCase())}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '14px',
                    background: 'var(--color-surface)'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '5px' }}>
                  Hora de llegada *
                </label>
                <input
                  type="time"
                  value={horaLlegadaTime}
                  onChange={(e) => setHoraLlegadaTime(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '14px',
                    background: 'var(--color-surface)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '5px' }}>
                  Empresa de transporte
                </label>
                <input
                  type="text"
                  placeholder="Ej: Transportes TransMarítimo SAC"
                  value={empresaTransporte}
                  onChange={(e) => setEmpresaTransporte(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '14px',
                    background: 'var(--color-surface)'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '5px' }}>
                  Nombre del conductor
                </label>
                <input
                  type="text"
                  placeholder="Ej: Carlos Mendoza Paredes"
                  value={nombreConductor}
                  onChange={(e) => setNombreConductor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '14px',
                    background: 'var(--color-surface)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '5px' }}>
                  Teléfono del conductor
                </label>
                <input
                  type="text"
                  placeholder="Ej: +51 984 123 456"
                  value={telefonoConductor}
                  onChange={(e) => setTelefonoConductor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '14px',
                    background: 'var(--color-surface)'
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--color-brand-soft)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '10px 14px',
              fontSize: '12px',
              color: 'var(--color-text-primary)',
              lineHeight: 1.4
            }}
          >
            <strong>Información:</strong> Al registrar la llegada, el contenedor aparecerá en la lista de patio.
            Podrás hacer clic en <strong>Ver ficha</strong> para gestionar el control de cuadrilla, subir las fotos requeridas e indicar la salida del camión.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              className="button secondary"
              onClick={handleClose}
              disabled={saving}
              style={{ fontSize: '13px' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: 'var(--color-brand)',
                color: '#fff',
                border: 0,
                borderRadius: '6px',
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Registrando...' : '+ Registrar contenedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
