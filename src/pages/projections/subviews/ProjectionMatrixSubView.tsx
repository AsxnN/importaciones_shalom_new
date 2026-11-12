import { useMemo, type RefObject } from 'react'
import type {
  CalculableColumnKey,
  CalculatedProjectionRow,
  ColumnDisplayFormat,
  ProjectionItem,
  ProjectionOrder,
  ProjectionTemplate
} from '../../../types/projections'
import { ProjectionMonthRangeBar } from '../components/ProjectionMonthRangeBar'
import { ProjectionFormulaBar } from '../components/ProjectionFormulaBar'

const formatCustomColumnValue = (val: number, formato?: ColumnDisplayFormat): string => {
  if (typeof val !== 'number' || isNaN(val)) return '0'
  switch (formato) {
    case 'decimal':
      return val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    case 'moneda_pen':
      return `S/ ${Math.round(val).toLocaleString('es-PE')}`
    case 'moneda_usd':
      return `$ ${Math.round(val).toLocaleString('es-PE')}`
    case 'porcentaje':
      return `${(val * 100).toFixed(1)}%`
    case 'entero':
    default:
      return Math.round(val).toLocaleString('es-PE')
  }
}

interface ProjectionMatrixSubViewProps {
  selectedOrder: ProjectionOrder | null
  activeTemplate: ProjectionTemplate
  isOrderLocked: boolean
  loading: boolean
  errorMsg: string | null
  successMsg: string | null
  setSuccessMsg: (msg: string | null) => void
  onBackToList: () => void
  onOpenExcelModal: () => void
  onSyncLiveStock: () => Promise<void> | void
  syncingStock: boolean
  onSaveOrderSnapshot: () => Promise<void> | void
  onExportCSV: () => void
  onTerminarProyeccion: () => Promise<void> | void
  isEmittingOrder: boolean
  calculatedRows: CalculatedProjectionRow[]
  onGoToApprovalSummary: () => void
  onOpenPackingPlan: () => Promise<void> | void
  isGeneratingPackingPlan: boolean
  onOpenReceptions?: () => void
  metrics: { criticos: number; sugeridos: number; totalUnidadesSugeridas: number }
  items: ProjectionItem[]
  activeMonthsInAverage: string[]
  startMonth: string
  endMonth: string
  ignoreZeroMonths: boolean
  isUpdatingMonthRange: boolean
  onApplyMonthRange: (newStart: string, newEnd: string, newIgnore: boolean) => Promise<void> | void
  onSetQuickMonthPreset: (preset: 'all' | 'quarter' | 'semester') => void
  onOpenAddMonthModal: () => void
  formulaBarColumn: CalculableColumnKey
  setFormulaBarColumn: (col: CalculableColumnKey) => void
  columnChips: Record<string, string>
  onOpenEquationModal: (col: CalculableColumnKey) => void
  selectedColumnForEquation: CalculableColumnKey
  onOpenAddColumnModal: () => void
  onOpenParamsModal: () => void
  searchTerm: string
  setSearchTerm: (val: string) => void
  isSearchDropdownOpen: boolean
  setIsSearchDropdownOpen: (open: boolean) => void
  onLoadCatalogProductsFromDB: () => Promise<void> | void
  searchWrapperRef: RefObject<HTMLDivElement | null>
  matchingCatalogProducts: Array<{ id_producto?: number | null; sku?: string; nombre: string }>
  liveStockMap: Map<string, number>
  onQuickAddProduct: (prod: { id_producto?: number | null; sku?: string; nombre: string }) => Promise<void> | void
  filteredRows: CalculatedProjectionRow[]
  selectedItemIds: Set<number>
  onToggleSelectAll: () => void
  onToggleSelectRow: (id_item: number) => void
  onDeleteMonth: (month: string) => void
  onCellChange: (id_item: number, field: string, rawValue: string) => void
  onResetManualAverage: (id_item: number) => void
  onResetManualRound: (id_item: number) => void
  onDeleteItem: (id_item: number, name: string) => Promise<void> | void
}

