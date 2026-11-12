import { useEffect, useMemo, useState } from 'react'
import { logCatalogChange } from '../../lib/audit'
import { supabase } from '../../lib/supabase'
import { locationService } from '../../services/locationService'
import type { PalletRecord } from '../../types/locations'
import { productoRepository } from '../products/repositories/ProductRepository'
import { unidadSerializadaRepository } from '../products/repositories/SerialUnitRepository'
import type { EstadoUnidadSerial, UnidadSerializada } from '../products/types'
import { InventoryKpiStrip } from './InventoryKpiStrip'
import { OperationalAlertsBanner } from './OperationalAlertsBanner'
import { PalletDecommissionSubView } from './PalletDecommissionSubView'
import { RackLocationsSubView } from './RackLocationsSubView'
import { WarehouseSelectorBar } from './WarehouseSelectorBar'
import { SerialInspectionModal } from './modals/SerialInspectionModal'
import { StockEntryAdjustModal } from './modals/StockEntryAdjustModal'
import { WarehouseCrudModal } from './modals/WarehouseCrudModal'
import { MovementsSubView } from './subviews/MovementsSubView'
import { StockPalletsSubView } from './subviews/StockPalletsSubView'
import { WarehouseAdminSubView } from './subviews/WarehouseAdminSubView'
import {
  mapProductToOption,
  type InventoryItem,
  type Movement,
  type PalletCountSummary,
  type ProductOption,
  type SystemAlert,
  type Warehouse
} from './types'

