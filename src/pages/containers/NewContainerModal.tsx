import { useState, type FormEvent } from 'react'
import type { ContainerPhoto, ContainerPhotoType, CrewType, NewContainerPayload } from '../../types/containers'

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

  // Cuadrilla
  const [tipoPersonal, setTipoPersonal] = useState<CrewType>('PROPIO')
  const [cuadrillaPresente, setCuadrillaPresente] = useState(false)
  const [nombreCuadrilla, setNombreCuadrilla] = useState('')
  const [numEstibadores, setNumEstibadores] = useState(6)
  const [horaLlegadaCuadrillaTime, setHoraLlegadaCuadrillaTime] = useState(initialTime)

  // Fotos (límite 10)
  const [fotos, setFotos] = useState<ContainerPhoto[]>([])
  const [tempPhotoUrl, setTempPhotoUrl] = useState('')
  const [tempPhotoCaption, setTempPhotoCaption] = useState('')
  const [tempPhotoTipo, setTempPhotoTipo] = useState<ContainerPhotoType>('LLEGADA_CAMION')

  const [observaciones, setObservaciones] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAddPhoto = () => {
    if (fotos.length >= 10) {
      setErrorMsg('No es posible agregar más de 10 fotos de evidencia.')
      return
    }
    if (!tempPhotoUrl.trim()) {
      setErrorMsg('Por favor ingrese la URL o suba la imagen.')
      return
    }

    const newPhoto: ContainerPhoto = {
      id: `foto-${Date.now()}`,
      url: tempPhotoUrl.trim(),
      tipo: tempPhotoTipo,
      caption: tempPhotoCaption.trim() || 'Evidencia fotográfica',
      timestamp: new Date().toISOString()
    }

    setFotos([...fotos, newPhoto])
    setTempPhotoUrl('')
    setTempPhotoCaption('')
    setErrorMsg(null)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (fotos.length >= 10) {
      setErrorMsg('Límite de 10 fotos alcanzado.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const newPhoto: ContainerPhoto = {
          id: `foto-${Date.now()}`,
          url: reader.result,
          tipo: tempPhotoTipo,
          caption: tempPhotoCaption.trim() || file.name,
          timestamp: new Date().toISOString()
        }
        setFotos((prev) => [...prev, newPhoto])
        setTempPhotoCaption('')
        setErrorMsg(null)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = (id: string) => {
    setFotos(fotos.filter((f) => f.id !== id))
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

    setSaving(true)
    setErrorMsg(null)

    // Construir fechas completas a partir del tiempo
    const today = new Date().toISOString().split('T')[0]
    const fullHoraLlegadaContenedor = `${today}T${horaLlegadaTime}:00`
    const fullHoraLlegadaCuadrilla =
      tipoPersonal === 'CUADRILLA_EXTERNA' && cuadrillaPresente
        ? `${today}T${horaLlegadaCuadrillaTime}:00`
        : null

    const payload: NewContainerPayload = {
      numero_contenedor: numeroContenedor,
      placa_camion: placaCamion,
      empresa_transporte: empresaTransporte,
      nombre_conductor: nombreConductor,
      telefono_conductor: telefonoConductor,
      hora_llegada_contenedor: fullHoraLlegadaContenedor,
      tipo_personal: tipoPersonal,
      nombre_cuadrilla: tipoPersonal === 'CUADRILLA_EXTERNA' ? nombreCuadrilla : 'Personal propio de almacén',
      num_estibadores: tipoPersonal === 'CUADRILLA_EXTERNA' ? numEstibadores : 0,
      hora_llegada_cuadrilla: fullHoraLlegadaCuadrilla,
      fotos,
      observaciones
    }

    const res = await onSave(payload)
    setSaving(false)

    if (!res.success) {
      setErrorMsg(res.error || 'Error al guardar el contenedor.')
    } else {
      onClose()
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: '780px', width: '100%', maxHeight: '90vh' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', margin: 0, color: 'var(--color-brand-deep)' }}>
              Registrar llegada de contenedor
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Ingreso de vehículo a patio de maniobras, control de cuadrilla y evidencias fotográficas.
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Bloque 1: Vehículo y Contenedor */}
          <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px', color: 'var(--color-brand-deep)' }}>
              1. Datos del transporte y contenedor
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Número de contenedor *
                </label>
                <input
                  type="text"
                  placeholder="Ej: MSCU-982145-2"
                  value={numeroContenedor}
                  onChange={(e) => setNumeroContenedor(e.target.value.toUpperCase())}
                  required
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Placa del camión / tracto *
                </label>
                <input
                  type="text"
                  placeholder="Ej: D3F-821"
                  value={placaCamion}
                  onChange={(e) => setPlacaCamion(e.target.value.toUpperCase())}
                  required
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Hora llegada *
                </label>
                <input
                  type="time"
                  value={horaLlegadaTime}
                  onChange={(e) => setHoraLlegadaTime(e.target.value)}
                  required
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Empresa de transporte
                </label>
                <input
                  type="text"
                  placeholder="Ej: Transportes TransMarítimo SAC"
                  value={empresaTransporte}
                  onChange={(e) => setEmpresaTransporte(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Conductor
                </label>
                <input
                  type="text"
                  placeholder="Nombre de chofer"
                  value={nombreConductor}
                  onChange={(e) => setNombreConductor(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Teléfono conductor
                </label>
                <input
                  type="text"
                  placeholder="+51 987 654 321"
                  value={telefonoConductor}
                  onChange={(e) => setTelefonoConductor(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Cuadrilla de Apoyo */}
          <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px', color: 'var(--color-brand-deep)' }}>
              2. Personal de descarga y estiba
            </h3>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="tipoPersonal"
                  checked={tipoPersonal === 'PROPIO'}
                  onChange={() => setTipoPersonal('PROPIO')}
                />
                Personal propio de almacén
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="tipoPersonal"
                  checked={tipoPersonal === 'CUADRILLA_EXTERNA'}
                  onChange={() => setTipoPersonal('CUADRILLA_EXTERNA')}
                />
                Cuadrilla de apoyo externa (servicio contratado)
              </label>
            </div>

            {tipoPersonal === 'CUADRILLA_EXTERNA' && (
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    id="chkCuadrilla"
                    checked={cuadrillaPresente}
                    onChange={(e) => setCuadrillaPresente(e.target.checked)}
                  />
                  <label htmlFor="chkCuadrilla" style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                    La cuadrilla ya se encuentra presente en patio (registrar hora de ingreso)
                  </label>
                </div>

                {cuadrillaPresente ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 120px 140px', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                        Empresa / Proveedor de estiba
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Estibas y Cargas Rápidas SAC"
                        value={nombreCuadrilla}
                        onChange={(e) => setNombreCuadrilla(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                        N° Estibadores
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={numEstibadores}
                        onChange={(e) => setNumEstibadores(Number(e.target.value))}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                        Hora llegada cuadrilla
                      </label>
                      <input
                        type="time"
                        value={horaLlegadaCuadrillaTime}
                        onChange={(e) => setHoraLlegadaCuadrillaTime(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-warning)' }}>
                    ℹ Podrás registrar la hora exacta de llegada de la cuadrilla más tarde cuando se presenten en la garita.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bloque 3: Evidencias Fotográficas (Límite 10) */}
          <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--color-brand-deep)' }}>
                3. Evidencias fotográficas (Guías, precinto, camión)
              </h3>
              <span style={{ fontSize: '12px', fontWeight: 600, color: fotos.length >= 10 ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                {fotos.length} de 10 fotos subidas
              </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 10px' }}>
              Suba las fotos de las guías de remisión (3 a 4 fotos recomendadas), foto del camión/placa, precinto cerrado y personal.
            </p>

            {/* Selector para agregar nueva foto */}
            {fotos.length < 10 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1.2fr 1fr auto', gap: '8px', alignItems: 'flex-end', marginBottom: '12px', background: 'var(--color-surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Tipo de evidencia
                  </label>
                  <select
                    value={tempPhotoTipo}
                    onChange={(e) => setTempPhotoTipo(e.target.value as ContainerPhotoType)}
                    style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  >
                    <option value="LLEGADA_CAMION">Camión / Placa</option>
                    <option value="PRECINTO">Precinto cerrado</option>
                    <option value="GUIA_REMISION">Guía de remisión</option>
                    <option value="APERTURA_PUERTAS">Apertura puertas</option>
                    <option value="CUADRILLA_LLEGADA">Llegada cuadrilla</option>
                    <option value="OTRO">Otro documento</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Descripción breve
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Guía de remisión electrónica 001-4912"
                    value={tempPhotoCaption}
                    onChange={(e) => setTempPhotoCaption(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Archivo o URL de imagen
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ fontSize: '11px', width: '120px' }}
                    />
                    <input
                      type="url"
                      placeholder="o pegue URL..."
                      value={tempPhotoUrl}
                      onChange={(e) => setTempPhotoUrl(e.target.value)}
                      style={{ flex: 1, padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleAddPhoto}
                    disabled={!tempPhotoUrl.trim()}
                    style={{ padding: '6px 12px', background: 'var(--color-brand)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', cursor: 'pointer', height: '32px' }}
                  >
                    + Adjuntar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '8px 12px', background: '#fffbeb', border: '1px solid var(--color-warning)', borderRadius: '6px', fontSize: '12px', color: 'var(--color-warning)', marginBottom: '10px' }}>
                Límite de 10 fotos alcanzado. Si desea agregar otra, elimine una existente.
              </div>
            )}

            {/* Galería de fotos agregadas */}
            {fotos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                {fotos.map((f, i) => (
                  <div
                    key={f.id}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: 'var(--color-surface)',
                      position: 'relative'
                    }}
                  >
                    <img
                      src={f.url}
                      alt={f.caption}
                      style={{ width: '100%', height: '80px', objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = 'https://placehold.co/130x80?text=Foto'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(f.id)}
                      style={{
                        position: 'absolute',
                        top: '3px',
                        right: '3px',
                        background: 'rgba(0,0,0,0.65)',
                        color: '#fff',
                        border: 0,
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        lineHeight: 1
                      }}
                      title="Eliminar foto"
                    >
                      ✕
                    </button>
                    <div style={{ padding: '4px 6px' }}>
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

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              Observaciones de garita / patio
            </label>
            <textarea
              rows={2}
              placeholder="Estado del precinto, rampa asignada, notas de chofer o transporte..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={saving}
              style={{ background: 'var(--color-brand)', color: '#fff', padding: '8px 20px', borderRadius: '6px', fontWeight: 600, border: 0, cursor: 'pointer' }}
            >
              {saving ? 'Guardando contenedor…' : 'Registrar ingreso en patio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
