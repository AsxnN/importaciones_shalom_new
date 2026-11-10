import { useState, useEffect, useMemo, type ChangeEvent } from 'react'
import type { ContainerPhoto, ContainerPhotoType, ContainerRecord, ContainerStatus, CrewType } from '../../types/containers'
import { containerService } from '../../services/containerService'

interface Props {
  container: ContainerRecord
  onBack: () => void
  onUpdated: () => void
  onOpenReceptions?: (containerId: number) => void
}

export function ContainerDetailView({
  container,
  onBack,
  onUpdated,
  onOpenReceptions
}: Props) {
  // Modal de imagen ampliada (Lightbox)
  const [selectedPhoto, setSelectedPhoto] = useState<ContainerPhoto | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // -------------------------------------------------------------
  // APARTADO 1: DATOS GENERALES DEL CONTENEDOR Y TRANSPORTE
  // -------------------------------------------------------------
  const [isEditingGeneral, setIsEditingGeneral] = useState(false)
  const [editNumeroContenedor, setEditNumeroContenedor] = useState('')
  const [editPlacaCamion, setEditPlacaCamion] = useState('')
  const [editHoraLlegadaTime, setEditHoraLlegadaTime] = useState('')
  const [editEmpresaTransporte, setEditEmpresaTransporte] = useState('')
  const [editNombreConductor, setEditNombreConductor] = useState('')
  const [editTelefonoConductor, setEditTelefonoConductor] = useState('')

  // -------------------------------------------------------------
  // APARTADO 2: CONTROL DE CUADRILLA
  // -------------------------------------------------------------
  const [isEditingCuadrilla, setIsEditingCuadrilla] = useState(false)
  const [crewType, setCrewType] = useState<CrewType>('PROPIO')
  const [crewName, setCrewName] = useState('')
  const [crewCount, setCrewCount] = useState<number>(6)
  const [crewArrivalTime, setCrewArrivalTime] = useState('')
  const [crewDepartureTime, setCrewDepartureTime] = useState('')

  // Subida de fotos de cuadrilla
  const [showUploadCrewArrival, setShowUploadCrewArrival] = useState(false)
  const [crewArrivalFileUrl, setCrewArrivalFileUrl] = useState('')
  const [crewArrivalCaption, setCrewArrivalCaption] = useState('')

  const [showUploadCrewDeparture, setShowUploadCrewDeparture] = useState(false)
  const [crewDepartureFileUrl, setCrewDepartureFileUrl] = useState('')
  const [crewDepartureCaption, setCrewDepartureCaption] = useState('')

  const [showUploadPropio, setShowUploadPropio] = useState(false)
  const [propioFileUrl, setPropioFileUrl] = useState('')
  const [propioCaption, setPropioCaption] = useState('')

  // -------------------------------------------------------------
  // APARTADO 3: CONTROL OPERATIVO DEL CAMIÓN Y TIEMPOS
  // -------------------------------------------------------------
  const [isEditingTruck, setIsEditingTruck] = useState(false)
  const [truckStatus, setTruckStatus] = useState<ContainerStatus>('EN_PATIO')
  const [truckRampa, setTruckRampa] = useState('')
  const [truckNotes, setTruckNotes] = useState('')

  // -------------------------------------------------------------
  // APARTADO 4: FOTOS DE INSPECCIÓN INDEPENDIENTES
  // -------------------------------------------------------------
  const [showUploadGuia, setShowUploadGuia] = useState(false)
  const [guiaFileUrl, setGuiaFileUrl] = useState('')
  const [guiaCaption, setGuiaCaption] = useState('')

  const [showUploadPrecinto, setShowUploadPrecinto] = useState(false)
  const [precintoFileUrl, setPrecintoFileUrl] = useState('')
  const [precintoCaption, setPrecintoCaption] = useState('')

  const [showUploadPlaca, setShowUploadPlaca] = useState(false)
  const [placaFileUrl, setPlacaFileUrl] = useState('')
  const [placaCaption, setPlacaCaption] = useState('')

  const [showUploadVacio, setShowUploadVacio] = useState(false)
  const [vacioFileUrl, setVacioFileUrl] = useState('')
  const [vacioCaption, setVacioCaption] = useState('')

  const [showUploadIncidencia, setShowUploadIncidencia] = useState(false)
  const [incidenciaFileUrl, setIncidenciaFileUrl] = useState('')
  const [incidenciaCaption, setIncidenciaCaption] = useState('')

  // -------------------------------------------------------------
  // APARTADO 5: SALIDA DEL CAMIÓN / CONTENEDOR
  // -------------------------------------------------------------
  const now = new Date()
  const initialTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const [departureTime, setDepartureTime] = useState(initialTime)
  const [departureFileUrl, setDepartureFileUrl] = useState('')
  const [departureCaption, setDepartureCaption] = useState('')

  // Sincronizar estado local al abrir o cambiar de contenedor
  useEffect(() => {
    if (!container) return

    // Apartado 1
    setEditNumeroContenedor(container.numero_contenedor || '')
    setEditPlacaCamion(container.placa_camion || '')
    setEditEmpresaTransporte(container.empresa_transporte || '')
    setEditNombreConductor(container.nombre_conductor || '')
    setEditTelefonoConductor(container.telefono_conductor || '')
    const rawArrival = container.hora_llegada_contenedor || ''
    const timeMatch = rawArrival.match(/T(\d{2}:\d{2})/) || rawArrival.match(/(\d{2}:\d{2})/)
    setEditHoraLlegadaTime(timeMatch ? timeMatch[1] : initialTime)
    setIsEditingGeneral(false)

    // Apartado 2
    setCrewType(container.tipo_personal || 'PROPIO')
    setCrewName(container.nombre_cuadrilla || '')
    setCrewCount(container.num_estibadores || 6)
    const rawCrewArr = container.hora_llegada_cuadrilla || ''
    const crewArrivalMatch = rawCrewArr.match(/T(\d{2}:\d{2})/) || rawCrewArr.match(/(\d{2}:\d{2})/)
    setCrewArrivalTime(crewArrivalMatch ? crewArrivalMatch[1] : '')
    const rawCrewDep = container.hora_salida_cuadrilla || ''
    const crewDepartureMatch = rawCrewDep.match(/T(\d{2}:\d{2})/) || rawCrewDep.match(/(\d{2}:\d{2})/)
    setCrewDepartureTime(crewDepartureMatch ? crewDepartureMatch[1] : '')
    setIsEditingCuadrilla(false)

    // Apartado 3
    setTruckStatus(container.estado || 'EN_PATIO')
    setTruckRampa(container.rampa || '')
    setTruckNotes(container.observaciones || '')
    setIsEditingTruck(false)

    // Reset upload forms
    setShowUploadCrewArrival(false)
    setShowUploadCrewDeparture(false)
    setShowUploadPropio(false)
    setShowUploadGuia(false)
    setShowUploadPrecinto(false)
    setShowUploadPlaca(false)
    setShowUploadVacio(false)
    setShowUploadIncidencia(false)

    setErrorMsg(null)
    setSuccessMsg(null)
  }, [container])

  // Fotos garantizadas como array
  const safeFotos = useMemo(() => {
    return Array.isArray(container?.fotos) ? container.fotos : []
  }, [container?.fotos])

  // Helpers de formateo
  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hrs`
    } catch {
      return dateStr
    }
  }

  const calculateDuration = (startStr?: string | null, endStr?: string | null) => {
    if (!startStr) return '-'
    try {
      const start = new Date(startStr).getTime()
      if (isNaN(start)) return '-'
      const end = endStr ? new Date(endStr).getTime() : Date.now()
      if (isNaN(end)) return '-'
      const diffMs = Math.max(0, end - start)
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const hrs = Math.floor(diffMins / 60)
      const mins = diffMins % 60
      return `${hrs}h ${mins}m`
    } catch {
      return '-'
    }
  }

  const calculateCrewDecimalHours = (startStr?: string | null, endStr?: string | null) => {
    if (!startStr || !endStr) return null
    try {
      const start = new Date(startStr).getTime()
      const end = new Date(endStr).getTime()
      if (isNaN(start) || isNaN(end)) return null
      const diffMs = Math.max(0, end - start)
      return (diffMs / (1000 * 60 * 60)).toFixed(2)
    } catch {
      return null
    }
  }

  // Filtrado seguro de fotos por categoría
  const fotosGuia = safeFotos.filter((f) => f && f.tipo === 'GUIA_REMISION')
  const fotosPrecinto = safeFotos.filter((f) => f && f.tipo === 'PRECINTO')
  const fotosPlaca = safeFotos.filter((f) => f && (f.tipo === 'PLACA_CAMION' || f.tipo === 'LLEGADA_CAMION'))
  const fotosVacio = safeFotos.filter((f) => f && f.tipo === 'CONTENEDOR_VACIO')
  const fotosIncidencia = safeFotos.filter((f) => f && f.tipo === 'INCIDENCIA')
  const fotosCrewArrival = safeFotos.filter((f) => f && (f.tipo === 'CUADRILLA_ENTRADA' || f.tipo === 'CUADRILLA_LLEGADA'))
  const fotosCrewDeparture = safeFotos.filter((f) => f && f.tipo === 'CUADRILLA_SALIDA')
  const fotosPersonalPropio = safeFotos.filter((f) => f && f.tipo === 'PERSONAL_PROPIO')
  const fotosSalida = safeFotos.filter((f) => f && f.tipo === 'SALIDA_CAMION')

  // Validación de fotos completas para habilitar salida
  const isPhotosRequirementMet = useMemo(() => {
    const hasGuias = fotosGuia.length >= 5
    const hasPrecinto = fotosPrecinto.length >= 1
    const hasPlaca = fotosPlaca.length >= 1
    const hasVacio = fotosVacio.length >= 1
    return hasGuias && hasPrecinto && hasPlaca && hasVacio
  }, [fotosGuia.length, fotosPrecinto.length, fotosPlaca.length, fotosVacio.length])

  // Helper para convertir archivo a dataURL
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setter(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3500)
  }

  // =============================================================
  // HANDLERS: APARTADO 1 - DATOS GENERALES
  // =============================================================
  const handleSaveGeneral = async () => {
    if (!editNumeroContenedor.trim() || !editPlacaCamion.trim()) {
      setErrorMsg('Número de contenedor y placa son obligatorios.')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    const rawArrival = container.hora_llegada_contenedor || ''
    const today = rawArrival.includes('T') ? rawArrival.split('T')[0] : new Date().toISOString().split('T')[0]
    const updatedHoraLlegada = `${today}T${editHoraLlegadaTime || initialTime}:00`

    const res = await containerService.updateContainer(container.id_contenedor, {
      numero_contenedor: editNumeroContenedor.trim().toUpperCase(),
      placa_camion: editPlacaCamion.trim().toUpperCase(),
      hora_llegada_contenedor: updatedHoraLlegada,
      empresa_transporte: editEmpresaTransporte.trim(),
      nombre_conductor: editNombreConductor.trim(),
      telefono_conductor: editTelefonoConductor.trim()
    })

    setSaving(false)
    if (res.success) {
      setIsEditingGeneral(false)
      notifySuccess('Datos del contenedor y transporte actualizados.')
      onUpdated()
    } else {
      setErrorMsg(res.error || 'Error al actualizar datos generales.')
    }
  }

  const handleCancelGeneral = () => {
    setEditNumeroContenedor(container.numero_contenedor || '')
    setEditPlacaCamion(container.placa_camion || '')
    setEditEmpresaTransporte(container.empresa_transporte || '')
    setEditNombreConductor(container.nombre_conductor || '')
    setEditTelefonoConductor(container.telefono_conductor || '')
    const rawArrival = container.hora_llegada_contenedor || ''
    const timeMatch = rawArrival.match(/T(\d{2}:\d{2})/) || rawArrival.match(/(\d{2}:\d{2})/)
    setEditHoraLlegadaTime(timeMatch ? timeMatch[1] : initialTime)
    setIsEditingGeneral(false)
    setErrorMsg(null)
  }

  // =============================================================
  // HANDLERS: APARTADO 2 - CUADRILLA
  // =============================================================
  const handleSaveCuadrilla = async () => {
    setSaving(true)
    setErrorMsg(null)

    const today = new Date().toISOString().split('T')[0]
    const updatedHoraLlegada = crewArrivalTime ? `${today}T${crewArrivalTime}:00` : null
    const updatedHoraSalida = crewDepartureTime ? `${today}T${crewDepartureTime}:00` : null

    const res = await containerService.updateContainer(container.id_contenedor, {
      tipo_personal: crewType,
      nombre_cuadrilla: crewType === 'CUADRILLA_EXTERNA' ? crewName.trim() : 'Personal propio de almacén',
      num_estibadores: crewType === 'CUADRILLA_EXTERNA' ? crewCount : 0,
      hora_llegada_cuadrilla: updatedHoraLlegada,
      hora_salida_cuadrilla: updatedHoraSalida
    })

    setSaving(false)
    if (res.success) {
      setIsEditingCuadrilla(false)
      notifySuccess('Apartado de cuadrilla guardado exitosamente.')
      onUpdated()
    } else {
      setErrorMsg(res.error || 'Error al guardar apartado de cuadrilla.')
    }
  }

  const handleCancelCuadrilla = () => {
    setCrewType(container.tipo_personal || 'PROPIO')
    setCrewName(container.nombre_cuadrilla || '')
    setCrewCount(container.num_estibadores || 6)
    const rawCrewArr = container.hora_llegada_cuadrilla || ''
    const crewArrivalMatch = rawCrewArr.match(/T(\d{2}:\d{2})/) || rawCrewArr.match(/(\d{2}:\d{2})/)
    setCrewArrivalTime(crewArrivalMatch ? crewArrivalMatch[1] : '')
    const rawCrewDep = container.hora_salida_cuadrilla || ''
    const crewDepartureMatch = rawCrewDep.match(/T(\d{2}:\d{2})/) || rawCrewDep.match(/(\d{2}:\d{2})/)
    setCrewDepartureTime(crewDepartureMatch ? crewDepartureMatch[1] : '')
    setIsEditingCuadrilla(false)
    setErrorMsg(null)
  }

  // =============================================================
  // HANDLERS: APARTADO 3 - CAMIÓN Y ESTADO
  // =============================================================
  const handleSaveTruck = async () => {
    setSaving(true)
    setErrorMsg(null)

    const res = await containerService.updateContainer(container.id_contenedor, {
      estado: truckStatus,
      rampa: truckRampa.trim(),
      observaciones: truckNotes.trim()
    })

    setSaving(false)
    if (res.success) {
      setIsEditingTruck(false)
      notifySuccess('Datos operativos y estado del camión guardados.')
      onUpdated()
    } else {
      setErrorMsg(res.error || 'Error al guardar datos del camión.')
    }
  }

  const handleCancelTruck = () => {
    setTruckStatus(container.estado || 'EN_PATIO')
    setTruckRampa(container.rampa || '')
    setTruckNotes(container.observaciones || '')
    setIsEditingTruck(false)
    setErrorMsg(null)
  }

  // =============================================================
  // HANDLERS: SUBIDA Y ELIMINACIÓN DE FOTOS
  // =============================================================
  const handleUploadPhoto = async (
    tipo: ContainerPhotoType,
    url: string,
    caption: string,
    onSuccess: () => void
  ) => {
    if (!url.trim()) {
      setErrorMsg('Por favor seleccione una imagen o ingrese la URL.')
      return
    }
    if (!caption.trim()) {
      setErrorMsg('La descripción de la foto es obligatoria.')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    const photoObj: ContainerPhoto = {
      id: `foto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      url: url.trim(),
      tipo,
      caption: caption.trim(),
      timestamp: new Date().toISOString()
    }

    const res = await containerService.addPhoto(container.id_contenedor, photoObj)
    setSaving(false)

    if (res.success) {
      notifySuccess('Foto registrada con éxito.')
      onSuccess()
      onUpdated()
    } else {
      setErrorMsg(res.error || 'Error al subir la fotografía.')
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('¿Desea eliminar esta evidencia fotográfica?')) return
    setSaving(true)
    setErrorMsg(null)
    const res = await containerService.removePhoto(container.id_contenedor, photoId)
    setSaving(false)
    if (res.success) {
      notifySuccess('Evidencia fotográfica eliminada.')
      onUpdated()
    } else {
      setErrorMsg(res.error || 'Error al eliminar foto.')
    }
  }

  // =============================================================
  // HANDLERS: APARTADO 5 - SALIDA DEL CAMIÓN
  // =============================================================
  const handleRegisterDeparture = async () => {
    if (!departureFileUrl.trim()) {
      setErrorMsg('Es obligatorio subir la foto de salida del camión / contenedor.')
      return
    }
    if (!departureCaption.trim()) {
      setErrorMsg('Debe agregar una descripción para la foto de salida.')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    const today = new Date().toISOString().split('T')[0]
    const fullDepartureTime = `${today}T${departureTime}:00`

    const photoObj: ContainerPhoto = {
      id: `foto-${Date.now()}`,
      url: departureFileUrl.trim(),
      tipo: 'SALIDA_CAMION',
      caption: departureCaption.trim(),
      timestamp: new Date().toISOString()
    }

    const res = await containerService.registerContainerDeparture(
      container.id_contenedor,
      fullDepartureTime,
      photoObj
    )

    setSaving(false)
    if (res.success) {
      notifySuccess('Salida del camión registrada exitosamente. Contenedor despachado.')
      onUpdated()
    } else {
      setErrorMsg(res.error || 'Error al registrar la salida.')
    }
  }

  // Renderizador genérico de tabla de fotos
  const renderPhotoTable = (fotos: ContainerPhoto[], emptyMsg: string) => {
    if (fotos.length === 0) {
      return (
        <div style={{ padding: '12px', background: 'var(--color-canvas)', borderRadius: '6px', fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic', border: '1px dashed var(--color-border)' }}>
          {emptyMsg}
        </div>
      )
    }

    return (
      <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: 'var(--color-surface)' }}>
          <thead>
            <tr style={{ background: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', width: '40px', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '12px' }}>N°</th>
              <th style={{ padding: '8px 12px', width: '80px', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '12px' }}>Vista previa</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '12px' }}>Descripción de la foto</th>
              <th style={{ padding: '8px 12px', width: '110px', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '12px' }}>Hora registro</th>
              <th style={{ padding: '8px 12px', width: '80px', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '12px' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {fotos.map((f, idx) => (
              <tr key={f.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  {idx + 1}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <img
                    src={f.url}
                    alt={f.caption}
                    onClick={() => setSelectedPhoto(f)}
                    style={{
                      width: '64px',
                      height: '44px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: '1px solid var(--color-border)'
                    }}
                    title="Clic para ampliar foto"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = 'https://placehold.co/64x44?text=Foto'
                    }}
                  />
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--color-text-primary)' }}>
                  {f.caption}
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {formatTime(f.timestamp)}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(f.id)}
                    disabled={saving}
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: 'var(--color-danger)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: '4px 8px'
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Renderizador genérico de formulario de subida de foto
  const renderUploadForm = (
    labelButton: string,
    fileUrl: string,
    setFileUrl: (url: string) => void,
    caption: string,
    setCaption: (cap: string) => void,
    onCancel: () => void,
    onAccept: () => void,
    placeholderDesc: string
  ) => {
    return (
      <div
        style={{
          marginTop: '10px',
          padding: '12px',
          background: 'var(--color-surface)',
          border: '1px dashed var(--color-brand)',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              Archivo de imagen / cámara
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFileChange(e, setFileUrl)}
              style={{ fontSize: '12px', width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              Descripción obligatoria de la foto *
            </label>
            <input
              type="text"
              placeholder={placeholderDesc}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-canvas)'
              }}
            />
          </div>
        </div>

        {fileUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--color-canvas)', padding: '6px 10px', borderRadius: '4px' }}>
            <img
              src={fileUrl}
              alt="Preview"
              style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-border)' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Imagen lista para adjuntar
            </span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="button secondary"
            style={{ padding: '5px 12px', fontSize: '12px' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={saving || !fileUrl.trim() || !caption.trim()}
            style={{
              padding: '6px 16px',
              background: 'var(--color-brand)',
              color: '#fff',
              border: 0,
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Guardando...' : labelButton}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px', background: 'var(--color-canvas)', minHeight: '100vh' }}>
      
      {/* Barra Superior con Navegación y Volver */}
      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          className="button secondary"
          onClick={onBack}
          style={{ marginBottom: '10px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          ← Volver a la lista de contenedores
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', margin: 0, color: 'var(--color-brand-deep)', fontWeight: 600 }}>
                Ficha del contenedor {container.numero_contenedor}
              </h1>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 12px',
                  borderRadius: '4px',
                  background:
                    container.estado === 'DESPACHADO'
                      ? 'rgba(47, 125, 79, 0.15)'
                      : container.estado === 'EN_DESCARGA'
                      ? 'rgba(22, 125, 141, 0.15)'
                      : container.estado === 'DESCARGADO'
                      ? 'rgba(47, 125, 79, 0.12)'
                      : 'rgba(188, 121, 31, 0.15)',
                  color:
                    container.estado === 'DESPACHADO'
                      ? 'var(--color-success)'
                      : container.estado === 'EN_DESCARGA'
                      ? 'var(--color-brand)'
                      : container.estado === 'DESCARGADO'
                      ? 'var(--color-success)'
                      : 'var(--color-warning)'
                }}
              >
                {container.estado === 'EN_PATIO'
                  ? 'En patio'
                  : container.estado === 'EN_DESCARGA'
                  ? 'En descarga activa'
                  : container.estado === 'DESCARGADO'
                  ? 'Descargado'
                  : 'Despachado de patio'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Placa del camión: <strong style={{ color: 'var(--color-text-primary)' }}>{container.placa_camion}</strong>
              {container.empresa_transporte && ` • Empresa: ${container.empresa_transporte}`}
              {container.nombre_conductor && ` • Conductor: ${container.nombre_conductor}`}
              {container.telefono_conductor && ` (${container.telefono_conductor})`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {!container.hora_salida_contenedor && onOpenReceptions && (
              <button
                type="button"
                onClick={() => onOpenReceptions(container.id_contenedor)}
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
        </div>
      </div>

      {/* Mensajes de Alerta */}
      {errorMsg && (
        <div style={{ background: '#fdf2f2', border: '1px solid var(--color-danger)', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: 'var(--color-danger)', fontSize: '13px' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid var(--color-success)', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: 'var(--color-success)', fontSize: '13px' }}>
          {successMsg}
        </div>
      )}

      {/* Contenido en 5 Apartados Modulares */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ========================================================= */}
        {/* APARTADO 1: DATOS DEL CONTENEDOR Y TRANSPORTE (SUPERIOR)  */}
        {/* ========================================================= */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--color-brand-deep)' }}>
              1. Datos generales del contenedor y transporte
            </h3>
            {!isEditingGeneral && (
              <button
                type="button"
                onClick={() => setIsEditingGeneral(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-brand)',
                  cursor: 'pointer'
                }}
              >
                ✎ Modificar datos
              </button>
            )}
          </div>

          {!isEditingGeneral ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', background: 'var(--color-canvas)', padding: '14px 16px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Número contenedor</span>
                <strong style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>{container.numero_contenedor}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Placa camión / tracto</span>
                <strong style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>{container.placa_camion}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Hora de llegada</span>
                <strong style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>
                  {formatTime(container.hora_llegada_contenedor)}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Empresa de transporte</span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{container.empresa_transporte || 'No especificada'}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Conductor</span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{container.nombre_conductor || 'No especificado'}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Teléfono</span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{container.telefono_conductor || 'No registrado'}</span>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--color-canvas)', padding: '16px', borderRadius: '6px', border: '1px solid var(--color-brand)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Número de contenedor *
                  </label>
                  <input
                    type="text"
                    value={editNumeroContenedor}
                    onChange={(e) => setEditNumeroContenedor(e.target.value.toUpperCase())}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Placa del camión *
                  </label>
                  <input
                    type="text"
                    value={editPlacaCamion}
                    onChange={(e) => setEditPlacaCamion(e.target.value.toUpperCase())}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Hora llegada *
                  </label>
                  <input
                    type="time"
                    value={editHoraLlegadaTime}
                    onChange={(e) => setEditHoraLlegadaTime(e.target.value)}
                    style={{ width: '100%', padding: '7px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Empresa de transporte
                  </label>
                  <input
                    type="text"
                    value={editEmpresaTransporte}
                    onChange={(e) => setEditEmpresaTransporte(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Conductor
                  </label>
                  <input
                    type="text"
                    value={editNombreConductor}
                    onChange={(e) => setEditNombreConductor(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Teléfono conductor
                  </label>
                  <input
                    type="text"
                    value={editTelefonoConductor}
                    onChange={(e) => setEditTelefonoConductor(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCancelGeneral}
                  disabled={saving}
                  className="button secondary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveGeneral}
                  disabled={saving}
                  style={{
                    background: 'var(--color-brand)',
                    color: '#fff',
                    border: 0,
                    borderRadius: '4px',
                    padding: '6px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar datos de cabecera'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* APARTADO 2: CONTROL DE CUADRILLA                          */}
        {/* ========================================================= */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--color-brand-deep)' }}>
                2. Control de cuadrilla y descarga
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Defina si la descarga es realizada por estibadores externos o por personal propio de almacén.
              </span>
            </div>
            {!isEditingCuadrilla && (
              <button
                type="button"
                onClick={() => setIsEditingCuadrilla(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-brand)',
                  cursor: 'pointer'
                }}
              >
                ✎ Modificar cuadrilla
              </button>
            )}
          </div>

          {/* Selector de Tipo de Cuadrilla */}
          <div style={{ display: 'flex', gap: '24px', padding: '12px 16px', background: 'var(--color-canvas)', borderRadius: '6px', border: '1px solid var(--color-border)', marginBottom: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: isEditingCuadrilla ? 'pointer' : 'default', fontWeight: 500 }}>
              <input
                type="radio"
                name="crewType"
                value="PROPIO"
                checked={crewType === 'PROPIO'}
                disabled={!isEditingCuadrilla}
                onChange={() => setCrewType('PROPIO')}
              />
              Personal propio de almacén
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: isEditingCuadrilla ? 'pointer' : 'default', fontWeight: 500 }}>
              <input
                type="radio"
                name="crewType"
                value="CUADRILLA_EXTERNA"
                checked={crewType === 'CUADRILLA_EXTERNA'}
                disabled={!isEditingCuadrilla}
                onChange={() => setCrewType('CUADRILLA_EXTERNA')}
              />
              Estibadores / Cuadrilla externa
            </label>
          </div>

          {/* Formulario editable para datos de cuadrilla externa */}
          {isEditingCuadrilla && crewType === 'CUADRILLA_EXTERNA' && (
            <div style={{ background: 'var(--color-surface)', padding: '14px', borderRadius: '6px', border: '1px solid var(--color-brand)', marginBottom: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 120px 140px 140px', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Nombre de la empresa / proveedor de estiba
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Estibas y Logística Rápida SAC"
                    value={crewName}
                    onChange={(e) => setCrewName(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    N° Estibadores
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={crewCount}
                    onChange={(e) => setCrewCount(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Hora de entrada
                  </label>
                  <input
                    type="time"
                    value={crewArrivalTime}
                    onChange={(e) => setCrewArrivalTime(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Hora de salida
                  </label>
                  <input
                    type="time"
                    value={crewDepartureTime}
                    onChange={(e) => setCrewDepartureTime(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCancelCuadrilla}
                  disabled={saving}
                  className="button secondary"
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCuadrilla}
                  disabled={saving}
                  style={{
                    background: 'var(--color-brand)',
                    color: '#fff',
                    border: 0,
                    borderRadius: '4px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {saving ? 'Guardando...' : 'Aceptar y fijar cuadrilla'}
                </button>
              </div>
            </div>
          )}

          {isEditingCuadrilla && crewType === 'PROPIO' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={handleCancelCuadrilla}
                disabled={saving}
                className="button secondary"
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCuadrilla}
                disabled={saving}
                style={{
                  background: 'var(--color-brand)',
                  color: '#fff',
                  border: 0,
                  borderRadius: '4px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {saving ? 'Guardando...' : 'Aceptar cuadrilla propia'}
              </button>
            </div>
          )}

          {/* Renderizado de Fotos según Selección */}
          {crewType === 'CUADRILLA_EXTERNA' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--color-canvas)', padding: '12px 16px', borderRadius: '6px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                    Proveedor: <strong>{container.nombre_cuadrilla || 'Por definir'}</strong> • Dotación: <strong>{container.num_estibadores || 0} estibadores</strong>
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--color-brand)', fontWeight: 600 }}>
                    Horas calculadas a pagar:{' '}
                    {container.hora_llegada_cuadrilla && container.hora_salida_cuadrilla
                      ? `${calculateCrewDecimalHours(container.hora_llegada_cuadrilla, container.hora_salida_cuadrilla)} hrs (${calculateDuration(container.hora_llegada_cuadrilla, container.hora_salida_cuadrilla)})`
                      : 'En curso / Pendiente de salida'}
                  </span>
                </div>
              </div>

              {/* Sub-bloque Entrada Estibadores */}
              <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px', background: 'var(--color-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                      Fotos de entrada de estibadores (1 a 3 fotos)
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                      [{fotosCrewArrival.length} de 3 registradas]
                    </span>
                  </div>
                  {fotosCrewArrival.length < 3 && !showUploadCrewArrival && (
                    <button
                      type="button"
                      onClick={() => setShowUploadCrewArrival(true)}
                      style={{ padding: '5px 12px', background: 'var(--color-brand)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      + Subir foto de entrada
                    </button>
                  )}
                </div>

                {showUploadCrewArrival &&
                  renderUploadForm(
                    'Aceptar foto de entrada',
                    crewArrivalFileUrl,
                    setCrewArrivalFileUrl,
                    crewArrivalCaption,
                    setCrewArrivalCaption,
                    () => setShowUploadCrewArrival(false),
                    () =>
                      handleUploadPhoto('CUADRILLA_ENTRADA', crewArrivalFileUrl, crewArrivalCaption, () => {
                        setShowUploadCrewArrival(false)
                        setCrewArrivalFileUrl('')
                        setCrewArrivalCaption('')
                      }),
                    'Ej: Formación inicial de estibadores con EPP en garita'
                  )}

                {renderPhotoTable(fotosCrewArrival, 'No se han subido fotos de entrada de estibadores.')}
              </div>

              {/* Sub-bloque Salida Estibadores */}
              <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px', background: 'var(--color-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                      Fotos de salida de estibadores (1 a 3 fotos)
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                      [{fotosCrewDeparture.length} de 3 registradas]
                    </span>
                  </div>
                  {fotosCrewDeparture.length < 3 && !showUploadCrewDeparture && (
                    <button
                      type="button"
                      onClick={() => setShowUploadCrewDeparture(true)}
                      style={{ padding: '5px 12px', background: 'var(--color-brand)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      + Subir foto de salida
                    </button>
                  )}
                </div>

                {showUploadCrewDeparture &&
                  renderUploadForm(
                    'Aceptar foto de salida',
                    crewDepartureFileUrl,
                    setCrewDepartureFileUrl,
                    crewDepartureCaption,
                    setCrewDepartureCaption,
                    () => setShowUploadCrewDeparture(false),
                    () =>
                      handleUploadPhoto('CUADRILLA_SALIDA', crewDepartureFileUrl, crewDepartureCaption, () => {
                        setShowUploadCrewDeparture(false)
                        setCrewDepartureFileUrl('')
                        setCrewDepartureCaption('')
                      }),
                    'Ej: Salida de cuadrilla tras término de descarga y firma de reporte'
                  )}

                {renderPhotoTable(fotosCrewDeparture, 'No se han subido fotos de salida de estibadores.')}
              </div>
            </div>
          ) : (
            /* Caso Personal Propio de Almacén */
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px', background: 'var(--color-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                    Fotos de cuadrilla interna / personal propio (Máximo 10 fotos)
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                    [{fotosPersonalPropio.length} de 10 fotos]
                  </span>
                </div>
                {fotosPersonalPropio.length < 10 && !showUploadPropio && (
                  <button
                    type="button"
                    onClick={() => setShowUploadPropio(true)}
                    style={{ padding: '5px 12px', background: 'var(--color-brand)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    + Subir foto personal propio
                  </button>
                )}
              </div>

              {showUploadPropio &&
                renderUploadForm(
                  'Aceptar foto de personal propio',
                  propioFileUrl,
                  setPropioFileUrl,
                  propioCaption,
                  setPropioCaption,
                  () => setShowUploadPropio(false),
                  () =>
                    handleUploadPhoto('PERSONAL_PROPIO', propioFileUrl, propioCaption, () => {
                      setShowUploadPropio(false)
                      setPropioFileUrl('')
                      setPropioCaption('')
                    }),
                  'Ej: Equipo de almacén Shalom en maniobra de descarga'
                )}

              {renderPhotoTable(fotosPersonalPropio, 'No se han subido fotos del personal propio de almacén.')}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* APARTADO 3: CONTROL OPERATIVO DEL CAMIÓN Y PERMANENCIA   */}
        {/* ========================================================= */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--color-brand-deep)' }}>
              3. Datos del camión, estado y permanencia en patio
            </h3>
            {!isEditingTruck && (
              <button
                type="button"
                onClick={() => setIsEditingTruck(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-brand)',
                  cursor: 'pointer'
                }}
              >
                ✎ Modificar datos de camión
              </button>
            )}
          </div>

          {!isEditingTruck ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', background: 'var(--color-canvas)', padding: '14px 16px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Hora de llegada</span>
                <strong style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>
                  {formatTime(container.hora_llegada_contenedor)}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Estado operativo</span>
                <strong style={{ fontSize: '15px', color: 'var(--color-brand)' }}>
                  {container.estado === 'EN_PATIO'
                    ? 'En patio (esperando rampa)'
                    : container.estado === 'EN_DESCARGA'
                    ? 'En descarga activa'
                    : container.estado === 'DESCARGADO'
                    ? 'Descarga terminada'
                    : 'Despachado'}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Permanencia transcurrida</span>
                <strong style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>
                  ⏱ {calculateDuration(container.hora_llegada_contenedor, container.hora_salida_contenedor)}
                </strong>
                <small style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>
                  {container.hora_salida_contenedor ? 'Tiempo cerrado' : 'En transcurso continuo'}
                </small>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Rampa asignada / Ubicación</span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                  {container.rampa || 'Sin rampa asignada'}
                </span>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Observaciones del vehículo / maniobras</span>
                <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  {container.observaciones || 'Sin observaciones registradas.'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--color-canvas)', padding: '16px', borderRadius: '6px', border: '1px solid var(--color-brand)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Estado operativo del camión
                  </label>
                  <select
                    value={truckStatus}
                    onChange={(e) => setTruckStatus(e.target.value as ContainerStatus)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#fff' }}
                  >
                    <option value="EN_PATIO">En patio (esperando rampa)</option>
                    <option value="EN_DESCARGA">En descarga activa</option>
                    <option value="DESCARGADO">Descargado</option>
                    <option value="DESPACHADO">Despachado</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                    Rampa asignada / Ubicación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Rampa 2 - Nave Principal"
                    value={truckRampa}
                    onChange={(e) => setTruckRampa(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                  Observaciones y datos relevantes de maniobra
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre el estado del camión, maniobras de rampa o incidencias menores..."
                  value={truckNotes}
                  onChange={(e) => setTruckNotes(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCancelTruck}
                  disabled={saving}
                  className="button secondary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveTruck}
                  disabled={saving}
                  style={{
                    background: 'var(--color-brand)',
                    color: '#fff',
                    border: 0,
                    borderRadius: '4px',
                    padding: '6px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar datos de camión'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* APARTADO 4: REGISTRO FOTOGRÁFICO E INSPECCIÓN             */}
        {/* ========================================================= */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '18px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--color-brand-deep)' }}>
              4. Registro fotográfico e inspección física y documentaria
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Suba las evidencias requeridas por categoría. Cada imagen debe contar con su descripción correspondiente.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* 4.1 GUÍAS DE REMISIÓN (5 a 10 fotos) */}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                    4.1 Guías de remisión (5 a 10 fotos)
                  </strong>
                  <span
                    style={{
                      fontSize: '11px',
                      marginLeft: '8px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: fotosGuia.length >= 5 ? 'rgba(47, 125, 79, 0.15)' : 'rgba(188, 121, 31, 0.15)',
                      color: fotosGuia.length >= 5 ? 'var(--color-success)' : 'var(--color-warning)'
                    }}
                  >
                    {fotosGuia.length} de 10 fotos (Mínimo 5)
                  </span>
                </div>

                {fotosGuia.length < 10 && !showUploadGuia && (
                  <button
                    type="button"
                    onClick={() => setShowUploadGuia(true)}
                    style={{ padding: '5px 12px', background: 'var(--color-brand)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    + Subir foto de guía
                  </button>
                )}
              </div>

              {showUploadGuia &&
                renderUploadForm(
                  'Aceptar foto de guía',
                  guiaFileUrl,
                  setGuiaFileUrl,
                  guiaCaption,
                  setGuiaCaption,
                  () => setShowUploadGuia(false),
                  () =>
                    handleUploadPhoto('GUIA_REMISION', guiaFileUrl, guiaCaption, () => {
                      setShowUploadGuia(false)
                      setGuiaFileUrl('')
                      setGuiaCaption('')
                    }),
                  'Ej: Guía de remisión remitente folio T001-09412'
                )}

              {renderPhotoTable(fotosGuia, 'No se han adjuntado guías de remisión (se requieren de 5 a 10 fotos).')}
            </div>

            {/* 4.2 PRECINTO (1 foto) */}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                    4.2 Foto del precinto o cómo llegó el contenedor (1 foto)
                  </strong>
                  <span
                    style={{
                      fontSize: '11px',
                      marginLeft: '8px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: fotosPrecinto.length >= 1 ? 'rgba(47, 125, 79, 0.15)' : 'rgba(188, 121, 31, 0.15)',
                      color: fotosPrecinto.length >= 1 ? 'var(--color-success)' : 'var(--color-warning)'
                    }}
                  >
                    {fotosPrecinto.length} de 1 foto
                  </span>
                </div>

                {fotosPrecinto.length < 1 && !showUploadPrecinto && (
                  <button
                    type="button"
                    onClick={() => setShowUploadPrecinto(true)}
                    style={{ padding: '5px 12px', background: 'var(--color-brand)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    + Subir foto de precinto
                  </button>
                )}
              </div>

              {showUploadPrecinto &&
                renderUploadForm(
                  'Aceptar foto de precinto',
                  precintoFileUrl,
                  setPrecintoFileUrl,
                  precintoCaption,
                  setPrecintoCaption,
                  () => setShowUploadPrecinto(false),
                  () =>
                    handleUploadPhoto('PRECINTO', precintoFileUrl, precintoCaption, () => {
                      setShowUploadPrecinto(false)
                      setPrecintoFileUrl('')
                      setPrecintoCaption('')
                    }),
                  'Ej: Precinto de seguridad aduanero intacto serie #ML-88412'
                )}

              {renderPhotoTable(fotosPrecinto, 'Pendiente de registrar foto del precinto.')}
            </div>

            {/* 4.3 PLACA DEL CAMIÓN (1 foto) */}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                    4.3 Foto de la placa del camión / tracto (1 foto)
                  </strong>
                  <span
                    style={{
                      fontSize: '11px',
                      marginLeft: '8px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: fotosPlaca.length >= 1 ? 'rgba(47, 125, 79, 0.15)' : 'rgba(188, 121, 31, 0.15)',
                      color: fotosPlaca.length >= 1 ? 'var(--color-success)' : 'var(--color-warning)'
                    }}
                  >
                    {fotosPlaca.length} de 1 foto
                  </span>
                </div>

                {fotosPlaca.length < 1 && !showUploadPlaca && (
                  <button
                    type="button"
                    onClick={() => setShowUploadPlaca(true)}
                    style={{ padding: '5px 12px', background: 'var(--color-brand)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    + Subir foto de placa
                  </button>
                )}
              </div>

              {showUploadPlaca &&
                renderUploadForm(
                  'Aceptar foto de placa',
                  placaFileUrl,
                  setPlacaFileUrl,
                  placaCaption,
                  setPlacaCaption,
                  () => setShowUploadPlaca(false),
                  () =>
                    handleUploadPhoto('PLACA_CAMION', placaFileUrl, placaCaption, () => {
                      setShowUploadPlaca(false)
                      setPlacaFileUrl('')
                      setPlacaCaption('')
                    }),
                  `Ej: Placa frontal ${container.placa_camion} visible en garita de patio`
                )}

              {renderPhotoTable(fotosPlaca, 'Pendiente de registrar foto de la placa del vehículo.')}
            </div>

            {/* 4.4 CONTENEDOR VACÍO (1 a 2 fotos) */}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                    4.4 Foto del contenedor vacío (1 a 2 fotos)
                  </strong>
                  <span
                    style={{
                      fontSize: '11px',
                      marginLeft: '8px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: fotosVacio.length >= 1 ? 'rgba(47, 125, 79, 0.15)' : 'rgba(188, 121, 31, 0.15)',
                      color: fotosVacio.length >= 1 ? 'var(--color-success)' : 'var(--color-warning)'
                    }}
                  >
                    {fotosVacio.length} de 2 fotos (Mínimo 1)
                  </span>
                </div>

                {fotosVacio.length < 2 && !showUploadVacio && (
                  <button
                    type="button"
                    onClick={() => setShowUploadVacio(true)}
                    style={{ padding: '5px 12px', background: 'var(--color-brand)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    + Subir foto de contenedor vacío
                  </button>
                )}
              </div>

              {showUploadVacio &&
                renderUploadForm(
                  'Aceptar foto de contenedor vacío',
                  vacioFileUrl,
                  setVacioFileUrl,
                  vacioCaption,
                  setVacioCaption,
                  () => setShowUploadVacio(false),
                  () =>
                    handleUploadPhoto('CONTENEDOR_VACIO', vacioFileUrl, vacioCaption, () => {
                      setShowUploadVacio(false)
                      setVacioFileUrl('')
                      setVacioCaption('')
                    }),
                  'Ej: Interior del contenedor completamente barrido y desocupado'
                )}

              {renderPhotoTable(fotosVacio, 'Pendiente de verificar y fotografiar contenedor vacío tras descarga.')}
            </div>

            {/* 4.5 INCIDENCIAS (0 a 10 fotos) */}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                    4.5 Incidencias / Novedades de carga (Opcional, hasta 10 fotos)
                  </strong>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                    [{fotosIncidencia.length} de 10 fotos]
                  </span>
                </div>

                {fotosIncidencia.length < 10 && !showUploadIncidencia && (
                  <button
                    type="button"
                    onClick={() => setShowUploadIncidencia(true)}
                    style={{ padding: '5px 12px', background: 'var(--color-brand)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    + Registrar incidencia
                  </button>
                )}
              </div>

              {showUploadIncidencia &&
                renderUploadForm(
                  'Aceptar foto de incidencia',
                  incidenciaFileUrl,
                  setIncidenciaFileUrl,
                  incidenciaCaption,
                  setIncidenciaCaption,
                  () => setShowUploadIncidencia(false),
                  () =>
                    handleUploadPhoto('INCIDENCIA', incidenciaFileUrl, incidenciaCaption, () => {
                      setShowUploadIncidencia(false)
                      setIncidenciaFileUrl('')
                      setIncidenciaCaption('')
                    }),
                  'Ej: Caja aplastada en base del pallet #3, humedad en esquina'
                )}

              {renderPhotoTable(fotosIncidencia, 'No se registraron incidencias en este contenedor.')}
            </div>

          </div>
        </div>

        {/* ========================================================= */}
        {/* APARTADO 5: SALIDA DEL CAMIÓN / CIERRE DE CONTENEDOR     */}
        {/* ========================================================= */}
        <div
          style={{
            background: container.hora_salida_contenedor ? 'var(--color-canvas)' : 'var(--color-surface)',
            border: container.hora_salida_contenedor ? '1px solid var(--color-success)' : '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '18px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--color-brand-deep)' }}>
                5. Salida del contenedor y cierre de patio
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {container.hora_salida_contenedor
                  ? 'El camión ya ha sido despachado y la operación está cerrada.'
                  : 'Para registrar la salida, debe completarse el registro fotográfico mínimo y adjuntar la foto de salida.'}
              </span>
            </div>

            {container.hora_salida_contenedor && (
              <span style={{ background: 'rgba(47, 125, 79, 0.15)', color: 'var(--color-success)', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                ✔ Despachado {formatTime(container.hora_salida_contenedor)}
              </span>
            )}
          </div>

          {/* Si ya salió */}
          {container.hora_salida_contenedor ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: 'var(--color-surface)', padding: '14px', borderRadius: '6px', border: '1px solid var(--color-border)', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Hora de salida</span>
                  <strong style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>
                    {formatTime(container.hora_salida_contenedor)}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Permanencia total en patio</span>
                  <strong style={{ fontSize: '15px', color: 'var(--color-brand)' }}>
                    {calculateDuration(container.hora_llegada_contenedor, container.hora_salida_contenedor)}
                  </strong>
                </div>
              </div>
              {renderPhotoTable(fotosSalida, 'No se registró foto de salida.')}
            </div>
          ) : (
            /* Aún en patio */
            <div>
              {/* Validación de fotos */}
              {!isPhotosRequirementMet ? (
                <div style={{ background: 'var(--color-brand-soft)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '12px 16px', marginBottom: '14px', fontSize: '13px' }}>
                  <strong style={{ color: 'var(--color-brand-deep)' }}>Fotos pendientes para habilitar salida:</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '12px', color: 'var(--color-text-primary)' }}>
                    {fotosGuia.length < 5 && <li>Guías de remisión: faltan {5 - fotosGuia.length} fotos (mínimo 5 requeridas).</li>}
                    {fotosPrecinto.length < 1 && <li>Foto del precinto: falta 1 foto.</li>}
                    {fotosPlaca.length < 1 && <li>Foto de placa del camión: falta 1 foto.</li>}
                    {fotosVacio.length < 1 && <li>Foto de contenedor vacío: falta 1 foto.</li>}
                  </ul>
                </div>
              ) : (
                <div style={{ background: 'rgba(47, 125, 79, 0.08)', border: '1px solid var(--color-success)', borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--color-success)', fontWeight: 500 }}>
                  ✔ Todas las evidencias fotográficas requeridas han sido completadas satisfactoriamente.
                </div>
              )}

              {/* Formulario de salida */}
              <div style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1.4fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                      Hora de salida *
                    </label>
                    <input
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      style={{ width: '100%', padding: '7px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#fff' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                      Foto salida camión (Cámara/Archivo) *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileChange(e, setDepartureFileUrl)}
                      style={{ fontSize: '12px', width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                      Descripción obligatoria *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Camión saliendo por garita principal con contenedor vacío"
                      value={departureCaption}
                      onChange={(e) => setDepartureCaption(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#fff' }}
                    />
                  </div>
                </div>

                {departureFileUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--color-border)', marginBottom: '12px' }}>
                    <img
                      src={departureFileUrl}
                      alt="Preview Salida"
                      style={{ width: '54px', height: '38px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      Foto de salida lista para confirmar
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleRegisterDeparture}
                    disabled={saving || !departureFileUrl.trim() || !departureCaption.trim()}
                    style={{
                      padding: '10px 20px',
                      background: 'var(--color-danger)',
                      color: '#fff',
                      border: 0,
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: saving || !departureFileUrl.trim() ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {saving ? 'Registrando salida...' : '🚚 Registrar salida del camión y cerrar contenedor'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer de Acciones de la Vista */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '10px' }}>
          <button
            type="button"
            className="button secondary"
            onClick={onBack}
            style={{ fontSize: '13px' }}
          >
            ← Volver a la lista de contenedores
          </button>

          {!container.hora_salida_contenedor && onOpenReceptions && (
            <button
              type="button"
              onClick={() => onOpenReceptions(container.id_contenedor)}
              style={{
                padding: '8px 18px',
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

      </div>

      {/* Lightbox para Foto Ampliada */}
      {selectedPhoto && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedPhoto(null)}
          style={{ zIndex: 1100, background: 'rgba(0,0,0,0.85)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', background: '#fff', borderRadius: '8px', overflow: 'hidden', padding: '16px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--color-brand)' }}>
                  {selectedPhoto.tipo.replace(/_/g, ' ')}
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  {selectedPhoto.caption}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                style={{ background: 'transparent', border: 0, fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
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