export function InventoryPage({ onBack }: { onBack: () => void }) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [showZeroStock, setShowZeroStock] = useState<boolean>(false)
  const [movements, setMovements] = useState<Movement[]>([])
  const [allProducts, setAllProducts] = useState<ProductOption[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingStock, setLoadingStock] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [currentTab, setCurrentTab] = useState<'stock' | 'paletas' | 'ubicaciones' | 'movimientos' | 'almacenes'>('stock')
  const [filterPalletSku, setFilterPalletSku] = useState('')
  const [activePallets, setActivePallets] = useState<PalletRecord[]>([])
  const [palletCountsMap, setPalletCountsMap] = useState<Map<number, PalletCountSummary>>(new Map())
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([])
  const [serialUnitsMap, setSerialUnitsMap] = useState<Map<number, UnidadSerializada[]>>(new Map())

  // Estado de los Modales
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustModalProductId, setAdjustModalProductId] = useState<string>('')
  const [adjustModalPaletas, setAdjustModalPaletas] = useState<string>('0')
  const [adjustModalPuchos, setAdjustModalPuchos] = useState<string>('0')

  const [inspectSerialProd, setInspectSerialProd] = useState<{
    product: ProductOption
    units: UnidadSerializada[]
  } | null>(null)
  const [updatingUnitState, setUpdatingUnitState] = useState(false)

  const [showWhModal, setShowWhModal] = useState(false)
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null)
  const [savingWh, setSavingWh] = useState(false)

  // Cargar infraestructura y catálogo inicial
  async function loadInitialData(selectWhId?: number) {
    setLoading(true)
    setError(null)

    const { data: whData, error: whErr } = await supabase
      .from('almacen')
      .select('id_almacen, nombre, tipo, capacidad_m3, activo, prefijo_rfid')
      .order('id_almacen')

    if (whErr) {
      setError(`Error cargando almacenes: ${whErr.message}`)
      setLoading(false)
      return
    }

    const whList = (whData as Warehouse[]) || []
    setWarehouses(whList)

    if (selectWhId) {
      setSelectedWarehouseId(selectWhId)
    } else if (whList.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(whList[0].id_almacen)
    }

    try {
      const prodList = await productoRepository.obtenerTodos()
      const opts: ProductOption[] = prodList.map(mapProductToOption)
      setAllProducts(opts)
    } catch (prodErr: any) {
      console.warn('[loadInitialData] Error cargando catálogo maestro:', prodErr)
    }

    setLoading(false)
  }

  // Cargar existencias, movimientos y paletas del almacén activo
  async function loadWarehouseInventory(whId: number) {
    setLoadingStock(true)
    setError(null)

    let currentProds = allProducts
    if (currentProds.length === 0) {
      try {
        const prodList = await productoRepository.obtenerTodos()
        currentProds = prodList.map(mapProductToOption)
        setAllProducts(currentProds)
      } catch (prodErr: any) {
        console.warn('[loadWarehouseInventory] Error cargando productos:', prodErr)
      }
    }

    // Cargar unidades serializadas
    try {
      const { data: sData } = await supabase
        .from('unidad_serializada')
        .select(`
          id_unidad,
          id_producto,
          numero_serie,
          id_etiqueta,
          id_almacen,
          estado,
          fecha_ingreso,
          etiqueta_rfid:etiqueta_rfid (
            id_etiqueta,
            uid_tag,
            estado
          )
        `)
        .eq('id_almacen', whId)
        .order('fecha_ingreso', { ascending: false })

      const sMap = new Map<number, UnidadSerializada[]>()
      if (sData) {
        for (const s of sData) {
          const pid = Number(s.id_producto)
          const list = sMap.get(pid) || []
          list.push(s as unknown as UnidadSerializada)
          sMap.set(pid, list)
        }
      }
      setSerialUnitsMap(sMap)
    } catch (sErr) {
      console.warn('[loadWarehouseInventory] Error cargando unidades serializadas:', sErr)
    }

    // Cargar inventario contable
    const { data, error: invErr } = await supabase
      .from('inventario')
      .select(`
        id_inventario,
        id_producto,
        id_almacen,
        stock_real,
        stock_minimo,
        estado_semaforo,
        producto (
          sku,
          nombre,
          clasificacion_abc,
          unidad_medida,
          categoria (nombre, modo_manejo),
          regla_empaque (
            unidades_por_caja,
            cajas_por_camada,
            numero_camadas,
            cajas_por_camita,
            camitas_por_paleta,
            volumen_caja_m3,
            volumen_total_m3
          )
        )
      `)
      .eq('id_almacen', whId)

    if (invErr) {
      console.warn('[loadWarehouseInventory] Error consultando inventario:', invErr.message)
    }

    // Cargar movimientos recientes
    const { data: movData } = await supabase
      .from('movimiento')
      .select('id_movimiento, tipo, cantidad_afectada, fecha_hora, motivo, producto(sku, nombre)')
      .eq('destino_almacen', whId)
      .order('fecha_hora', { ascending: false })
      .limit(30)

    setMovements((movData as unknown as Movement[]) || [])

    // Cargar paletas físicas reales
    let pList: PalletRecord[] = []
    try {
      pList = await locationService.getWarehousePallets(whId)
      setActivePallets(pList)
    } catch {
      setActivePallets([])
    }

    // Cargar conteos oficiales
    try {
      const counts = await locationService.getWarehousePalletCounts(whId)
      const cMap = new Map<number, PalletCountSummary>()
      for (const c of counts) {
        if (c.id_producto) {
          cMap.set(c.id_producto, c)
        }
      }
      setPalletCountsMap(cMap)
    } catch {
      setPalletCountsMap(new Map())
    }

    // Cargar alertas del sistema
    try {
      const alerts = await locationService.getSystemAlerts(whId)
      setSystemAlerts(alerts)
    } catch {
      setSystemAlerts([])
    }

    // Reconciliación 1:1 entre inventario contable y paletas físicas reales
    const invItems: InventoryItem[] = (data as unknown as InventoryItem[]) || []
    const existingProdIds = new Set(invItems.map((item) => item.id_producto))

    const missingFromInventory = new Map<number, PalletRecord[]>()
    for (const p of pList) {
      if (p.id_producto && !existingProdIds.has(p.id_producto)) {
        const cur = missingFromInventory.get(p.id_producto) || []
        cur.push(p)
        missingFromInventory.set(p.id_producto, cur)
      }
    }

    for (const [prodId, pallets] of missingFromInventory.entries()) {
      const prodInfo = currentProds.find((ap) => ap.id_producto === prodId)
      const samplePallet = pallets[0]
      const totalPhysicalUnits = pallets.reduce(
        (acc, p) => acc + (Number(p.cantidad_actual) || Number(p.cantidad_paquetes) || 0),
        0
      )
      const minStock = 100
      const semaforo = totalPhysicalUnits <= 0 ? 'ROJO' : totalPhysicalUnits <= minStock ? 'AMARILLO' : 'VERDE'

      const syntheticItem: InventoryItem = {
        id_inventario: -prodId,
        id_producto: prodId,
        id_almacen: whId,
        stock_real: totalPhysicalUnits,
        stock_minimo: minStock,
        estado_semaforo: semaforo,
        producto: {
          sku: prodInfo?.sku || samplePallet.producto?.sku || `SKU-${prodId}`,
          nombre: prodInfo?.nombre || samplePallet.producto?.nombre || 'Producto registrado',
          clasificacion_abc: 'A',
          unidad_medida: 'UND',
          categoria: { nombre: 'General' },
          regla_empaque: {
            unidades_por_caja: prodInfo?.unidades_por_caja || 1,
            cajas_por_camada: prodInfo?.cajas_por_paleta || 1,
            numero_camadas: 1,
            volumen_caja_m3: prodInfo?.volumen_caja_m3 || null
          }
        }
      }
      invItems.push(syntheticItem)

      void supabase.from('inventario').upsert(
        {
          id_almacen: whId,
          id_producto: prodId,
          stock_real: totalPhysicalUnits,
          stock_minimo: minStock,
          estado_semaforo: semaforo
        },
        { onConflict: 'id_producto,id_almacen' }
      )
    }

    for (const item of invItems) {
      const prodPallets = pList.filter((p) => p.id_producto === item.id_producto)
      if (prodPallets.length > 0) {
        const physUnits = prodPallets.reduce(
          (acc, p) => acc + (Number(p.cantidad_actual) || Number(p.cantidad_paquetes) || 0),
          0
        )
        if (physUnits > 0 && Number(item.stock_real) === 0) {
          item.stock_real = physUnits
          item.estado_semaforo = physUnits <= item.stock_minimo ? 'AMARILLO' : 'VERDE'
          void supabase
            .from('inventario')
            .update({
              stock_real: physUnits,
              estado_semaforo: item.estado_semaforo
            })
            .eq('id_almacen', whId)
            .eq('id_producto', item.id_producto)
        }
      }
    }

    setInventory(invItems)
    setLoadingStock(false)
  }

  useEffect(() => {
    void loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedWarehouseId !== null) {
      setShowZeroStock(false)
      void loadWarehouseInventory(selectedWarehouseId)
    }
  }, [selectedWarehouseId])

  const selectedWarehouse = warehouses.find((w) => w.id_almacen === selectedWarehouseId)

  // Separar productos activos de los agotados
  const { activeItems } = useMemo(() => {
    const active: InventoryItem[] = []
    const zero: InventoryItem[] = []

    inventory.forEach((item) => {
      const stock = Number(item.stock_real) || 0
      const hasPallets = activePallets.some((p) => p.id_producto === item.id_producto)
      if (stock > 0 || hasPallets) {
        active.push(item)
      } else {
        zero.push(item)
      }
    })

    return { activeItems: active, zeroStockItems: zero }
  }, [inventory, activePallets])

  // Resumen métrico del almacén seleccionado
  const summary = useMemo(() => {
    let totalUnidades = 0
    let totalVolumenM3 = 0

    const paletasCompletasFisicas = activePallets.filter((p) => p.tipo_paleta === 'COMPLETO').length
    const puchosFisicos = activePallets.filter((p) => p.tipo_paleta === 'PUCHO').length
    const totalCajasPuchos = activePallets
      .filter((p) => p.tipo_paleta === 'PUCHO')
      .reduce((acc, p) => acc + (Number(p.cantidad_paquetes) || 1), 0)

    activeItems.forEach((item) => {
      const stock = Number(item.stock_real) || 0
      totalUnidades += stock

      const r = Array.isArray(item.producto?.regla_empaque)
        ? item.producto.regla_empaque[0]
        : item.producto?.regla_empaque

      const uCaja = Math.max(1, r?.unidades_por_caja || 1)
      const totalCajas = Math.floor(stock / uCaja)

      const prodOpt = allProducts.find((p) => p.id_producto === item.id_producto)
      if (prodOpt?.modo_manejo === 'SERIALIZADO' && prodOpt.largo_cm && prodOpt.ancho_cm && prodOpt.alto_cm) {
        const volUnitM3 = (prodOpt.largo_cm * prodOpt.ancho_cm * prodOpt.alto_cm) / 1000000
        totalVolumenM3 += stock * volUnitM3
      } else if (r?.volumen_caja_m3) {
        totalVolumenM3 += totalCajas * Number(r.volumen_caja_m3)
      }
    })

    const capacidad = selectedWarehouse?.capacidad_m3 || 500
    const pctOcupado = capacidad > 0 ? (totalVolumenM3 / capacidad) * 100 : 0
    const totalEquiposSeriales = Array.from(serialUnitsMap.values()).reduce((acc, list) => acc + list.length, 0)

    return {
      totalUnidades,
      totalPaletas: paletasCompletasFisicas,
      totalPuchos: puchosFisicos,
      totalCajasPuchos,
      totalVolumenM3: Number(totalVolumenM3.toFixed(3)),
      pctOcupado: Math.min(100, Number(pctOcupado.toFixed(1))),
      itemsCount: activeItems.length,
      totalEquiposSeriales
    }
  }, [activeItems, selectedWarehouse, activePallets, allProducts, serialUnitsMap])

  // Acciones de almacenes
  async function handleSaveWarehouse(payload: {
    nombre: string
    tipo: 'PRINCIPAL' | 'TIENDA' | 'MERMA'
    capacidad_m3: number | null
    activo: boolean
    prefijo_rfid: string
  }) {
    setSavingWh(true)
    setError(null)
    setSuccessMsg(null)

    try {
      if (editingWh) {
        const { error: updErr } = await supabase
          .from('almacen')
          .update(payload)
          .eq('id_almacen', editingWh.id_almacen)

        if (updErr) throw updErr

        await logCatalogChange({
          tabla: 'almacen',
          operacion: 'UPDATE',
          id_registro: editingWh.id_almacen,
          datos_anteriores: editingWh,
          datos_nuevos: payload
        })

        setSuccessMsg(`Almacén "${payload.nombre}" actualizado correctamente con prefijo [${payload.prefijo_rfid}].`)
        await loadInitialData(editingWh.id_almacen)
      } else {
        const { data: newWh, error: insErr } = await supabase
          .from('almacen')
          .insert(payload)
          .select('id_almacen')
          .single()

        if (insErr) throw insErr

        if (newWh?.id_almacen) {
          try {
            await supabase
              .from('secuencia_rfid')
              .upsert({ id_almacen: newWh.id_almacen, ultimo_numero: 0 }, { onConflict: 'id_almacen' })
          } catch {}
        }

        await logCatalogChange({
          tabla: 'almacen',
          operacion: 'INSERT',
          id_registro: newWh?.id_almacen ?? 0,
          datos_nuevos: payload
        })

        setSuccessMsg(`Nuevo almacén "${payload.nombre}" registrado correctamente con prefijo [${payload.prefijo_rfid}].`)
        await loadInitialData(newWh?.id_almacen)
      }
      setShowWhModal(false)
    } catch (err: any) {
      setError(`Error guardando almacén: ${err.message}`)
    } finally {
      setSavingWh(false)
    }
  }

  async function handleToggleWarehouseActive(wh: Warehouse) {
    setError(null)
    const updatedStatus = !wh.activo

    const { error: updErr } = await supabase
      .from('almacen')
      .update({ activo: updatedStatus })
      .eq('id_almacen', wh.id_almacen)

    if (updErr) {
      setError(`Error cambiando estado: ${updErr.message}`)
      return
    }

    await logCatalogChange({
      tabla: 'almacen',
      operacion: 'UPDATE',
      id_registro: wh.id_almacen,
      datos_anteriores: { activo: wh.activo },
      datos_nuevos: { activo: updatedStatus }
    })

    setSuccessMsg(`Almacén "${wh.nombre}" ${updatedStatus ? 'activado' : 'desactivado'}.`)
    await loadInitialData(wh.id_almacen)
  }

  async function handleDeleteWarehouse(wh: Warehouse) {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar el almacén "${wh.nombre}"? Si tiene existencias registradas, el sistema impedirá su eliminación para proteger los datos.`
      )
    ) {
      return
    }

    setError(null)
    const { error: delErr } = await supabase.from('almacen').delete().eq('id_almacen', wh.id_almacen)

    if (delErr) {
      setError(
        `No se puede eliminar el almacén porque contiene registros dependientes (inventario o movimientos). Te recomendamos desactivarlo: ${delErr.message}`
      )
      return
    }

    await logCatalogChange({
      tabla: 'almacen',
      operacion: 'DELETE',
      id_registro: wh.id_almacen,
      datos_anteriores: wh
    })

    setSuccessMsg(`Almacén "${wh.nombre}" eliminado correctamente.`)
    await loadInitialData()
  }

  async function handleToggleUnitState(unit: UnidadSerializada) {
    setUpdatingUnitState(true)
    setError(null)
    try {
      const nuevoEstado: EstadoUnidadSerial = unit.estado === 'DISPONIBLE' ? 'EN_MANTENIMIENTO' : 'DISPONIBLE'
      await unidadSerializadaRepository.cambiarEstado(unit.id_unidad, nuevoEstado)

      if (inspectSerialProd) {
        const updatedUnits = inspectSerialProd.units.map((u) =>
          u.id_unidad === unit.id_unidad ? { ...u, estado: nuevoEstado } : u
        )
        setInspectSerialProd({ ...inspectSerialProd, units: updatedUnits })
      }
      if (selectedWarehouseId) {
        await loadWarehouseInventory(selectedWarehouseId)
      }
    } catch (err: any) {
      setError(`Error actualizando estado de unidad serializada: ${err.message}`)
    } finally {
      setUpdatingUnitState(false)
    }
  }

  if (loading) {
    return <main className="screen-message">Cargando infraestructura de almacenes y existencias…</main>
  }

  return (
    <section className="products-page">
      {/* Encabezado Módulo 2 */}
      <div className="page-heading">
        <div>
          <button className="link-back" type="button" onClick={onBack}>
            <span aria-hidden="true">‹</span> Volver al panel principal
          </button>
          <div className="view-title-row">
            <h2>Inventario y almacenes</h2>
            <span className="module-code-badge">MOD-02</span>
          </div>
          <p className="page-lead">
            Supervisión de existencias físicas por almacén, conteo en paletas completas y puchos, y administración de sedes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              setAdjustModalProductId('')
              setAdjustModalPaletas('0')
              setAdjustModalPuchos('0')
              setShowAdjustModal(true)
            }}
            style={{ margin: 0 }}
          >
            + Ingresar stock / paleta
          </button>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => selectedWarehouseId && void loadWarehouseInventory(selectedWarehouseId)}
          >
            Actualizar existencias
          </button>
        </div>
      </div>

      {/* Alertas del Sistema */}
      {error && (
        <p className="error notice" style={{ margin: '14px 0' }}>
          {error}
        </p>
      )}
      {successMsg && (
        <div
          role="status"
          style={{
            margin: '14px 0',
            padding: '10px 16px',
            backgroundColor: 'var(--color-brand-soft)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            color: 'var(--color-brand-deep)',
            fontSize: '13.5px',
            fontWeight: 500
          }}
        >
          {successMsg}
        </div>
      )}

      {/* Alertas Operativas de Piso */}
      <OperationalAlertsBanner
        alerts={systemAlerts}
        onResolveAlert={async (idAlerta) => {
          await locationService.resolveAlert(idAlerta)
          setSystemAlerts((prev) => prev.filter((a) => a.id_alerta !== idAlerta))
          setSuccessMsg('Alerta marcada como verificada.')
        }}
      />

      {/* Selector Operativo de Almacenes (Soporta 50+ sedes con búsqueda instantánea) */}
      <WarehouseSelectorBar
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        onSelectWarehouse={(id) => setSelectedWarehouseId(id)}
        onNewWarehouse={() => {
          setEditingWh(null)
          setShowWhModal(true)
        }}
        onEditWarehouse={(wh) => {
          setEditingWh(wh)
          setShowWhModal(true)
        }}
        summary={summary}
      />

      {/* Tira Densa de KPIs Ejecutivos (Efferd 2 / skill_design.md) */}
      <InventoryKpiStrip
        summary={summary}
        activePalletsCount={activePallets.length}
        warehouseName={selectedWarehouse?.nombre}
      />

      {/* Navegación de Subpestañas */}
      <nav className="module-tabs">
        <button
          className={currentTab === 'stock' ? 'active' : ''}
          type="button"
          onClick={() => setCurrentTab('stock')}
        >
          Existencias y paletizado ({activeItems.length})
        </button>
        <button
          className={currentTab === 'paletas' ? 'active' : ''}
          type="button"
          onClick={() => {
            setFilterPalletSku('')
            setCurrentTab('paletas')
          }}
        >
          Paletas RFID ({activePallets.length})
        </button>
        <button
          className={currentTab === 'ubicaciones' ? 'active' : ''}
          type="button"
          onClick={() => setCurrentTab('ubicaciones')}
        >
          Racks y ubicaciones
        </button>
        <button
          className={currentTab === 'movimientos' ? 'active' : ''}
          type="button"
          onClick={() => setCurrentTab('movimientos')}
        >
          Historial de movimientos ({movements.length})
        </button>
        <button
          className={currentTab === 'almacenes' ? 'active' : ''}
          type="button"
          onClick={() => setCurrentTab('almacenes')}
        >
          Administración de almacenes ({warehouses.length})
        </button>
      </nav>

      {/* Pestaña 1: Existencias y Paletizado */}
      {currentTab === 'stock' && (
        <StockPalletsSubView
          warehouseName={selectedWarehouse?.nombre}
          inventory={inventory}
          allProducts={allProducts}
          activePallets={activePallets}
          palletCountsMap={palletCountsMap}
          serialUnitsMap={serialUnitsMap}
          loadingStock={loadingStock}
          showZeroStock={showZeroStock}
          onToggleShowZeroStock={(show) => setShowZeroStock(show)}
          onOpenAdjustModal={(prodId, isSerial, paletas, puchos) => {
            setAdjustModalProductId(String(prodId))
            if (isSerial) {
              setAdjustModalPaletas('0')
              setAdjustModalPuchos('0')
            } else {
              setAdjustModalPaletas(String(paletas ?? 0))
              setAdjustModalPuchos(String(puchos ?? 0))
            }
            setShowAdjustModal(true)
          }}
          onInspectSerial={(product, units) => {
            setInspectSerialProd({ product, units })
          }}
          onViewPallets={(sku) => {
            setFilterPalletSku(sku)
            setCurrentTab('paletas')
          }}
        />
      )}

      {/* Pestaña 2: Paletas RFID */}
      {currentTab === 'paletas' && selectedWarehouse && (
        <PalletDecommissionSubView
          warehouseId={selectedWarehouse.id_almacen}
          warehouseName={selectedWarehouse.nombre}
          products={allProducts}
          warehouses={warehouses}
          initialFilterSku={filterPalletSku}
          onPalletDecommissioned={() => {
            void loadWarehouseInventory(selectedWarehouse.id_almacen)
          }}
        />
      )}

      {/* Pestaña 3: Racks y Ubicaciones Físicas */}
      {currentTab === 'ubicaciones' && selectedWarehouse && (
        <RackLocationsSubView
          warehouseId={selectedWarehouse.id_almacen}
          warehouseName={selectedWarehouse.nombre}
          products={allProducts}
        />
      )}

      {/* Pestaña 4: Historial de Movimientos */}
      {currentTab === 'movimientos' && (
        <MovementsSubView
          warehouseName={selectedWarehouse?.nombre}
          movements={movements}
        />
      )}

      {/* Pestaña 5: Administración de Almacenes */}
      {currentTab === 'almacenes' && (
        <WarehouseAdminSubView
          warehouses={warehouses}
          onNewWarehouse={() => {
            setEditingWh(null)
            setShowWhModal(true)
          }}
          onEditWarehouse={(wh) => {
            setEditingWh(wh)
            setShowWhModal(true)
          }}
          onToggleWarehouseActive={(wh) => void handleToggleWarehouseActive(wh)}
          onDeleteWarehouse={(wh) => void handleDeleteWarehouse(wh)}
        />
      )}

      {/* MODALES DEL MÓDULO */}
      <StockEntryAdjustModal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        selectedWarehouseId={selectedWarehouseId}
        selectedWarehouseName={selectedWarehouse?.nombre}
        selectedWarehousePrefix={selectedWarehouse?.prefijo_rfid || undefined}
        allProducts={allProducts}
        initialProductId={adjustModalProductId}
        initialPaletas={adjustModalPaletas}
        initialPuchos={adjustModalPuchos}
        onSaveSuccess={(msg) => {
          setSuccessMsg(msg)
          if (selectedWarehouseId) {
            void loadWarehouseInventory(selectedWarehouseId)
          }
        }}
        onError={(err) => setError(err)}
      />

      <SerialInspectionModal
        isOpen={Boolean(inspectSerialProd)}
        onClose={() => setInspectSerialProd(null)}
        inspectProd={inspectSerialProd}
        warehouseName={selectedWarehouse?.nombre}
        onToggleUnitState={(unit) => void handleToggleUnitState(unit)}
        updatingUnitState={updatingUnitState}
        onOpenEnrollModal={(prodId) => {
          setAdjustModalProductId(String(prodId))
          setShowAdjustModal(true)
        }}
      />

      <WarehouseCrudModal
        isOpen={showWhModal}
        onClose={() => setShowWhModal(false)}
        editingWh={editingWh}
        onSaveWarehouse={handleSaveWarehouse}
        saving={savingWh}
      />
    </section>
  )
}
