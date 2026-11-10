import { useState, useMemo } from 'react'
import type { ImportOrder, ImportOrderDetail, OrderReceptionState } from '../../types/receptions'
import type { WarehouseOption } from '../../services/receptionService'
import type { OrderPackingPlan, PalletTagItem } from '../../services/packingListService'
import { PalletStickerModal, type PalletStickerData } from '../../components/PalletStickerModal'

interface Props {
  order: ImportOrder
  warehouse?: WarehouseOption | null
  orderDetail: ImportOrderDetail
  receptionState: OrderReceptionState
  packingPlan: OrderPackingPlan | null
  onConfirmPallet: (payload: {
    uid_tag: string
    tipo: 'COMPLETO' | 'PUCHO'
    cajas: number
    unidades: number
    codigo_barras?: string
  }) => Promise<void>
  onBack: () => void
}

export function ProductReceptionView({
  order,
  warehouse,
  orderDetail,
  receptionState,
  packingPlan,
  onConfirmPallet,
  onBack
}: Props) {
  const product = orderDetail.producto
  const regla = product?.regla_empaque
  const unidadesPorCaja = regla?.unidades_por_caja || 50
  const cajasPorPaleta = regla?.cajas_por_paleta || 40

  const isOrderLiquidated = order.estado === 'RECIBIDA' || receptionState.estado_recepcion === 'LIQUIDADA'

  // 1. Obtener códigos separados específicos para este producto
  const productPlan = useMemo(() => {
    if (!packingPlan?.productos) return null
    return packingPlan.productos.find((p) => p.id_producto === orderDetail.id_producto) || null
  }, [packingPlan, orderDetail.id_producto])

  const productSeparatedTags: PalletTagItem[] = useMemo(() => {
    return productPlan?.paletas || []
  }, [productPlan])

  const contingencyTags: PalletTagItem[] = useMemo(() => {
    return packingPlan?.etiquetas_reserva || []
  }, [packingPlan])

  // Conjunto de códigos ya utilizados en esta orden
  const usedTagsSet = useMemo(() => {
    return new Set(receptionState.paletas_recibidas.map((p) => p.uid_tag.trim().toUpperCase()))
  }, [receptionState.paletas_recibidas])

  // Paletas recepcionadas específicamente para este producto
  const receivedForThisProduct = useMemo(() => {
    return receptionState.paletas_recibidas.filter((p) => p.id_producto === orderDetail.id_producto)
  }, [receptionState.paletas_recibidas, orderDetail.id_producto])

  // Códigos pendientes disponibles para este producto
  const availableProductTags = useMemo(() => {
    return productSeparatedTags.filter((t) => !usedTagsSet.has(t.uid_tag.trim().toUpperCase()))
  }, [productSeparatedTags, usedTagsSet])

  // Etiquetas de reserva aún disponibles
  const availableContingencyTags = useMemo(() => {
    return contingencyTags.filter((t) => !usedTagsSet.has(t.uid_tag.trim().toUpperCase()))
  }, [contingencyTags, usedTagsSet])

  // 2. Estado del formulario de ingreso de paleta
  const [selectedTagValue, setSelectedTagValue] = useState<string>('')
  const [manualScanInput, setManualScanInput] = useState<string>('')
  const [loadType, setLoadType] = useState<'COMPLETO' | 'PUCHO'>('COMPLETO')
  const [puchoBoxes, setPuchoBoxes] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [selectedSticker, setSelectedSticker] = useState<PalletStickerData | null>(null)

  // Abrir vista previa e impresión de sticker térmico de la paleta
  const handleOpenSticker = (p: {
    uid_tag: string
    cajas: number
    unidades: number
    fecha_hora?: string
  }) => {
    const pesoCaja = regla?.peso_caja_kg || 0
    const pesoTotal = pesoCaja > 0 ? p.cajas * pesoCaja + 25 : null

    setSelectedSticker({
      almacenNombre: warehouse?.nombre || 'ALMACÉN GENERAL',
      empresa: 'SHALOM',
      tagRfid: p.uid_tag,
      ordenNumero: order.numero_orden,
      sku: product?.sku || '',
      productoNombre: product?.nombre || '',
      cajas: p.cajas,
      unidades: p.unidades,
      cajasPorCamada: regla?.cajas_por_camada,
      camadas: regla?.numero_camadas,
      pesoTotalKg: pesoTotal,
      pareto: product?.clasificacion_abc || 'B',
      fecha: p.fecha_hora || order.fecha_emision
    })
  }

  // Código activo a validar (ya sea del desplegable o del input)
  const activeCodeToValidate = (manualScanInput.trim() || selectedTagValue.trim()).toUpperCase()

  // Validación estricta del código
  const codeValidation = useMemo(() => {
    if (!activeCodeToValidate) return null

    // ¿Ya fue usado?
    if (usedTagsSet.has(activeCodeToValidate)) {
      return {
        valid: false,
        reason: `El código [${activeCodeToValidate}] ya fue utilizado y recepcionado en esta orden. No se puede reutilizar.`
      }
    }

    // ¿Es un código separado para este producto?
    const isProductSeparated = productSeparatedTags.some(
      (t) => t.uid_tag.trim().toUpperCase() === activeCodeToValidate
    )
    if (isProductSeparated) {
      return {
        valid: true,
        type: 'SEPARADO_PRODUCTO' as const,
        label: 'Código reservado oficial para este producto'
      }
    }

    // ¿Es un código de contingencia/reserva de muelle?
    const isContingency = contingencyTags.some(
      (t) => t.uid_tag.trim().toUpperCase() === activeCodeToValidate
    )
    if (isContingency) {
      return {
        valid: true,
        type: 'CONTINGENCIA' as const,
        label: 'Etiqueta de reserva para excedentes de muelle'
      }
    }

    // Si no está en ninguno: BLOQUEO ESTRICTO
    return {
      valid: false,
      reason: `El código [${activeCodeToValidate}] no pertenece a los códigos separados para este producto ni a las etiquetas de reserva de esta orden.`
    }
  }, [activeCodeToValidate, usedTagsSet, productSeparatedTags, contingencyTags])

  // Al elegir del desplegable de códigos pendientes
  const handleSelectDropdownCode = (val: string) => {
    setSelectedTagValue(val)
    setManualScanInput(val)
    setFormError(null)

    // Auto-completar tipo de carga y cajas teóricas si es un código conocido
    const foundProdTag = productSeparatedTags.find((t) => t.uid_tag.trim().toUpperCase() === val.toUpperCase())
    if (foundProdTag) {
      if (foundProdTag.tipo === 'PUCHO') {
        setLoadType('PUCHO')
        setPuchoBoxes(foundProdTag.cajas > 0 ? foundProdTag.cajas : 1)
      } else {
        setLoadType('COMPLETO')
        setPuchoBoxes(cajasPorPaleta)
      }
    }
  }

  // Manejar cambio en input de escaneo / pistola
  const handleManualInputChange = (val: string) => {
    setManualScanInput(val)
    setSelectedTagValue(val)
    setFormError(null)

    const clean = val.trim().toUpperCase()
    const foundProdTag = productSeparatedTags.find((t) => t.uid_tag.trim().toUpperCase() === clean)
    if (foundProdTag) {
      if (foundProdTag.tipo === 'PUCHO') {
        setLoadType('PUCHO')
        setPuchoBoxes(foundProdTag.cajas > 0 ? foundProdTag.cajas : 1)
      } else {
        setLoadType('COMPLETO')
        setPuchoBoxes(cajasPorPaleta)
      }
    }
  }

  // Confirmar y recepcionar la paleta
  const handleConfirmSubmit = async () => {
    setFormError(null)
    setFormSuccess(null)

    if (!activeCodeToValidate) {
      setFormError('Por favor selecciona o escanea un código de paleta.')
      return
    }

    if (!codeValidation || !codeValidation.valid) {
      setFormError(codeValidation?.reason || 'Código no válido para la recepción.')
      return
    }

    const calculatedBoxes = loadType === 'COMPLETO' ? cajasPorPaleta : puchoBoxes
    if (calculatedBoxes <= 0) {
      setFormError('La cantidad de cajas debe ser mayor a cero.')
      return
    }

    const calculatedUnits = calculatedBoxes * unidadesPorCaja

    setIsSubmitting(true)
    try {
      await onConfirmPallet({
        uid_tag: activeCodeToValidate,
        tipo: loadType,
        cajas: calculatedBoxes,
        unidades: calculatedUnits
      })

      setFormSuccess(
        `Paleta [${activeCodeToValidate}] recepcionada con éxito (${calculatedBoxes} cajas / ${calculatedUnits.toLocaleString('es-PE')} unid) e ingresada al almacén.`
      )
      // Limpiar selección para la siguiente paleta
      setSelectedTagValue('')
      setManualScanInput('')
      setLoadType('COMPLETO')
      setPuchoBoxes(1)
    } catch (err: any) {
      setFormError(err.message || 'Error al recepcionar la paleta en el sistema.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Métricas acumuladas del producto
  const projectedUnits = Number(orderDetail.cantidad_pedida) || 0
  const receivedUnits = receivedForThisProduct.reduce((acc, p) => acc + p.unidades, 0)
  const receivedBoxes = receivedForThisProduct.reduce((acc, p) => acc + p.cajas, 0)
  const diferenciaUnits = receivedUnits - projectedUnits
  const pct = projectedUnits > 0 ? Math.min(100, Math.round((receivedUnits / projectedUnits) * 100)) : 0
  const liberatedTagsForProduct = productSeparatedTags.filter((t) => !usedTagsSet.has(t.uid_tag.trim().toUpperCase()))
  const firstPalletDate = receivedForThisProduct[0]?.fecha_hora || receptionState.fecha_liquidacion || 'Fecha registrada en muelle'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Barra de Navegación y Título */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--color-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="button secondary"
            onClick={onBack}
            style={{ fontSize: '13px', padding: '6px 12px' }}
          >
            ← Volver a la orden {order.numero_orden}
          </button>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-brand)' }}>
              {isOrderLiquidated ? 'Ficha de auditoría por SKU' : 'Recepción individual por SKU'} · Orden {order.numero_orden}
            </span>
            <h1 className="page-title" style={{ margin: '2px 0 0 0', fontSize: '20px', color: 'var(--color-brand-deep)' }}>
              [{product?.sku}] {product?.nombre}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isOrderLiquidated ? (
            <span
              style={{
                background: '#EAF5ED',
                color: 'var(--color-success)',
                border: '1px solid var(--color-border)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              Recepción liquidada · Solo lectura
            </span>
          ) : (
            <span
              style={{
                background: 'var(--color-canvas)',
                border: '1px solid var(--color-border)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              Contenedor activo: <strong style={{ color: 'var(--color-brand-deep)' }}>{receptionState.numero_contenedor_seleccionado || 'No asignado'}</strong>
            </span>
          )}
        </div>
      </div>

      {/* MODO A: ORDEN LIQUIDADA (Vistas de Resumen y Auditoría Inmutable) */}
      {isOrderLiquidated ? (
        <>
          {/* Panel 1: Balance Final de Liquidación del Producto */}
          <div
            className="panel"
            style={{
              padding: '20px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                  Resumen de recepción del SKU
                </span>
                <h2 className="section-title" style={{ margin: '2px 0 0 0', fontSize: '16px', color: 'var(--color-brand-deep)' }}>
                  1. Balance final de liquidación del producto
                </h2>
              </div>
              <span
                style={{
                  background: diferenciaUnits === 0 ? '#EAF5ED' : diferenciaUnits < 0 ? '#FFF8E6' : '#E4F1F3',
                  color: diferenciaUnits === 0 ? 'var(--color-success)' : diferenciaUnits < 0 ? 'var(--color-warning)' : 'var(--color-brand)',
                  fontWeight: 700,
                  fontSize: '12px',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)'
                }}
              >
                {diferenciaUnits === 0
                  ? '✓ Ingreso completo y conforme (100%)'
                  : diferenciaUnits < 0
                  ? `⚠ Faltante de ${Math.abs(diferenciaUnits).toLocaleString('es-PE')} unid`
                  : `+ Excedente de +${diferenciaUnits.toLocaleString('es-PE')} unid`}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--color-canvas)', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Cantidad proyectada
                </span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  {projectedUnits.toLocaleString('es-PE')} unid
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  {Math.ceil(projectedUnits / unidadesPorCaja)} cajas teóricas
                </span>
              </div>

              <div style={{ background: 'var(--color-canvas)', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Cantidad recepcionada
                </span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-brand-deep)', marginTop: '2px' }}>
                  {receivedUnits.toLocaleString('es-PE')} unid
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  {receivedBoxes} cajas ({receivedForThisProduct.length} paletas físicas)
                </span>
              </div>

              <div style={{ background: 'var(--color-canvas)', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Diferencia física
                </span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: diferenciaUnits === 0 ? 'var(--color-success)' : 'var(--color-danger)', marginTop: '2px' }}>
                  {diferenciaUnits === 0 ? '0 unidades' : diferenciaUnits > 0 ? `+${diferenciaUnits.toLocaleString('es-PE')} unid` : `${diferenciaUnits.toLocaleString('es-PE')} unid`}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  {diferenciaUnits === 0 ? 'Sin discrepancias' : diferenciaUnits < 0 ? 'Mercadería no embarcada por proveedor' : 'Carga adicional recibida'}
                </span>
              </div>

              <div style={{ background: 'var(--color-canvas)', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Cumplimiento
                </span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: pct === 100 ? 'var(--color-success)' : 'var(--color-warning)', marginTop: '2px' }}>
                  {pct}%
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  {pct >= 100 ? 'Meta cumplida' : 'Entrega parcial'}
                </span>
              </div>
            </div>
          </div>

          {/* Panel 2: Trazabilidad de Descarga y Logística */}
          <div
            className="panel"
            style={{
              padding: '20px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px'
            }}
          >
            <h2 className="section-title" style={{ margin: '0 0 14px 0', fontSize: '16px', color: 'var(--color-brand-deep)' }}>
              2. Trazabilidad de descarga y logística
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Contenedor de arribo
                </span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  {receptionState.numero_contenedor_seleccionado || 'General'}
                </div>
                {receptionState.placa_camion_seleccionado && (
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Placa camión: {receptionState.placa_camion_seleccionado}
                  </span>
                )}
              </div>

              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Ubicación física actual
                </span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-brand)', marginTop: '2px' }}>
                  [{warehouse?.prefijo_rfid || 'IMP'}] {warehouse?.nombre || 'Almacén Principal'}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Celda: ALM-CAMPO (Zona Campo)
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Fecha y hora de descarga
                </span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  {firstPalletDate}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Verificado en garita y muelle
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Regla de empaque
                </span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  {unidadesPorCaja} unid/caja · {cajasPorPaleta} cajas/pal
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {(unidadesPorCaja * cajasPorPaleta).toLocaleString('es-PE')} unid/paleta estándar
                </span>
              </div>
            </div>
          </div>

          {/* Panel 3: Estado de Códigos Correlativos del Producto */}
          <div
            className="panel"
            style={{
              padding: '20px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px'
            }}
          >
            <h2 className="section-title" style={{ margin: '0 0 14px 0', fontSize: '16px', color: 'var(--color-brand-deep)' }}>
              3. Estado de los códigos correlativos de este producto
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Códigos activos en almacén ({receivedForThisProduct.length}):
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {receivedForThisProduct.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Ninguno</span>
                  ) : (
                    receivedForThisProduct.map((p) => (
                      <span
                        key={p.uid_tag}
                        style={{
                          background: 'var(--color-brand-soft)',
                          color: 'var(--color-brand)',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: '1px solid var(--color-border)',
                          fontSize: '12px'
                        }}
                      >
                        {p.uid_tag} · {p.tipo === 'PUCHO' ? `Pucho (${p.cajas} cajas)` : `Paleta completa (${p.cajas} cajas)`}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Códigos no utilizados / liberados:
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {liberatedTagsForProduct.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 500 }}>
                      ✓ Ninguno (se utilizaron todos los códigos previstos para este SKU).
                    </span>
                  ) : (
                    liberatedTagsForProduct.map((t) => (
                      <span
                        key={t.uid_tag}
                        style={{
                          background: 'rgba(188, 121, 31, 0.1)',
                          color: 'var(--color-warning)',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: '1px solid rgba(188, 121, 31, 0.3)',
                          fontSize: '12px'
                        }}
                      >
                        ⛔ {t.uid_tag} (Liberado por faltante de proveedor)
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* MODO B: DESCARGA ACTIVA (Formulario de Ingreso y Registro de Paleta) */
        <>
          {/* 2. Tarjeta de Datos Generales y Resumen de Avance */}
          <div
            className="panel"
            style={{
              padding: '16px 20px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Factor de empaque
                </span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  {unidadesPorCaja} unid/caja · {cajasPorPaleta} cajas/pal
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Cantidad proyectada
                </span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  {projectedUnits.toLocaleString('es-PE')} unid
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                    {' '}({Math.ceil(projectedUnits / unidadesPorCaja)} cajas)
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Recepcionado físicamente
                </span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-brand-deep)', marginTop: '2px' }}>
                  {receivedUnits.toLocaleString('es-PE')} unid
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                    {' '}({receivedBoxes} cajas, {receivedForThisProduct.length} paletas)
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Códigos reservados disponibles
                </span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-brand)', marginTop: '2px' }}>
                  {availableProductTags.length} de {productSeparatedTags.length} pendientes
                </div>
              </div>
            </div>

            {/* Barra de Progreso */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Avance físico de recepción</span>
                <span style={{ color: pct === 100 ? 'var(--color-success)' : 'var(--color-brand)' }}>{pct}%</span>
              </div>
              <div style={{ height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: pct === 100 ? 'var(--color-success)' : 'var(--color-brand)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3. Formulario de Asignación de Códigos de Paleta */}
          <div
            className="panel"
            style={{
              padding: '20px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px'
            }}
          >
            <div>
              <h2 className="section-title" style={{ margin: 0, fontSize: '16px', color: 'var(--color-brand-deep)' }}>
                Asignar código de paleta (Solo códigos previamente separados)
              </h2>
              <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                Selecciona un código reservado del desplegable o dispara la pistola RFID. Una vez asignado el código a la paleta física, se dará de alta en el inventario y se retirará de las opciones disponibles.
              </p>
            </div>

            {/* Mensajes de Alerta */}
            {formError && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: '#FDF2F0',
                  border: '1px solid var(--color-danger)',
                  color: 'var(--color-danger)',
                  fontSize: '13px'
                }}
              >
                ⛔ {formError}
              </div>
            )}

            {formSuccess && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: '#EAF5ED',
                  border: '1px solid var(--color-success)',
                  color: 'var(--color-success)',
                  fontSize: '13px'
                }}
              >
                ✓ {formSuccess}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
              {/* Opción A: Desplegable de códigos pendientes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  1. Seleccionar código reservado pendiente:
                </label>
                <select
                  value={selectedTagValue}
                  onChange={(e) => handleSelectDropdownCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">-- Elige un código reservado --</option>
                  {availableProductTags.length > 0 && (
                    <optgroup label={`Códigos reservados para este producto (${availableProductTags.length} pendientes)`}>
                      {availableProductTags.map((t) => (
                        <option key={t.uid_tag} value={t.uid_tag}>
                          {t.uid_tag} · {t.tipo === 'PUCHO' ? `Pucho (${t.cajas} cajas)` : `Paleta completa (${t.cajas} cajas)`}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {availableContingencyTags.length > 0 && (
                    <optgroup label={`Etiquetas de contingencia / Reserva muelle (${availableContingencyTags.length} disponibles)`}>
                      {availableContingencyTags.map((t) => (
                        <option key={t.uid_tag} value={t.uid_tag}>
                          {t.uid_tag} · Reserva de muelle para excedente
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {availableProductTags.length === 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>
                    Todos los códigos reservados para este producto ya han sido utilizados.
                  </span>
                )}
              </div>

              {/* Opción B: Disparo por Pistola RFID / Código de Barras */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  2. O disparar con pistola RFID / Lector de barras:
                </label>
                <input
                  type="text"
                  placeholder="Escanear o tipear tag (ej. IMP00001)..."
                  value={manualScanInput}
                  onChange={(e) => handleManualInputChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: `1px solid ${
                      codeValidation
                        ? codeValidation.valid
                          ? 'var(--color-success)'
                          : 'var(--color-danger)'
                        : 'var(--color-border)'
                    }`,
                    background: 'var(--color-surface)',
                    boxSizing: 'border-box'
                  }}
                />
                {codeValidation && (
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      marginTop: '4px',
                      color: codeValidation.valid ? 'var(--color-success)' : 'var(--color-danger)'
                    }}
                  >
                    {codeValidation.valid ? `✓ ${codeValidation.label}` : `⛔ ${codeValidation.reason}`}
                  </div>
                )}
              </div>
            </div>

            {/* Carga: Completa vs Pucho */}
            <div
              style={{
                marginTop: '16px',
                padding: '14px',
                background: 'var(--color-canvas)',
                borderRadius: '6px',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="loadType"
                    checked={loadType === 'COMPLETO'}
                    onChange={() => setLoadType('COMPLETO')}
                  />
                  Paleta completa ({cajasPorPaleta} cajas / {(cajasPorPaleta * unidadesPorCaja).toLocaleString('es-PE')} unid)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="loadType"
                    checked={loadType === 'PUCHO'}
                    onChange={() => setLoadType('PUCHO')}
                  />
                  Pucho suelto
                </label>

                {loadType === 'PUCHO' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cajas físicas:</span>
                    <input
                      type="number"
                      min={1}
                      max={cajasPorPaleta - 1}
                      value={puchoBoxes}
                      onChange={(e) => setPuchoBoxes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      style={{
                        width: '70px',
                        padding: '5px 8px',
                        fontSize: '13px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-border)',
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--color-brand)', fontWeight: 600 }}>
                      = {(puchoBoxes * unidadesPorCaja).toLocaleString('es-PE')} unid
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Botón de Confirmación */}
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="button primary"
                onClick={handleConfirmSubmit}
                disabled={!codeValidation || !codeValidation.valid || isSubmitting}
                style={{ padding: '9px 24px', fontSize: '13px', fontWeight: 600 }}
              >
                {isSubmitting ? 'Registrando paleta...' : 'Confirmar y recepcionar paleta'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 4. Tabla de Historial de Paletas Recepcionadas para este Producto */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, fontSize: '16px', color: 'var(--color-brand-deep)' }}>
            Historial de paletas recepcionadas para este producto ({receivedForThisProduct.length})
          </h2>
          <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
            Los códigos listados aquí ya fueron utilizados en muelle, quedaron registrados con el contenedor y se retiraron de la lista de pendientes.
          </p>
        </div>

        <div className="table-wrap" style={{ margin: 0 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Código RFID / Tag</th>
                <th>Tipo de paleta</th>
                <th style={{ textAlign: 'right' }}>Cajas</th>
                <th style={{ textAlign: 'right' }}>Unidades</th>
                <th>Contenedor</th>
                <th>Fecha y hora</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Sticker</th>
              </tr>
            </thead>
            <tbody>
              {receivedForThisProduct.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                    No hay paletas recepcionadas aún para este producto.
                  </td>
                </tr>
              ) : (
                receivedForThisProduct.map((p, idx) => (
                  <tr key={p.uid_tag + idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <span
                        style={{
                          background: 'var(--color-brand-soft)',
                          color: 'var(--color-brand)',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}
                      >
                        {p.uid_tag}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {p.tipo === 'PUCHO' ? 'Pucho suelto' : 'Paleta completa'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                      {p.cajas} cajas
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-brand-deep)' }}>
                      {p.unidades.toLocaleString('es-PE')} unid
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {p.numero_contenedor || 'General'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {p.fecha_hora}
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-brand)' }}>
                        ALM-CAMPO
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          background: '#EAF5ED',
                          color: 'var(--color-success)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}
                      >
                        En almacén
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="button secondary button-sm"
                        onClick={() => handleOpenSticker(p)}
                        style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 600 }}
                        title="Ver e imprimir etiqueta térmica de esta paleta"
                      >
                        Imprimir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Botón inferior si la orden está liquidada */}
        {isOrderLiquidated && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button
              type="button"
              className="button secondary"
              onClick={onBack}
              style={{ fontWeight: 600, padding: '8px 18px' }}
            >
              ← Volver al resumen de la orden
            </button>
          </div>
        )}
      </div>

      {/* Modal de Etiqueta Térmica de Paleta */}
      <PalletStickerModal
        isOpen={!!selectedSticker}
        onClose={() => setSelectedSticker(null)}
        data={selectedSticker}
      />
    </div>
  )
}
