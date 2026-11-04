import { useState } from 'react'
import type { ContainerPhoto, ContainerRecord } from '../../types/containers'
import { containerService } from '../../services/containerService'

interface Props {
  container: ContainerRecord | null
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
  onOpenReceptions?: (containerId: number) => void
}

export function ContainerDetailModal({
  container,
  isOpen,
  onClose,
  onUpdated,
  onOpenReceptions
}: Props) {
  const [selectedPhoto, setSelectedPhoto] = useState<ContainerPhoto | null>(null)
  
  // Modos de acción rápida
  const [showCrewArrivalForm, setShowCrewArrivalForm] = useState(false)
  const [showCrewDepartureForm, setShowCrewDepartureForm] = useState(false)
  const [showContainerDepartureForm, setShowContainerDepartureForm] = useState(false)
  const [showAddPhotoForm, setShowAddPhotoForm] = useState(false)

  // Campos de formulario rápido
  const now = new Date()
  const initialTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const [actionTime, setActionTime] = useState(initialTime)
  const [actionPhotoUrl, setActionPhotoUrl] = useState('')
  const [actionCaption, setActionCaption] = useState('')
  const [actionPhotoTipo, setActionPhotoTipo] = useState<any>('OTRO')

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen || !container) return null

  // Cálculo de tiempo en patio
  const calculateDuration = (startStr?: string | null, endStr?: string | null) => {
    if (!startStr) return '-'
    const start = new Date(startStr).getTime()
    const end = endStr ? new Date(endStr).getTime() : Date.now()
    const diffMs = Math.max(0, end - start)
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const hrs = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hrs}h ${mins}m`
  }

  // Cálculo decimal de horas para pago de cuadrilla
  const calculateCrewDecimalHours = (startStr?: string | null, endStr?: string | null) => {
    if (!startStr || !endStr) return null
    const diffMs = Math.max(0, new Date(endStr).getTime() - new Date(startStr).getTime())
    const hours = diffMs / (1000 * 60 * 60)
    return hours.toFixed(2)
  }

  const handleRegisterCrewArrival = async () => {
    setSaving(true)
    setErrorMsg(null)
    const today = new Date().toISOString().split('T')[0]
    const fullTime = `${today}T${actionTime}:00`

    let photoObj: ContainerPhoto | undefined
    if (actionPhotoUrl.trim()) {
      photoObj = {
        id: `foto-${Date.now()}`,
        url: actionPhotoUrl.trim(),
        tipo: 'CUADRILLA_LLEGADA',
        caption: actionCaption.trim() || 'Llegada de cuadrilla externa',
        timestamp: new Date().toISOString()
      }
    }

    const res = await containerService.registerCrewArrival(container.id_contenedor, fullTime, photoObj)
    setSaving(false)
    if (!res.success) {
      setErrorMsg(res.error || 'Error al registrar llegada de cuadrilla.')
    } else {
      setShowCrewArrivalForm(false)
      setActionPhotoUrl('')
      setActionCaption('')
      onUpdated()
    }
  }

  const handleRegisterCrewDeparture = async () => {
    setSaving(true)
    setErrorMsg(null)
    const today = new Date().toISOString().split('T')[0]
    const fullTime = `${today}T${actionTime}:00`

    let photoObj: ContainerPhoto | undefined
    if (actionPhotoUrl.trim()) {
      photoObj = {
        id: `foto-${Date.now()}`,
        url: actionPhotoUrl.trim(),
        tipo: 'CUADRILLA_SALIDA',
        caption: actionCaption.trim() || 'Salida de cuadrilla externa al término de faena',
        timestamp: new Date().toISOString()
      }
    }

    const res = await containerService.registerCrewDeparture(container.id_contenedor, fullTime, photoObj)
    setSaving(false)
    if (!res.success) {
      setErrorMsg(res.error || 'Error al registrar salida de cuadrilla.')
    } else {
      setShowCrewDepartureForm(false)
      setActionPhotoUrl('')
      setActionCaption('')
      onUpdated()
    }
  }

  const handleRegisterContainerDeparture = async () => {
    setSaving(true)
    setErrorMsg(null)
    const today = new Date().toISOString().split('T')[0]
    const fullTime = `${today}T${actionTime}:00`

    let photoObj: ContainerPhoto | undefined
    if (actionPhotoUrl.trim()) {
      photoObj = {
        id: `foto-${Date.now()}`,
        url: actionPhotoUrl.trim(),
        tipo: 'SALIDA_CAMION',
        caption: actionCaption.trim() || 'Salida de camión / contenedor vacío',
        timestamp: new Date().toISOString()
      }
    }

    const res = await containerService.registerContainerDeparture(container.id_contenedor, fullTime, photoObj)
    setSaving(false)
    if (!res.success) {
      setErrorMsg(res.error || 'Error al registrar salida de contenedor.')
    } else {
      setShowContainerDepartureForm(false)
      setActionPhotoUrl('')
      setActionCaption('')
      onUpdated()
    }
  }

  const handleAddNewPhoto = async () => {
    if (!actionPhotoUrl.trim()) return
    setSaving(true)
    setErrorMsg(null)

    const photoObj: ContainerPhoto = {
      id: `foto-${Date.now()}`,
      url: actionPhotoUrl.trim(),
      tipo: actionPhotoTipo,
      caption: actionCaption.trim() || 'Evidencia fotográfica adicional',
      timestamp: new Date().toISOString()
    }

    const res = await containerService.addPhoto(container.id_contenedor, photoObj)
    setSaving(false)
    if (!res.success) {
      setErrorMsg(res.error || 'Error al agregar foto.')
    } else {
      setShowAddPhotoForm(false)
      setActionPhotoUrl('')
      setActionCaption('')
      onUpdated()
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: '840px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', margin: 0, color: 'var(--color-brand-deep)' }}>
                Contenedor {container.numero_contenedor}
              </h2>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background:
                    container.estado === 'DESPACHADO'
                      ? 'rgba(47, 125, 79, 0.15)'
                      : container.estado === 'EN_DESCARGA'
                      ? 'rgba(22, 125, 141, 0.15)'
                      : 'rgba(188, 121, 31, 0.15)',
                  color:
                    container.estado === 'DESPACHADO'
                      ? 'var(--color-success)'
                      : container.estado === 'EN_DESCARGA'
                      ? 'var(--color-brand)'
                      : 'var(--color-warning)'
                }}
              >
                {container.estado === 'EN_PATIO'
                  ? 'En patio (listo para rampa)'
                  : container.estado === 'EN_DESCARGA'
                  ? 'En descarga activa'
                  : 'Despachado de patio'}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Placa del camión: <strong style={{ color: 'var(--color-text-primary)' }}>{container.placa_camion}</strong>
              {container.empresa_transporte && ` • ${container.empresa_transporte}`}
              {container.nombre_conductor && ` • Conductor: ${container.nombre_conductor}`}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: '#fdf2f2', border: '1px solid var(--color-danger)', borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', color: 'var(--color-danger)', fontSize: '13px' }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Tira de Métricas de Tiempo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px 14px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 500 }}>
                Llegada a patio
              </span>
              <strong style={{ fontSize: '15px', color: 'var(--color-text-primary)', display: 'block', marginTop: '2px' }}>
                {new Date(container.hora_llegada_contenedor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hrs
              </strong>
              <small style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                {new Date(container.hora_llegada_contenedor).toLocaleDateString()}
              </small>
            </div>

            <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px 14px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 500 }}>
                Salida de camión
              </span>
              <strong style={{ fontSize: '15px', color: container.hora_salida_contenedor ? 'var(--color-text-primary)' : 'var(--color-warning)', display: 'block', marginTop: '2px' }}>
                {container.hora_salida_contenedor
                  ? `${new Date(container.hora_salida_contenedor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hrs`
                  : 'En patio / Sin salida'}
              </strong>
              <small style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                {container.hora_salida_contenedor ? new Date(container.hora_salida_contenedor).toLocaleDateString() : 'Aún en rampa'}
              </small>
            </div>

            <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px 14px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 500 }}>
                Permanencia en patio
              </span>
              <strong style={{ fontSize: '16px', color: 'var(--color-brand)', display: 'block', marginTop: '2px' }}>
                {calculateDuration(container.hora_llegada_contenedor, container.hora_salida_contenedor)}
              </strong>
              <small style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                {container.hora_salida_contenedor ? 'Tiempo final cerrado' : 'Contador en transcurso'}
              </small>
            </div>

            <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px 14px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 500 }}>
                Horas cuadrilla a pagar
              </span>
              <strong style={{ fontSize: '16px', color: container.hora_salida_cuadrilla ? 'var(--color-success)' : 'var(--color-text-secondary)', display: 'block', marginTop: '2px' }}>
                {container.tipo_personal === 'PROPIO'
                  ? 'No aplica (Propio)'
                  : container.hora_salida_cuadrilla
                  ? `${calculateCrewDecimalHours(container.hora_llegada_cuadrilla, container.hora_salida_cuadrilla)} hrs`
                  : 'Faena en curso'}
              </strong>
              <small style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                {container.tipo_personal === 'PROPIO' ? 'Equipo interno' : `${container.num_estibadores || 0} estibadores`}
              </small>
            </div>
          </div>

          {/* Bloque Cuadrilla de Descarga */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--color-brand-deep)' }}>
                Control de cuadrilla de descarga
              </h3>
              <span style={{ fontSize: '12px', fontWeight: 600, color: container.tipo_personal === 'PROPIO' ? 'var(--color-brand)' : 'var(--color-warning)' }}>
                {container.tipo_personal === 'PROPIO' ? 'Personal propio de almacén' : 'Cuadrilla externa contratada'}
              </span>
            </div>

            {container.tipo_personal === 'CUADRILLA_EXTERNA' ? (
              <div>
                <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  Proveedor: <strong style={{ color: 'var(--color-text-primary)' }}>{container.nombre_cuadrilla || 'No especificado'}</strong> •
                  Dotación: <strong style={{ color: 'var(--color-text-primary)' }}>{container.num_estibadores || 0} personas</strong>
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--color-canvas)', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>
                      Hora de ingreso cuadrilla
                    </span>
                    {container.hora_llegada_cuadrilla ? (
                      <strong style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        {new Date(container.hora_llegada_cuadrilla).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hrs
                      </strong>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCrewArrivalForm(true)}
                        style={{ marginTop: '4px', padding: '4px 8px', fontSize: '11px', background: 'var(--color-brand)', color: '#fff', border: 0, borderRadius: '4px', cursor: 'pointer' }}
                      >
                        + Registrar llegada cuadrilla
                      </button>
                    )}
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>
                      Hora de salida cuadrilla
                    </span>
                    {container.hora_salida_cuadrilla ? (
                      <div>
                        <strong style={{ fontSize: '14px', color: 'var(--color-success)' }}>
                          {new Date(container.hora_salida_cuadrilla).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hrs
                        </strong>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                          Total: {calculateDuration(container.hora_llegada_cuadrilla, container.hora_salida_cuadrilla)} ({calculateCrewDecimalHours(container.hora_llegada_cuadrilla, container.hora_salida_cuadrilla)} hrs para liquidación)
                        </span>
                      </div>
                    ) : container.hora_llegada_cuadrilla ? (
                      <button
                        type="button"
                        onClick={() => setShowCrewDepartureForm(true)}
                        style={{ marginTop: '4px', padding: '4px 8px', fontSize: '11px', background: 'var(--color-warning)', color: '#fff', border: 0, borderRadius: '4px', cursor: 'pointer' }}
                      >
                        ⏱ Registrar salida y liquidar horas
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Esperando registro de ingreso</span>
                    )}
                  </div>
                </div>

                {/* Formulario rápido llegada cuadrilla */}
                {showCrewArrivalForm && (
                  <div style={{ marginTop: '10px', padding: '10px', background: 'var(--color-surface)', border: '1px dashed var(--color-brand)', borderRadius: '6px' }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: '12px' }}>Registrar llegada de cuadrilla</h4>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="time"
                        value={actionTime}
                        onChange={(e) => setActionTime(e.target.value)}
                        style={{ padding: '5px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                      />
                      <input
                        type="text"
                        placeholder="URL foto de cuadrilla (opcional)"
                        value={actionPhotoUrl}
                        onChange={(e) => setActionPhotoUrl(e.target.value)}
                        style={{ flex: 1, padding: '5px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                      />
                      <button
                        type="button"
                        onClick={handleRegisterCrewArrival}
                        disabled={saving}
                        style={{ padding: '6px 12px', background: 'var(--color-brand)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        {saving ? 'Guardando...' : 'Confirmar llegada'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCrewArrivalForm(false)}
                        style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Formulario rápido salida cuadrilla */}
                {showCrewDepartureForm && (
                  <div style={{ marginTop: '10px', padding: '10px', background: 'var(--color-surface)', border: '1px dashed var(--color-warning)', borderRadius: '6px' }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: '12px' }}>Registrar salida de cuadrilla (Cálculo de horas)</h4>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="time"
                        value={actionTime}
                        onChange={(e) => setActionTime(e.target.value)}
                        style={{ padding: '5px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                      />
                      <input
                        type="text"
                        placeholder="URL foto fin de faena (opcional)"
                        value={actionPhotoUrl}
                        onChange={(e) => setActionPhotoUrl(e.target.value)}
                        style={{ flex: 1, padding: '5px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                      />
                      <button
                        type="button"
                        onClick={handleRegisterCrewDeparture}
                        disabled={saving}
                        style={{ padding: '6px 12px', background: 'var(--color-warning)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        {saving ? 'Liquidando...' : 'Confirmar salida y horas'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCrewDepartureForm(false)}
                        style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                La descarga es ejecutada por personal interno de la empresa. No requiere liquidación de horas externas.
              </p>
            )}
          </div>

          {/* Bloque Salida de Camión / Contenedor */}
          {!container.hora_salida_contenedor && (
            <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)', display: 'block' }}>
                  El camión {container.placa_camion} se encuentra actualmente en patio
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Al registrar la salida del camión, desaparecerá del selector de Recepciones RFID.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowContainerDepartureForm(true)}
                style={{ padding: '7px 14px', background: 'var(--color-danger)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Registrar salida de camión
              </button>
            </div>
          )}

          {showContainerDepartureForm && (
            <div style={{ padding: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-danger)', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--color-danger)' }}>
                Confirmar salida del camión y contenedor vacío
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1.5fr auto auto', gap: '8px' }}>
                <input
                  type="time"
                  value={actionTime}
                  onChange={(e) => setActionTime(e.target.value)}
                  style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
                <input
                  type="text"
                  placeholder="URL foto contenedor vacío / barrido (opcional)"
                  value={actionPhotoUrl}
                  onChange={(e) => setActionPhotoUrl(e.target.value)}
                  style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
                <button
                  type="button"
                  onClick={handleRegisterContainerDeparture}
                  disabled={saving}
                  style={{ padding: '6px 14px', background: 'var(--color-danger)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {saving ? 'Registrando...' : 'Confirmar salida'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowContainerDepartureForm(false)}
                  style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Bloque Evidencias Fotográficas (Máx 10) */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--color-brand-deep)' }}>
                  Evidencias fotográficas registradas
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {container.fotos.length} de 10 fotos adjuntas (guías, precinto, camión, cuadrilla)
                </span>
              </div>

              {container.fotos.length < 10 && !showAddPhotoForm && (
                <button
                  type="button"
                  onClick={() => setShowAddPhotoForm(true)}
                  style={{ padding: '5px 10px', background: 'var(--color-brand)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                >
                  + Adjuntar foto
                </button>
              )}
            </div>

            {showAddPhotoForm && (
              <div style={{ marginBottom: '12px', padding: '10px', background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1.2fr auto auto', gap: '8px' }}>
                  <select
                    value={actionPhotoTipo}
                    onChange={(e) => setActionPhotoTipo(e.target.value)}
                    style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  >
                    <option value="GUIA_REMISION">Guía de remisión</option>
                    <option value="PRECINTO">Precinto cerrado</option>
                    <option value="LLEGADA_CAMION">Camión / Placa</option>
                    <option value="CUADRILLA_LLEGADA">Llegada cuadrilla</option>
                    <option value="CUADRILLA_SALIDA">Salida cuadrilla</option>
                    <option value="SALIDA_CAMION">Contenedor vacío</option>
                    <option value="OTRO">Otro documento</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Descripción de foto"
                    value={actionCaption}
                    onChange={(e) => setActionCaption(e.target.value)}
                    style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  />
                  <input
                    type="url"
                    placeholder="URL de imagen..."
                    value={actionPhotoUrl}
                    onChange={(e) => setActionPhotoUrl(e.target.value)}
                    style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewPhoto}
                    disabled={!actionPhotoUrl.trim() || saving}
                    style={{ padding: '6px 12px', background: 'var(--color-brand)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddPhotoForm(false)}
                    style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {container.fotos.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                No se han adjuntado fotos a este contenedor.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                {container.fotos.map((f, i) => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedPhoto(f)}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: 'var(--color-canvas)',
                      transition: 'transform 0.15s ease'
                    }}
                    title="Clic para ampliar imagen"
                  >
                    <img
                      src={f.url}
                      alt={f.caption}
                      style={{ width: '100%', height: '85px', objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = 'https://placehold.co/130x85?text=Foto'
                      }}
                    />
                    <div style={{ padding: '5px 7px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-brand)', display: 'block' }}>
                        #{i + 1} {f.tipo.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-primary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.caption}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {container.observaciones && (
            <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px 14px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 600 }}>
                Observaciones generales de patio
              </span>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                {container.observaciones}
              </p>
            </div>
          )}

          {/* Footer de Acciones */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '14px', marginTop: '4px' }}>
            <div>
              {!container.hora_salida_contenedor && onOpenReceptions && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenReceptions(container.id_contenedor)
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--color-brand)',
                    color: '#fff',
                    border: 0,
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Ir a Recepciones RFID para descargar este contenedor
                </button>
              )}
            </div>

            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Cerrar ficha
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox / Modal de Foto Ampliada */}
      {selectedPhoto && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedPhoto(null)}
          style={{ zIndex: 1100, background: 'rgba(0,0,0,0.85)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', background: '#fff', borderRadius: '8px', overflow: 'hidden', padding: '12px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--color-brand)' }}>
                  {selectedPhoto.tipo.replace('_', ' ')}
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#333' }}>
                  {selectedPhoto.caption}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                style={{ background: 'transparent', border: 0, fontSize: '18px', cursor: 'pointer', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption}
              style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', display: 'block', margin: '0 auto', borderRadius: '4px' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
