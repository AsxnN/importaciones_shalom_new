import { useEffect, useState, useMemo } from 'react'
import { containerService } from '../services/containerService'
import type { ContainerRecord, NewContainerPayload } from '../types/containers'
import { NewContainerModal } from './containers/NewContainerModal'
import { ContainerDetailModal } from './containers/ContainerDetailModal'

interface Props {
  onBack: () => void
  onOpenReceptions?: (containerId?: number) => void
}

export function ContainersPage({ onBack, onOpenReceptions }: Props) {
  const [containers, setContainers] = useState<ContainerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filtros
  const [activeTab, setActiveTab] = useState<'patio' | 'historial'>('patio')
  const [searchTerm, setSearchTerm] = useState('')

  // Modales
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedContainer, setSelectedContainer] = useState<ContainerRecord | null>(null)

  const loadContainers = async () => {
    setLoading(true)
    try {
      const data = await containerService.getContainers('ALL')
      setContainers(data)
    } catch (err: any) {
      setErrorMsg(`Error al cargar contenedores: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContainers()
  }, [])

  // Filtrado reactivo
  const filteredContainers = useMemo(() => {
    return containers.filter((c) => {
      // Pestaña
      const matchesTab =
        activeTab === 'patio'
          ? !c.hora_salida_contenedor && c.estado !== 'DESPACHADO'
          : !!c.hora_salida_contenedor || c.estado === 'DESPACHADO'

      if (!matchesTab) return false

      // Búsqueda
      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      return (
        c.numero_contenedor.toLowerCase().includes(term) ||
        c.placa_camion.toLowerCase().includes(term) ||
        (c.empresa_transporte && c.empresa_transporte.toLowerCase().includes(term)) ||
        (c.nombre_cuadrilla && c.nombre_cuadrilla.toLowerCase().includes(term))
      )
    })
  }, [containers, activeTab, searchTerm])

  // KPIs
  const activeInYardCount = useMemo(() => {
    return containers.filter((c) => !c.hora_salida_contenedor && c.estado !== 'DESPACHADO').length
  }, [containers])

  const activeCrewsCount = useMemo(() => {
    return containers.filter(
      (c) =>
        !c.hora_salida_contenedor &&
        c.tipo_personal === 'CUADRILLA_EXTERNA' &&
        c.hora_llegada_cuadrilla &&
        !c.hora_salida_cuadrilla
    ).length
  }, [containers])

  const departedCount = useMemo(() => {
    return containers.filter((c) => !!c.hora_salida_contenedor || c.estado === 'DESPACHADO').length
  }, [containers])

  const handleCreateContainer = async (payload: NewContainerPayload) => {
    const res = await containerService.createContainer(payload)
    if (res.success) {
      setSuccessMsg(`Contenedor ${payload.numero_contenedor} (Placa ${payload.placa_camion}) registrado exitosamente.`)
      setTimeout(() => setSuccessMsg(null), 4000)
      loadContainers()
      return { success: true }
    }
    return { success: false, error: res.error }
  }

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

  const calculateCrewDecimalHours = (startStr?: string | null, endStr?: string | null) => {
    if (!startStr || !endStr) return null
    const diffMs = Math.max(0, new Date(endStr).getTime() - new Date(startStr).getTime())
    return (diffMs / (1000 * 60 * 60)).toFixed(2)
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <button
            type="button"
            className="button secondary"
            onClick={onBack}
            style={{ marginBottom: '8px', fontSize: '13px' }}
          >
            ← Volver al resumen
          </button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, color: 'var(--color-brand-deep)', margin: 0 }}>
            Control de contenedores y patio
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Registro independiente de vehículos en garita, tiempos de permanencia, control de horas de cuadrilla y evidencias fotográficas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          style={{
            background: 'var(--color-brand)',
            color: '#fff',
            border: 0,
            borderRadius: '6px',
            padding: '9px 18px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          + Registrar llegada de contenedor
        </button>
      </div>

      {successMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid var(--color-success)', color: 'var(--color-success)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#fdf2f2', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
          {errorMsg}
        </div>
      )}

      {/* Tira Horizontal de Indicadores Clave */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px 18px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block' }}>
            Contenedores activos en patio
          </span>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--color-brand)', display: 'block', margin: '2px 0' }}>
            {activeInYardCount}
          </strong>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Disponibles para Recepciones RFID
          </span>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px 18px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block' }}>
            Cuadrillas externas en faena
          </span>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: activeCrewsCount > 0 ? 'var(--color-warning)' : 'var(--color-text-primary)', display: 'block', margin: '2px 0' }}>
            {activeCrewsCount}
          </strong>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Con reloj activo de horas a liquidar
          </span>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px 18px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block' }}>
            Contenedores despachados
          </span>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'block', margin: '2px 0' }}>
            {departedCount}
          </strong>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Con salida y fotos cerradas
          </span>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '14px 18px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block' }}>
            Límite de evidencias
          </span>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--color-brand-deep)', display: 'block', margin: '2px 0' }}>
            10 fotos
          </strong>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Máximo por vehículo / contenedor
          </span>
        </div>
      </div>

      {/* Pestañas de Navegación y Filtros */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div className="module-tabs" style={{ margin: 0 }}>
            <button
              type="button"
              className={activeTab === 'patio' ? 'active' : ''}
              onClick={() => setActiveTab('patio')}
            >
              En patio y rampa ({activeInYardCount})
            </button>
            <button
              type="button"
              className={activeTab === 'historial' ? 'active' : ''}
              onClick={() => setActiveTab('historial')}
            >
              Historial y despachados ({departedCount})
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="search"
              placeholder="Buscar por contenedor, placa o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '280px',
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                fontSize: '13px'
              }}
            />
          </div>
        </div>

        {/* Tabla de Contenedores */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-secondary)' }}>
            Cargando control de contenedores…
          </div>
        ) : filteredContainers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)', background: 'var(--color-canvas)', borderRadius: '6px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 500 }}>
              {activeTab === 'patio'
                ? 'No hay camiones ni contenedores activos en patio en este momento.'
                : 'No se encontraron contenedores despachados con los filtros aplicados.'}
            </p>
            {activeTab === 'patio' && (
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                style={{ padding: '6px 14px', background: 'var(--color-brand)', color: '#fff', border: 0, borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
              >
                + Registrar ingreso de camión
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-canvas)' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Contenedor y Placa</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Llegada / Salida</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Permanencia</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Personal / Cuadrilla</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Evidencias</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Estado</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredContainers.map((c) => (
                  <tr
                    key={c.id_contenedor}
                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                    onClick={() => setSelectedContainer(c)}
                  >
                    <td style={{ padding: '12px' }}>
                      <strong style={{ display: 'block', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        {c.numero_contenedor}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--color-brand-deep)', fontWeight: 600 }}>
                        Placa: {c.placa_camion}
                      </span>
                      {c.empresa_transporte && (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>
                          {c.empresa_transporte}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px' }}>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-primary)' }}>
                        Ingreso: {new Date(c.hora_llegada_contenedor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        {new Date(c.hora_llegada_contenedor).toLocaleDateString()}
                      </span>
                      {c.hora_salida_contenedor && (
                        <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-success)', marginTop: '2px' }}>
                          Salida: {new Date(c.hora_salida_contenedor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--color-brand)' }}>
                        {calculateDuration(c.hora_llegada_contenedor, c.hora_salida_contenedor)}
                      </strong>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>
                        {c.hora_salida_contenedor ? 'Cerrado' : 'En patio'}
                      </span>
                    </td>

                    <td style={{ padding: '12px' }}>
                      {c.tipo_personal === 'PROPIO' ? (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                          Personal propio
                        </span>
                      ) : (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-warning)' }}>
                            Cuadrilla externa ({c.num_estibadores || 0} p.)
                          </span>
                          {c.nombre_cuadrilla && (
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>
                              {c.nombre_cuadrilla}
                            </span>
                          )}
                          {c.hora_salida_cuadrilla && (
                            <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 600, display: 'block' }}>
                              {calculateCrewDecimalHours(c.hora_llegada_cuadrilla, c.hora_salida_cuadrilla)} hrs a liquidar
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'var(--color-canvas)',
                          border: '1px solid var(--color-border)',
                          color: c.fotos.length > 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'
                        }}
                      >
                        {c.fotos.length} / 10 fotos
                      </span>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background:
                            c.estado === 'DESPACHADO'
                              ? 'rgba(47, 125, 79, 0.12)'
                              : c.estado === 'EN_DESCARGA'
                              ? 'rgba(22, 125, 141, 0.12)'
                              : 'rgba(188, 121, 31, 0.12)',
                          color:
                            c.estado === 'DESPACHADO'
                              ? 'var(--color-success)'
                              : c.estado === 'EN_DESCARGA'
                              ? 'var(--color-brand)'
                              : 'var(--color-warning)'
                        }}
                      >
                        {c.estado === 'EN_PATIO'
                          ? 'En patio'
                          : c.estado === 'EN_DESCARGA'
                          ? 'En descarga'
                          : 'Despachado'}
                      </span>
                    </td>

                    <td style={{ padding: '12px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedContainer(c)}
                          style={{
                            padding: '4px 10px',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Ver ficha
                        </button>

                        {!c.hora_salida_contenedor && onOpenReceptions && (
                          <button
                            type="button"
                            onClick={() => onOpenReceptions(c.id_contenedor)}
                            style={{
                              padding: '4px 10px',
                              background: 'var(--color-brand-soft)',
                              border: '1px solid var(--color-brand)',
                              color: 'var(--color-brand)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            title="Ir a Recepciones RFID para iniciar descarga"
                          >
                            Descargar RFID →
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nuevo Contenedor */}
      <NewContainerModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSave={handleCreateContainer}
      />

      {/* Modal Detalle Contenedor */}
      <ContainerDetailModal
        container={selectedContainer}
        isOpen={!!selectedContainer}
        onClose={() => setSelectedContainer(null)}
        onUpdated={() => {
          loadContainers()
          if (selectedContainer) {
            containerService.getContainers('ALL').then((list) => {
              const updated = list.find((c) => c.id_contenedor === selectedContainer.id_contenedor)
              setSelectedContainer(updated || null)
            })
          }
        }}
        onOpenReceptions={(id) => {
          setSelectedContainer(null)
          onOpenReceptions?.(id)
        }}
      />
    </div>
  )
}
