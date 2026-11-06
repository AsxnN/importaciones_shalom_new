import { useState, useMemo, useEffect } from 'react'
import * as XLSX from 'xlsx'
import type { ProjectionOrder, CalculatedProjectionRow } from '../../types/projections'
import { packingListService } from '../../services/packingListService'
import { projectionService } from '../../services/projectionService'

export type DecisionState = 'PENDIENTE' | 'CAMBIANDO' | 'APROBADO_100' | 'APROBADO_RECALCULO'

export interface ApprovedItemRow {
  id_item: number
  id_producto: number | null
  sku: string
  nombre_producto: string
  promedio_consumo: number
  stock_real: number
  compra_proyectada: number
  unidades_por_caja: number
  cajas_por_paleta: number
  cajas_proyectadas: number
  paletas_completas_proyectadas: number
  pucho_cajas_proyectadas: number

  // Flujo interactivo de decisión y recálculo
  estado_decision: DecisionState
  cantidad_editable: string
  cajas_calculadas_temp?: number
  paletas_calculadas_temp?: number
  puchos_calculados_temp?: number

  cantidad_aprobada: number
  motivo_recorte: string
  cajas_aprobadas: number
  paletas_completas_aprobadas: number
  pucho_cajas_aprobadas: number
  pucho_unidades_aprobadas: number
  total_bultos_aprobados: number
  estado_aprobacion: 'APROBADO_TOTAL' | 'RECORTADO' | 'EXCLUIDO' | 'INCREMENTADO'
  porcentaje_aprobado: number
}

interface ProjectionSummaryApprovalSubViewProps {
  order: ProjectionOrder
  calculatedRows: CalculatedProjectionRow[]
  onBack: () => void
  onConfirmApproval: (approvedRows: ApprovedItemRow[]) => Promise<void>
  isEmitting?: boolean
  readOnly?: boolean
}

