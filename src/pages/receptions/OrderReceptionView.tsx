import { useState, useMemo } from 'react'
import type { ImportOrder, OrderReceptionState } from '../../types/receptions'
import type { WarehouseOption } from '../../services/receptionService'
import type { ContainerRecord } from '../../types/containers'
import type { OrderPackingPlan } from '../../services/packingListService'

interface Props {
  order: ImportOrder
  warehouse: WarehouseOption | null
  activeContainers: ContainerRecord[]
  receptionState: OrderReceptionState
  packingPlan: OrderPackingPlan | null
  onSaveContainer: (containerId: number, containerNumber: string, truckPlate: string) => void
  onSelectProduct: (productId: number) => void
  onGoToLiquidation: () => void
  onBack: () => void
}

export function OrderReceptionView({
  order,
  warehouse,
  activeContainers,
  receptionState,
  packingPlan,
  onSaveContainer,
  onSelectProduct,
  onGoToLiquidation,
  onBack
}: Props) {
  const [selectedContId, setSelectedContId] = useState<string>(
    receptionState.id_contenedor_seleccionado
      ? String(receptionState.id_contenedor_seleccionado)
      : activeContainers.length > 0
      ? String(activeContainers[0].id_contenedor)
      : ''
  )
  const [isChangingContainer, setIsChangingContainer] = useState(false)

  // Guardar contenedor seleccionado
  const handleConfirmContainer = () => {
    if (!selectedContId) return
    const cont = activeContainers.find((c) => String(c.id_contenedor) === selectedContId)
    if (!cont) return
    onSaveContainer(cont.id_contenedor, cont.numero_contenedor, cont.placa_camion)
    setIsChangingContainer(false)
  }

  // Progreso por producto calculado desde paletas_recibidas
  const productStats = useMemo(() => {
    const map = new Map<
      number,
      {
        receivedUnits: number
        receivedBoxes: number
        receivedPallets: number
      }
    >()

    for (const pal of receptionState.paletas_recibidas) {
      const prev = map.get(pal.id_producto) || { receivedUnits: 0, receivedBoxes: 0, receivedPallets: 0 }
      map.set(pal.id_producto, {
        receivedUnits: prev.receivedUnits + pal.unidades,
        receivedBoxes: prev.receivedBoxes + pal.cajas,
        receivedPallets: prev.receivedPallets + 1
      })
    }
    return map
  }, [receptionState.paletas_recibidas])

  // Desglose teórico por producto desde packingPlan
  const planMap = useMemo(() => {
    const map = new Map<number, { cajas_totales: number; paletas_completas: number; cajas_pucho: number }>()
    if (packingPlan?.productos) {
      for (const p of packingPlan.productos) {
        map.set(p.id_producto, {
          cajas_totales: p.cajas_totales,
          paletas_completas: p.paletas_completas,
          cajas_pucho: p.cajas_pucho
        })
      }
    }
    return map
  }, [packingPlan])

  const isOrderLiquidated = order.estado === 'RECIBIDA' || receptionState.estado_recepcion === 'LIQUIDADA'
  const isContainerLocked = !receptionState.contenedor_confirmado || isChangingContainer
  const totalPalletsScanned = receptionState.paletas_recibidas.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Barra Superior de Navegación y Título */}
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
            ← Volver a la lista de órdenes
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="page-title" style={{ margin: 0, fontSize: '22px', color: 'var(--color-brand-deep)' }}>
                Recepción de orden: {order.numero_orden}
              </h1>
              <span
                style={{
                  background:
                    isOrderLiquidated
                      ? '#EAF5ED'
                      : order.estado === 'TRANSITO'
                      ? '#FDF6EC'
                      : 'var(--color-canvas)',
                  color:
                    isOrderLiquidated
                      ? 'var(--color-success)'
                      : order.estado === 'TRANSITO'
                      ? 'var(--color-warning)'
                      : 'var(--color-text-secondary)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid var(--color-border)'
                }}
              >
                {isOrderLiquidated
                  ? 'Recibida y liquidada'
                  : order.estado === 'TRANSITO'
                  ? 'En tránsito / Descarga activa'
                  : 'Borrador'}
              </span>
            </div>
            <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '13px' }}>
              {isOrderLiquidated
                ? 'Esta orden fue liquidada formalmente. Consulta el resumen de cumplimiento y paletas por SKU.'
                : 'Verifica el contenedor en patio y recepciona las paletas producto por producto.'}
            </p>
          </div>
        </div>

        {/* Botón de Liquidación Rápida si la orden no está liquidada */}
        {!isOrderLiquidated && (
          <button
            type="button"
            className="button primary"
            onClick={onGoToLiquidation}
            disabled={totalPalletsScanned === 0}
            title={totalPalletsScanned === 0 ? 'Recepciona al menos una paleta antes de liquidar' : 'Finalizar y liquidar recepción'}
            style={{
              background: totalPalletsScanned > 0 ? 'var(--color-brand-deep)' : undefined,
              borderColor: totalPalletsScanned > 0 ? 'var(--color-brand-deep)' : undefined,
              fontWeight: 600
            }}
          >
            Finalizar y liquidar recepción de la orden
          </button>
        )}

        {/* Botón para ver dictamen si ya está liquidada */}
        {isOrderLiquidated && (
          <button
            type="button"
            className="button secondary"
            onClick={onGoToLiquidation}
            style={{ fontWeight: 600, fontSize: '13px' }}
          >
            Ver acta de liquidación
          </button>
        )}
      </div>

      {/* Banner Informativo de Orden Liquidada */}
      {isOrderLiquidated && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            background: '#EAF5ED',
            border: '1px solid var(--color-success)',
            color: 'var(--color-text-primary)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div>
            <strong style={{ color: 'var(--color-success)' }}>✓ Orden cerrada y liquidada:</strong> Esta orden fue completada y liquidada{receptionState.fecha_liquidacion ? ` el ${receptionState.fecha_liquidacion}` : ''}. La información se encuentra en modo solo lectura para fines de consulta y trazabilidad contable.
          </div>
        </div>
      )}

      {/* 2. Tarjeta de Metadatos de la Orden */}
      <div
        className="panel"
        style={{
          padding: '16px 20px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Sede destino
            </span>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
              [{warehouse?.prefijo_rfid || 'IMP'}] {warehouse?.nombre || 'Almacén Principal'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Proveedor
            </span>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
              {order.proveedor?.nombre || order.proveedor?.razon_social || 'Proveedor genérico'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Fecha de emisión
            </span>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
              {order.fecha_emision}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Tipo de contenedor proyectado
            </span>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-brand)', marginTop: '2px' }}>
              {order.tipo_contenedor || '40FT'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tarjeta de Compuerta de Contenedor en Patio (MOD-07) */}
      <div
        className="panel"
        style={{
          padding: '18px 20px',
          background: receptionState.contenedor_confirmado && !isChangingContainer ? 'var(--color-surface)' : '#FFFBF0',
          border: `1px solid ${receptionState.contenedor_confirmado && !isChangingContainer ? 'var(--color-border)' : 'var(--color-warning)'}`,
          borderRadius: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '15px', color: 'var(--color-brand-deep)' }}>
                Contenedor en patio (MOD-07)
              </strong>
              {receptionState.contenedor_confirmado && !isChangingContainer ? (
                <span
                  style={{
                    background: '#EAF5ED',
                    color: 'var(--color-success)',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #D1EBD7'
                  }}
                >
                  ✓ Contenedor fijado para la recepción
                </span>
              ) : (
                <span
                  style={{
                    background: '#FDF6EC',
                    color: 'var(--color-warning)',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #F5E0C2'
                  }}
                >
                  ⚠ Requerido para habilitar descarga
                </span>
              )}
            </div>
            <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
              {receptionState.contenedor_confirmado && !isChangingContainer
                ? 'El contenedor activo ha sido vinculado. Todas las paletas recepcionadas quedarán registradas con este contenedor.'
                : 'Selecciona el contenedor que ha arribado a garita y presiona "Guardar contenedor" para comenzar a recepcionar productos.'}
            </p>
          </div>

          {!isOrderLiquidated && receptionState.contenedor_confirmado && !isChangingContainer && order.estado !== 'RECIBIDA' && (
            <button
              type="button"
              className="button secondary button-sm"
              onClick={() => setIsChangingContainer(true)}
              style={{ fontSize: '12px' }}
            >
              Cambiar contenedor
            </button>
          )}
        </div>

        {/* Vista fija cuando ya está confirmado */}
        {receptionState.contenedor_confirmado && !isChangingContainer ? (
          <div
            style={{
              marginTop: '14px',
              padding: '12px 16px',
              background: 'var(--color-canvas)',
              borderRadius: '6px',
              display: 'flex',
              gap: '24px',
              flexWrap: 'wrap',
              border: '1px solid var(--color-border)'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>N° Contenedor:</span>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-brand-deep)' }}>
                {receptionState.numero_contenedor_seleccionado}
              </div>
            </div>
            {receptionState.placa_camion_seleccionado && (
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Placa del camión:</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {receptionState.placa_camion_seleccionado}
                </div>
              </div>
            )}
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Paletas ingresadas:</span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-brand)' }}>
                {totalPalletsScanned} paleta(s)
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Estado:</span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: isOrderLiquidated ? 'var(--color-success)' : 'var(--color-brand)' }}>
                {isOrderLiquidated ? 'Descargado en muelle' : 'En descarga activa'}
              </div>
            </div>
          </div>
        ) : (
          /* Formulario de selección y confirmación de contenedor */
          <div style={{ marginTop: '14px' }}>
            {activeContainers.length === 0 ? (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#FDF2F0',
                  borderRadius: '6px',
                  border: '1px solid var(--color-danger)',
                  color: 'var(--color-danger)',
                  fontSize: '13px'
                }}
              >
                No hay contenedores registrados en patio actualmente (MOD-07). Debes registrar la llegada del camión en garita primero para poder recepcionarlo.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={selectedContId}
                  onChange={(e) => setSelectedContId(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    minWidth: '360px',
                    fontWeight: 500
                  }}
                >
                  <option value="">-- Seleccionar contenedor en patio --</option>
                  {activeContainers.map((c) => (
                    <option key={c.id_contenedor} value={String(c.id_contenedor)}>
                      {c.numero_contenedor} · Placa: {c.placa_camion} · Conductor: {c.nombre_conductor || 'No asignado'} ({c.estado})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="button primary"
                  onClick={handleConfirmContainer}
                  disabled={!selectedContId}
                  style={{ fontWeight: 600, padding: '8px 18px' }}
                >
                  Guardar contenedor
                </button>

                {isChangingContainer && (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setIsChangingContainer(false)}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Tabla de Productos Proyectados de la Orden */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 className="section-title" style={{ margin: 0, fontSize: '18px', color: 'var(--color-brand-deep)' }}>
              Productos de la orden (Proyección y avance físico)
            </h2>
            <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '13px' }}>
              {isOrderLiquidated
                ? 'Consulta el cumplimiento proyectado vs recepcionado y las paletas ingresadas para cada SKU.'
                : 'Selecciona un producto para asignar los códigos de paleta reservados en el Packing List.'}
            </p>
          </div>
        </div>

        {/* Banner de bloqueo si el contenedor no está confirmado y no está liquidada */}
        {!isOrderLiquidated && isContainerLocked && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              background: '#FDF6EC',
              border: '1px solid var(--color-warning)',
              color: 'var(--color-warning)',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            🔒 Recepción de productos bloqueada: Guarda y confirma el contenedor arriba para habilitar la carga de paletas.
          </div>
        )}

        <div className="table-wrap" style={{ margin: 0, opacity: (!isOrderLiquidated && isContainerLocked) ? 0.6 : 1, transition: 'opacity 0.2s ease' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>SKU</th>
                <th>Nombre del producto</th>
                <th style={{ textAlign: 'right' }}>Cantidad proyectada</th>
                <th style={{ textAlign: 'right' }}>Recepcionado físicamente</th>
                <th style={{ width: '180px' }}>Avance (%)</th>
                <th>Paletas registradas</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {(!order.detalles || order.detalles.length === 0) ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>
                    Esta orden no cuenta con líneas de producto registradas.
                  </td>
                </tr>
              ) : (
                order.detalles.map((d, idx) => {
                  const stats = productStats.get(d.id_producto) || { receivedUnits: 0, receivedBoxes: 0, receivedPallets: 0 }
                  const planItem = planMap.get(d.id_producto)
                  const projectedUnits = Number(d.cantidad_pedida) || 0
                  const receivedUnits = stats.receivedUnits
                  const pct = projectedUnits > 0 ? Math.min(100, Math.round((receivedUnits / projectedUnits) * 100)) : 0

                  let statusText = 'Pendiente'
                  let statusBg = 'var(--color-canvas)'
                  let statusColor = 'var(--color-text-secondary)'
                  if (receivedUnits >= projectedUnits && projectedUnits > 0) {
                    statusText = receivedUnits > projectedUnits ? 'Excedente' : 'Completo'
                    statusBg = '#EAF5ED'
                    statusColor = 'var(--color-success)'
                  } else if (receivedUnits > 0) {
                    statusText = 'En curso'
                    statusBg = 'var(--color-brand-soft)'
                    statusColor = 'var(--color-brand)'
                  }

                  return (
                    <tr key={d.id_detalle}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong style={{ color: 'var(--color-brand)' }}>{d.producto?.sku}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {d.producto?.nombre}
                        </div>
                        {d.producto?.regla_empaque && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            {d.producto.regla_empaque.unidades_por_caja} unid/caja · {d.producto.regla_empaque.cajas_por_paleta} cajas/pal
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                        {projectedUnits.toLocaleString('es-PE')} unid
                        {planItem && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                            ({planItem.cajas_totales} cajas)
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-brand-deep)' }}>
                        {receivedUnits.toLocaleString('es-PE')} unid
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                          ({stats.receivedBoxes} cajas)
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              flex: 1,
                              height: '8px',
                              background: 'var(--color-border)',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: pct === 100 ? 'var(--color-success)' : 'var(--color-brand)',
                                transition: 'width 0.3s ease'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '36px', textAlign: 'right' }}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{stats.receivedPallets} paleta(s)</span>
                        {planItem && (
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            {' '}de {planItem.paletas_completas + (planItem.cajas_pucho > 0 ? 1 : 0)} prev.
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            background: statusBg,
                            color: statusColor,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {statusText}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="button primary button-sm"
                          disabled={!isOrderLiquidated && isContainerLocked}
                          onClick={() => onSelectProduct(d.id_producto)}
                          style={{
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: isOrderLiquidated ? 'var(--color-surface)' : undefined,
                            color: isOrderLiquidated ? 'var(--color-brand)' : undefined,
                            borderColor: isOrderLiquidated ? 'var(--color-brand)' : undefined
                          }}
                        >
                          {isOrderLiquidated ? 'Ver resumen' : 'Elegir'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Resumen Final si la Orden ya está Liquidada */}
        {isOrderLiquidated && (
          <div
            className="panel"
            style={{
              padding: '16px 20px',
              borderRadius: '8px',
              background: 'var(--color-brand-soft)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '12px'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                Resumen de liquidación de la orden:
              </span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-brand-deep)', marginTop: '2px' }}>
                Dictamen: {receptionState.dictamen || 'COMPLETA'} · {totalPalletsScanned} paleta(s) física(s) en almacén · {(receptionState.codigos_liberados?.length || 0)} códigos liberados
              </div>
            </div>
            <button
              type="button"
              className="button primary button-sm"
              onClick={onGoToLiquidation}
              style={{ fontWeight: 600, padding: '8px 18px', background: 'var(--color-brand-deep)', borderColor: 'var(--color-brand-deep)' }}
            >
              Ver acta completa de liquidación
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
