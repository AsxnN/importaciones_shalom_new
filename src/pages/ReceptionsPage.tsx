import { useEffect, useState, useMemo, type FormEvent } from 'react'
import {
  receptionService,
  type WarehouseOption,
  type ProductOption,
  type SupplierOption
} from '../services/receptionService'
import { containerService } from '../services/containerService'
import { packingListService, type OrderPackingPlan } from '../services/packingListService'
import { orderReceptionService } from '../services/orderReceptionService'
import type { ContainerRecord } from '../types/containers'
import type { ImportOrder, OrderReceptionState } from '../types/receptions'

// Subcomponentes del nuevo flujo modular
import { WarehouseSearchSelector } from './receptions/WarehouseSearchSelector'
import { OrderReceptionView } from './receptions/OrderReceptionView'
import { ProductReceptionView } from './receptions/ProductReceptionView'
import { ReceptionLiquidationView } from './receptions/ReceptionLiquidationView'

interface Props {
  onBack?: () => void
  onNavigateToInventory?: () => void
  initialContainerId?: number | null
}

export function ReceptionsPage({ onBack: _onBack, onNavigateToInventory: _onNavigateToInventory, initialContainerId }: Props) {
  // 1. Almacenes y estado global
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null)

  // 2. Modo de Navegación del Módulo
  // 'orders_list': Lista principal de órdenes
  // 'order_reception': Vista de la orden seleccionada con compuerta de contenedor
  // 'product_reception': Vista de recepción individual de un producto
  // 'liquidation': Vista de liquidación y liberación de códigos
  const [viewMode, setViewMode] = useState<'orders_list' | 'order_reception' | 'product_reception' | 'liquidation'>('orders_list')

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // 3. Datos maestros
  const [orders, setOrders] = useState<ImportOrder[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [activeContainers, setActiveContainers] = useState<ContainerRecord[]>([])

  // 4. Selección activa
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [activePackingPlan, setActivePackingPlan] = useState<OrderPackingPlan | null>(null)
  const [receptionState, setReceptionState] = useState<OrderReceptionState>({
    contenedor_confirmado: false,
    paletas_recibidas: [],
    codigos_liberados: [],
    estado_recepcion: 'PENDIENTE'
  })

  // 5. Filtro y búsqueda en lista de órdenes
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'PENDING' | 'RECEIVED'>('ALL')
  const [searchOrderTerm, setSearchOrderTerm] = useState('')

  // 6. Modal de Nueva Orden Rápida de Importación
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [newOrderNumber, setNewOrderNumber] = useState('')
  const [newOrderSupplierId, setNewOrderSupplierId] = useState<string>('')
  const [newOrderContainer, setNewOrderContainer] = useState<'20FT' | '40FT' | 'LCL'>('40FT')
  const [newOrderItems, setNewOrderItems] = useState<Array<{ id_producto: number; cantidad_pedida: number }>>([])
  const [tempAddProdId, setTempAddProdId] = useState<string>('')
  const [tempAddQty, setTempAddQty] = useState<number>(100)
  const [creatingOrder, setCreatingOrder] = useState(false)

  // 7. Modal y visualizador de Packing List
  const [orderPackingModal, setOrderPackingModal] = useState<OrderPackingPlan | null>(null)
  const [loadingPackingModal, setLoadingPackingModal] = useState(false)

  // Almacén activo
  const selectedWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id_almacen === selectedWarehouseId) || warehouses[0] || null
  }, [warehouses, selectedWarehouseId])

  // Orden activa
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null
    return orders.find((o) => String(o.id_orden) === selectedOrderId) || null
  }, [orders, selectedOrderId])

  // Detalle de producto activo en la orden
  const selectedOrderDetail = useMemo(() => {
    if (!selectedOrder || !selectedProductId) return null
    return selectedOrder.detalles?.find((d) => d.id_producto === selectedProductId) || null
  }, [selectedOrder, selectedProductId])

  // Carga inicial
  const loadInitialData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [whList, ordList, prodList, supList, contList] = await Promise.all([
        receptionService.getWarehouses(),
        receptionService.getImportOrders('ALL'),
        receptionService.getActiveProducts(),
        receptionService.getSuppliers(),
        containerService.getActiveContainersInYard()
      ])

      setWarehouses(whList)
      setOrders(ordList)
      setProducts(prodList)
      setSuppliers(supList)
      setActiveContainers(contList)

      if (whList.length > 0 && selectedWarehouseId === null) {
        setSelectedWarehouseId(whList[0].id_almacen)
      }
    } catch (err: any) {
      setErrorMsg(`Error cargando datos de recepción: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refrescar contenedores al cambiar de vista
  useEffect(() => {
    void containerService.getActiveContainersInYard().then(setActiveContainers)
  }, [viewMode])

  // Órdenes filtradas para la lista principal
  const filteredOrders = useMemo(() => {
    let list = orders
    if (orderFilter === 'PENDING') {
      list = list.filter((o) => o.estado === 'TRANSITO' || o.estado === 'BORRADOR')
    } else if (orderFilter === 'RECEIVED') {
      list = list.filter((o) => o.estado === 'RECIBIDA')
    }

    if (searchOrderTerm.trim()) {
      const q = searchOrderTerm.toLowerCase().trim()
      list = list.filter(
        (o) =>
          o.numero_orden.toLowerCase().includes(q) ||
          (o.proveedor?.razon_social && o.proveedor.razon_social.toLowerCase().includes(q)) ||
          (o.proveedor?.nombre && o.proveedor.nombre.toLowerCase().includes(q)) ||
          (o.detalles && o.detalles.some((d) => d.producto?.sku.toLowerCase().includes(q) || d.producto?.nombre.toLowerCase().includes(q)))
      )
    }
    return list
  }, [orders, orderFilter, searchOrderTerm])

  // Abrir recepción de una orden (Paso al Nivel 2)
  const handleOpenOrderReception = async (ord: ImportOrder) => {
    setErrorMsg(null)
    setSelectedOrderId(String(ord.id_orden))
    setSelectedProductId(null)

    // Cargar o inicializar estado de recepción
    const state = orderReceptionService.getOrderReceptionState(ord.id_orden, ord.snapshot_proyeccion)

    // Si viene un initialContainerId desde MOD-07 y la orden no tenía contenedor confirmado, auto-asociarlo
    if (initialContainerId && !state.contenedor_confirmado) {
      const matched = activeContainers.find((c) => c.id_contenedor === initialContainerId)
      if (matched) {
        state.id_contenedor_seleccionado = matched.id_contenedor
        state.numero_contenedor_seleccionado = matched.numero_contenedor
        state.placa_camion_seleccionado = matched.placa_camion
      }
    }

    setReceptionState(state)

    // Cargar plan de paletizado de la orden (códigos separados)
    try {
      const plan = await packingListService.generateOrderPackingPlan(
        ord,
        selectedWarehouse?.prefijo_rfid || 'IMP'
      )
      setActivePackingPlan(plan)
    } catch (e: any) {
      console.warn('Error loading packing plan:', e)
    }

    setViewMode('order_reception')
  }

  // Guardar contenedor seleccionado para la orden
  const handleSaveContainer = (containerId: number, containerNumber: string, truckPlate: string) => {
    if (!selectedOrder) return
    const updated: OrderReceptionState = {
      ...receptionState,
      id_contenedor_seleccionado: containerId,
      numero_contenedor_seleccionado: containerNumber,
      placa_camion_seleccionado: truckPlate,
      contenedor_confirmado: true
    }
    setReceptionState(updated)
    orderReceptionService.saveOrderReceptionState(selectedOrder.id_orden, updated, selectedOrder.numero_orden)
    setSuccessMsg(`Contenedor [${containerNumber}] vinculado y fijado para la orden ${selectedOrder.numero_orden}.`)
  }

  // Seleccionar un producto para recepcionar (Paso al Nivel 3)
  const handleSelectProduct = (productId: number) => {
    setSelectedProductId(productId)
    setViewMode('product_reception')
  }

  // Confirmar y registrar físicamente una paleta
  const handleConfirmPallet = async (payload: {
    uid_tag: string
    tipo: 'COMPLETO' | 'PUCHO'
    cajas: number
    unidades: number
    codigo_barras?: string
  }) => {
    if (!selectedOrder || !selectedWarehouse || !selectedOrderDetail || !selectedOrderDetail.producto) {
      throw new Error('Faltan datos de la orden o producto para registrar la paleta.')
    }

    const updatedState = await orderReceptionService.recordPalletReception({
      id_orden: selectedOrder.id_orden,
      numero_orden: selectedOrder.numero_orden,
      id_almacen: selectedWarehouse.id_almacen,
      id_producto: selectedOrderDetail.id_producto,
      sku: selectedOrderDetail.producto.sku,
      nombre: selectedOrderDetail.producto.nombre,
      uid_tag: payload.uid_tag,
      tipo: payload.tipo,
      cajas: payload.cajas,
      unidades: payload.unidades,
      id_contenedor: receptionState.id_contenedor_seleccionado,
      numero_contenedor: receptionState.numero_contenedor_seleccionado,
      currentState: receptionState
    })

    setReceptionState(updatedState)
  }

  // Liquidación final de la orden
  const handleConfirmLiquidation = async (
    dictamen: 'COMPLETA' | 'FALTANTES' | 'SOBRANTES',
    observaciones: string,
    codigosALiberar: string[]
  ) => {
    if (!selectedOrder) return

    await orderReceptionService.liquidateOrderReception({
      id_orden: selectedOrder.id_orden,
      numero_orden: selectedOrder.numero_orden,
      dictamen,
      observaciones,
      codigosALiberar,
      id_contenedor: receptionState.id_contenedor_seleccionado,
      packingPlan: activePackingPlan,
      currentState: receptionState
    })

    setSuccessMsg(
      `Recepción de la orden ${selectedOrder.numero_orden} liquidada con éxito (Dictamen: ${dictamen}). Se liberaron ${codigosALiberar.length} códigos correlativos para futuras órdenes.`
    )

    // Recargar órdenes
    await loadInitialData()
    setViewMode('orders_list')
    setSelectedOrderId('')
    setSelectedProductId(null)
  }

  // Modal de Packing List
  const handleOpenOrderPacking = async (ord: ImportOrder) => {
    setLoadingPackingModal(true)
    try {
      const plan = await packingListService.generateOrderPackingPlan(
        ord,
        selectedWarehouse?.prefijo_rfid || 'IMP'
      )
      setOrderPackingModal(plan)
    } catch (err: any) {
      setErrorMsg(`Error al generar el plan de paletizado: ${err.message}`)
    } finally {
      setLoadingPackingModal(false)
    }
  }

  // Crear orden rápida
  const handleCreateOrder = async (e: FormEvent) => {
    e.preventDefault()
    if (!newOrderNumber.trim()) {
      alert('Ingrese el número de orden.')
      return
    }
    if (newOrderItems.length === 0) {
      alert('Debe agregar al menos un producto a la orden.')
      return
    }

    setCreatingOrder(true)
    try {
      const res = await receptionService.createImportOrder({
        numero_orden: newOrderNumber.trim(),
        id_proveedor: newOrderSupplierId ? Number(newOrderSupplierId) : null,
        tipo_contenedor: newOrderContainer,
        items: newOrderItems
      })

      if (!res.success) {
        alert(res.error || 'Error al crear orden.')
        return
      }

      const updatedOrders = await receptionService.getImportOrders('ALL')
      setOrders(updatedOrders)
      setShowOrderModal(false)
      setNewOrderNumber('')
      setNewOrderItems([])

      setSuccessMsg(`Orden ${newOrderNumber} creada y lista para recibir mercancía en muelle.`)
    } catch (err: any) {
      alert(err.message || 'Error al crear orden.')
    } finally {
      setCreatingOrder(false)
    }
  }

  return (
    <div className="workspace" style={{ padding: '24px 32px' }}>
      {/* Mensajes de Alerta y Éxito */}
      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            background: '#FDF2F0',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
            fontSize: '13px',
            marginBottom: '16px'
          }}
        >
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            background: '#EAF5ED',
            border: '1px solid var(--color-success)',
            color: 'var(--color-success)',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>✓ {successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-success)', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* VISTA 1: Lista Principal de Órdenes de Importación */}
      {viewMode === 'orders_list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Cabecera Principal con Selector de Almacén Buscable */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--color-border)'
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-brand)' }}>
                Módulo 04 · Recepciones tácticas en muelle
              </span>
              <h1 className="page-title" style={{ margin: '2px 0 0 0', fontSize: '24px', color: 'var(--color-brand-deep)' }}>
                Órdenes de importación y embarques
              </h1>
              <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '13px' }}>
                Recepción de contenedores llegados al patio, conciliación física y asignación de códigos RFID.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Selector Inteligente de Almacén (Sin scroll horizontal) */}
              <WarehouseSearchSelector
                warehouses={warehouses}
                selectedWarehouseId={selectedWarehouseId}
                onSelectWarehouse={(id) => setSelectedWarehouseId(id)}
              />

              <button
                type="button"
                className="button primary"
                onClick={() => setShowOrderModal(true)}
                style={{ fontWeight: 600 }}
              >
                + Nueva orden de importación
              </button>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className={`button ${orderFilter === 'ALL' ? 'primary' : 'secondary'} button-sm`}
                onClick={() => setOrderFilter('ALL')}
                style={{ fontSize: '13px' }}
              >
                Todas las órdenes ({orders.length})
              </button>
              <button
                type="button"
                className={`button ${orderFilter === 'PENDING' ? 'primary' : 'secondary'} button-sm`}
                onClick={() => setOrderFilter('PENDING')}
                style={{ fontSize: '13px' }}
              >
                En tránsito / Muelle ({orders.filter((o) => o.estado === 'TRANSITO' || o.estado === 'BORRADOR').length})
              </button>
              <button
                type="button"
                className={`button ${orderFilter === 'RECEIVED' ? 'primary' : 'secondary'} button-sm`}
                onClick={() => setOrderFilter('RECEIVED')}
                style={{ fontSize: '13px' }}
              >
                Recibidas ({orders.filter((o) => o.estado === 'RECIBIDA').length})
              </button>
            </div>

            <div style={{ width: '320px', maxWidth: '100%' }}>
              <input
                type="text"
                placeholder="Buscar orden por N°, proveedor o SKU..."
                value={searchOrderTerm}
                onChange={(e) => setSearchOrderTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Tabla de Órdenes */}
          <div className="table-wrap" style={{ margin: 0 }}>
            {loading ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                Cargando órdenes de importación y embarques...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No se encontraron órdenes registradas para el filtro seleccionado.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>N° Orden</th>
                    <th>Fecha de emisión</th>
                    <th>Proveedor</th>
                    <th>Contenedor</th>
                    <th>Líneas de producto</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id_orden}>
                      <td>
                        <strong style={{ color: 'var(--color-brand-deep)', fontSize: '14px' }}>
                          {ord.numero_orden}
                        </strong>
                      </td>
                      <td>{ord.fecha_emision}</td>
                      <td>{ord.proveedor?.nombre || ord.proveedor?.razon_social || 'Proveedor genérico'}</td>
                      <td>
                        <span
                          style={{
                            background: 'var(--color-canvas)',
                            border: '1px solid var(--color-border)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--color-text-secondary)'
                          }}
                        >
                          {ord.tipo_contenedor || '40FT'}
                        </span>
                      </td>
                      <td>
                        {ord.detalles && ord.detalles.length > 0 ? (
                          <div style={{ fontSize: '13px' }}>
                            {ord.detalles.length} producto(s) · {ord.detalles.reduce((acc, d) => acc + (Number(d.cantidad_pedida) || 0), 0).toLocaleString('es-PE')} unid
                          </div>
                        ) : (
                          <span className="muted">Sin detalles</span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            background:
                              ord.estado === 'RECIBIDA'
                                ? '#EAF5ED'
                                : ord.estado === 'TRANSITO'
                                ? '#FDF6EC'
                                : 'var(--color-canvas)',
                            color:
                              ord.estado === 'RECIBIDA'
                                ? 'var(--color-success)'
                                : ord.estado === 'TRANSITO'
                                ? 'var(--color-warning)'
                                : 'var(--color-text-secondary)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: '1px solid var(--color-border)'
                          }}
                        >
                          {ord.estado === 'RECIBIDA'
                            ? 'Recibida en muelle'
                            : ord.estado === 'TRANSITO'
                            ? 'En tránsito'
                            : 'Borrador'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="button secondary button-sm"
                            onClick={() => handleOpenOrderPacking(ord)}
                            disabled={loadingPackingModal}
                            title="Ver desglose de paletas esperadas y descargar rótulos"
                          >
                            Packing / Rótulos
                          </button>
                          <button
                            type="button"
                            className="button primary button-sm"
                            onClick={() => handleOpenOrderReception(ord)}
                            style={{ fontWeight: 600, padding: '6px 14px' }}
                          >
                            {ord.estado === 'RECIBIDA' ? 'Ver recepción' : 'Recepcionar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: Vista de la Orden con Compuerta de Contenedor */}
      {viewMode === 'order_reception' && selectedOrder && (
        <OrderReceptionView
          order={selectedOrder}
          warehouse={selectedWarehouse}
          activeContainers={activeContainers}
          receptionState={receptionState}
          packingPlan={activePackingPlan}
          onSaveContainer={handleSaveContainer}
          onSelectProduct={handleSelectProduct}
          onGoToLiquidation={() => setViewMode('liquidation')}
          onBack={() => setViewMode('orders_list')}
        />
      )}

      {/* VISTA 3: Vista de Recepción Individual del Producto */}
      {viewMode === 'product_reception' && selectedOrder && selectedOrderDetail && (
        <ProductReceptionView
          order={selectedOrder}
          warehouse={selectedWarehouse}
          orderDetail={selectedOrderDetail}
          receptionState={receptionState}
          packingPlan={activePackingPlan}
          onConfirmPallet={handleConfirmPallet}
          onBack={() => setViewMode('order_reception')}
        />
      )}

      {/* VISTA 4: Liquidación y Liberación de Códigos */}
      {viewMode === 'liquidation' && selectedOrder && (
        <ReceptionLiquidationView
          order={selectedOrder}
          warehouse={selectedWarehouse}
          receptionState={receptionState}
          packingPlan={activePackingPlan}
          onConfirmLiquidation={handleConfirmLiquidation}
          onBack={() => setViewMode('order_reception')}
        />
      )}

      {/* MODAL 1: Nueva Orden Rápida de Importación */}
      {showOrderModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: '640px', width: '90%' }}>
            <form onSubmit={handleCreateOrder}>
              <div className="modal-header">
                <h2 className="modal-title" style={{ margin: 0, fontSize: '18px', color: 'var(--color-brand-deep)' }}>
                  Nueva orden de importación
                </h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowOrderModal(false)}
                  aria-label="Cerrar ventana"
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      Número de orden *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: IMP-2026-005"
                      value={newOrderNumber}
                      onChange={(e) => setNewOrderNumber(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text-primary)',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      Proveedor
                    </label>
                    <select
                      value={newOrderSupplierId}
                      onChange={(e) => setNewOrderSupplierId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text-primary)',
                        fontSize: '13px'
                      }}
                    >
                      <option value="">-- Proveedor genérico --</option>
                      {suppliers.map((s) => (
                        <option key={s.id_proveedor} value={s.id_proveedor}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    Tipo de contenedor
                  </label>
                  <select
                    value={newOrderContainer}
                    onChange={(e) => setNewOrderContainer(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px'
                    }}
                  >
                    <option value="40FT">40FT (Estándar marítimo - ~67 m³)</option>
                    <option value="20FT">20FT (Contenedor corto - ~33 m³)</option>
                    <option value="LCL">LCL (Carga suelta consolidada)</option>
                  </select>
                </div>

                {/* Agregar Productos a la Orden */}
                <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '12px', background: 'var(--color-canvas)' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                    Productos de la orden ({newOrderItems.length})
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={tempAddProdId}
                      onChange={(e) => setTempAddProdId(e.target.value)}
                      style={{ flex: 1, padding: '7px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    >
                      <option value="">-- Seleccionar producto --</option>
                      {products.map((p) => (
                        <option key={p.id_producto} value={p.id_producto}>
                          {p.sku} - {p.nombre}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      placeholder="Cantidad"
                      value={tempAddQty}
                      onChange={(e) => setTempAddQty(parseInt(e.target.value, 10) || 1)}
                      style={{ width: '90px', padding: '7px 8px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    />
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => {
                        if (!tempAddProdId) return
                        const pId = Number(tempAddProdId)
                        setNewOrderItems((prev) => {
                          const existing = prev.find((item) => item.id_producto === pId)
                          if (existing) {
                            return prev.map((item) =>
                              item.id_producto === pId
                                ? { ...item, cantidad_pedida: item.cantidad_pedida + tempAddQty }
                                : item
                            )
                          }
                          return [...prev, { id_producto: pId, cantidad_pedida: tempAddQty }]
                        })
                        setTempAddProdId('')
                        setTempAddQty(100)
                      }}
                    >
                      + Agregar
                    </button>
                  </div>

                  {newOrderItems.length > 0 && (
                    <div style={{ marginTop: '10px', maxHeight: '140px', overflowY: 'auto' }}>
                      {newOrderItems.map((item, idx) => {
                        const pInfo = products.find((p) => p.id_producto === item.id_producto)
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '4px 8px',
                              background: 'var(--color-surface)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              marginBottom: '4px',
                              border: '1px solid var(--color-border)'
                            }}
                          >
                            <span>
                              <strong>{pInfo?.sku || `SKU-${item.id_producto}`}</strong> · {pInfo?.nombre}: {item.cantidad_pedida} unid
                            </span>
                            <button
                              type="button"
                              onClick={() => setNewOrderItems((prev) => prev.filter((_, i) => i !== idx))}
                              style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontWeight: 700 }}
                            >
                              ✕
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="button secondary" onClick={() => setShowOrderModal(false)} disabled={creatingOrder}>
                  Cancelar
                </button>
                <button type="submit" className="button primary" disabled={creatingOrder || newOrderItems.length === 0}>
                  {creatingOrder ? 'Creando orden...' : 'Crear orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Visor de Packing List y Rótulos */}
      {orderPackingModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: '820px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ margin: 0, fontSize: '18px', color: 'var(--color-brand-deep)' }}>
                  Packing list oficial: {orderPackingModal.numero_orden}
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Proveedor: {orderPackingModal.proveedor} · Contenedor: {orderPackingModal.contenedor} · Total bultos: {orderPackingModal.total_bultos_previstos}
                </span>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setOrderPackingModal(null)}>
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
              <div className="table-wrap" style={{ margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>SKU</th>
                      <th>Descripción</th>
                      <th style={{ textAlign: 'right' }}>Unid. pedidas</th>
                      <th style={{ textAlign: 'right' }}>Cajas</th>
                      <th style={{ textAlign: 'right' }}>Paletas compl.</th>
                      <th style={{ textAlign: 'right' }}>Pucho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderPackingModal.productos.map((p, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{p.sku}</strong>
                        </td>
                        <td>{p.nombre}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{p.cantidad_pedida.toLocaleString('es-PE')}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{p.cajas_totales}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{p.paletas_completas}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{p.cajas_pucho > 0 ? `${p.cajas_pucho} cajas` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => packingListService.exportPackingListToExcel(orderPackingModal)}
              >
                Descargar Excel con rótulos (.xlsx)
              </button>
              <button type="button" className="button primary" onClick={() => setOrderPackingModal(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
