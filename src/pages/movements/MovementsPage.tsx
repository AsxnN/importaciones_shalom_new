import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { locationService } from '../../services/locationService'
import type { PalletRecord } from '../../types/locations'
import type {
  Warehouse,
  MovementLog,
  MovementsSummary,
  MovementTab,
  DestinationMode,
  TipoSalida
} from './types'
import { MovementWarehouseSelectorBar } from './MovementWarehouseSelectorBar'
import { MovementsKpiStrip } from './MovementsKpiStrip'
import { TransferOrDispatchSubView } from './subviews/TransferOrDispatchSubView'
import { ActivePalletsSubView } from './subviews/ActivePalletsSubView'
import { MovementHistorySubView } from './subviews/MovementHistorySubView'
import { MovementDetailModal } from './modals/MovementDetailModal'

export function MovementsPage({ onBack }: { onBack: () => void }) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null)
  const [activePallets, setActivePallets] = useState<PalletRecord[]>([])
  const [movements, setMovements] = useState<MovementLog[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingPallets, setLoadingPallets] = useState(false)
  const [currentTab, setCurrentTab] = useState<MovementTab>('operar')

  // Formulario unificado de movimiento
  const [selectedPalletId, setSelectedPalletId] = useState<string>('')
  const [destinationMode, setDestinationMode] = useState<DestinationMode>('INTERNAL')
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('')
  const [tipoSalida, setTipoSalida] = useState<TipoSalida>('VENTA_CLIENTE')
  const [destinatario, setDestinatario] = useState('')
  const [documentoRef, setDocumentoRef] = useState('')
  const [motivo, setMotivo] = useState('')
  const [dispatchUnits, setDispatchUnits] = useState<string>('')
  const [executing, setExecuting] = useState(false)

  // Mensajes de estado
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Modal de auditoría de detalle de movimiento
  const [inspectedMovement, setInspectedMovement] = useState<MovementLog | null>(null)

  // Cargar almacenes activos
  async function loadWarehouses() {
    setLoading(true)
    setErrorMsg(null)
    const { data, error } = await supabase
      .from('almacen')
      .select('id_almacen, nombre, tipo, capacidad_m3, activo, prefijo_rfid')
      .eq('activo', true)
      .order('nombre')

    if (error) {
      setErrorMsg(`Error cargando almacenes: ${error.message}`)
      setLoading(false)
      return
    }

    const list = (data as Warehouse[]) || []
    setWarehouses(list)
    if (list.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(list[0].id_almacen)
    }
    setLoading(false)
  }

  // Cargar paletas y bitácora de movimientos
  async function loadWarehouseData(whId: number) {
    setLoadingPallets(true)
    setErrorMsg(null)

    // 1. Paletas activas en la sede
    try {
      const pList = await locationService.getWarehousePallets(whId)
      setActivePallets(pList)
    } catch {
      setActivePallets([])
    }

    // 2. Historial de movimientos
    const { data: movData, error: movErr } = await supabase
      .from('movimiento')
      .select(`
        id_movimiento,
        tipo,
        cantidad_afectada,
        fecha_hora,
        motivo,
        destino_almacen,
        producto ( sku, nombre, clasificacion_abc, unidad_medida ),
        destino:destino_almacen ( nombre ),
        etiqueta_rfid ( uid_tag )
      `)
      .order('fecha_hora', { ascending: false })
      .limit(60)

    if (!movErr && movData) {
      setMovements(movData as unknown as MovementLog[])
    }

    setLoadingPallets(false)
  }

  useEffect(() => {
    void loadWarehouses()
  }, [])

  useEffect(() => {
    if (selectedWarehouseId !== null) {
      void loadWarehouseData(selectedWarehouseId)
      setSelectedPalletId('')
      const dests = warehouses.filter((w) => w.id_almacen !== selectedWarehouseId)
      setTargetWarehouseId(dests.length > 0 ? String(dests[0].id_almacen) : '')
      setDestinatario('')
      setDocumentoRef('')
      setMotivo('')
    }
  }, [selectedWarehouseId, warehouses])

  const selectedWarehouse = warehouses.find((w) => w.id_almacen === selectedWarehouseId) || null
  const availableDestinations = warehouses.filter((w) => w.id_almacen !== selectedWarehouseId)

  // Paleta seleccionada en el formulario
  const currentPallet = useMemo(() => {
    if (!selectedPalletId) return null
    return activePallets.find((p) => String(p.id_etiqueta) === selectedPalletId) || null
  }, [selectedPalletId, activePallets])

  useEffect(() => {
    if (currentPallet) {
      setDispatchUnits(String(currentPallet.cantidad_actual || currentPallet.cantidad_paquetes || 1))
    } else {
      setDispatchUnits('')
    }
  }, [currentPallet])

  // Resumen métrico para el KPI strip
  const summary: MovementsSummary = useMemo(() => {
    const totalPaletas = activePallets.length
    const totalTransferencias = movements.filter((m) => m.destino_almacen !== null).length
    const totalSalidas = movements.filter(
      (m) => m.destino_almacen === null && (m.tipo === 'DESPACHO_COMPLETO' || m.tipo === 'RETIRO_PARCIAL')
    ).length
    const totalUnidadesMovidas = movements.reduce((acc, m) => acc + (Number(m.cantidad_afectada) || 0), 0)

    return {
      totalPaletas,
      totalTransferencias,
      totalSalidas,
      totalUnidadesMovidas
    }
  }, [activePallets, movements])

  // Transición directa al seleccionar una paleta desde la pestaña "paletas"
  const handleSelectPalletFromList = (palletId: string) => {
    setSelectedPalletId(palletId)
    setCurrentTab('operar')
  }

  // Ejecución del movimiento (Transferencia o Salida externa)
  async function handleExecuteMovement(e: FormEvent) {
    e.preventDefault()
    if (!selectedWarehouseId || !currentPallet) {
      setErrorMsg('Selecciona una paleta física activa para realizar el movimiento.')
      return
    }

    setExecuting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      if (destinationMode === 'INTERNAL') {
        // --- CASO A: TRANSFERENCIA ENTRE ÁREAS INTERNAS ---
        const targetWhId = parseInt(targetWarehouseId)
        if (!targetWhId) {
          throw new Error('Selecciona el almacén o área interna de destino.')
        }

        const targetWh = warehouses.find((w) => w.id_almacen === targetWhId)
        const finalMotivo = motivo.trim() || `Transferencia a ${targetWh?.nombre || 'otra sede'}`

        const res = await locationService.transferPallet(
          currentPallet.uid_tag,
          selectedWarehouseId,
          targetWhId,
          finalMotivo
        )

        let msg = `Transferencia exitosa: Paleta [${currentPallet.uid_tag}] transferida a "${targetWh?.nombre}". `
        msg += `Nuevo código generado en destino: [${res.uid_destino}].`
        if (res.uid_pucho_restante) {
          msg += ` Se generó también pucho restante [${res.uid_pucho_restante}].`
        }
        if (res.alerta_generada) {
          msg += ' Se completó una paleta entera y se generó alerta de verificación física.'
        }

        setSuccessMsg(msg)
      } else {
        // --- CASO B: SALIDA DEFINITIVA FUERA DE LA EMPRESA ---
        const totalUnits = Number(currentPallet.cantidad_actual) || Number(currentPallet.cantidad_paquetes) || 1
        const requestedUnits = Number(dispatchUnits) || totalUnits
        const units = Math.max(1, Math.min(requestedUnits, totalUnits))
        const cajas = Number(currentPallet.cantidad_paquetes) || 1

        const res = await locationService.dispatchPalletOutside({
          palletId: currentPallet.id_etiqueta,
          uidTag: currentPallet.uid_tag,
          warehouseId: selectedWarehouseId,
          productId: currentPallet.id_producto,
          units,
          cajas,
          tipoSalida,
          destinatario: destinatario.trim() || undefined,
          documento: documentoRef.trim() || undefined,
          motivo: motivo.trim() || 'Salida definitiva fuera de la empresa'
        })

        setSuccessMsg(res.mensaje)
      }

      // Limpiar formulario y recargar datos de la sede
      setSelectedPalletId('')
      setTargetWarehouseId('')
      setDestinatario('')
      setDocumentoRef('')
      setMotivo('')
      await loadWarehouseData(selectedWarehouseId)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error procesando el movimiento.')
    } finally {
      setExecuting(false)
    }
  }

  if (loading) {
    return <main className="screen-message">Cargando infraestructura de movimientos y sedes…</main>
  }

  return (
    <div className="inventory-container" style={{ paddingBottom: '40px' }}>
      {/* Cabecera de Página */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        <div>
          <button
            type="button"
            className="btn-back"
            onClick={onBack}
            style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver al resumen
          </button>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '30px',
              fontWeight: 600,
              color: 'var(--color-brand-deep)',
              margin: 0,
              letterSpacing: '0.01em',
              lineHeight: 1.15
            }}
          >
            Movimientos y transferencias
          </h1>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '14px' }}>
            Módulo táctico para transferencias entre áreas internas y salidas definitivas fuera de la empresa.
          </p>
        </div>

        {selectedWarehouse && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--color-brand)',
                background: 'var(--color-brand-soft)',
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid rgba(22, 125, 141, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              </svg>
              Sede activa: {selectedWarehouse.nombre} ({selectedWarehouse.prefijo_rfid || 'SIN PREFIJO'})
            </span>
          </div>
        )}
      </div>

      {/* Alertas y Notificaciones de Estado */}
      {errorMsg && (
        <div
          className="error-banner"
          style={{
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(179, 64, 42, 0.08)',
            border: '1px solid rgba(179, 64, 42, 0.25)',
            color: 'var(--color-danger)',
            borderRadius: '6px',
            padding: '12px 16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{ fontSize: '13.5px', fontWeight: 500 }}>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '16px', fontWeight: 'bold' }}
            aria-label="Cerrar alerta"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: 'var(--color-brand-soft)',
            color: 'var(--color-brand-deep)',
            border: '1px solid var(--color-brand)',
            borderRadius: '6px',
            padding: '12px 18px',
            marginBottom: '16px',
            fontSize: '13.5px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-success)' }} aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-brand-deep)', fontSize: '16px', fontWeight: 'bold' }}
            aria-label="Cerrar confirmación"
          >
            ✕
          </button>
        </div>
      )}

      {/* Selector de Sede de Origen Táctico (Diseño Superior / skill_design.md) */}
      <MovementWarehouseSelectorBar
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        onSelectWarehouse={setSelectedWarehouseId}
        activePalletsCount={activePallets.length}
      />

      {/* Tira Horizontal de Indicadores Clave (KPI Strip) */}
      <MovementsKpiStrip
        summary={summary}
        activeWarehouseName={selectedWarehouse?.nombre}
      />

      {/* Navegación por Subpestañas del Módulo */}
      <nav className="module-tabs" aria-label="Secciones de movimientos">
        <button
          type="button"
          className={currentTab === 'operar' ? 'active' : ''}
          onClick={() => setCurrentTab('operar')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m16 3 4 4-4 4" />
            <path d="M20 7H4" />
            <path d="m8 21-4-4 4-4" />
            <path d="M4 17h16" />
          </svg>
          Realizar movimiento o salida
        </button>

        <button
          type="button"
          className={currentTab === 'paletas' ? 'active' : ''}
          onClick={() => setCurrentTab('paletas')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
          Paletas disponibles en sede ({activePallets.length})
        </button>

        <button
          type="button"
          className={currentTab === 'historial' ? 'active' : ''}
          onClick={() => setCurrentTab('historial')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Historial y Kardex ({movements.length})
        </button>
      </nav>

      {/* =========================================================================
          CONTENIDO SEGÚN SUBPESTAÑA ACTIVA
         ========================================================================= */}
      {currentTab === 'operar' && (
        <TransferOrDispatchSubView
          selectedWarehouse={selectedWarehouse}
          availableDestinations={availableDestinations}
          activePallets={activePallets}
          selectedPalletId={selectedPalletId}
          onSelectPalletId={setSelectedPalletId}
          destinationMode={destinationMode}
          onChangeDestinationMode={setDestinationMode}
          targetWarehouseId={targetWarehouseId}
          onChangeTargetWarehouseId={setTargetWarehouseId}
          tipoSalida={tipoSalida}
          onChangeTipoSalida={setTipoSalida}
          destinatario={destinatario}
          onChangeDestinatario={setDestinatario}
          documentoRef={documentoRef}
          onChangeDocumentoRef={setDocumentoRef}
          motivo={motivo}
          onChangeMotivo={setMotivo}
          dispatchUnits={dispatchUnits}
          onChangeDispatchUnits={setDispatchUnits}
          executing={executing}
          onSubmit={handleExecuteMovement}
        />
      )}

      {currentTab === 'paletas' && (
        <ActivePalletsSubView
          warehouseName={selectedWarehouse?.nombre}
          pallets={activePallets}
          loading={loadingPallets}
          onSelectPalletForOperation={handleSelectPalletFromList}
        />
      )}

      {currentTab === 'historial' && (
        <MovementHistorySubView
          movements={movements}
          onInspectMovement={setInspectedMovement}
        />
      )}

      {/* Modal de Detalle de Auditoría de Movimiento */}
      <MovementDetailModal
        movement={inspectedMovement}
        onClose={() => setInspectedMovement(null)}
      />
    </div>
  )
}