export function ProjectionMatrixSubView({
  selectedOrder,
  activeTemplate,
  isOrderLocked,
  loading,
  errorMsg,
  successMsg,
  setSuccessMsg,
  onBackToList,
  onOpenExcelModal,
  onSyncLiveStock,
  syncingStock,
  onSaveOrderSnapshot,
  onExportCSV,
  onTerminarProyeccion,
  isEmittingOrder,
  calculatedRows,
  onGoToApprovalSummary,
  onOpenPackingPlan,
  isGeneratingPackingPlan,
  onOpenReceptions,
  metrics,
  items,
  activeMonthsInAverage,
  startMonth,
  endMonth,
  ignoreZeroMonths,
  isUpdatingMonthRange,
  onApplyMonthRange,
  onSetQuickMonthPreset,
  onOpenAddMonthModal,
  formulaBarColumn,
  setFormulaBarColumn,
  columnChips,
  onOpenEquationModal,
  selectedColumnForEquation,
  onOpenAddColumnModal,
  onOpenParamsModal,
  searchTerm,
  setSearchTerm,
  isSearchDropdownOpen,
  setIsSearchDropdownOpen,
  onLoadCatalogProductsFromDB,
  searchWrapperRef,
  matchingCatalogProducts,
  liveStockMap,
  onQuickAddProduct,
  filteredRows,
  selectedItemIds,
  onToggleSelectAll,
  onToggleSelectRow,
  onDeleteMonth,
  onCellChange,
  onResetManualAverage,
  onResetManualRound,
  onDeleteItem
}: ProjectionMatrixSubViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* 1. Barra de Navegación y Contexto de la Orden Activa */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '14px 18px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button secondary button-sm"
            onClick={onBackToList}
            title="Volver a la lista de órdenes y proyecciones"
            style={{ fontWeight: 600 }}
          >
            ← Volver a la lista de órdenes
          </button>

          {selectedOrder && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--color-brand-deep)',
                  fontFamily: 'monospace'
                }}
              >
                {selectedOrder.numero_orden}
              </span>
              <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                · {selectedOrder.descripcion || 'Planificación de abastecimiento'}
              </span>
              <span
                style={{
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--color-border)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Estado:{' '}
                {selectedOrder.estado === 'RECIBIDA'
                  ? 'Recepcionado completamente'
                  : selectedOrder.estado === 'TRANSITO'
                  ? 'Aprobado y en camino'
                  : selectedOrder.estado === 'FALTA_APROBACION'
                  ? 'Falta aprobación'
                  : 'Borrador'}
              </span>
            </div>
          )}
        </div>

        {/* Acciones Rápidas Superiores */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isOrderLocked && (
            <>
              {/* Botón para Importar Excel de Salidas */}
              <button
                type="button"
                className="button secondary"
                onClick={onOpenExcelModal}
                title="Cargar archivo Excel con salidas y consumos mensuales hacia agencias"
                style={{ fontWeight: 600, borderColor: 'var(--color-brand)', color: 'var(--color-brand)' }}
              >
                Cargar salidas de Excel
              </button>

              <button
                type="button"
                className="button secondary"
                onClick={() => void onSyncLiveStock()}
                disabled={syncingStock}
                title="Actualizar existencias actuales directamente desde las paletas e inventario físico"
              >
                {syncingStock ? 'Sincronizando...' : 'Sincronizar stock'}
              </button>

              <button
                type="button"
                className="button secondary"
                onClick={() => void onSaveOrderSnapshot()}
                title="Guardar avance del cálculo para continuar en otro momento"
              >
                Guardar cambios
              </button>
            </>
          )}

          <button
            type="button"
            className="button secondary"
            onClick={onExportCSV}
            title="Descargar matriz en formato CSV"
          >
            Exportar CSV
          </button>

          {/* Botón Terminar Proyección */}
          {!isOrderLocked && selectedOrder?.estado !== 'FALTA_APROBACION' && (
            <button
              type="button"
              className="button primary"
              onClick={() => void onTerminarProyeccion()}
              disabled={isEmittingOrder || calculatedRows.length === 0}
              title="Culminar el cálculo de la proyección y avanzar a la revisión y aprobación del resumen"
              style={{
                fontWeight: 700,
                backgroundColor: 'var(--color-brand-deep)',
                borderColor: 'var(--color-brand-deep)',
                color: '#FFFFFF',
                padding: '8px 18px',
                fontSize: '14px',
                boxShadow: 'none'
              }}
            >
              Terminar proyección
            </button>
          )}

          {/* Botón Revisar resumen y aprobar */}
          {!isOrderLocked && selectedOrder?.estado === 'FALTA_APROBACION' && (
            <button
              type="button"
              className="button primary"
              onClick={onGoToApprovalSummary}
              disabled={isEmittingOrder}
              title="Revisar cantidades proyectadas, validar recortes presupuestales y autorizar la compra"
              style={{
                fontWeight: 700,
                backgroundColor: 'var(--color-brand)',
                borderColor: 'var(--color-brand)',
                color: '#FFFFFF',
                padding: '8px 18px',
                fontSize: '14px'
              }}
            >
              Revisar resumen y aprobar
            </button>
          )}

          {/* Modo solo lectura para órdenes ya aprobadas */}
          {isOrderLocked && (
            <button
              type="button"
              className="button secondary"
              onClick={onGoToApprovalSummary}
              title="Consultar el resumen de aprobación presupuestal y decisiones tomadas"
            >
              Ver resumen de aprobación
            </button>
          )}

          {selectedOrder?.estado !== 'BORRADOR' && selectedOrder?.estado !== 'FALTA_APROBACION' && onOpenReceptions && (
            <button
              type="button"
              className="button secondary"
              onClick={onOpenReceptions}
              title="Ver estado de recepción en muelle (Módulo 04)"
            >
              Ver en recepciones
            </button>
          )}
        </div>
      </div>

      {/* Banner de Modo Solo Lectura para Órdenes Emitidas */}
      {isOrderLocked && selectedOrder && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderLeft: '4px solid var(--color-brand)',
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '15px', color: 'var(--color-brand-deep)' }}>
                Proyección aprobada — Modo solo lectura
              </strong>
              <span
                className="badge"
                style={{
                  background: 'var(--color-brand-soft)',
                  color: 'var(--color-brand)',
                  fontWeight: 600
                }}
              >
                {selectedOrder.estado === 'RECIBIDA' ? 'Recepcionado completamente' : 'Aprobado y en camino'}
              </span>
            </div>
            <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
              Esta proyección fue aprobada y emitida formalmente. Las cantidades, consumos y fórmulas se conservan congeladas para auditoría y no pueden ser modificadas.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="button secondary button-sm"
              onClick={onGoToApprovalSummary}
              title="Consultar las cantidades solicitadas vs aprobadas y motivos"
            >
              Ver resumen de aprobación
            </button>
            <button
              type="button"
              className="button primary button-sm"
              onClick={() => void onOpenPackingPlan()}
              disabled={isGeneratingPackingPlan}
              title="Consultar o descargar el Packing List oficial"
            >
              {isGeneratingPackingPlan ? 'Generando...' : 'Ver packing list / paletas'}
            </button>
            {onOpenReceptions && (
              <button
                type="button"
                className="button secondary button-sm"
                onClick={onOpenReceptions}
                title="Ver estado de recepción en muelle (Módulo 04)"
              >
                Ver en recepciones
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Mensajes informativos y de error */}
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
          {onOpenReceptions && successMsg.includes('creada con éxito') && (
            <button
              type="button"
              className="button secondary button-sm"
              onClick={onOpenReceptions}
              style={{ marginLeft: '12px' }}
            >
              Ir a Recepciones RFID
            </button>
          )}
        </div>
      )}

      {/* Aviso si la orden aún no tiene consumos mensuales cargados */}
      {(!activeTemplate?.columnas_meses || activeTemplate.columnas_meses.length === 0) && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '2px dashed var(--color-brand)',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <strong style={{ fontSize: '16px', color: 'var(--color-brand-deep)' }}>
            Esta orden no tiene consumos mensuales cargados
          </strong>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '580px' }}>
            Las órdenes nuevas inician sin datos de meses previos. Puedes agregar los meses manualmente uno a uno o cargar el archivo Excel con las salidas hacia las agencias para generar automáticamente las columnas y calcular la proyección.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {!isOrderLocked && (
              <button
                type="button"
                className="button primary"
                onClick={onOpenAddMonthModal}
                style={{ fontWeight: 600 }}
              >
                + Agregar mes
              </button>
            )}
            <button
              type="button"
              className="button secondary"
              onClick={onOpenExcelModal}
              style={{ fontWeight: 600, color: 'var(--color-brand)', borderColor: 'var(--color-brand)' }}
            >
              Cargar salidas de Excel
            </button>
          </div>
        </div>
      )}

      {/* 3. Tira de Indicadores Clave */}
      <section className="indicator-strip" aria-label="Resumen de proyecciones">
        <div className="indicator-card">
          <span className="indicator-label">Productos en la tabla</span>
          <span className="indicator-value">{loading ? '—' : items.length}</span>
          <span className="indicator-context">En la matriz activa</span>
        </div>

        <div
          className="indicator-card"
          style={{
            borderColor: metrics.criticos > 0 ? 'var(--color-danger)' : 'var(--color-border)'
          }}
        >
          <span
            className="indicator-label"
            style={{ color: metrics.criticos > 0 ? 'var(--color-danger)' : 'inherit' }}
          >
            Riesgo de quiebre
          </span>
          <span
            className="indicator-value"
            style={{ color: metrics.criticos > 0 ? 'var(--color-danger)' : 'inherit' }}
          >
            {loading ? '—' : metrics.criticos}
          </span>
          <span className="indicator-context">Productos con stock crítico</span>
        </div>

        <div className="indicator-card">
          <span className="indicator-label">Ítems a comprar</span>
          <span className="indicator-value">{loading ? '—' : metrics.sugeridos}</span>
          <span className="indicator-context">Con compra sugerida &gt; 0</span>
        </div>

        <div className="indicator-card">
          <span className="indicator-label">Total unidades sugeridas</span>
          <span className="indicator-value">
            {loading ? '—' : metrics.totalUnidadesSugeridas.toLocaleString('es-PE')}
          </span>
          <span className="indicator-context">Suma de pedidos calculados</span>
        </div>
      </section>

      {/* 4. Selector de Rango de Meses para el Promedio de Salidas */}
      <ProjectionMonthRangeBar
        activeTemplate={activeTemplate}
        activeMonthsInAverage={activeMonthsInAverage}
        startMonth={startMonth}
        endMonth={endMonth}
        ignoreZeroMonths={ignoreZeroMonths}
        isOrderLocked={isOrderLocked}
        isUpdatingMonthRange={isUpdatingMonthRange}
        onApplyMonthRange={onApplyMonthRange}
        onSetQuickMonthPreset={onSetQuickMonthPreset}
        onOpenAddMonthModal={onOpenAddMonthModal}
      />

      {/* 5. Barra de Fórmulas tipo Excel (Excel Formula Bar) */}
      <ProjectionFormulaBar
        activeTemplate={activeTemplate}
        formulaBarColumn={formulaBarColumn}
        setFormulaBarColumn={setFormulaBarColumn}
        columnChips={columnChips}
        onOpenEquationModal={onOpenEquationModal}
        onOpenAddColumnModal={onOpenAddColumnModal}
        onOpenParamsModal={onOpenParamsModal}
        isOrderLocked={isOrderLocked}
      />

      {/* 6. Barra de Búsqueda y Acciones Esenciales */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          position: 'relative'
        }}
      >
        {isOrderLocked ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              background: 'var(--color-canvas)',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              fontSize: '13px',
              color: 'var(--color-text-secondary)'
            }}
          >
            <span>Matriz congelada: no se pueden agregar ni eliminar productos de una orden emitida a tránsito.</span>
          </div>
        ) : (
          <div
            ref={searchWrapperRef}
            style={{
              position: 'relative',
              flex: 1,
              minWidth: '280px',
              maxWidth: '500px'
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Busca por nombre de producto..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setIsSearchDropdownOpen(true)
                }}
                onFocus={() => {
                  setIsSearchDropdownOpen(true)
                  void onLoadCatalogProductsFromDB()
                }}
                style={{
                  width: '100%',
                  padding: '9px 36px 9px 14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setIsSearchDropdownOpen(false)
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '2px 4px'
                  }}
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Menú flotante interactivo con productos de catálogo */}
            {isSearchDropdownOpen && searchTerm.trim().length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
                  zIndex: 60,
                  maxHeight: '340px',
                  overflowY: 'auto'
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    background: 'var(--color-canvas)',
                    borderBottom: '1px solid var(--color-border)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>Productos en base de datos ({matchingCatalogProducts.length})</span>
                  <span style={{ fontSize: '11px', fontWeight: 400 }}>Presiona Añadir para incorporar</span>
                </div>

                {matchingCatalogProducts.length > 0 ? (
                  matchingCatalogProducts.map((p) => {
                    const isAdded = items.some(
                      (it) => it.nombre_producto.toUpperCase() === p.nombre.toUpperCase()
                    )
                    return (
                      <div
                        key={p.sku || p.nombre}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          background: isAdded ? '#FAFCFD' : 'var(--color-surface)'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                            {p.nombre}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {p.sku ? `SKU: ${p.sku}` : 'En base de datos'}
                            {liveStockMap.has(p.nombre) && (
                              <span style={{ marginLeft: '8px' }}>
                                · Stock físico: {liveStockMap.get(p.nombre)?.toLocaleString('es-PE')}
                              </span>
                            )}
                          </div>
                        </div>

                        {isAdded ? (
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--color-success)',
                              padding: '4px 8px',
                              background: '#F1F8F4',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            En la proyección
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="button primary button-sm"
                            onClick={() => void onQuickAddProduct(p)}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            + Añadir
                          </button>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div style={{ padding: '16px 14px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    No se encontró ningún producto con ese nombre registrado en tu base de datos.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Checkbox para ignorar meses con consumo en 0 */}
        {!isOrderLocked && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <input
              type="checkbox"
              checked={ignoreZeroMonths}
              onChange={(e) =>
                void onApplyMonthRange(startMonth, endMonth, e.target.checked)
              }
            />
            Ignorar meses con consumo en 0 para el promedio
          </label>
        )}
      </div>

      {/* 7. MATRIZ INTERACTIVA (Grid tipo Excel con Chips de Fórmulas y Celdas Editables) */}
      <div
        className="table-wrap"
        style={{
          overflowX: 'auto',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          background: 'var(--color-surface)'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                background: 'var(--color-canvas)',
                borderBottom: '2px solid var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <th style={{ padding: '10px 8px', width: '36px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={filteredRows.length > 0 && selectedItemIds.size === filteredRows.length}
                  onChange={onToggleSelectAll}
                  title="Seleccionar todos para generar orden"
                />
              </th>
              <th style={{ padding: '10px 12px', minWidth: '220px', fontWeight: 600 }}>Producto</th>

              {/* Columnas dinámicas de meses */}
              {activeTemplate?.columnas_meses?.map((m) => {
                const isInAverage = activeMonthsInAverage.includes(m)
                return (
                  <th
                    key={m}
                    style={{
                      padding: '8px 8px',
                      minWidth: '78px',
                      textAlign: 'right',
                      fontWeight: isInAverage ? 700 : 500,
                      backgroundColor: isInAverage ? 'var(--color-brand-soft)' : 'transparent',
                      color: isInAverage ? 'var(--color-brand-deep)' : 'inherit',
                      borderTop: isInAverage ? '3px solid var(--color-brand)' : '3px solid transparent'
                    }}
                    title={
                      isInAverage
                        ? `Columna ${m}: activa para el cálculo del promedio mensual`
                        : `Columna ${m}: histórico informativo (fuera del rango de promedio)`
                    }
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      <span>{m}</span>
                      {!isOrderLocked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteMonth(m)
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            padding: '1px 3px',
                            borderRadius: '3px',
                            lineHeight: 1
                          }}
                          title={`Eliminar columna de mes ${m}`}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {isInAverage && (
                      <span
                        style={{
                          fontSize: '10px',
                          display: 'block',
                          color: 'var(--color-brand)',
                          fontWeight: 600
                        }}
                      >
                        Promedio
                      </span>
                    )}
                  </th>
                )
              })}

              {/* Promedio mensual */}
              <th
                style={{
                  padding: '8px 8px',
                  minWidth: '105px',
                  textAlign: 'right',
                  fontWeight: 600,
                  background: '#F8FAFC'
                }}
              >
                <div>Promedio</div>
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', display: 'block' }}>
                  {activeMonthsInAverage.length} mes(es)
                </span>
              </th>

              {/* Stock real */}
              <th style={{ padding: '8px 8px', minWidth: '95px', textAlign: 'right', fontWeight: 600 }}>
                <div>Stock real</div>
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', display: 'block' }}>
                  Físico actual
                </span>
              </th>

              {/* Stock mín con chip de fórmula */}
              <th
                onClick={() => onOpenEquationModal('stock_min')}
                style={{
                  padding: '8px 8px',
                  minWidth: '105px',
                  textAlign: 'right',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor:
                    selectedColumnForEquation === 'stock_min'
                      ? 'var(--color-brand-soft)'
                      : 'transparent',
                  transition: 'background-color 0.15s ease'
                }}
                title="Haz clic para modificar la ecuación de Stock Mínimo (dinámica tipo Excel)"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>Stock mín</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-brand)', fontWeight: 700 }}>fx</span>
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    border: '1px dashed var(--color-border)',
                    borderRadius: '3px',
                    padding: '1px 5px',
                    fontSize: '10px',
                    color: 'var(--color-brand)',
                    marginTop: '2px'
                  }}
                >
                  {activeTemplate?.formula_stock_min ? 'fórmula' : `× ${activeTemplate?.lead_time_meses || 3}m`}
                </div>
              </th>

              {/* Seguridad con chip de fórmula */}
              <th
                onClick={() => onOpenEquationModal('seguridad')}
                style={{
                  padding: '8px 8px',
                  minWidth: '95px',
                  textAlign: 'right',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor:
                    selectedColumnForEquation === 'seguridad'
                      ? 'var(--color-brand-soft)'
                      : 'transparent',
                  transition: 'background-color 0.15s ease'
                }}
                title="Haz clic para modificar la ecuación del Stock de Seguridad"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>Seguridad</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-brand)', fontWeight: 700 }}>fx</span>
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    border: '1px dashed var(--color-border)',
                    borderRadius: '3px',
                    padding: '1px 5px',
                    fontSize: '10px',
                    color: 'var(--color-brand)',
                    marginTop: '2px'
                  }}
                >
                  {activeTemplate?.formula_seguridad
                    ? 'fórmula'
                    : `${Math.round((activeTemplate?.seguridad_pct || 0.2) * 100)}%`}
                </div>
              </th>

              {/* Stock mín final con chip de fórmula */}
              <th
                onClick={() => onOpenEquationModal('stock_min_f')}
                style={{
                  padding: '8px 8px',
                  minWidth: '110px',
                  textAlign: 'right',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor:
                    selectedColumnForEquation === 'stock_min_f'
                      ? 'var(--color-brand-soft)'
                      : 'transparent',
                  transition: 'background-color 0.15s ease'
                }}
                title="Haz clic para modificar la ecuación de Stock Mínimo Final"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>Stock mín F</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-brand)', fontWeight: 700 }}>fx</span>
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    border: '1px dashed var(--color-border)',
                    borderRadius: '3px',
                    padding: '1px 5px',
                    fontSize: '10px',
                    color: 'var(--color-brand)',
                    marginTop: '2px'
                  }}
                >
                  {activeTemplate?.formula_stock_min_f ? 'fórmula' : 'Mín + Seg'}
                </div>
              </th>

              {/* Redondeado editable */}
              <th
                onClick={() => onOpenEquationModal('stock_min_redondeado')}
                style={{
                  padding: '8px 8px',
                  minWidth: '105px',
                  textAlign: 'right',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor:
                    selectedColumnForEquation === 'stock_min_redondeado'
                      ? 'var(--color-brand-soft)'
                      : 'transparent',
                  transition: 'background-color 0.15s ease'
                }}
                title="Haz clic para modificar la ecuación del Stock Redondeado"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>Redondeado</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-brand)', fontWeight: 700 }}>fx</span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', display: 'block' }}>
                  Manual / Lote
                </span>
              </th>

              {/* Columnas personalizadas añadidas dinámicamente */}
              {activeTemplate?.columnas_personalizadas?.map((col) => (
                <th
                  key={col.id}
                  onClick={() => onOpenEquationModal(col.id)}
                  style={{
                    padding: '8px 8px',
                    minWidth: '115px',
                    textAlign: 'right',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor:
                      selectedColumnForEquation === col.id ? 'var(--color-brand-soft)' : '#FAF5FF',
                    borderTop: '3px solid #8B5CF6'
                  }}
                  title={`Columna dinámica: ${col.nombre} (${col.formula}). Clic para editar fórmula.`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    <span style={{ color: '#6D28D9' }}>{col.nombre}</span>
                    <span style={{ fontSize: '10px', color: '#8B5CF6', fontWeight: 700 }}>fx</span>
                  </div>
                  <div
                    style={{
                      display: 'inline-block',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      color: '#7C3AED',
                      maxWidth: '90px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    ={col.codigo_variable}
                  </div>
                </th>
              ))}

              {/* Compra sugerida */}
              <th
                onClick={() => onOpenEquationModal('compra_sugerida')}
                style={{
                  padding: '8px 8px',
                  minWidth: '120px',
                  textAlign: 'right',
                  fontWeight: 700,
                  background: 'var(--color-brand-soft)',
                  color: 'var(--color-brand-deep)',
                  cursor: 'pointer'
                }}
                title="Haz clic para modificar la fórmula de Compra Sugerida"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>Compra</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-brand)', fontWeight: 700 }}>fx</span>
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    border: '1px solid rgba(22, 125, 141, 0.3)',
                    borderRadius: '3px',
                    padding: '1px 5px',
                    fontSize: '10px',
                    color: 'var(--color-brand-deep)',
                    marginTop: '2px',
                    background: '#FFFFFF'
                  }}
                >
                  {activeTemplate?.formula_compra_sugerida
                    ? 'fórmula'
                    : `× ${activeTemplate?.factor_compra || 2}`}
                </div>
              </th>

              {/* Meses de duración */}
              <th
                onClick={() => onOpenEquationModal('meses_duracion')}
                style={{
                  padding: '8px 8px',
                  minWidth: '100px',
                  textAlign: 'right',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Haz clic para modificar la fórmula de Duración en meses"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>Duración</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-brand)', fontWeight: 700 }}>fx</span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', display: 'block' }}>
                  Meses stock
                </span>
              </th>

              {/* Acciones de fila */}
              <th style={{ padding: '8px 8px', width: '60px', textAlign: 'center' }}>
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={10 + (activeTemplate?.columnas_meses?.length || 0) + (activeTemplate?.columnas_personalizadas?.length || 0)}
                  style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-secondary)' }}
                >
                  {items.length === 0
                    ? 'No hay productos en esta plantilla. Agrega uno o carga salidas desde Excel.'
                    : 'No se encontraron productos coincidentes con el filtro de búsqueda.'}
                </td>
              </tr>
            ) : (
              filteredRows.map((r, rowIdx) => {
                const isSelected = selectedItemIds.has(r.id_item)
                const isCritico = r.dias_duracion <= 45
                const badgeColor =
                  r.dias_duracion <= 15
                    ? 'var(--color-danger)'
                    : r.dias_duracion <= 45
                    ? 'var(--color-warning)'
                    : 'var(--color-success)'

                return (
                  <tr
                    key={r.id_item}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: isSelected
                        ? 'var(--color-brand-soft)'
                        : rowIdx % 2 === 0
                        ? 'var(--color-surface)'
                        : '#FCFDFE',
                      transition: 'background-color 0.12s ease'
                    }}
                  >
                    {/* Checkbox de selección */}
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectRow(r.id_item)}
                        title="Seleccionar fila"
                      />
                    </td>

                    {/* Nombre del producto */}
                    <td style={{ padding: '6px 12px' }}>
                      <strong style={{ display: 'block', color: 'var(--color-text-primary)' }}>
                        {r.nombre_producto}
                      </strong>
                      <span className="muted" style={{ fontSize: '11px' }}>
                        Ítem #{r.id_item}
                      </span>
                    </td>

                    {/* Columnas dinámicas de meses (editables) */}
                    {activeTemplate?.columnas_meses?.map((m) => {
                      const val = r.meses_consumo[m] ?? 0
                      const isInAverage = activeMonthsInAverage.includes(m)
                      return (
                        <td
                          key={m}
                          style={{
                            padding: '4px 6px',
                            textAlign: 'right',
                            backgroundColor: isInAverage ? 'rgba(22, 125, 141, 0.04)' : 'transparent'
                          }}
                        >
                          {!isOrderLocked ? (
                            <input
                              type="number"
                              min="0"
                              value={val}
                              onChange={(e) => onCellChange(r.id_item, `mes_${m}`, e.target.value)}
                              style={{
                                width: '100%',
                                maxWidth: '74px',
                                textAlign: 'right',
                                padding: '4px 6px',
                                border: '1px solid transparent',
                                borderRadius: '4px',
                                background: 'transparent',
                                fontFamily: 'var(--font-body)',
                                fontSize: '13px',
                                fontWeight: isInAverage ? 600 : 400
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'var(--color-brand)'
                                e.currentTarget.style.background = '#FFFFFF'
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'transparent'
                                e.currentTarget.style.background = 'transparent'
                              }}
                            />
                          ) : (
                            <span style={{ padding: '4px 6px', display: 'inline-block' }}>
                              {val.toLocaleString('es-PE')}
                            </span>
                          )}
                        </td>
                      )
                    })}

                    {/* Promedio mensual */}
                    <td style={{ padding: '6px 8px', textAlign: 'right', background: '#F8FAFC' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{r.promedio_final.toLocaleString('es-PE')}</span>
                        {r.promedio_manual !== null && !isOrderLocked && (
                          <button
                            type="button"
                            onClick={() => onResetManualAverage(r.id_item)}
                            title="Restaurar a promedio automático calculado de los meses"
                            style={{
                              border: 'none',
                              background: 'none',
                              color: 'var(--color-text-secondary)',
                              cursor: 'pointer',
                              fontSize: '11px',
                              padding: '0 2px'
                            }}
                          >
                            ↺
                          </button>
                        )}
                      </div>
                      {r.promedio_manual !== null && (
                        <span style={{ fontSize: '10px', color: 'var(--color-warning)', display: 'block' }}>
                          Manual
                        </span>
                      )}
                    </td>

                    {/* Stock real */}
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                      {!isOrderLocked ? (
                        <input
                          type="number"
                          min="0"
                          value={r.stock_real}
                          onChange={(e) => onCellChange(r.id_item, 'stock_real', e.target.value)}
                          style={{
                            width: '100%',
                            maxWidth: '85px',
                            textAlign: 'right',
                            padding: '4px 6px',
                            border: '1px solid transparent',
                            borderRadius: '4px',
                            background: 'transparent',
                            fontFamily: 'var(--font-body)',
                            fontSize: '13px',
                            fontWeight: 600
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-brand)'
                            e.currentTarget.style.background = '#FFFFFF'
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'transparent'
                            e.currentTarget.style.background = 'transparent'
                          }}
                        />
                      ) : (
                        <span style={{ padding: '4px 6px', display: 'inline-block', fontWeight: 600 }}>
                          {r.stock_real.toLocaleString('es-PE')}
                        </span>
                      )}
                    </td>

                    {/* Stock mín */}
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                      {r.stock_min.toLocaleString('es-PE')}
                    </td>

                    {/* Seguridad */}
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                      {r.seguridad.toLocaleString('es-PE')}
                    </td>

                    {/* Stock mín F */}
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                      {r.stock_min_f.toLocaleString('es-PE')}
                    </td>

                    {/* Stock redondeado */}
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                      {!isOrderLocked ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                          <input
                            type="number"
                            min="0"
                            value={r.stock_min_redondeado}
                            onChange={(e) =>
                              onCellChange(r.id_item, 'stock_min_redondeado_manual', e.target.value)
                            }
                            style={{
                              width: '100%',
                              maxWidth: '85px',
                              textAlign: 'right',
                              padding: '4px 6px',
                              border: r.stock_min_redondeado_manual !== null
                                ? '1px solid var(--color-warning)'
                                : '1px solid transparent',
                              borderRadius: '4px',
                              background: r.stock_min_redondeado_manual !== null ? '#FEFCE8' : 'transparent',
                              fontFamily: 'var(--font-body)',
                              fontSize: '13px',
                              fontWeight: 600
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = 'var(--color-brand)'
                              e.currentTarget.style.background = '#FFFFFF'
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor =
                                r.stock_min_redondeado_manual !== null
                                  ? 'var(--color-warning)'
                                  : 'transparent'
                              e.currentTarget.style.background =
                                r.stock_min_redondeado_manual !== null ? '#FEFCE8' : 'transparent'
                            }}
                          />
                          {r.stock_min_redondeado_manual !== null && (
                            <button
                              type="button"
                              onClick={() => onResetManualRound(r.id_item)}
                              title="Restaurar al valor calculado automáticamente"
                              style={{
                                border: 'none',
                                background: 'none',
                                color: 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                fontSize: '11px',
                                padding: '0 2px'
                              }}
                            >
                              ↺
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ padding: '4px 6px', display: 'inline-block', fontWeight: 600 }}>
                          {r.stock_min_redondeado.toLocaleString('es-PE')}
                        </span>
                      )}
                    </td>

                    {/* Celdas de columnas personalizadas */}
                    {activeTemplate?.columnas_personalizadas?.map((col) => {
                      const val = r.columnas_personalizadas_valores?.[col.id] ?? 0
                      return (
                        <td
                          key={col.id}
                          style={{
                            padding: '6px 8px',
                            textAlign: 'right',
                            fontFamily: col.formato === 'moneda_pen' || col.formato === 'moneda_usd' ? 'var(--font-body)' : 'inherit',
                            fontWeight: 600,
                            color: '#6D28D9',
                            background: 'rgba(139, 92, 246, 0.04)'
                          }}
                        >
                          {formatCustomColumnValue(val, col.formato)}
                        </td>
                      )
                    })}

                    {/* Compra sugerida */}
                    <td
                      style={{
                        padding: '6px 8px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: r.compra_sugerida > 0 ? 'var(--color-brand-deep)' : 'var(--color-text-secondary)',
                        background: r.compra_sugerida > 0 ? 'var(--color-brand-soft)' : 'transparent'
                      }}
                    >
                      {r.compra_sugerida.toLocaleString('es-PE')}
                    </td>

                    {/* Meses de duración */}
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: badgeColor }}>
                        {r.meses_duracion} m
                      </div>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '11px',
                          color: badgeColor,
                          fontWeight: 500
                        }}
                      >
                        Vence: {r.fecha_quiebre}
                      </span>
                    </td>

                    {/* Botón de eliminar fila */}
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                      {!isOrderLocked ? (
                        <button
                          type="button"
                          onClick={() => void onDeleteItem(r.id_item, r.nombre_producto)}
                          title="Eliminar producto de la matriz"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-danger)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: '4px'
                          }}
                        >
                          Eliminar
                        </button>
                      ) : (
                        <span className="muted" style={{ fontSize: '11px' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
