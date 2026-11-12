import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { projectionService } from '../../services/projectionService'
import {
  projectionFormulaEngine,
  type FormulaEvaluationContext
} from '../../services/projectionFormulaEngine'
import { receptionService } from '../../services/receptionService'
import { packingListService, type OrderPackingPlan } from '../../services/packingListService'
import { OrdersListSubView } from './subviews/OrdersListSubView'
import { PackingListSubView } from './subviews/PackingListSubView'
import {
  ProjectionSummaryApprovalSubView,
  type ApprovedItemRow
} from './subviews/ProjectionSummaryApprovalSubView'
import { ProjectionMatrixSubView } from './subviews/ProjectionMatrixSubView'
import { NewOrderModal } from './modals/NewOrderModal'
import { ExcelImportModal } from './modals/ExcelImportModal'
import { GlobalParametersModal } from './modals/GlobalParametersModal'
import { AddMonthModal } from './modals/AddMonthModal'
import { AddProductModal } from './modals/AddProductModal'
import { EquationBuilderModal } from './modals/EquationBuilderModal'
import { AddCustomColumnModal } from './modals/AddCustomColumnModal'
import type {
  CalculableColumnKey,
  CalculatedProjectionRow,
  ColumnDisplayFormat,
  ColumnEquationConfig,
  CustomProjectionColumn,
  ProjectionItem,
  ProjectionOrder,
  ProjectionTemplate,
  TemplateParamsForm
} from '../../types/projections'

interface ProjectionsPageProps {
  onBack: () => void
  onOpenReceptions?: () => void
}

