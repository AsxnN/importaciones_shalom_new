import { useState, useMemo } from 'react'
import type { ImportOrder, OrderReceptionState } from '../../types/receptions'
import type { WarehouseOption } from '../../services/receptionService'
import type { OrderPackingPlan } from '../../services/packingListService'

interface Props {
  order: ImportOrder
  warehouse?: WarehouseOption | null
  receptionState: OrderReceptionState
  packingPlan: OrderPackingPlan | null
  onConfirmLiquidation: (
    dictamen: 'COMPLETA' | 'FALTANTES' | 'SOBRANTES',
    observaciones: string,
    codigosALiberar: string[]
  ) => Promise<void>
  onBack: () => void
}

interface CodeAuditRow {
  uid_tag: string
  producto_sku: string
  producto_nombre: string
  tipo: string
  cajas: number
  unidades: number
  usado: boolean
  motivo_no_uso?: string
  destino_cierre: string
}

export function ReceptionLiquidationView({
  order,
  warehouse: _warehouse,
  receptionState,
  packingPlan,
  onConfirmLiquidation,
  onBack
}: Props) {
  const isAlreadyLiquidated = order.estado === 'RECIBIDA' || receptionState.estado_recepcion === 'LIQUIDADA'
  const [observaciones, setObservaciones] = useState(receptionState.observaciones_liquidacion || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 1. Calcular totales proyectados vs recepcionados
  const totalProyectado = useMemo(() => {
    return (order.detalles || []).reduce((acc, d) => acc + (Number(d.cantidad_pedida) || 0), 0)
  }, [order.detalles])

  const totalRecepcionado = useMemo(() => {
    return receptionState.paletas_recibidas.reduce((acc, p) => acc + p.unidades, 0)
  }, [receptionState.paletas_recibidas])

  const diferencia = totalRecepcionado - totalProyectado

  const dictamen: 'COMPLETA' | 'FALTANTES' | 'SOBRANTES' = useMemo(() => {
    if (receptionState.dictamen) return receptionState.dictamen
    if (diferencia === 0) return 'COMPLETA'
    if (diferencia < 0) return 'FALTANTES'
    return 'SOBRANTES'
  }, [receptionState.dictamen, diferencia])

  // 2. Mapa de paletas efectivamente recibidas
  const receivedMap = useMemo(() => {
    const map = new Map<string, (typeof receptionState.paletas_recibidas)[0]>()
    for (const p of receptionState.paletas_recibidas) {
      map.set(p.uid_tag.trim().toUpperCase(), p)
    }
    return map
  }, [receptionState.paletas_recibidas])

  // 3. Auditoría exhaustiva código por código
  const codeAuditRows: CodeAuditRow[] = useMemo(() => {
    const rows: CodeAuditRow[] = []
    const seenUids = new Set<string>()

    // A. Códigos de bultos previstos en el plan
    if (packingPlan?.etiquetas_bultos) {
      for (const item of packingPlan.etiquetas_bultos) {
        const cleanUid = item.uid_tag.trim().toUpperCase()
        seenUids.add(cleanUid)
        const received = receivedMap.get(cleanUid)

        if (received) {
          rows.push({
            uid_tag: cleanUid,
            producto_sku: item.sku,
            producto_nombre: item.nombre,
            tipo: received.tipo === 'PUCHO' ? 'Pucho suelto' : 'Paleta completa',
            cajas: received.cajas,
            unidades: received.unidades,
            usado: true,
            destino_cierre: `Queda activo en almacén (${received.numero_contenedor || 'Contenedor verificado'})`
          })
        } else {
          rows.push({
            uid_tag: cleanUid,
            producto_sku: item.sku,
            producto_nombre: item.nombre,
            tipo: item.tipo === 'PUCHO' ? 'Pucho previsto' : 'Paleta completa',
            cajas: item.cajas,
            unidades: item.unidades,
            usado: false,
            motivo_no_uso: 'Mercadería no llegó (Faltante de proveedor)',
            destino_cierre: isAlreadyLiquidated
              ? '» Código liberado para el sistema'
              : '» Se liberará el código para futuras órdenes'
          })
        }
      }
    }

    // B. Etiquetas de contingencia / reserva de muelle
    if (packingPlan?.etiquetas_reserva) {
      for (const res of packingPlan.etiquetas_reserva) {
        const cleanUid = res.uid_tag.trim().toUpperCase()
        if (seenUids.has(cleanUid)) continue
        seenUids.add(cleanUid)
        const received = receivedMap.get(cleanUid)

        if (received) {
          rows.push({
            uid_tag: cleanUid,
            producto_sku: received.sku,
            producto_nombre: 'Excedente rotulado en muelle',
            tipo: received.tipo === 'PUCHO' ? 'Pucho suelto' : 'Paleta completa',
            cajas: received.cajas,
            unidades: received.unidades,
            usado: true,
            destino_cierre: `Queda activo en almacén (${received.numero_contenedor || 'Contenedor verificado'})`
          })
        } else {
          rows.push({
            uid_tag: cleanUid,
            producto_sku: 'RESERVA',
            producto_nombre: 'Etiqueta de contingencia de muelle',
            tipo: 'Reserva muelle',
            cajas: 0,
            unidades: 0,
            usado: false,
            motivo_no_uso: 'No se necesitó (Sin excedentes imprevistos)',
            destino_cierre: isAlreadyLiquidated
              ? '» Código liberado para el sistema'
              : '» Se liberará el código para futuras órdenes'
          })
        }
      }
    }

    // C. Cualquier código escaneado que no estuviese en el plan (por seguridad)
    for (const [uid, rec] of receivedMap.entries()) {
      if (!seenUids.has(uid)) {
        rows.push({
          uid_tag: uid,
          producto_sku: rec.sku,
          producto_nombre: 'Paleta ingresada adicional',
          tipo: rec.tipo,
          cajas: rec.cajas,
          unidades: rec.unidades,
          usado: true,
          destino_cierre: `Queda activo en almacén (${rec.numero_contenedor || 'Contenedor verificado'})`
        })
      }
    }

    return rows
  }, [packingPlan, receivedMap, isAlreadyLiquidated])

  // Códigos que se van a liberar
  const codigosALiberar = useMemo(() => {
    return codeAuditRows.filter((r) => !r.usado).map((r) => r.uid_tag)
  }, [codeAuditRows])

  const codigosUtilizadosCount = codeAuditRows.filter((r) => r.usado).length

  // Manejador de confirmación
  const handleConfirm = async () => {
    setErrorMsg(null)
    setIsSubmitting(true)
    try {
      await onConfirmLiquidation(dictamen, observaciones, codigosALiberar)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al liquidar la recepción.')
      setIsSubmitting(false)
    }
  }

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
            disabled={isSubmitting}
            style={{ fontSize: '13px', padding: '6px 12px' }}
          >
            {isAlreadyLiquidated ? '← Volver al resumen de la orden' : '← Volver a la descarga'}
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ margin: 0, fontSize: '22px', color: 'var(--color-brand-deep)' }}>
                Liquidación y conciliación: Orden {order.numero_orden}
              </h1>
              {isAlreadyLiquidated && (
                <span
                  style={{
                    background: '#EAF5ED',
                    color: 'var(--color-success)',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}
                >
                  Acta formalizada · Solo consulta
                </span>
              )}
            </div>
            <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '13px' }}>
              {isAlreadyLiquidated
                ? 'Acta oficial de descarga, balance final de inventario y estado de códigos correlativos.'
                : 'Cierre formal de la descarga, conciliación de inventario y liberación de códigos correlativos no utilizados.'}
            </p>
          </div>
        </div>
      </div>

      {isAlreadyLiquidated && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            background: '#EAF5ED',
            border: '1px solid var(--color-success)',
            color: 'var(--color-success)',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          ✓ Acta de liquidación cerrada: Esta orden fue liquidada formalmente{receptionState.fecha_liquidacion ? ` el ${new Date(receptionState.fecha_liquidacion).toLocaleString('es-PE')}` : ''}. Los datos de inventario y los códigos liberados se encuentran registrados y son inmutables.
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            background: '#FDF2F0',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
            fontSize: '13px'
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* 2. Tarjeta del Dictamen de Conciliación */}
      <div
        className="panel"
        style={{
          padding: '20px',
          borderRadius: '8px',
          background:
            dictamen === 'COMPLETA' ? '#F2F8F4' : dictamen === 'FALTANTES' ? '#FFFBF0' : '#F0F7FB',
          border: `1px solid ${
            dictamen === 'COMPLETA'
              ? 'var(--color-success)'
              : dictamen === 'FALTANTES'
              ? 'var(--color-warning)'
              : 'var(--color-brand)'
          }`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color:
                  dictamen === 'COMPLETA'
                    ? 'var(--color-success)'
                    : dictamen === 'FALTANTES'
                    ? 'var(--color-warning)'
                    : 'var(--color-brand)'
              }}
            >
              Dictamen oficial de muelle:
            </span>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', color: 'var(--color-brand-deep)' }}>
              {dictamen === 'COMPLETA' && 'Recepción completa y conforme'}
              {dictamen === 'FALTANTES' && 'Recepción incompleta con faltantes de proveedor'}
              {dictamen === 'SOBRANTES' && 'Recepción con excedentes / sobrantes'}
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.4' }}>
              Se proyectaron <strong>{totalProyectado.toLocaleString('es-PE')} unidades</strong>. Se recepcionaron físicamente en muelle <strong>{totalRecepcionado.toLocaleString('es-PE')} unidades</strong>.
              {diferencia !== 0 && (
                <span style={{ fontWeight: 600, marginLeft: '6px' }}>
                  Diferencia neta: {diferencia > 0 ? `+${diferencia.toLocaleString('es-PE')}` : diferencia.toLocaleString('es-PE')} unidades.
                </span>
              )}
            </p>
          </div>

          <div
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              textAlign: 'right'
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Contenedor en garita:</span>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-brand-deep)' }}>
              {receptionState.numero_contenedor_seleccionado || 'General'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tabla de Auditoría Código por Código */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0, fontSize: '16px', color: 'var(--color-brand-deep)' }}>
            Auditoría de códigos correlativos ({codeAuditRows.length} códigos analizados)
          </h2>
          <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
            Los códigos no utilizados serán desvinculados de inmediato para que la siguiente orden pueda utilizarlos sin dejar vacíos correlativos.
          </p>
        </div>

        <div className="table-wrap" style={{ margin: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Código RFID / Tag</th>
                <th>Producto destino</th>
                <th>Tipo / Carga</th>
                <th style={{ textAlign: 'right' }}>Cajas</th>
                <th style={{ textAlign: 'right' }}>Unidades</th>
                <th>Estado final</th>
                <th>Destino tras liquidación</th>
              </tr>
            </thead>
            <tbody>
              {codeAuditRows.map((r) => (
                <tr key={r.uid_tag} style={{ background: r.usado ? 'transparent' : 'rgba(188, 121, 31, 0.04)' }}>
                  <td>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: r.usado ? 'var(--color-brand-soft)' : 'var(--color-canvas)',
                        color: r.usado ? 'var(--color-brand)' : 'var(--color-text-secondary)'
                      }}
                    >
                      {r.uid_tag}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{r.producto_sku}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      {r.producto_nombre}
                    </div>
                  </td>
                  <td>{r.tipo}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                    {r.cajas > 0 ? `${r.cajas} cajas` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                    {r.unidades > 0 ? `${r.unidades.toLocaleString('es-PE')} unid` : '-'}
                  </td>
                  <td>
                    {r.usado ? (
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
                        ✓ Recepcionado y usado
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(188, 121, 31, 0.12)',
                          color: 'var(--color-warning)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}
                      >
                        ⛔ {r.motivo_no_uso || 'No utilizado'}
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: r.usado ? 500 : 700,
                        color: r.usado ? 'var(--color-text-primary)' : 'var(--color-brand-deep)'
                      }}
                    >
                      {r.destino_cierre}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Resumen de Liberación y Observaciones */}
      <div
        className="panel"
        style={{
          padding: '16px 20px',
          background: 'var(--color-brand-soft)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Códigos activos que quedan en almacén
            </span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-brand)' }}>
              {codigosUtilizadosCount} códigos
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              Sellados con el contenedor {receptionState.numero_contenedor_seleccionado || 'activo'}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Códigos no utilizados a liberar
            </span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-brand-deep)' }}>
              {codigosALiberar.length} códigos
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              Quedarán disponibles de inmediato para nuevas órdenes
            </span>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            Observaciones de liquidación{isAlreadyLiquidated ? ' registradas:' : ' (opcional):'}
          </label>
          <textarea
            rows={2}
            placeholder={
              isAlreadyLiquidated
                ? 'Sin observaciones registradas durante la liquidación.'
                : 'Ej. Proveedor no embarcó 1 paleta de Film Stretch. Contenedor cerrado conforme en muelle.'
            }
            value={observaciones}
            readOnly={isAlreadyLiquidated}
            onChange={(e) => setObservaciones(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: isAlreadyLiquidated ? 'var(--color-canvas)' : 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              cursor: isAlreadyLiquidated ? 'default' : 'text',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* 5. Botones de Acción */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        {isAlreadyLiquidated ? (
          <button
            type="button"
            className="button primary"
            onClick={onBack}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            ← Volver al resumen de la orden
          </button>
        ) : (
          <>
            <button
              type="button"
              className="button secondary"
              onClick={onBack}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="button primary"
              onClick={handleConfirm}
              disabled={isSubmitting}
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 600,
                background: 'var(--color-brand-deep)',
                borderColor: 'var(--color-brand-deep)'
              }}
            >
              {isSubmitting
                ? 'Liquidando y liberando códigos...'
                : codigosALiberar.length > 0
                ? `Confirmar liquidación y liberar ${codigosALiberar.length} códigos`
                : 'Confirmar liquidación y cerrar orden'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