export function ProjectionSummaryApprovalSubView({
  order,
  calculatedRows,
  onBack,
  onConfirmApproval,
  isEmitting = false,
  readOnly = false
}: ProjectionSummaryApprovalSubViewProps) {
  const [rows, setRows] = useState<ApprovedItemRow[]>([])
  const [packingRulesMap, setPackingRulesMap] = useState<Map<number, { unidades_por_caja: number; cajas_por_paleta: number }>>(new Map())
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APROBADOS' | 'PENDIENTES'>('ALL')
  const [isSavingAvance, setIsSavingAvance] = useState(false)
  const [saveStatusMsg, setSaveStatusMsg] = useState<string | null>(null)

  const isOrderEmitted = readOnly || order.estado === 'TRANSITO' || order.estado === 'RECIBIDA'

  // Cargar reglas de empaque reales del catálogo
  useEffect(() => {
    let mounted = true
    packingListService.getProductsPackingRules().then((map) => {
      if (mounted) {
        setPackingRulesMap(map)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Inicializar o restaurar las filas de aprobación
  useEffect(() => {
    // Si la orden ya cuenta con un snapshot de aprobación guardado, restaurarlo
    const savedApproval = order.snapshot_proyeccion?.approval_summary as ApprovedItemRow[] | undefined
    if (savedApproval && savedApproval.length > 0) {
      setRows(
        savedApproval.map((r) => {
          let decState: DecisionState = r.estado_decision
          if (!decState) {
            decState = isOrderEmitted
              ? r.cantidad_aprobada === r.compra_proyectada
                ? 'APROBADO_100'
                : 'APROBADO_RECALCULO'
              : 'PENDIENTE'
          }
          return {
            ...r,
            estado_decision: decState,
            cantidad_editable: r.cantidad_editable !== undefined ? r.cantidad_editable : String(r.cantidad_aprobada),
            cajas_calculadas_temp: r.cajas_calculadas_temp !== undefined ? r.cajas_calculadas_temp : r.cajas_aprobadas,
            paletas_calculadas_temp: r.paletas_calculadas_temp !== undefined ? r.paletas_calculadas_temp : r.paletas_completas_aprobadas,
            puchos_calculados_temp: r.puchos_calculados_temp !== undefined ? r.puchos_calculados_temp : r.pucho_cajas_aprobadas
          }
        })
      )
      return
    }

    // Si no, construir a partir de calculatedRows
    const initialRows: ApprovedItemRow[] = calculatedRows.map((calc) => {
      const prodId = calc.id_producto || 0
      const rule = packingRulesMap.get(prodId) || { unidades_por_caja: 1, cajas_por_paleta: 1 }
      const unidCaja = Math.max(1, rule.unidades_por_caja)
      const cajasPal = Math.max(1, rule.cajas_por_paleta)

      const compraProy = calc.compra_sugerida
      const cajasProy = Math.ceil(compraProy / unidCaja)
      const palCompletasProy = Math.floor(cajasProy / cajasPal)
      const puchoProy = cajasProy % cajasPal

      return {
        id_item: calc.id_item,
        id_producto: calc.id_producto,
        sku: `SKU-${calc.id_producto ? String(calc.id_producto).padStart(5, '0') : '00000'}`,
        nombre_producto: calc.nombre_producto,
        promedio_consumo: calc.promedio_final,
        stock_real: calc.stock_real,
        compra_proyectada: compraProy,
        unidades_por_caja: unidCaja,
        cajas_por_paleta: cajasPal,
        cajas_proyectadas: cajasProy,
        paletas_completas_proyectadas: palCompletasProy,
        pucho_cajas_proyectadas: puchoProy,
        cantidad_aprobada: isOrderEmitted ? compraProy : 0,
        motivo_recorte: '',
        cajas_aprobadas: isOrderEmitted ? cajasProy : 0,
        paletas_completas_aprobadas: isOrderEmitted ? palCompletasProy : 0,
        pucho_cajas_aprobadas: isOrderEmitted ? puchoProy : 0,
        pucho_unidades_aprobadas: isOrderEmitted ? puchoProy * unidCaja : 0,
        total_bultos_aprobados: isOrderEmitted ? palCompletasProy + (puchoProy > 0 ? 1 : 0) : 0,
        estado_aprobacion: 'APROBADO_TOTAL',
        porcentaje_aprobado: isOrderEmitted ? 100 : 0,
        estado_decision: isOrderEmitted ? 'APROBADO_100' : 'PENDIENTE',
        cantidad_editable: String(compraProy),
        cajas_calculadas_temp: cajasProy,
        paletas_calculadas_temp: palCompletasProy,
        puchos_calculados_temp: puchoProy
      }
    })

    setRows(initialRows)
  }, [calculatedRows, packingRulesMap, order, isOrderEmitted])

  // Persistir estado de aprobación en snapshot y Supabase
  const persistApprovalState = async (updatedRows: ApprovedItemRow[]) => {
    try {
      const snap = {
        ...(order.snapshot_proyeccion || {}),
        approval_summary: updatedRows
      }
      projectionService.saveSnapshotToStorage(order.id_orden, order.numero_orden, snap)
      await projectionService.updateOrder(order.id_orden, {
        numero_orden: order.numero_orden,
        snapshot_proyeccion: snap
      })
    } catch (e) {
      console.warn('Error al persistir avance de aprobación:', e)
    }
  }

  // Guardar avance manual
  const handleManualSaveAvance = async () => {
    setIsSavingAvance(true)
    setSaveStatusMsg(null)
    try {
      await persistApprovalState(rows)
      const approvedCount = rows.filter(
        (r) => r.estado_decision === 'APROBADO_100' || r.estado_decision === 'APROBADO_RECALCULO'
      ).length
      setSaveStatusMsg(`Avance guardado con éxito (${approvedCount} de ${rows.length} productos confirmados).`)
      setTimeout(() => setSaveStatusMsg(null), 4000)
    } catch (err: any) {
      setSaveStatusMsg(`Error al guardar avance: ${err.message}`)
    } finally {
      setIsSavingAvance(false)
    }
  }

  // 1. Aprobar al 100% directamente
  const handleAprobar100 = (idItem: number) => {
    if (isOrderEmitted) return
    const updated = rows.map((r) => {
      if (r.id_item !== idItem) return r

      const unidCaja = Math.max(1, r.unidades_por_caja)
      const cajasPal = Math.max(1, r.cajas_por_paleta)
      const cant = r.compra_proyectada
      const cajas = Math.ceil(cant / unidCaja)
      const paletas = Math.floor(cajas / cajasPal)
      const puchos = cajas % cajasPal
      const puchoUnid = puchos > 0 ? puchos * unidCaja : 0
      const totalBultos = paletas + (puchos > 0 ? 1 : 0)

      return {
        ...r,
        estado_decision: 'APROBADO_100' as DecisionState,
        cantidad_editable: String(cant),
        cantidad_aprobada: cant,
        cajas_calculadas_temp: cajas,
        paletas_calculadas_temp: paletas,
        puchos_calculados_temp: puchos,
        cajas_aprobadas: cajas,
        paletas_completas_aprobadas: paletas,
        pucho_cajas_aprobadas: puchos,
        pucho_unidades_aprobadas: puchoUnid,
        total_bultos_aprobados: totalBultos,
        estado_aprobacion: 'APROBADO_TOTAL' as const,
        porcentaje_aprobado: 100,
        motivo_recorte: ''
      }
    })
    setRows(updated)
    void persistApprovalState(updated)
  }

  // 2. Iniciar modo de cambio
  const handleIniciarCambio = (idItem: number) => {
    if (isOrderEmitted) return
    setRows((prev) =>
      prev.map((r) => {
        if (r.id_item !== idItem) return r
        const currentQty =
          r.cantidad_aprobada > 0 && r.estado_decision !== 'PENDIENTE'
            ? r.cantidad_aprobada
            : r.compra_proyectada
        const unidCaja = Math.max(1, r.unidades_por_caja)
        const cajasPal = Math.max(1, r.cajas_por_paleta)
        const cajas = Math.ceil(currentQty / unidCaja)
        const paletas = Math.floor(cajas / cajasPal)
        const puchos = cajas % cajasPal

        return {
          ...r,
          estado_decision: 'CAMBIANDO' as DecisionState,
          cantidad_editable: String(currentQty),
          cajas_calculadas_temp: cajas,
          paletas_calculadas_temp: paletas,
          puchos_calculados_temp: puchos
        }
      })
    )
  }

  // 3. Cancelar modo de cambio (revertir a PENDIENTE)
  const handleCancelarCambio = (idItem: number) => {
    if (isOrderEmitted) return
    setRows((prev) =>
      prev.map((r) => {
        if (r.id_item !== idItem) return r
        return {
          ...r,
          estado_decision: 'PENDIENTE' as DecisionState
        }
      })
    )
  }

  // 4. Cambiar valor en input de cantidad editable
  const handleEditableQtyChange = (idItem: number, valueStr: string) => {
    if (isOrderEmitted) return
    setRows((prev) =>
      prev.map((r) => (r.id_item === idItem ? { ...r, cantidad_editable: valueStr } : r))
    )
  }

  // 5. Presionar Calcular (se puede presionar cuantas veces sea necesario)
  const handleCalcularFila = (idItem: number) => {
    if (isOrderEmitted) return
    setRows((prev) =>
      prev.map((r) => {
        if (r.id_item !== idItem) return r

        const cant = Math.max(0, parseInt(r.cantidad_editable || '0', 10) || 0)
        const unidCaja = Math.max(1, r.unidades_por_caja)
        const cajasPal = Math.max(1, r.cajas_por_paleta)
        const cajas = Math.ceil(cant / unidCaja)
        const paletas = Math.floor(cajas / cajasPal)
        const puchos = cajas % cajasPal

        return {
          ...r,
          cajas_calculadas_temp: cajas,
          paletas_calculadas_temp: paletas,
          puchos_calculados_temp: puchos
        }
      })
    )
  }

  // 6. Confirmar y aprobar recálculo
  const handleAprobarRecalculo = (idItem: number) => {
    if (isOrderEmitted) return
    const updated = rows.map((r) => {
      if (r.id_item !== idItem) return r

      const cant = Math.max(0, parseInt(r.cantidad_editable || '0', 10) || 0)
      const unidCaja = Math.max(1, r.unidades_por_caja)
      const cajasPal = Math.max(1, r.cajas_por_paleta)
      const cajas = Math.ceil(cant / unidCaja)
      const paletas = Math.floor(cajas / cajasPal)
      const puchos = cajas % cajasPal
      const puchoUnid = puchos > 0 ? puchos * unidCaja : 0
      const totalBultos = paletas + (puchos > 0 ? 1 : 0)

      let estado: ApprovedItemRow['estado_aprobacion'] = 'APROBADO_TOTAL'
      if (cant === 0) {
        estado = 'EXCLUIDO'
      } else if (cant < r.compra_proyectada) {
        estado = 'RECORTADO'
      } else if (cant > r.compra_proyectada) {
        estado = 'INCREMENTADO'
      }

      const pct = r.compra_proyectada > 0 ? Math.round((cant / r.compra_proyectada) * 100) : 100

      return {
        ...r,
        estado_decision: 'APROBADO_RECALCULO' as DecisionState,
        cantidad_aprobada: cant,
        cajas_calculadas_temp: cajas,
        paletas_calculadas_temp: paletas,
        puchos_calculados_temp: puchos,
        cajas_aprobadas: cajas,
        paletas_completas_aprobadas: paletas,
        pucho_cajas_aprobadas: puchos,
        pucho_unidades_aprobadas: puchoUnid,
        total_bultos_aprobados: totalBultos,
        estado_aprobacion: estado,
        porcentaje_aprobado: pct
      }
    })
    setRows(updated)
    void persistApprovalState(updated)
  }

  // 7. Cancelar aprobación para permitir volver a recalcular
  const handleCancelarAprobacion = (idItem: number) => {
    if (isOrderEmitted) return
    const updated = rows.map((r) => {
      if (r.id_item !== idItem) return r
      return {
        ...r,
        estado_decision: 'CAMBIANDO' as DecisionState,
        cantidad_editable: String(r.cantidad_aprobada)
      }
    })
    setRows(updated)
    void persistApprovalState(updated)
  }

  // Acción masiva: Aprobar todos al 100%
  const handleApproveAll100 = () => {
    if (isOrderEmitted) return
    const updated = rows.map((r) => {
      const unidCaja = Math.max(1, r.unidades_por_caja)
      const cajasPal = Math.max(1, r.cajas_por_paleta)
      const cant = r.compra_proyectada
      const cajas = Math.ceil(cant / unidCaja)
      const paletas = Math.floor(cajas / cajasPal)
      const puchos = cajas % cajasPal
      return {
        ...r,
        estado_decision: 'APROBADO_100' as DecisionState,
        cantidad_editable: String(cant),
        cantidad_aprobada: cant,
        cajas_calculadas_temp: cajas,
        paletas_calculadas_temp: paletas,
        puchos_calculados_temp: puchos,
        cajas_aprobadas: cajas,
        paletas_completas_aprobadas: paletas,
        pucho_cajas_aprobadas: puchos,
        pucho_unidades_aprobadas: puchos * unidCaja,
        total_bultos_aprobados: paletas + (puchos > 0 ? 1 : 0),
        estado_aprobacion: 'APROBADO_TOTAL' as const,
        porcentaje_aprobado: 100,
        motivo_recorte: ''
      }
    })
    setRows(updated)
    void persistApprovalState(updated)
  }

  // Acción masiva: Excluir todos a 0
  const handleExcludeAll = () => {
    if (isOrderEmitted) return
    const updated = rows.map((r) => ({
      ...r,
      estado_decision: 'APROBADO_RECALCULO' as DecisionState,
      cantidad_editable: '0',
      cantidad_aprobada: 0,
      cajas_calculadas_temp: 0,
      paletas_calculadas_temp: 0,
      puchos_calculados_temp: 0,
      cajas_aprobadas: 0,
      paletas_completas_aprobadas: 0,
      pucho_cajas_aprobadas: 0,
      pucho_unidades_aprobadas: 0,
      total_bultos_aprobados: 0,
      estado_aprobacion: 'EXCLUIDO' as const,
      porcentaje_aprobado: 0,
      motivo_recorte: 'Exclusión masiva para este ciclo'
    }))
    setRows(updated)
    void persistApprovalState(updated)
  }

  // Métricas globales sumadas
  const metrics = useMemo(() => {
    let totalProyectadas = 0
    let totalAprobadas = 0
    let totalCajasAprobadas = 0
    let totalPaletasCompletas = 0
    let totalPuchos = 0
    let totalBultos = 0

    let aprobadosCount = 0

    for (const r of rows) {
      totalProyectadas += r.compra_proyectada
      const isApproved = r.estado_decision === 'APROBADO_100' || r.estado_decision === 'APROBADO_RECALCULO'
      if (isApproved) {
        aprobadosCount++
        totalAprobadas += r.cantidad_aprobada
        totalCajasAprobadas += r.cajas_aprobadas
        totalPaletasCompletas += r.paletas_completas_aprobadas
        totalPuchos += r.pucho_cajas_aprobadas
        totalBultos += r.total_bultos_aprobados
      }
    }

    const deltaUnidades = totalAprobadas - totalProyectadas
    const deltaPorcentaje = totalProyectadas > 0 ? ((totalAprobadas - totalProyectadas) / totalProyectadas) * 100 : 0
    const pendientesCount = rows.length - aprobadosCount

    return {
      skusCount: rows.length,
      aprobadosCount,
      pendientesCount,
      totalProyectadas,
      totalAprobadas,
      deltaUnidades,
      deltaPorcentaje,
      totalCajasAprobadas,
      totalPaletasCompletas,
      totalPuchos,
      totalBultos
    }
  }, [rows])

  // ¿Todos los productos están aprobados?
  const allApproved = useMemo(() => {
    return rows.length > 0 && metrics.aprobadosCount === rows.length
  }, [rows, metrics.aprobadosCount])

  // Filtrado reactivo de filas
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter === 'APROBADOS') {
        const isApp = r.estado_decision === 'APROBADO_100' || r.estado_decision === 'APROBADO_RECALCULO'
        if (!isApp) return false
      }
      if (statusFilter === 'PENDIENTES') {
        const isApp = r.estado_decision === 'APROBADO_100' || r.estado_decision === 'APROBADO_RECALCULO'
        if (isApp) return false
      }
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase()
        const matchesSku = r.sku.toLowerCase().includes(query)
        const matchesName = r.nombre_producto.toLowerCase().includes(query)
        if (!matchesSku && !matchesName) return false
      }
      return true
    })
  }, [rows, searchFilter, statusFilter])

  // Exportar Excel Oficial para Contabilidad con Firmas
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()

    const dataAprobacion: (string | number)[][] = [
      ['IMPORTACIONES SHALOM S.A. — CONTROL PRESUPUESTAL Y APROBACIÓN DE COMPRA'],
      [`Orden de Importación: ${order.numero_orden}`, `Contenedor: ${order.tipo_contenedor || '40FT'}`, `Fecha: ${order.fecha_emision || new Date().toISOString().split('T')[0]}`],
      [`Estado: ${order.estado}`, `Total SKUs: ${metrics.skusCount}`, `Unidades Aprobadas: ${metrics.totalAprobadas.toLocaleString('es-PE')}`],
      [],
      [
        '#',
        'SKU',
        'Producto',
        'Consumo Prom.',
        'Stock Real',
        'Unid/Caja',
        'Cajas/Paleta',
        'Cantidad Proyectada (Logística)',
        'Cantidad Aprobada (Empresa)',
        'Δ Unidades',
        '% Aprobado',
        'Cajas Aprobadas',
        'Paletas Completas',
        'Cajas Pucho',
        'Estado Decisión',
        'Motivo / Justificación'
      ]
    ]

    rows.forEach((r, idx) => {
      dataAprobacion.push([
        idx + 1,
        r.sku,
        r.nombre_producto,
        r.promedio_consumo,
        r.stock_real,
        r.unidades_por_caja,
        r.cajas_por_paleta,
        r.compra_proyectada,
        r.cantidad_aprobada,
        r.cantidad_aprobada - r.compra_proyectada,
        `${r.porcentaje_aprobado}%`,
        r.cajas_aprobadas,
        r.paletas_completas_aprobadas,
        r.pucho_cajas_aprobadas,
        r.estado_decision,
        r.motivo_recorte || (r.estado_decision === 'APROBADO_100' ? 'Aprobado conforme al 100%' : '')
      ])
    })

    dataAprobacion.push([])
    dataAprobacion.push([
      'TOTALES',
      '',
      '',
      '',
      '',
      '',
      '',
      metrics.totalProyectadas,
      metrics.totalAprobadas,
      metrics.deltaUnidades,
      `${Math.round(metrics.deltaPorcentaje + 100)}%`,
      metrics.totalCajasAprobadas,
      metrics.totalPaletasCompletas,
      metrics.totalPuchos,
      '',
      ''
    ])

    dataAprobacion.push([])
    dataAprobacion.push([])
    dataAprobacion.push(['AUTORIZACIONES Y CONFORMIDAD OPERATIVA:'])
    dataAprobacion.push([])
    dataAprobacion.push([
      '_________________________________________',
      '',
      '_________________________________________',
      '',
      '_________________________________________'
    ])
    dataAprobacion.push([
      'RESPONSABLE DE LOGÍSTICA',
      '',
      'CONTABILIDAD / FINANZAS',
      '',
      'GERENCIA GENERAL'
    ])
    dataAprobacion.push([
      'Elaboró proyección y cálculo de estiba',
      '',
      'Validó disponibilidad presupuestal',
      '',
      'Aprobó emisión de orden de importación'
    ])

    const ws = XLSX.utils.aoa_to_sheet(dataAprobacion)

    ws['!cols'] = [
      { wch: 4 },
      { wch: 14 },
      { wch: 32 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 32 }
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Aprobacion_Contable')
    XLSX.writeFile(wb, `Aprobacion_Presupuestal_${order.numero_orden}.xlsx`)
  }

  // Confirmar y continuar hacia Packing List
  const handleConfirm = async () => {
    if (!allApproved) {
      alert(`Debe confirmar la totalidad de los productos antes de generar el Packing List. Faltan ${metrics.pendientesCount} productos por aprobar.`)
      return
    }
    if (metrics.totalAprobadas === 0) {
      alert('Debe autorizar al menos un producto con cantidad mayor a cero para poder generar el Packing List.')
      return
    }
    await onConfirmApproval(rows)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* 1. Barra de Navegación y Encabezado de la Subvista */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            className="button secondary button-sm"
            onClick={onBack}
            title="Volver a la matriz de cálculo"
          >
            ← Volver a la matriz
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '22px',
                  fontWeight: 600,
                  color: 'var(--color-brand-deep)',
                  fontFamily: 'Barlow Semi Condensed, sans-serif'
                }}
              >
                Resumen de proyección y aprobación presupuestal
              </h1>
              <span
                className="badge"
                style={{
                  background: isOrderEmitted ? 'var(--color-brand-soft)' : '#FFF8EE',
                  color: isOrderEmitted ? 'var(--color-brand)' : 'var(--color-warning)',
                  fontWeight: 600,
                  border: isOrderEmitted ? '1px solid var(--color-brand)' : '1px solid #F5D399'
                }}
              >
                {isOrderEmitted ? 'Orden emitida' : 'Falta aprobación'}
              </span>
            </div>
            <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
              Valide producto por producto la cantidad autorizada. Una vez aprobados todos los productos se habilitará el Packing List oficial.
            </p>
          </div>
        </div>

        {/* Metadatos Rápidos y Acciones Globales */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'var(--color-canvas)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              display: 'flex',
              gap: '10px'
            }}
          >
            <span>
              Orden: <strong style={{ color: 'var(--color-brand-deep)' }}>{order.numero_orden}</strong>
            </span>
            <span>•</span>
            <span>
              Contenedor: <strong>{order.tipo_contenedor || '40FT'}</strong>
            </span>
            <span>•</span>
            <span>
              Fecha: <strong>{order.fecha_emision || new Date().toISOString().split('T')[0]}</strong>
            </span>
          </div>

          {!isOrderEmitted && (
            <button
              type="button"
              className="button secondary button-sm"
              onClick={handleManualSaveAvance}
              disabled={isSavingAvance}
              title="Guardar el avance actual en la base de datos para continuar en otro momento"
              style={{ fontWeight: 600 }}
            >
              {isSavingAvance ? 'Guardando avance...' : 'Guardar avance'}
            </button>
          )}

          <button
            type="button"
            className="button secondary button-sm"
            onClick={handleExportExcel}
            title="Descargar hoja de cálculo formal con firmas para Contabilidad y Gerencia"
          >
            Descargar Excel para contabilidad
          </button>

          {/* Botón Principal Llamativo hacia Packing List */}
          {!isOrderEmitted && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!allApproved || isEmitting}
              style={{
                background: allApproved ? 'var(--color-brand-deep)' : '#CBD5E1',
                borderColor: allApproved ? 'var(--color-brand-deep)' : '#94A3B8',
                color: '#FFFFFF',
                fontWeight: 700,
                cursor: allApproved ? 'pointer' : 'not-allowed',
                padding: '7px 16px',
                borderRadius: '6px',
                border: '1px solid',
                fontSize: '13px',
                transition: 'all 0.2s ease'
              }}
              title={
                allApproved
                  ? 'Confirmar aprobación definitiva y generar Packing List oficial'
                  : `Debe confirmar todos los productos para continuar (faltan ${metrics.pendientesCount})`
              }
            >
              {isEmitting
                ? 'Emitiendo orden...'
                : allApproved
                ? 'Confirmar aprobación y generar Packing List →'
                : `Confirmar y generar Packing List (Faltan ${metrics.pendientesCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Notificación de guardado de avance */}
      {saveStatusMsg && (
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: 'var(--color-success)',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '13px',
            fontWeight: 500
          }}
        >
          {saveStatusMsg}
        </div>
      )}

      {/* Alerta contextual si la orden ya está congelada en tránsito */}
      {isOrderEmitted && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderLeft: '4px solid var(--color-brand)',
            borderRadius: '6px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div>
            <strong style={{ fontSize: '14px', color: 'var(--color-brand-deep)' }}>
              Registro oficial congelado para auditoría
            </strong>
            <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '13px' }}>
              Esta orden ya fue confirmada y emitida a tránsito. Las cantidades proyectadas vs autorizadas permanecen inmutables para el control forense de existencias.
            </p>
          </div>
          <span
            className="badge"
            style={{
              background: 'var(--color-brand-soft)',
              color: 'var(--color-brand)',
              fontWeight: 600
            }}
          >
            Solo lectura
          </span>
        </div>
      )}

      {/* 2. Tira de Métricas e Indicadores Clave de Decisión (KPIs) */}
      <div className="indicator-strip">
        <div className="indicator-card">
          <span className="indicator-label">SKUs en revisión</span>
          <span className="indicator-value">{metrics.aprobadosCount} de {metrics.skusCount}</span>
          <span className="indicator-context">
            {metrics.pendientesCount === 0 ? 'Todos los productos aprobados' : `Faltan ${metrics.pendientesCount} por revisar`}
          </span>
        </div>

        <div className="indicator-card">
          <span className="indicator-label">Unidades proyectadas</span>
          <span className="indicator-value">{metrics.totalProyectadas.toLocaleString('es-PE')}</span>
          <span className="indicator-context">Cálculo teórico de logística</span>
        </div>

        <div className="indicator-card">
          <span className="indicator-label">Unidades aprobadas</span>
          <span
            className="indicator-value"
            style={{
              color: metrics.deltaUnidades < 0 ? 'var(--color-warning)' : 'var(--color-success)'
            }}
          >
            {metrics.totalAprobadas.toLocaleString('es-PE')}
          </span>
          <span className="indicator-context">
            {metrics.deltaUnidades < 0
              ? `Recorte neto: ${metrics.deltaUnidades.toLocaleString('es-PE')} unid (${Math.round(metrics.deltaPorcentaje)}%)`
              : metrics.deltaUnidades === 0
              ? 'Aprobación idéntica al 100%'
              : `Incremento: +${metrics.deltaUnidades.toLocaleString('es-PE')} unid`}
          </span>
        </div>

        <div className="indicator-card">
          <span className="indicator-label">Cajas físicas aprobadas</span>
          <span className="indicator-value">{metrics.totalCajasAprobadas.toLocaleString('es-PE')}</span>
          <span className="indicator-context">Cajas totales a transportar</span>
        </div>

        <div className="indicator-card">
          <span className="indicator-label">Paletas completas</span>
          <span className="indicator-value" style={{ color: 'var(--color-brand)' }}>
            {metrics.totalPaletasCompletas}
          </span>
          <span className="indicator-context">Cargas estándar homogéneas</span>
        </div>

        <div className="indicator-card">
          <span className="indicator-label">Bultos físicos en muelle</span>
          <span className="indicator-value" style={{ color: 'var(--color-brand-deep)' }}>
            {metrics.totalBultos}
          </span>
          <span className="indicator-context">
            {metrics.totalPuchos > 0 ? `Incluye ${metrics.totalPuchos} cajas en puchos` : 'Sin puchos sueltos'}
          </span>
        </div>
      </div>

      {/* 3. Barra de Filtros y Acciones Masivas */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input"
            style={{ width: '260px', padding: '6px 12px', fontSize: '13px' }}
            placeholder="Buscar por SKU o producto..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`button ${statusFilter === 'ALL' ? 'primary' : 'secondary'} button-sm`}
              onClick={() => setStatusFilter('ALL')}
            >
              Todos ({rows.length})
            </button>
            <button
              type="button"
              className={`button ${statusFilter === 'APROBADOS' ? 'primary' : 'secondary'} button-sm`}
              onClick={() => setStatusFilter('APROBADOS')}
            >
              Aprobados ({metrics.aprobadosCount})
            </button>
            <button
              type="button"
              className={`button ${statusFilter === 'PENDIENTES' ? 'primary' : 'secondary'} button-sm`}
              onClick={() => setStatusFilter('PENDIENTES')}
            >
              Pendientes ({metrics.pendientesCount})
            </button>
          </div>
        </div>

        {!isOrderEmitted && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="button secondary button-sm"
              onClick={handleApproveAll100}
              title="Aprobar el 100% de las cantidades proyectadas por logística para todos los productos"
            >
              Aprobar todo al 100%
            </button>
            <button
              type="button"
              className="button secondary button-sm"
              onClick={handleExcludeAll}
              title="Excluir todos los productos (colocar en 0)"
            >
              Excluir todo a 0
            </button>
          </div>
        )}
      </div>

      {/* 4. Tabla Comparativa Lado a Lado por Producto */}
      <div className="table-wrap" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
        <table>
          <thead>
            <tr style={{ background: 'var(--color-canvas)', borderBottom: '2px solid var(--color-border)' }}>
              <th colSpan={3} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '13px', color: 'var(--color-brand-deep)' }}>
                Identificación del producto
              </th>
              <th colSpan={3} style={{ textAlign: 'center', background: '#F8FAFC', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', fontSize: '13px' }}>
                1. Proyección logística (Base teórica)
              </th>
              <th colSpan={2} style={{ textAlign: 'center', background: '#F2F9FA', borderRight: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-brand)' }}>
                2. Decisión de la empresa (Aprobación)
              </th>
              <th colSpan={4} style={{ textAlign: 'center', fontSize: '13px' }}>
                3. Recálculo físico de empaque y estiba
              </th>
            </tr>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>#</th>
              <th style={{ width: '105px' }}>SKU</th>
              <th>Producto y factor de empaque</th>

              {/* 1. Proyección Logística */}
              <th style={{ textAlign: 'right', width: '100px', borderLeft: '1px solid var(--color-border)', background: '#F8FAFC' }}>
                Unid. proyectadas
              </th>
              <th style={{ textAlign: 'right', width: '75px', background: '#F8FAFC' }}>Cajas</th>
              <th style={{ textAlign: 'center', width: '100px', borderRight: '1px solid var(--color-border)', background: '#F8FAFC' }}>
                Paletas proy.
              </th>

              {/* 2. Decisión de la Empresa */}
              <th style={{ textAlign: 'center', width: '130px', background: '#F2F9FA' }}>Estado decisión</th>
              <th style={{ textAlign: 'center', width: '160px', borderRight: '1px solid var(--color-border)', background: '#F2F9FA' }}>
                Acción empresa
              </th>

              {/* 3. Recálculo Físico */}
              <th style={{ textAlign: 'center', width: '190px' }}>Nueva cantidad y cálculo</th>
              <th style={{ textAlign: 'right', width: '75px' }}>Cajas</th>
              <th style={{ textAlign: 'center', width: '110px' }}>Paletas / Puchos</th>
              <th style={{ textAlign: 'center', width: '120px' }}>Estado final</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-secondary)' }}>
                  No se encontraron productos que coincidan con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const isApproved100 = row.estado_decision === 'APROBADO_100'
                const isApprovedRecalc = row.estado_decision === 'APROBADO_RECALCULO'
                const isApproved = isApproved100 || isApprovedRecalc
                const isEditing = row.estado_decision === 'CAMBIANDO'
                const isPending = row.estado_decision === 'PENDIENTE'

                return (
                  <tr
                    key={row.id_item}
                    style={{
                      background: isApproved100
                        ? '#F0FDF4'
                        : isApprovedRecalc
                        ? '#F8FAFC'
                        : isEditing
                        ? '#FFFDF5'
                        : 'var(--color-surface)',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Identificación */}
                    <td style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                      {idx + 1}
                    </td>
                    <td>
                      <code style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-brand-deep)' }}>
                        {row.sku}
                      </code>
                    </td>
                    <td>
                      <div>
                        <strong style={{ color: 'var(--color-text-primary)', fontSize: '13px' }}>
                          {row.nombre_producto}
                        </strong>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          Factor: <strong>{row.unidades_por_caja}</strong> unid/caja • <strong>{row.cajas_por_paleta}</strong> cajas/paleta ({row.unidades_por_caja * row.cajas_por_paleta} unid/paleta)
                        </div>
                      </div>
                    </td>

                    {/* 1. Proyección Logística */}
                    <td style={{ textAlign: 'right', fontWeight: 600, borderLeft: '1px solid var(--color-border)', background: '#F8FAFC' }}>
                      {row.compra_proyectada.toLocaleString('es-PE')}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)', background: '#F8FAFC' }}>
                      {row.cajas_proyectadas.toLocaleString('es-PE')}
                    </td>
                    <td style={{ textAlign: 'center', borderRight: '1px solid var(--color-border)', background: '#F8FAFC', fontSize: '12px' }}>
                      {row.paletas_completas_proyectadas} pal.
                      {row.pucho_cajas_proyectadas > 0 && (
                        <span style={{ color: 'var(--color-warning)', marginLeft: '4px' }}>
                          +{row.pucho_cajas_proyectadas} cj
                        </span>
                      )}
                    </td>

                    {/* 2. Decisión de la Empresa */}
                    <td style={{ textAlign: 'center', background: '#F2F9FA' }}>
                      {isApproved100 && (
                        <span
                          className="badge"
                          style={{
                            background: '#F0FDF4',
                            color: 'var(--color-success)',
                            border: '1px solid #BBF7D0',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          Aprobado 100%
                        </span>
                      )}
                      {isApprovedRecalc && (
                        <span
                          className="badge"
                          style={{
                            background: '#F0FDF4',
                            color: 'var(--color-success)',
                            border: '1px solid #BBF7D0',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          Aprobado: {row.cantidad_aprobada.toLocaleString('es-PE')}
                        </span>
                      )}
                      {isEditing && (
                        <span
                          className="badge"
                          style={{
                            background: 'var(--color-brand-soft)',
                            color: 'var(--color-brand)',
                            border: '1px solid var(--color-brand)',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          En recálculo
                        </span>
                      )}
                      {isPending && (
                        <span
                          className="badge"
                          style={{
                            background: '#FFF8EE',
                            color: 'var(--color-warning)',
                            border: '1px solid #F5D399',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          Pendiente
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'center', borderRight: '1px solid var(--color-border)', background: '#F2F9FA' }}>
                      {!isOrderEmitted ? (
                        <>
                          {isPending && (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="button primary button-sm"
                                style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}
                                onClick={() => handleAprobar100(row.id_item)}
                                title="Aprobar la cantidad total proyectada"
                              >
                                Aprobar 100%
                              </button>
                              <button
                                type="button"
                                className="button secondary button-sm"
                                style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}
                                onClick={() => handleIniciarCambio(row.id_item)}
                                title="Cambiar la cantidad para autorizar menos y recalcular"
                              >
                                Cambiar
                              </button>
                            </div>
                          )}

                          {isEditing && (
                            <button
                              type="button"
                              className="button secondary button-sm"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => handleCancelarCambio(row.id_item)}
                              title="Cancelar cambio y volver a estado pendiente"
                            >
                              Cancelar cambio
                            </button>
                          )}

                          {isApproved && (
                            <button
                              type="button"
                              className="button secondary button-sm"
                              style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--color-text-secondary)' }}
                              onClick={() => handleCancelarAprobacion(row.id_item)}
                              title="Cancelar la aprobación para permitir modificar o recalcular de nuevo"
                            >
                              Cancelar aprobación
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="muted" style={{ fontSize: '12px' }}>
                          Fijado
                        </span>
                      )}
                    </td>

                    {/* 3. Recálculo Físico de Empaque y Estiba */}
                    <td style={{ textAlign: 'center' }}>
                      {isEditing && !isOrderEmitted ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input
                              type="number"
                              className="input"
                              min={0}
                              style={{
                                width: '85px',
                                padding: '4px 6px',
                                fontSize: '13px',
                                fontWeight: 700,
                                textAlign: 'right'
                              }}
                              value={row.cantidad_editable}
                              onChange={(e) => handleEditableQtyChange(row.id_item, e.target.value)}
                              placeholder="Cant."
                            />
                            <button
                              type="button"
                              className="button secondary button-sm"
                              style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}
                              onClick={() => handleCalcularFila(row.id_item)}
                              title="Calcular nuevo empaque (puede presionarlo cuantas veces necesite)"
                            >
                              Calcular
                            </button>
                          </div>
                          <button
                            type="button"
                            className="button primary button-sm"
                            style={{
                              padding: '3px 10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: 'var(--color-success)',
                              borderColor: 'var(--color-success)'
                            }}
                            onClick={() => handleAprobarRecalculo(row.id_item)}
                            title="Confirmar y aprobar este producto con la cantidad calculada"
                          >
                            Aprobar recálculo
                          </button>
                        </div>
                      ) : isApproved ? (
                        <strong style={{ color: 'var(--color-brand-deep)', fontSize: '13px' }}>
                          {row.cantidad_aprobada.toLocaleString('es-PE')} und
                        </strong>
                      ) : (
                        <span className="muted" style={{ fontSize: '12px' }}>
                          —
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {isEditing ? (
                        <span style={{ color: 'var(--color-brand)' }}>
                          {row.cajas_calculadas_temp !== undefined ? row.cajas_calculadas_temp.toLocaleString('es-PE') : '—'} cj
                        </span>
                      ) : isApproved ? (
                        <span>{row.cajas_aprobadas.toLocaleString('es-PE')} cj</span>
                      ) : (
                        <span className="muted">({row.cajas_proyectadas} cj)</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'center', fontSize: '12px' }}>
                      {isEditing ? (
                        <span style={{ color: 'var(--color-brand)' }}>
                          {row.paletas_calculadas_temp ?? 0} pal.
                          {(row.puchos_calculados_temp ?? 0) > 0 && (
                            <span style={{ color: 'var(--color-warning)', marginLeft: '4px' }}>
                              +{row.puchos_calculados_temp} cj
                            </span>
                          )}
                        </span>
                      ) : isApproved ? (
                        <span>
                          {row.paletas_completas_aprobadas} pal.
                          {row.pucho_cajas_aprobadas > 0 && (
                            <span style={{ color: 'var(--color-warning)', marginLeft: '4px' }}>
                              +{row.pucho_cajas_aprobadas} cj
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="muted">
                          ({row.paletas_completas_proyectadas} pal.)
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {isApproved100 && (
                        <span
                          className="badge"
                          style={{
                            background: '#F0FDF4',
                            color: 'var(--color-success)',
                            border: '1px solid #BBF7D0',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          100% Aprobado
                        </span>
                      )}
                      {isApprovedRecalc && (
                        <span
                          className="badge"
                          style={{
                            background: row.cantidad_aprobada === 0 ? '#FEF2F2' : '#FFF8EE',
                            color: row.cantidad_aprobada === 0 ? 'var(--color-danger)' : 'var(--color-warning)',
                            border: row.cantidad_aprobada === 0 ? '1px solid #FECACA' : '1px solid #F5D399',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {row.cantidad_aprobada === 0
                            ? 'Excluido (0)'
                            : `Recalculado (${row.porcentaje_aprobado}%)`}
                        </span>
                      )}
                      {isEditing && (
                        <span
                          className="badge"
                          style={{
                            background: 'var(--color-brand-soft)',
                            color: 'var(--color-brand)',
                            fontSize: '11px'
                          }}
                        >
                          Editando
                        </span>
                      )}
                      {isPending && (
                        <span
                          className="badge"
                          style={{
                            background: '#F1F5F9',
                            color: '#64748B',
                            fontSize: '11px'
                          }}
                        >
                          Sin confirmar
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Pie de Acciones y Confirmación Final */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
          <strong style={{ fontSize: '14px', color: 'var(--color-brand-deep)' }}>
            Efecto de la confirmación:
          </strong>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '13px', maxWidth: '650px' }}>
            {allApproved
              ? 'Todos los productos han sido confirmados. Al pulsar el botón se guardarán las cantidades autorizadas en la orden de importación y se abrirá directamente el Packing List oficial para muelle.'
              : `Aún no puede continuar: faltan ${metrics.pendientesCount} productos por revisar y confirmar.`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="button secondary"
            onClick={onBack}
          >
            Volver a la matriz
          </button>

          {!isOrderEmitted && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!allApproved || isEmitting}
              style={{
                background: allApproved ? 'var(--color-brand-deep)' : '#CBD5E1',
                borderColor: allApproved ? 'var(--color-brand-deep)' : '#94A3B8',
                color: '#FFFFFF',
                fontWeight: 700,
                cursor: allApproved ? 'pointer' : 'not-allowed',
                padding: '9px 20px',
                borderRadius: '6px',
                border: '1px solid',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              title={
                allApproved
                  ? 'Confirmar aprobación definitiva y generar Packing List oficial'
                  : `Debe confirmar todos los productos para continuar (faltan ${metrics.pendientesCount})`
              }
            >
              {isEmitting
                ? 'Emitiendo y generando packing list...'
                : allApproved
                ? `Confirmar ${metrics.totalAprobadas.toLocaleString('es-PE')} unid y generar Packing List →`
                : `Confirmar y generar Packing List (Faltan ${metrics.pendientesCount})`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