export function ProjectionsPage({ onBack, onOpenReceptions }: ProjectionsPageProps) {
  // 0. Modo de Vista: Listado vs Matriz vs Resumen de Aprobación vs Packing List
  const [viewMode, setViewMode] = useState<'list' | 'matrix' | 'approval_summary' | 'packing_list'>('list')
  const [orders, setOrders] = useState<ProjectionOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<ProjectionOrder | null>(null)
  const isOrderLocked = Boolean(
    selectedOrder && (selectedOrder.estado === 'TRANSITO' || selectedOrder.estado === 'RECIBIDA')
  )
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false)
  const [excelModalOpen, setExcelModalOpen] = useState(false)
  const [suppliers, setSuppliers] = useState<Array<{ id_proveedor: number; razon_social: string }>>([])
  const [isEmittingOrder, setIsEmittingOrder] = useState(false)

  // 1. Estado principal
  const [templates, setTemplates] = useState<ProjectionTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(1)
  const [items, setItems] = useState<ProjectionItem[]>([])
  const [liveStockMap, setLiveStockMap] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [syncingStock, setSyncingStock] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // 2. Selección grupal para órdenes de importación
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set())

  // 3. Búsqueda y catálogo interactivo
  const [searchTerm, setSearchTerm] = useState('')
  const [catalogProducts, setCatalogProducts] = useState<
    Array<{ id_producto?: number | null; sku?: string; nombre: string }>
  >([])
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)
  const searchWrapperRef = useRef<HTMLDivElement>(null)

  // 4. Configuración de Rango de Meses para Promedio
  const [startMonth, setStartMonth] = useState<string>('SEP')
  const [endMonth, setEndMonth] = useState<string>('JUL')
  const [ignoreZeroMonths, setIgnoreZeroMonths] = useState<boolean>(true)
  const [isUpdatingMonthRange, setIsUpdatingMonthRange] = useState(false)

  // 5. Barra de Fórmulas tipo Excel y Constructor Visual
  const [formulaBarColumn, setFormulaBarColumn] = useState<CalculableColumnKey>('compra_sugerida')
  const [equationModalOpen, setEquationModalOpen] = useState(false)
  const [selectedColumnForEquation, setSelectedColumnForEquation] = useState<CalculableColumnKey>('compra_sugerida')
  const [draftFormula, setDraftFormula] = useState<string>('')
  const [isSavingFormula, setIsSavingFormula] = useState(false)

  // 5b. Gestión de Nueva Columna Calculada (Dinámica Excel)
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColVariable, setNewColVariable] = useState('')
  const [newColFormula, setNewColFormula] = useState('')
  const [newColFormat, setNewColFormat] = useState<ColumnDisplayFormat>('entero')
  const [isAddingColumn, setIsAddingColumn] = useState(false)

  // Edición de propiedades de columna personalizada en el modal de ecuaciones
  const [draftCustomName, setDraftCustomName] = useState<string>('')
  const [draftCustomFormat, setDraftCustomFormat] = useState<ColumnDisplayFormat>('entero')

  const handleColNameChange = (val: string) => {
    setNewColName(val)
    const slug = val
      .toUpperCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, '_')
      .slice(0, 16)
    setNewColVariable(slug)
  }

  // 6. Modales de Parámetros y Entidades
  const [paramsModalOpen, setParamsModalOpen] = useState(false)
  const [formLeadTime, setFormLeadTime] = useState<number>(3)
  const [formSeguridadPct, setFormSeguridadPct] = useState<number>(20)
  const [formFactorCompra, setFormFactorCompra] = useState<number>(2)
  const [formDiasMes, setFormDiasMes] = useState<number>(30)
  const [isSavingParams, setIsSavingParams] = useState(false)

  // Modal de Agregar Mes
  const [addMonthModalOpen, setAddMonthModalOpen] = useState(false)
  const [newMonthName, setNewMonthName] = useState('')
  const [isAddingMonth, setIsAddingMonth] = useState(false)

  // Modal de Agregar Producto
  const [addProductModalOpen, setAddProductModalOpen] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductStock, setNewProductStock] = useState<number>(0)
  const [isAddingProduct, setIsAddingProduct] = useState(false)

  // Vista y plan de paletizado / packing list completo
  const [packingPlan, setPackingPlan] = useState<OrderPackingPlan | null>(null)
  const [packingPreviousView, setPackingPreviousView] = useState<'list' | 'matrix' | 'approval_summary'>('matrix')
  const [isGeneratingPackingPlan, setIsGeneratingPackingPlan] = useState(false)

  // Plantilla activa
  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id_plantilla === selectedTemplateId) || templates[0]
  }, [templates, selectedTemplateId])

  // Meses activos participantes en el promedio
  const activeMonthsInAverage = useMemo(() => {
    if (!activeTemplate) return []
    return projectionFormulaEngine.getActiveMonthRange(activeTemplate)
  }, [activeTemplate])

  // Cargar datos iniciales
  const loadInitialData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [tplList, stockMap, ordList, supList] = await Promise.all([
        projectionService.getTemplates(),
        projectionService.getLiveStockMap(),
        projectionService.getOrders(),
        receptionService.getSuppliers()
      ])
      setTemplates(tplList)
      setLiveStockMap(stockMap)
      setOrders(ordList)
      setSuppliers(
        supList.map((s) => ({
          id_proveedor: s.id_proveedor,
          razon_social: s.razon_social || s.nombre || 'Proveedor'
        }))
      )

      // Cargar única y exclusivamente los productos registrados en la base de datos (public.producto)
      try {
        const { data: prods, error: prodsErr } = await supabase
          .from('producto')
          .select('id_producto, sku, nombre')
          .or('activo.is.null,activo.eq.true')
          .order('nombre', { ascending: true })

        if (prodsErr) {
          console.warn('Error al consultar productos de base de datos:', prodsErr.message)
          setCatalogProducts([])
        } else if (prods && Array.isArray(prods)) {
          setCatalogProducts(
            prods.map((p: any) => ({
              id_producto: p.id_producto,
              sku: p.sku || '',
              nombre: p.nombre
            }))
          )
        } else {
          setCatalogProducts([])
        }
      } catch (err: any) {
        console.warn('Excepción al cargar productos de base de datos:', err?.message)
        setCatalogProducts([])
      }

      const activeTpl = tplList.find((t) => t.id_plantilla === selectedTemplateId) || tplList[0]
      if (activeTpl) {
        setSelectedTemplateId(activeTpl.id_plantilla)
        setFormLeadTime(Number(activeTpl.lead_time_meses))
        setFormSeguridadPct(Number(activeTpl.seguridad_pct) * 100)
        setFormFactorCompra(Number(activeTpl.factor_compra))
        setFormDiasMes(Number(activeTpl.dias_por_mes) || 30)

        // Inicializar rango de meses
        const months = activeTpl.columnas_meses || []
        const initStart = activeTpl.mes_inicio_promedio || (months.length > 0 ? months[0] : 'SEP')
        const initEnd = activeTpl.mes_fin_promedio || (months.length > 0 ? months[months.length - 1] : 'JUL')
        setStartMonth(initStart)
        setEndMonth(initEnd)
        setIgnoreZeroMonths(activeTpl.ignorar_meses_cero !== false)

        const rawItems = await projectionService.getItems(activeTpl.id_plantilla, activeTpl.codigo)
        setItems(rawItems)
      }
    } catch (err: any) {
      setErrorMsg(`Error al cargar datos de proyecciones: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInitialData()
  }, [])

  // GESTIÓN Y SELECCIÓN DE ÓRDENES GUARDADAS
  const handleSelectOrder = async (order: ProjectionOrder) => {
    const snapshot =
      order.snapshot_proyeccion ||
      projectionService.getSnapshotFromStorage(order.id_orden, order.numero_orden)

    const resolvedOrder: ProjectionOrder = {
      ...order,
      snapshot_proyeccion: snapshot,
      estado: snapshot?.estado_operativo || order.estado
    }

    setSelectedOrder(resolvedOrder)
    const tplId = order.id_plantilla || 1
    setSelectedTemplateId(tplId)
    setSelectedItemIds(new Set())
    setErrorMsg(null)
    setSuccessMsg(null)

    const activeTpl = templates.find((t) => t.id_plantilla === tplId) || templates[0]
    if (activeTpl) {
      setFormLeadTime(Number(activeTpl.lead_time_meses))
      setFormSeguridadPct(Number(activeTpl.seguridad_pct) * 100)
      setFormFactorCompra(Number(activeTpl.factor_compra))
      setFormDiasMes(Number(activeTpl.dias_por_mes) || 30)

      if (snapshot?.columnas_meses !== undefined && Array.isArray(snapshot.columnas_meses)) {
        const orderMonths = snapshot.columnas_meses || []
        setTemplates((prev) =>
          prev.map((t) =>
            t.id_plantilla === tplId ? { ...t, columnas_meses: orderMonths } : t
          )
        )
        setStartMonth(snapshot.startMonth || (orderMonths.length > 0 ? orderMonths[0] : ''))
        setEndMonth(snapshot.endMonth || (orderMonths.length > 0 ? orderMonths[orderMonths.length - 1] : ''))
        setIgnoreZeroMonths(snapshot.ignoreZeroMonths !== false)
      } else if (snapshot?.startMonth && snapshot?.endMonth) {
        setStartMonth(snapshot.startMonth)
        setEndMonth(snapshot.endMonth)
        setIgnoreZeroMonths(snapshot.ignoreZeroMonths !== false)
      } else {
        const months = activeTpl.columnas_meses || []
        const initStart = activeTpl.mes_inicio_promedio || (months.length > 0 ? months[0] : '')
        const initEnd = activeTpl.mes_fin_promedio || (months.length > 0 ? months[months.length - 1] : '')
        setStartMonth(initStart)
        setEndMonth(initEnd)
        setIgnoreZeroMonths(activeTpl.ignorar_meses_cero !== false)
      }

      if (snapshot?.items !== undefined && Array.isArray(snapshot.items)) {
        setItems(snapshot.items)
      } else {
        const rawItems = await projectionService.getItems(activeTpl.id_plantilla, activeTpl.codigo)
        setItems(rawItems)
      }
    }

    setViewMode('matrix')
  }

  const handleCreateOrder = async (data: {
    numero_orden: string
    descripcion: string
    id_plantilla: number
    id_proveedor: number | null
    tipo_contenedor: '20FT' | '40FT' | 'LCL'
  }) => {
    const activeTpl = templates.find((t) => t.id_plantilla === data.id_plantilla) || templates[0]
    const cleanItems: ProjectionItem[] = []

    const res = await projectionService.createOrder({
      numero_orden: data.numero_orden,
      descripcion: data.descripcion,
      id_plantilla: data.id_plantilla,
      id_proveedor: data.id_proveedor,
      tipo_contenedor: data.tipo_contenedor,
      estado: 'BORRADOR',
      snapshot_proyeccion: {
        templateId: data.id_plantilla,
        templateCodigo: activeTpl.codigo,
        startMonth: '',
        endMonth: '',
        columnas_meses: [],
        ignoreZeroMonths: true,
        items: cleanItems
      }
    })

    if (!res.success || !res.order) {
      throw new Error(res.error || 'No se pudo crear la orden.')
    }

    const updatedOrders = await projectionService.getOrders()
    setOrders(updatedOrders)
    await handleSelectOrder(res.order)
    setSuccessMsg(
      `Orden ${res.order.numero_orden} creada en blanco. Carga el Excel de salidas para extraer los consumos reales y generar los meses dinámicamente.`
    )
  }

  const handleDeleteOrder = async (id_orden: number) => {
    await projectionService.deleteOrder(id_orden)
    const updatedOrders = await projectionService.getOrders()
    setOrders(updatedOrders)
    if (selectedOrder?.id_orden === id_orden) {
      setSelectedOrder(null)
      setViewMode('list')
    }
    setSuccessMsg('Orden eliminada correctamente del historial.')
  }

  // Volver a la lista de órdenes persistiendo el avance actual
  const handleBackToList = () => {
    if (selectedOrder) {
      const currentMonths = activeTemplate?.columnas_meses || []
      const sumUnits = calculatedRows.reduce((acc, r) => acc + (r.compra_sugerida || 0), 0)
      const snapshot: any = {
        templateId: activeTemplate?.id_plantilla,
        templateCodigo: activeTemplate?.codigo,
        startMonth,
        endMonth,
        columnas_meses: currentMonths,
        ignoreZeroMonths,
        items,
        customColumns: activeTemplate?.columnas_personalizadas,
        estado_operativo: selectedOrder.estado
      }
      projectionService.saveSnapshotToStorage(
        selectedOrder.id_orden,
        selectedOrder.numero_orden,
        snapshot
      )
      void projectionService.updateOrder(selectedOrder.id_orden, {
        numero_orden: selectedOrder.numero_orden,
        total_items: items.length,
        total_unidades: sumUnits,
        snapshot_proyeccion: snapshot
      })
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id_orden === selectedOrder.id_orden
            ? {
                ...ord,
                total_items: items.length,
                total_unidades: sumUnits,
                snapshot_proyeccion: snapshot
              }
            : ord
        )
      )
    }
    setViewMode('list')
  }

  const handleOpenPackingPlan = async (targetOrder?: ProjectionOrder) => {
    const ord = targetOrder || selectedOrder
    if (!ord) return

    setIsGeneratingPackingPlan(true)
    setErrorMsg(null)
    try {
      let orderToPlan = ord
      if ((!ord.detalles || ord.detalles.length === 0) && calculatedRows.length > 0) {
        const rowsWithPurchase = calculatedRows.filter((r) => r.compra_sugerida > 0)
        orderToPlan = {
          ...ord,
          detalles: rowsWithPurchase.map((r) => ({
            id_producto: r.id_producto || 0,
            cantidad_pedida: r.compra_sugerida,
            producto: {
              sku: `PROD-${r.id_producto || 'A'}`,
              nombre: r.nombre_producto
            }
          }))
        }
      }

      const warehousePrefix = ord.snapshot_proyeccion?.warehousePrefix || 'IMP'
      const plan = await packingListService.generateOrderPackingPlan(orderToPlan, warehousePrefix)
      setPackingPreviousView(viewMode === 'packing_list' ? 'matrix' : viewMode)
      setPackingPlan(plan)
      setViewMode('packing_list')
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al generar el plan de paletizado y packing list.')
    } finally {
      setIsGeneratingPackingPlan(false)
    }
  }

  // Culminar la proyección y pasar al resumen de aprobación
  const handleTerminarProyeccion = async () => {
    if (!selectedOrder) return
    if (calculatedRows.length === 0) {
      setErrorMsg('No hay productos en la matriz para terminar la proyección.')
      return
    }

    try {
      setIsEmittingOrder(true)
      const sumUnits = calculatedRows.reduce((acc, r) => acc + (r.compra_sugerida || 0), 0)
      const updatedSnapshot = {
        ...(selectedOrder.snapshot_proyeccion || {}),
        templateId: activeTemplate?.id_plantilla,
        templateCodigo: activeTemplate?.codigo,
        startMonth,
        endMonth,
        ignoreZeroMonths,
        columnas_meses: activeTemplate?.columnas_meses || [],
        items,
        customColumns: activeTemplate?.columnas_personalizadas,
        estado_operativo: 'FALTA_APROBACION'
      }

      await projectionService.updateOrder(selectedOrder.id_orden, {
        estado: 'FALTA_APROBACION',
        total_items: items.length,
        total_unidades: sumUnits,
        snapshot_proyeccion: updatedSnapshot
      })

      const updatedOrders = await projectionService.getOrders()
      setOrders(updatedOrders)
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              estado: 'FALTA_APROBACION',
              total_items: items.length,
              total_unidades: sumUnits,
              snapshot_proyeccion: updatedSnapshot
            }
          : prev
      )

      setSuccessMsg('Proyección terminada. A continuación se abre el resumen de aprobación.')
      setViewMode('approval_summary')
    } catch (err: any) {
      setErrorMsg(`Error al terminar la proyección: ${err.message}`)
    } finally {
      setIsEmittingOrder(false)
    }
  }

  // Eliminar columna de mes de la matriz
  const handleDeleteMonth = (monthToDelete: string) => {
    if (isOrderLocked || !activeTemplate || !activeTemplate.columnas_meses) return
    if (!window.confirm(`¿Deseas eliminar la columna de mes "${monthToDelete}" de la matriz?`)) return

    const updatedMonths = activeTemplate.columnas_meses.filter((m) => m !== monthToDelete)
    setTemplates((prev) =>
      prev.map((t) =>
        t.id_plantilla === activeTemplate.id_plantilla
          ? { ...t, columnas_meses: updatedMonths }
          : t
      )
    )

    let newStart = startMonth
    let newEnd = endMonth
    if (startMonth === monthToDelete) {
      newStart = updatedMonths.length > 0 ? updatedMonths[0] : ''
      setStartMonth(newStart)
    }
    if (endMonth === monthToDelete) {
      newEnd = updatedMonths.length > 0 ? updatedMonths[updatedMonths.length - 1] : ''
      setEndMonth(newEnd)
    }

    if (selectedOrder) {
      const updatedSnapshot = {
        ...(selectedOrder.snapshot_proyeccion || {}),
        columnas_meses: updatedMonths,
        startMonth: newStart,
        endMonth: newEnd,
        items,
        estado_operativo: selectedOrder.estado
      }
      projectionService.saveSnapshotToStorage(
        selectedOrder.id_orden,
        selectedOrder.numero_orden,
        updatedSnapshot
      )
      void projectionService.updateOrder(selectedOrder.id_orden, {
        numero_orden: selectedOrder.numero_orden,
        snapshot_proyeccion: updatedSnapshot
      })
      setSelectedOrder((prev) => (prev ? { ...prev, snapshot_proyeccion: updatedSnapshot } : prev))
    }
    setSuccessMsg(`Columna del mes ${monthToDelete} eliminada de la matriz.`)
  }

  const handleGoToApprovalSummary = () => {
    if (!selectedOrder) return
    const rowsWithPurchase = calculatedRows.filter((r) => r.compra_sugerida > 0)
    if (rowsWithPurchase.length === 0) {
      setErrorMsg('No hay productos con compra sugerida mayor a cero para revisar en el resumen de aprobación.')
      return
    }
    setErrorMsg(null)
    setViewMode('approval_summary')
  }

  const handleConfirmApprovalAndEmit = async (approvedRows: ApprovedItemRow[]) => {
    if (!selectedOrder) return

    const approvedRowsWithPurchase = approvedRows.filter((r) => r.cantidad_aprobada > 0)
    if (approvedRowsWithPurchase.length === 0) {
      setErrorMsg('Debe autorizar al menos un producto con cantidad mayor a cero para emitir la orden.')
      return
    }

    setIsEmittingOrder(true)
    setErrorMsg(null)
    try {
      const sumApprovedUnits = approvedRowsWithPurchase.reduce((acc, r) => acc + r.cantidad_aprobada, 0)

      const rowsForOrder: CalculatedProjectionRow[] = approvedRowsWithPurchase.map((r) => ({
        id_item: r.id_item,
        id_plantilla: activeTemplate?.id_plantilla || 0,
        id_producto: r.id_producto,
        nombre_producto: r.nombre_producto,
        datos_meses: {},
        meses_incluidos_promedio: [],
        promedio_calculado: r.promedio_consumo,
        promedio_final: r.promedio_consumo,
        stock_real: r.stock_real,
        stock_min: 0,
        seguridad: 0,
        stock_min_f: 0,
        stock_min_redondeado: 0,
        compra_sugerida: r.cantidad_aprobada,
        meses_duracion: 0,
        texto_duracion: '',
        fecha_quiebre: '',
        estado_critico: 'OPTIMO' as const
      }))

      const res = await projectionService.createImportOrderFromProjection(
        selectedOrder.numero_orden,
        selectedOrder.tipo_contenedor || '40FT',
        rowsForOrder
      )

      if (!res.success) {
        throw new Error(res.error || 'Error al emitir la orden.')
      }

      const updatedSnapshot = {
        templateId: activeTemplate?.id_plantilla,
        templateCodigo: activeTemplate?.codigo,
        startMonth,
        endMonth,
        ignoreZeroMonths,
        columnas_meses: activeTemplate?.columnas_meses || [],
        items,
        customColumns: activeTemplate?.columnas_personalizadas,
        approval_summary: approvedRows,
        isLocked: true,
        fecha_aprobacion: new Date().toISOString()
      }

      await projectionService.updateOrder(selectedOrder.id_orden, {
        estado: 'TRANSITO',
        total_items: approvedRowsWithPurchase.length,
        total_unidades: sumApprovedUnits,
        snapshot_proyeccion: updatedSnapshot
      })

      const updatedOrders = await projectionService.getOrders()
      setOrders(updatedOrders)
      const freshOrder = updatedOrders.find((o) => o.id_orden === selectedOrder.id_orden) || {
        ...selectedOrder,
        estado: 'TRANSITO' as const,
        total_items: approvedRowsWithPurchase.length,
        total_unidades: sumApprovedUnits,
        snapshot_proyeccion: updatedSnapshot
      }
      setSelectedOrder(freshOrder)
      setSuccessMsg(
        `¡Cantidades aprobadas con éxito! La orden ${selectedOrder.numero_orden} ha sido emitida a Tránsito Marítimo con ${approvedRowsWithPurchase.length} productos autorizados (${sumApprovedUnits.toLocaleString('es-PE')} unid). A continuación se muestra el Packing List y plan de paletizado oficial.`
      )

      // Abrir de inmediato la vista del Packing List con las cantidades aprobadas
      try {
        const orderToPlan = {
          ...freshOrder,
          detalles: approvedRowsWithPurchase.map((r) => ({
            id_producto: r.id_producto || 0,
            cantidad_pedida: r.cantidad_aprobada,
            producto: {
              sku: r.sku,
              nombre: r.nombre_producto
            }
          }))
        }
        const warehousePrefix = (freshOrder.snapshot_proyeccion as any)?.warehousePrefix || 'IMP'
        const plan = await packingListService.generateOrderPackingPlan(orderToPlan, warehousePrefix)
        setPackingPlan(plan)
        setPackingPreviousView('matrix')
        setViewMode('packing_list')
      } catch (packErr: any) {
        console.error('Error al generar packing list post-emisión:', packErr)
        setViewMode('matrix')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al emitir la orden a tránsito.')
    } finally {
      setIsEmittingOrder(false)
    }
  }

  const handleSaveOrderSnapshot = async () => {
    if (!selectedOrder) return
    try {
      const sumUnits = calculatedRows.reduce((acc, r) => acc + (r.compra_sugerida || 0), 0)
      const currentMonths = activeTemplate?.columnas_meses || []
      const snapshot: any = {
        templateId: activeTemplate?.id_plantilla,
        templateCodigo: activeTemplate?.codigo,
        startMonth,
        endMonth,
        columnas_meses: currentMonths,
        ignoreZeroMonths,
        items,
        customColumns: activeTemplate?.columnas_personalizadas,
        estado_operativo: selectedOrder.estado
      }

      projectionService.saveSnapshotToStorage(
        selectedOrder.id_orden,
        selectedOrder.numero_orden,
        snapshot
      )

      await projectionService.updateOrder(selectedOrder.id_orden, {
        numero_orden: selectedOrder.numero_orden,
        total_items: items.length,
        total_unidades: sumUnits,
        snapshot_proyeccion: snapshot
      })

      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              total_items: items.length,
              total_unidades: sumUnits,
              snapshot_proyeccion: snapshot
            }
          : prev
      )

      const updatedOrders = await projectionService.getOrders()
      setOrders(updatedOrders)
      setSuccessMsg(`Cálculos y proyecciones guardados para la orden ${selectedOrder.numero_orden}.`)
    } catch (err: any) {
      setErrorMsg(`Error al guardar cambios de la orden: ${err.message}`)
    }
  }

  const handleApplyExcelOutputs = async (updatedItems: ProjectionItem[], detectedMonths: string[]) => {
    if (isOrderLocked) return
    setItems(updatedItems)

    if (activeTemplate && detectedMonths.length > 0) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id_plantilla === activeTemplate.id_plantilla
            ? { ...t, columnas_meses: detectedMonths }
            : t
        )
      )
      setStartMonth(detectedMonths[0])
      setEndMonth(detectedMonths[detectedMonths.length - 1])
    }

    for (const item of updatedItems) {
      void projectionService.updateItemCell(item.id_item, { datos_meses: item.datos_meses })
    }

    if (selectedOrder) {
      const sumUnits = calculatedRows.reduce((acc, r) => acc + (r.compra_sugerida || 0), 0)
      const snap = {
        templateId: activeTemplate?.id_plantilla,
        templateCodigo: activeTemplate?.codigo,
        startMonth: detectedMonths[0],
        endMonth: detectedMonths[detectedMonths.length - 1],
        columnas_meses: detectedMonths,
        ignoreZeroMonths,
        items: updatedItems,
        customColumns: activeTemplate?.columnas_personalizadas,
        estado_operativo: selectedOrder.estado
      }
      projectionService.saveSnapshotToStorage(
        selectedOrder.id_orden,
        selectedOrder.numero_orden,
        snap
      )
      void projectionService.updateOrder(selectedOrder.id_orden, {
        numero_orden: selectedOrder.numero_orden,
        total_items: updatedItems.length,
        total_unidades: sumUnits,
        snapshot_proyeccion: snap
      })
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              total_items: updatedItems.length,
              total_unidades: sumUnits,
              snapshot_proyeccion: snap
            }
          : prev
      )
    }

    setSuccessMsg(
      `Consumos y salidas hacia agencias importados con éxito. Se incorporaron ${updatedItems.length} productos registrados en Maestros y Empaque para los meses ${detectedMonths.join(', ')}.`
    )
  }

  // Sincronizar existencias físicas en tiempo real
  const handleSyncLiveStock = async () => {
    setSyncingStock(true)
    try {
      const stockMap = await projectionService.getLiveStockMap()
      setLiveStockMap(stockMap)
      setSuccessMsg('Stock sincronizado correctamente con las existencias de almacén.')
    } catch (err: any) {
      setErrorMsg(`Error al sincronizar stock: ${err.message}`)
    } finally {
      setSyncingStock(false)
    }
  }

  // Filas calculadas reactivamente por el motor de fórmulas
  const calculatedRows = useMemo(() => {
    if (!activeTemplate) return []
    return projectionFormulaEngine.calculateAll(items, activeTemplate, liveStockMap)
  }, [items, activeTemplate, liveStockMap])

  // Filtrado y búsqueda
  const filteredRows = useMemo(() => {
    return calculatedRows.filter((r) => {
      const matchSearch = r.nombre_producto.toLowerCase().includes(searchTerm.toLowerCase().trim())
      return matchSearch
    })
  }, [calculatedRows, searchTerm])

  // Recargar catálogo fresco exclusivamente desde la base de datos (public.producto)
  const loadCatalogProductsFromDB = async () => {
    try {
      const { data: prods, error: prodsErr } = await supabase
        .from('producto')
        .select('id_producto, sku, nombre')
        .or('activo.is.null,activo.eq.true')
        .order('nombre', { ascending: true })

      if (!prodsErr && prods && Array.isArray(prods)) {
        setCatalogProducts(
          prods.map((p: any) => ({
            id_producto: p.id_producto,
            sku: p.sku || '',
            nombre: p.nombre
          }))
        )
      }
    } catch {
      // Ignorar silenciosamente
    }
  }

  // Abrir modal de importación de Excel con catálogo maestro fresco
  const handleOpenExcelModal = async () => {
    await loadCatalogProductsFromDB()
    setExcelModalOpen(true)
  }

  // Coincidencias en catálogo de base de datos para búsqueda y botón Añadir
  const matchingCatalogProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return []
    return catalogProducts
      .filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      )
      .slice(0, 20)
  }, [catalogProducts, searchTerm])

  // Cerrar menú flotante de búsqueda al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(event.target as Node)
      ) {
        setIsSearchDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Añadir producto desde el buscador
  const handleQuickAddProduct = async (product: {
    id_producto?: number | null
    sku?: string
    nombre: string
  }) => {
    if (isOrderLocked) return
    const cleanName = product.nombre.trim().toUpperCase()
    if (!cleanName) return

    if (items.some((it) => it.nombre_producto.toUpperCase() === cleanName)) {
      setErrorMsg(`El producto "${cleanName}" ya está añadido a la proyección.`)
      return
    }

    const initialStock = liveStockMap.get(cleanName) || 0
    const newItem: ProjectionItem = {
      id_item: Date.now() + Math.floor(Math.random() * 1000),
      id_plantilla: activeTemplate?.id_plantilla || 1,
      id_producto: product.id_producto || null,
      nombre_producto: cleanName,
      datos_meses: {},
      promedio_manual: null,
      stock_manual: initialStock,
      stock_redondeado_manual: null,
      orden_fila: items.length + 1,
      activo: true
    }

    if (activeTemplate?.columnas_meses) {
      activeTemplate.columnas_meses.forEach((m) => {
        newItem.datos_meses[m] = 0
      })
    }

    void projectionService.addItem(activeTemplate?.id_plantilla || 1, cleanName, initialStock)

    const updatedItems = [...items, newItem]
    setItems(updatedItems)

    if (selectedOrder) {
      const updatedSnapshot = {
        templateId: activeTemplate?.id_plantilla,
        templateCodigo: activeTemplate?.codigo,
        startMonth,
        endMonth,
        columnas_meses: activeTemplate?.columnas_meses || [],
        ignoreZeroMonths,
        items: updatedItems,
        customColumns: activeTemplate?.columnas_personalizadas,
        estado_operativo: selectedOrder.estado
      }
      projectionService.saveSnapshotToStorage(
        selectedOrder.id_orden,
        selectedOrder.numero_orden,
        updatedSnapshot
      )
      void projectionService.updateOrder(selectedOrder.id_orden, {
        numero_orden: selectedOrder.numero_orden,
        total_items: updatedItems.length,
        snapshot_proyeccion: updatedSnapshot
      })
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              total_items: updatedItems.length,
              snapshot_proyeccion: updatedSnapshot
            }
          : prev
      )
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id_orden === selectedOrder.id_orden
            ? { ...ord, total_items: updatedItems.length, snapshot_proyeccion: updatedSnapshot }
            : ord
        )
      )
    }

    setErrorMsg(null)
    setSuccessMsg(`Producto "${cleanName}" añadido a la proyección con éxito.`)
  }

  // Métricas de resumen para la tira horizontal de indicadores
  const metrics = useMemo(() => {
    const total = calculatedRows.length
    const criticos = calculatedRows.filter((r) => r.estado_critico === 'CRITICO').length
    const reorden = calculatedRows.filter((r) => r.estado_critico === 'REORDEN').length
    const optimos = calculatedRows.filter((r) => r.estado_critico === 'OPTIMO').length
    const sugeridos = calculatedRows.filter((r) => r.compra_sugerida > 0).length
    const totalUnidadesSugeridas = calculatedRows.reduce((acc, r) => acc + (r.compra_sugerida || 0), 0)
    return { total, criticos, reorden, optimos, sugeridos, totalUnidadesSugeridas }
  }, [calculatedRows])

  // GESTIÓN DEL RANGO DE MESES PARA PROMEDIO
  const handleApplyMonthRange = async (newStart: string, newEnd: string, newIgnore: boolean) => {
    if (!activeTemplate) return
    setStartMonth(newStart)
    setEndMonth(newEnd)
    setIgnoreZeroMonths(newIgnore)

    setTemplates((prev) =>
      prev.map((t) =>
        t.id_plantilla === activeTemplate.id_plantilla
          ? {
              ...t,
              mes_inicio_promedio: newStart,
              mes_fin_promedio: newEnd,
              ignorar_meses_cero: newIgnore
            }
          : t
      )
    )

    setIsUpdatingMonthRange(true)
    try {
      await projectionService.updateMonthRange(
        activeTemplate.id_plantilla,
        newStart,
        newEnd,
        newIgnore
      )
      setSuccessMsg(
        `Rango para promedio actualizado: de ${newStart} a ${newEnd}. La matriz recalculó el consumo reactivamente.`
      )
    } catch (err: any) {
      console.warn('Advertencia al guardar rango de meses:', err)
    } finally {
      setIsUpdatingMonthRange(false)
    }
  }

  // Accesos rápidos de rango de meses
  const handleSetQuickMonthPreset = (preset: 'all' | 'quarter' | 'semester') => {
    const months = activeTemplate?.columnas_meses || []
    if (months.length === 0) return

    let start = months[0]
    const end = months[months.length - 1]

    if (preset === 'quarter') {
      const idx = Math.max(0, months.length - 3)
      start = months[idx]
    } else if (preset === 'semester') {
      const idx = Math.max(0, months.length - 6)
      start = months[idx]
    }

    void handleApplyMonthRange(start, end, ignoreZeroMonths)
  }

  // CONSTRUCTOR VISUAL DE ECUACIONES POR COLUMNA
  const openEquationModal = (colKey: CalculableColumnKey) => {
    if (isOrderLocked || !activeTemplate) return
    setSelectedColumnForEquation(colKey)
    setFormulaBarColumn(colKey)
    const config = projectionFormulaEngine.getColumnEquationConfig(colKey, activeTemplate)
    setDraftFormula(config.currentFormula)
    if (config.isCustom) {
      setDraftCustomName(config.label)
      setDraftCustomFormat(config.format || 'entero')
    }
    setEquationModalOpen(true)
  }

  // Validación de la fórmula borrador
  const formulaValidation = useMemo(() => {
    if (!draftFormula.trim()) {
      return { valid: false, error: 'La ecuación no puede estar vacía.' }
    }
    const sampleCtx: FormulaEvaluationContext = {
      PROM_MEN: 15000,
      STOCK_REAL: 48500,
      LEAD_TIME: activeTemplate?.lead_time_meses || 3,
      STOCK_MIN: 45000,
      SEG: 9000,
      STOCK_MIN_F: 54000,
      STOCK_REDONDEADO: 60000,
      FACTOR_COMPRA: activeTemplate?.factor_compra || 2,
      SEGURIDAD_PCT: activeTemplate?.seguridad_pct || 0.2,
      DIAS_MES: activeTemplate?.dias_por_mes || 30,
      COMPRA_SUGERIDA: 120000,
      MESES_DURACION: 2.43
    }
    const res = projectionFormulaEngine.testFormula(draftFormula, sampleCtx)
    return { valid: res.valid, error: res.error, sampleResult: res.result }
  }, [draftFormula, activeTemplate])

  // Validación de la fórmula para nueva columna
  const newColumnFormulaValidation = useMemo(() => {
    if (!newColFormula.trim()) {
      return { valid: false, error: 'Escribe una ecuación matemática para la columna.' }
    }
    const sampleCtx: FormulaEvaluationContext = {
      PROM_MEN: 15000,
      STOCK_REAL: 48500,
      LEAD_TIME: activeTemplate?.lead_time_meses || 3,
      STOCK_MIN: 45000,
      SEG: 9000,
      STOCK_MIN_F: 54000,
      STOCK_REDONDEADO: 60000,
      FACTOR_COMPRA: activeTemplate?.factor_compra || 2,
      SEGURIDAD_PCT: activeTemplate?.seguridad_pct || 0.2,
      DIAS_MES: activeTemplate?.dias_por_mes || 30,
      COMPRA_SUGERIDA: 120000,
      MESES_DURACION: 2.43
    }
    const res = projectionFormulaEngine.testFormula(newColFormula, sampleCtx)
    return { valid: res.valid, error: res.error, sampleResult: res.result }
  }, [newColFormula, activeTemplate])

  // Productos de muestra para la simulación en tiempo real
  const simulationSampleRows = useMemo(() => {
    if (!calculatedRows || calculatedRows.length === 0) return []
    return calculatedRows.slice(0, 3)
  }, [calculatedRows])

  // Insertar variable u operador al cursor de la fórmula borrador
  const handleInsertToken = (token: string) => {
    setDraftFormula((prev) => {
      const trimmed = prev.trim()
      if (!trimmed) return token
      return `${prev} ${token}`
    })
  }

  // Insertar variable u operador al cursor de la nueva columna
  const handleInsertNewColToken = (token: string) => {
    setNewColFormula((prev) => {
      const trimmed = prev.trim()
      if (!trimmed) return token
      return `${prev} ${token}`
    })
  }

  // Aplicar ecuación a la columna (estándar o personalizada)
  const handleApplyColumnEquation = async () => {
    if (!activeTemplate || !formulaValidation.valid) return
    setIsSavingFormula(true)
    setErrorMsg(null)

    const colKey = selectedColumnForEquation
    const newFormula = draftFormula.trim()

    const formulaKeyMap: Record<string, string> = {
      stock_min: 'formula_stock_min',
      seguridad: 'formula_seguridad',
      stock_min_f: 'formula_stock_min_f',
      stock_min_redondeado: 'formula_stock_redondeado',
      compra_sugerida: 'formula_compra',
      meses_duracion: 'formula_meses_duracion'
    }

    try {
      const dbProp = formulaKeyMap[colKey]
      if (dbProp) {
        const res = await projectionService.updateColumnFormula(
          activeTemplate.id_plantilla,
          colKey,
          newFormula
        )

        if (!res.success) {
          setErrorMsg(res.error || 'No se pudo guardar la ecuación.')
          return
        }

        setTemplates((prev) =>
          prev.map((t) =>
            t.id_plantilla === activeTemplate.id_plantilla ? { ...t, [dbProp]: newFormula } : t
          )
        )
      } else {
        const currentCustoms = activeTemplate.columnas_personalizadas || []
        const updatedCustoms = currentCustoms.map((c) =>
          c.id === colKey
            ? {
                ...c,
                formula: newFormula,
                nombre: draftCustomName.trim() || c.nombre,
                formato: draftCustomFormat
              }
            : c
        )

        const res = await projectionService.saveCustomColumns(
          activeTemplate.id_plantilla,
          updatedCustoms
        )

        if (!res.success) {
          setErrorMsg(res.error || 'No se pudo guardar la columna personalizada.')
          return
        }

        setTemplates((prev) =>
          prev.map((t) =>
            t.id_plantilla === activeTemplate.id_plantilla
              ? { ...t, columnas_personalizadas: updatedCustoms }
              : t
          )
        )
      }

      setSuccessMsg(`Ecuación para "${draftCustomName || colKey}" actualizada y recalculada para todos los productos.`)
      setEquationModalOpen(false)
    } catch (err: any) {
      setErrorMsg(`Error al aplicar ecuación: ${err.message}`)
    } finally {
      setIsSavingFormula(false)
    }
  }

  // Agregar nueva columna personalizada con ecuación Excel
  const handleAddCustomColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTemplate || !newColName.trim() || !newColFormula.trim()) return
    setIsAddingColumn(true)
    setErrorMsg(null)

    const colId = `col_${Date.now()}`
    const colVar = newColVariable.trim() || `COL_${Date.now()}`
    const newCol: CustomProjectionColumn = {
      id: colId,
      codigo_variable: colVar,
      nombre: newColName.trim(),
      formula: newColFormula.trim(),
      formato: newColFormat
    }

    const existingCols = activeTemplate.columnas_personalizadas || []
    const updatedCols = [...existingCols, newCol]

    try {
      const res = await projectionService.saveCustomColumns(
        activeTemplate.id_plantilla,
        updatedCols
      )
      if (!res.success) {
        setErrorMsg(res.error || 'Error al agregar la columna.')
        return
      }

      setTemplates((prev) =>
        prev.map((t) =>
          t.id_plantilla === activeTemplate.id_plantilla
            ? { ...t, columnas_personalizadas: updatedCols }
            : t
        )
      )

      setSuccessMsg(`Columna calculada "${newCol.nombre}" creada y recalculada para toda la matriz.`)
      setAddColumnModalOpen(false)
      setNewColName('')
      setNewColVariable('')
      setNewColFormula('')
      setNewColFormat('entero')
    } catch (err: any) {
      setErrorMsg(`Error al agregar columna: ${err.message}`)
    } finally {
      setIsAddingColumn(false)
    }
  }

  // Eliminar columna personalizada
  const handleDeleteCustomColumn = async (colId: string, colName: string) => {
    if (!window.confirm(`¿Confirmas eliminar la columna calculada "${colName}" de esta proyección?`))
      return
    if (!activeTemplate) return

    const updatedCols = (activeTemplate.columnas_personalizadas || []).filter((c) => c.id !== colId)
    try {
      await projectionService.saveCustomColumns(activeTemplate.id_plantilla, updatedCols)
      setTemplates((prev) =>
        prev.map((t) =>
          t.id_plantilla === activeTemplate.id_plantilla
            ? { ...t, columnas_personalizadas: updatedCols }
            : t
        )
      )
      setSuccessMsg(`Columna "${colName}" eliminada de la matriz.`)
      if (equationModalOpen && selectedColumnForEquation === colId) {
        setEquationModalOpen(false)
      }
    } catch (err: any) {
      setErrorMsg(`Error al eliminar columna: ${err.message}`)
    }
  }

  // EDICIÓN INTERACTIVA DE CELDAS INLINE Y RESET
  const handleCellChange = (id_item: number, field: string, rawValue: string) => {
    if (isOrderLocked) return
    const numValue = rawValue === '' ? null : Number(rawValue)

    setItems((prevItems) => {
      const updated = prevItems.map((item) => {
        if (item.id_item !== id_item) return item

        if (field.startsWith('month_')) {
          const monthKey = field.replace('month_', '')
          const updatedMonths = {
            ...item.datos_meses,
            [monthKey]: numValue !== null ? numValue : 0
          }
          void projectionService.updateItemCell(id_item, { datos_meses: updatedMonths })
          return { ...item, datos_meses: updatedMonths }
        }

        if (field === 'promedio_manual') {
          void projectionService.updateItemCell(id_item, { promedio_manual: numValue })
          return { ...item, promedio_manual: numValue }
        }

        if (field === 'stock_manual') {
          void projectionService.updateItemCell(id_item, { stock_manual: numValue })
          return { ...item, stock_manual: numValue }
        }

        if (field === 'stock_redondeado_manual') {
          void projectionService.updateItemCell(id_item, { stock_redondeado_manual: numValue })
          return { ...item, stock_redondeado_manual: numValue }
        }

        return item
      })

      if (selectedOrder) {
        const snap = {
          templateId: activeTemplate?.id_plantilla,
          templateCodigo: activeTemplate?.codigo,
          startMonth,
          endMonth,
          columnas_meses: activeTemplate?.columnas_meses || [],
          ignoreZeroMonths,
          items: updated,
          customColumns: activeTemplate?.columnas_personalizadas,
          estado_operativo: selectedOrder.estado
        }
        projectionService.saveSnapshotToStorage(
          selectedOrder.id_orden,
          selectedOrder.numero_orden,
          snap
        )
      }

      return updated
    })
  }

  // Revertir sobreescritura manual al promedio calculado por la fórmula
  const handleResetManualAverage = (id_item: number) => {
    if (isOrderLocked) return
    setItems((prev) =>
      prev.map((i) => (i.id_item === id_item ? { ...i, promedio_manual: null } : i))
    )
    void projectionService.updateItemCell(id_item, { promedio_manual: null })
  }

  // Revertir sobreescritura manual al stock redondeado comercial
  const handleResetManualRound = (id_item: number) => {
    if (isOrderLocked) return
    setItems((prev) =>
      prev.map((i) => (i.id_item === id_item ? { ...i, stock_redondeado_manual: null } : i))
    )
    void projectionService.updateItemCell(id_item, { stock_redondeado_manual: null })
  }

  // SELECCIÓN GRUPAL Y ÓRDENES
  const handleToggleSelectAll = () => {
    if (selectedItemIds.size === filteredRows.length) {
      setSelectedItemIds(new Set())
    } else {
      const allIds = new Set(filteredRows.map((r) => r.id_item))
      setSelectedItemIds(allIds)
    }
  }

  const handleToggleSelectRow = (id_item: number) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(id_item)) {
        next.delete(id_item)
      } else {
        next.add(id_item)
      }
      return next
    })
  }

  // Guardar parámetros globales
  const handleSaveParams = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTemplate) return
    setIsSavingParams(true)
    setErrorMsg(null)

    const payload: TemplateParamsForm = {
      lead_time_meses: formLeadTime,
      seguridad_pct: formSeguridadPct / 100,
      factor_compra: formFactorCompra,
      dias_por_mes: formDiasMes,
      mes_inicio_promedio: startMonth,
      mes_fin_promedio: endMonth,
      ignorar_meses_cero: ignoreZeroMonths
    }

    try {
      const res = await projectionService.updateTemplateParams(activeTemplate.id_plantilla, payload)
      if (!res.success) {
        setErrorMsg(res.error || 'No se pudieron actualizar los parámetros.')
        return
      }

      setTemplates((prev) =>
        prev.map((t) =>
          t.id_plantilla === activeTemplate.id_plantilla
            ? {
                ...t,
                lead_time_meses: payload.lead_time_meses,
                seguridad_pct: payload.seguridad_pct,
                factor_compra: payload.factor_compra,
                dias_por_mes: payload.dias_por_mes
              }
            : t
        )
      )

      setSuccessMsg('Fórmulas y parámetros de proyección recalculados y guardados correctamente.')
      setParamsModalOpen(false)
    } catch (err: any) {
      setErrorMsg(`Error al guardar parámetros: ${err.message}`)
    } finally {
      setIsSavingParams(false)
    }
  }

  // Agregar nueva columna de mes
  const handleAddMonth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTemplate || !newMonthName.trim()) return
    const upperMonth = newMonthName.trim().toUpperCase()

    const existingMonths = activeTemplate.columnas_meses || []
    if (existingMonths.includes(upperMonth)) {
      setErrorMsg(`El mes "${upperMonth}" ya está incluido en la matriz.`)
      return
    }

    setIsAddingMonth(true)
    setErrorMsg(null)

    try {
      await projectionService.addMonthColumn(
        activeTemplate.id_plantilla,
        existingMonths,
        upperMonth
      )

      const updatedMonths = [...existingMonths, upperMonth]
      setTemplates((prev) =>
        prev.map((t) =>
          t.id_plantilla === activeTemplate.id_plantilla
            ? { ...t, columnas_meses: updatedMonths }
            : t
        )
      )

      if (!startMonth) {
        setStartMonth(upperMonth)
      }
      setEndMonth(upperMonth)

      const updatedItems = items.map((it) => ({
        ...it,
        datos_meses: {
          ...it.datos_meses,
          [upperMonth]: it.datos_meses[upperMonth] ?? 0
        }
      }))
      setItems(updatedItems)

      if (selectedOrder) {
        const updatedSnapshot = {
          ...(selectedOrder.snapshot_proyeccion || {}),
          templateId: activeTemplate.id_plantilla,
          templateCodigo: activeTemplate.codigo,
          columnas_meses: updatedMonths,
          startMonth: selectedOrder.snapshot_proyeccion?.startMonth || startMonth || upperMonth,
          endMonth: upperMonth,
          items: updatedItems,
          customColumns: activeTemplate.columnas_personalizadas,
          estado_operativo: selectedOrder.estado
        }
        projectionService.saveSnapshotToStorage(
          selectedOrder.id_orden,
          selectedOrder.numero_orden,
          updatedSnapshot
        )
        void projectionService.updateOrder(selectedOrder.id_orden, {
          numero_orden: selectedOrder.numero_orden,
          snapshot_proyeccion: updatedSnapshot
        })
        setSelectedOrder((prev) => (prev ? { ...prev, snapshot_proyeccion: updatedSnapshot } : prev))
      }

      setSuccessMsg(`Columna ${upperMonth} incorporada a la matriz exitosamente.`)
      setNewMonthName('')
      setAddMonthModalOpen(false)
    } catch (err: any) {
      setErrorMsg(`Error al agregar mes: ${err.message}`)
    } finally {
      setIsAddingMonth(false)
    }
  }

  // Agregar nuevo producto a la matriz
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTemplate || !newProductName.trim()) return
    setIsAddingProduct(true)
    setErrorMsg(null)

    try {
      const res = await projectionService.addItem(
        activeTemplate.id_plantilla,
        newProductName,
        newProductStock
      )

      if (!res.success || !res.newItem) {
        setErrorMsg(res.error || 'No se pudo registrar el producto.')
        return
      }

      setItems((prev) => [...prev, res.newItem!])
      setSuccessMsg(`Producto "${newProductName.trim().toUpperCase()}" agregado a la proyección.`)
      setNewProductName('')
      setNewProductStock(0)
      setAddProductModalOpen(false)
    } catch (err: any) {
      setErrorMsg(`Error al agregar producto: ${err.message}`)
    } finally {
      setIsAddingProduct(false)
    }
  }

  // Eliminar fila de la proyección
  const handleDeleteItem = async (id_item: number, name: string) => {
    if (isOrderLocked) return
    if (!window.confirm(`¿Confirmas eliminar "${name}" de esta proyección?`)) return
    try {
      await projectionService.deleteItem(id_item)
      const remainingItems = items.filter((i) => i.id_item !== id_item)
      setItems(remainingItems)

      setSelectedItemIds((prev) => {
        const next = new Set(prev)
        next.delete(id_item)
        return next
      })

      if (selectedOrder) {
        const updatedSnapshot = {
          templateId: activeTemplate?.id_plantilla,
          templateCodigo: activeTemplate?.codigo,
          startMonth,
          endMonth,
          columnas_meses: activeTemplate?.columnas_meses || [],
          ignoreZeroMonths,
          items: remainingItems,
          customColumns: activeTemplate?.columnas_personalizadas,
          estado_operativo: selectedOrder.estado
        }
        projectionService.saveSnapshotToStorage(
          selectedOrder.id_orden,
          selectedOrder.numero_orden,
          updatedSnapshot
        )
        await projectionService.updateOrder(selectedOrder.id_orden, {
          numero_orden: selectedOrder.numero_orden,
          total_items: remainingItems.length,
          snapshot_proyeccion: updatedSnapshot
        })
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                total_items: remainingItems.length,
                snapshot_proyeccion: updatedSnapshot
              }
            : prev
        )
        setOrders((prev) =>
          prev.map((ord) =>
            ord.id_orden === selectedOrder.id_orden
              ? { ...ord, total_items: remainingItems.length, snapshot_proyeccion: updatedSnapshot }
              : ord
          )
        )
      }

      setErrorMsg(null)
      setSuccessMsg(`Producto "${name}" eliminado de la proyección.`)
    } catch (err: any) {
      setErrorMsg(`Error al eliminar: ${err.message}`)
    }
  }

  // Exportar a CSV
  const handleExportCSV = () => {
    if (!activeTemplate || calculatedRows.length === 0) return

    const months = activeTemplate.columnas_meses || []
    const customCols = activeTemplate.columnas_personalizadas || []
    const headers = [
      'Producto',
      ...months,
      'Promedio mensual',
      'Stock real',
      'Stock minimo',
      'Seguridad',
      'Stock minimo final',
      'Stock redondeado',
      'Compra sugerida',
      'Meses duracion',
      'Vencimiento cobertura',
      ...customCols.map((c) => c.nombre),
      'Estado'
    ]

    const rows = calculatedRows.map((r) => {
      const mValues = months.map((m) => r.datos_meses[m] ?? 0)
      const customValues = customCols.map((c) => r.valores_personalizados?.[c.id] ?? 0)
      return [
        `"${r.nombre_producto}"`,
        ...mValues,
        r.promedio_final,
        r.stock_real,
        r.stock_min,
        r.seguridad,
        r.stock_min_f,
        r.stock_min_redondeado,
        r.compra_sugerida,
        r.meses_duracion,
        `"${r.texto_duracion} (${r.fecha_quiebre})"`,
        ...customValues,
        r.estado_critico
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `Proyeccion_${activeTemplate.codigo}_${new Date().toISOString().split('T')[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Fórmulas activas en chips resumidos
  const columnChips = useMemo(() => {
    if (!activeTemplate) return {}
    const chips: Record<string, string> = {
      stock_min: activeTemplate.formula_stock_min || 'PROM_MEN * lead_time',
      seguridad: activeTemplate.formula_seguridad || 'stock_min * 20%',
      stock_min_f: activeTemplate.formula_stock_min_f || 'stock_min + seg',
      stock_min_redondeado: activeTemplate.formula_stock_redondeado || 'CEIL 1,000',
      compra_sugerida: activeTemplate.formula_compra || 'redondeado * 2',
      meses_duracion: activeTemplate.formula_meses_duracion || '(real * 3) / redondeado'
    }
    if (activeTemplate.columnas_personalizadas) {
      for (const c of activeTemplate.columnas_personalizadas) {
        chips[c.id] = c.formula
      }
    }
    return chips
  }, [activeTemplate])

  // VISTA 1: LISTADO DE ÓRDENES GUARDADAS
  if (viewMode === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {errorMsg && (
          <div
            className="notice"
            role="alert"
            style={{
              borderColor: 'var(--color-danger)',
              backgroundColor: '#FDF3F2',
              color: 'var(--color-danger)'
            }}
          >
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div
            className="notice"
            role="alert"
            style={{
              borderColor: 'var(--color-success)',
              backgroundColor: '#F1F8F4',
              color: 'var(--color-success)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>{successMsg}</span>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}

        <OrdersListSubView
          orders={orders}
          onSelectOrder={handleSelectOrder}
          onCreateOrderClick={() => setNewOrderModalOpen(true)}
          onDeleteOrder={handleDeleteOrder}
          onOpenReceptions={onOpenReceptions}
          onOpenPackingPlan={handleOpenPackingPlan}
          onBack={onBack}
          loading={loading}
        />

        <NewOrderModal
          isOpen={newOrderModalOpen}
          onClose={() => setNewOrderModalOpen(false)}
          onSubmit={handleCreateOrder}
          templates={templates}
          existingOrderNumbers={orders.map((o) => o.numero_orden)}
          suppliers={suppliers}
        />
      </div>
    )
  }

  // VISTA 2: RESUMEN DE PROYECCIÓN Y APROBACIÓN PRESUPUESTAL
  if (viewMode === 'approval_summary' && selectedOrder) {
    return (
      <ProjectionSummaryApprovalSubView
        order={selectedOrder}
        calculatedRows={calculatedRows.filter((r) => r.compra_sugerida > 0)}
        onBack={() => setViewMode('matrix')}
        onConfirmApproval={handleConfirmApprovalAndEmit}
        isEmitting={isEmittingOrder}
        readOnly={isOrderLocked}
      />
    )
  }

  // VISTA 3: PACKING LIST Y PLAN DE PALETIZADO COMPLETO
  if (viewMode === 'packing_list' && packingPlan) {
    return (
      <PackingListSubView
        plan={packingPlan}
        onBack={() => setViewMode(packingPreviousView || (selectedOrder ? 'matrix' : 'list'))}
        onOpenReceptions={onOpenReceptions}
      />
    )
  }

  // VISTA 4: MATRIZ DINÁMICA TIPO EXCEL
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <ProjectionMatrixSubView
        selectedOrder={selectedOrder}
        activeTemplate={activeTemplate}
        isOrderLocked={isOrderLocked}
        loading={loading}
        errorMsg={errorMsg}
        successMsg={successMsg}
        setSuccessMsg={setSuccessMsg}
        onBackToList={handleBackToList}
        onOpenExcelModal={handleOpenExcelModal}
        onSyncLiveStock={handleSyncLiveStock}
        syncingStock={syncingStock}
        onSaveOrderSnapshot={handleSaveOrderSnapshot}
        onExportCSV={handleExportCSV}
        onTerminarProyeccion={handleTerminarProyeccion}
        isEmittingOrder={isEmittingOrder}
        calculatedRows={calculatedRows}
        onGoToApprovalSummary={handleGoToApprovalSummary}
        onOpenPackingPlan={handleOpenPackingPlan}
        isGeneratingPackingPlan={isGeneratingPackingPlan}
        onOpenReceptions={onOpenReceptions}
        metrics={metrics}
        items={items}
        activeMonthsInAverage={activeMonthsInAverage}
        startMonth={startMonth}
        endMonth={endMonth}
        ignoreZeroMonths={ignoreZeroMonths}
        isUpdatingMonthRange={isUpdatingMonthRange}
        onApplyMonthRange={handleApplyMonthRange}
        onSetQuickMonthPreset={handleSetQuickMonthPreset}
        onOpenAddMonthModal={() => setAddMonthModalOpen(true)}
        formulaBarColumn={formulaBarColumn}
        setFormulaBarColumn={setFormulaBarColumn}
        columnChips={columnChips}
        onOpenEquationModal={openEquationModal}
        selectedColumnForEquation={selectedColumnForEquation}
        onOpenAddColumnModal={() => setAddColumnModalOpen(true)}
        onOpenParamsModal={() => setParamsModalOpen(true)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isSearchDropdownOpen={isSearchDropdownOpen}
        setIsSearchDropdownOpen={setIsSearchDropdownOpen}
        onLoadCatalogProductsFromDB={loadCatalogProductsFromDB}
        searchWrapperRef={searchWrapperRef}
        matchingCatalogProducts={matchingCatalogProducts}
        liveStockMap={liveStockMap}
        onQuickAddProduct={handleQuickAddProduct}
        filteredRows={filteredRows}
        selectedItemIds={selectedItemIds}
        onToggleSelectAll={handleToggleSelectAll}
        onToggleSelectRow={handleToggleSelectRow}
        onDeleteMonth={handleDeleteMonth}
        onCellChange={handleCellChange}
        onResetManualAverage={handleResetManualAverage}
        onResetManualRound={handleResetManualRound}
        onDeleteItem={handleDeleteItem}
      />

      {/* Modales de la vista matriz */}
      <AddMonthModal
        isOpen={addMonthModalOpen}
        onClose={() => setAddMonthModalOpen(false)}
        newMonthName={newMonthName}
        setNewMonthName={setNewMonthName}
        isAdding={isAddingMonth}
        onAdd={handleAddMonth}
      />

      <AddProductModal
        isOpen={addProductModalOpen}
        onClose={() => setAddProductModalOpen(false)}
        newProductName={newProductName}
        setNewProductName={setNewProductName}
        newProductStock={newProductStock}
        setNewProductStock={setNewProductStock}
        isAdding={isAddingProduct}
        onAdd={handleAddProduct}
      />

      <GlobalParametersModal
        isOpen={paramsModalOpen}
        onClose={() => setParamsModalOpen(false)}
        formLeadTime={formLeadTime}
        setFormLeadTime={setFormLeadTime}
        formSeguridadPct={formSeguridadPct}
        setFormSeguridadPct={setFormSeguridadPct}
        formFactorCompra={formFactorCompra}
        setFormFactorCompra={setFormFactorCompra}
        formDiasMes={formDiasMes}
        setFormDiasMes={setFormDiasMes}
        isSaving={isSavingParams}
        onSave={handleSaveParams}
      />

      {activeTemplate && (
        <EquationBuilderModal
          isOpen={equationModalOpen}
          onClose={() => setEquationModalOpen(false)}
          activeTemplate={activeTemplate}
          selectedColumnForEquation={selectedColumnForEquation}
          setSelectedColumnForEquation={setSelectedColumnForEquation}
          setFormulaBarColumn={setFormulaBarColumn}
          draftFormula={draftFormula}
          setDraftFormula={setDraftFormula}
          draftCustomName={draftCustomName}
          setDraftCustomName={setDraftCustomName}
          draftCustomFormat={draftCustomFormat}
          setDraftCustomFormat={setDraftCustomFormat}
          onInsertToken={handleInsertToken}
          formulaValidation={formulaValidation}
          simulationSampleRows={simulationSampleRows}
          isSavingFormula={isSavingFormula}
          onApplyEquation={handleApplyColumnEquation}
          onDeleteCustomColumn={handleDeleteCustomColumn}
        />
      )}

      {activeTemplate && (
        <AddCustomColumnModal
          isOpen={addColumnModalOpen}
          onClose={() => setAddColumnModalOpen(false)}
          activeTemplate={activeTemplate}
          newColName={newColName}
          newColVariable={newColVariable}
          newColFormula={newColFormula}
          newColFormat={newColFormat}
          onColNameChange={handleColNameChange}
          setNewColVariable={setNewColVariable}
          setNewColFormula={setNewColFormula}
          setNewColFormat={setNewColFormat}
          onInsertToken={handleInsertNewColToken}
          formulaValidation={newColumnFormulaValidation}
          simulationSampleRows={simulationSampleRows}
          isAddingColumn={isAddingColumn}
          onSubmit={handleAddCustomColumn}
        />
      )}

      {excelModalOpen && activeTemplate && (
        <ExcelImportModal
          isOpen={excelModalOpen}
          onClose={() => setExcelModalOpen(false)}
          template={activeTemplate}
          items={items}
          catalogProducts={catalogProducts}
          onApply={handleApplyExcelOutputs}
        />
      )}
    </div>
  )
}
