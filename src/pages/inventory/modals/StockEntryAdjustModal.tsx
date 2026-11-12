import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { logCatalogChange } from '../../../lib/audit'
import { supabase } from '../../../lib/supabase'
import { locationService } from '../../../services/locationService'
import type { EstadoUnidadSerial } from '../../products/types'
import type { ProductOption } from '../types'

type Props = {
  isOpen: boolean
  onClose: () => void
  selectedWarehouseId: number | null
  selectedWarehouseName?: string
  selectedWarehousePrefix?: string
  allProducts: ProductOption[]
  initialProductId?: string
  initialPaletas?: string
  initialPuchos?: string
  onSaveSuccess: (msg: string) => void
  onError: (msg: string) => void
}

export function StockEntryAdjustModal({
  isOpen,
  onClose,
  selectedWarehouseId,
  selectedWarehouseName,
  selectedWarehousePrefix,
  allProducts,
  initialProductId,
  initialPaletas = '0',
  initialPuchos = '0',
  onSaveSuccess,
  onError
}: Props) {
  const [modalMode, setModalMode] = useState<'rfid' | 'manual'>('rfid')
  const [modalProdId, setModalProdId] = useState<string>(initialProductId || '')
  const [modalUidTag, setModalUidTag] = useState<string>('')
  const [modalTipoPaleta, setModalTipoPaleta] = useState<'COMPLETO' | 'PUCHO'>('COMPLETO')
  const [modalCajasPucho, setModalCajasPucho] = useState<string>('1')
  const [modalPaletas, setModalPaletas] = useState<string>(initialPaletas)
  const [modalPuchos, setModalPuchos] = useState<string>(initialPuchos)
  const [modalMotivo, setModalMotivo] = useState<string>('Ingreso de stock en almacén')
  const [modalNumeroSerie, setModalNumeroSerie] = useState<string>('')
  const [modalSerialEstado, setModalSerialEstado] = useState<EstadoUnidadSerial>('DISPONIBLE')
  const [modalSerialUnidadesAjuste, setModalSerialUnidadesAjuste] = useState<string>('1')
  const [savingAdjust, setSavingAdjust] = useState(false)

  // Sincronizar selección inicial al abrir
  useEffect(() => {
    if (isOpen) {
      if (initialProductId) {
        setModalProdId(initialProductId)
      } else if (allProducts.length > 0 && !modalProdId) {
        setModalProdId(String(allProducts[0].id_producto))
      }
      setModalPaletas(initialPaletas)
      setModalPuchos(initialPuchos)
      setModalUidTag('')
      setModalNumeroSerie('')
      setModalSerialUnidadesAjuste('1')
      setModalMotivo('Ingreso de stock en almacén')
    }
  }, [isOpen, initialProductId, initialPaletas, initialPuchos, allProducts])

  const modalSelectedProd = useMemo(() => {
    if (!modalProdId) return allProducts[0] || null
    return allProducts.find((p) => String(p.id_producto) === modalProdId) || allProducts[0] || null
  }, [modalProdId, allProducts])

  // Cálculo en tiempo real de estiba, unidades y volumen
  const modalPreview = useMemo(() => {
    if (!modalSelectedProd) return null

    // Modo SERIALIZADO
    if (modalSelectedProd.modo_manejo === 'SERIALIZADO') {
      const totalUnits = modalMode === 'rfid' ? 1 : Math.max(0, parseInt(modalSerialUnidadesAjuste) || 0)
      let volumenM3: string | null = null
      if (modalSelectedProd.largo_cm && modalSelectedProd.ancho_cm && modalSelectedProd.alto_cm) {
        volumenM3 = (
          totalUnits *
          ((modalSelectedProd.largo_cm * modalSelectedProd.ancho_cm * modalSelectedProd.alto_cm) / 1000000)
        ).toFixed(3)
      }
      return {
        isSerial: true,
        pal: 0,
        puch: 0,
        cajasPorPaleta: 1,
        cajasDePaletas: 0,
        totalCajas: totalUnits,
        totalUnidades: totalUnits,
        volumenM3
      }
    }

    // Modo PALETIZADO Estándar
    const cPaleta = modalSelectedProd.cajas_por_paleta || 1
    const uCaja = modalSelectedProd.unidades_por_caja || 1

    if (modalMode === 'rfid') {
      const cajas = modalTipoPaleta === 'COMPLETO' ? cPaleta : Math.max(1, parseInt(modalCajasPucho) || 1)
      const totalUnidades = cajas * uCaja
      const volumenM3 = modalSelectedProd.volumen_caja_m3
        ? (cajas * modalSelectedProd.volumen_caja_m3).toFixed(3)
        : null

      return {
        isSerial: false,
        pal: modalTipoPaleta === 'COMPLETO' ? 1 : 0,
        puch: modalTipoPaleta === 'PUCHO' ? cajas : 0,
        cajasPorPaleta: cPaleta,
        cajasDePaletas: modalTipoPaleta === 'COMPLETO' ? cPaleta : 0,
        totalCajas: cajas,
        totalUnidades,
        volumenM3
      }
    }

    const pal = Math.max(0, parseInt(modalPaletas) || 0)
    const puch = Math.max(0, parseInt(modalPuchos) || 0)

    const totalCajas = pal * cPaleta + puch
    const totalUnidades = totalCajas * uCaja
    const volumenM3 = modalSelectedProd.volumen_caja_m3
      ? (totalCajas * modalSelectedProd.volumen_caja_m3).toFixed(3)
      : null

    return {
      isSerial: false,
      pal,
      puch,
      cajasPorPaleta: cPaleta,
      cajasDePaletas: pal * cPaleta,
      totalCajas,
      totalUnidades,
      volumenM3
    }
  }, [
    modalSelectedProd,
    modalMode,
    modalTipoPaleta,
    modalCajasPucho,
    modalPaletas,
    modalPuchos,
    modalSerialUnidadesAjuste
  ])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!selectedWarehouseId) {
      onError('Debes seleccionar un almacén destino válido.')
      return
    }
    if (!modalSelectedProd) {
      onError('Debes seleccionar un producto válido.')
      return
    }

    setSavingAdjust(true)

    // =========================================================
    // FLUJO 1: PRODUCTOS SERIALIZADOS (MAQUINARIA Y EQUIPOS)
    // =========================================================
    if (modalSelectedProd.modo_manejo === 'SERIALIZADO') {
      if (modalMode === 'rfid') {
        const cleanSerie = modalNumeroSerie.trim()
        const cleanTag = modalUidTag.trim().toUpperCase()

        if (!cleanSerie) {
          onError('El número de serie de fábrica es obligatorio.')
          setSavingAdjust(false)
          return
        }
        if (!cleanTag) {
          onError('El código de Tag RFID es obligatorio.')
          setSavingAdjust(false)
          return
        }

        try {
          // 1. Validar que la serie no exista previamente
          const { data: existingSerie } = await supabase
            .from('unidad_serializada')
            .select('id_unidad, numero_serie')
            .eq('id_producto', parseInt(modalProdId))
            .eq('numero_serie', cleanSerie)
            .maybeSingle()

          if (existingSerie) {
            onError(`El número de serie "${cleanSerie}" ya se encuentra registrado para este producto.`)
            setSavingAdjust(false)
            return
          }

          // 2. Crear o reactivar la etiqueta RFID
          const { data: tagRow, error: tagErr } = await supabase
            .from('etiqueta_rfid')
            .upsert(
              {
                uid_tag: cleanTag,
                id_almacen: selectedWarehouseId,
                id_producto: parseInt(modalProdId),
                tipo_paleta: 'COMPLETO',
                cantidad_paquetes: 1,
                estado: 'ACTIVA'
              },
              { onConflict: 'uid_tag' }
            )
            .select('id_etiqueta')
            .single()

          if (tagErr) throw tagErr
          const tagId = tagRow?.id_etiqueta

          // 3. Registrar la unidad física serializada
          const { error: serialErr } = await supabase.from('unidad_serializada').insert({
            id_producto: parseInt(modalProdId),
            numero_serie: cleanSerie,
            id_etiqueta: tagId,
            id_almacen: selectedWarehouseId,
            estado: modalSerialEstado
          })

          if (serialErr) throw serialErr

          // 4. Sumar +1 unidad al inventario físico
          const { data: invRow } = await supabase
            .from('inventario')
            .select('stock_real, stock_minimo')
            .eq('id_almacen', selectedWarehouseId)
            .eq('id_producto', parseInt(modalProdId))
            .maybeSingle()

          const currStock = invRow ? Number(invRow.stock_real) : 0
          const newStock = currStock + 1
          const minStock = invRow?.stock_minimo ?? 1
          const semaforo = newStock <= 0 ? 'ROJO' : newStock <= minStock ? 'AMARILLO' : 'VERDE'

          await supabase.from('inventario').upsert(
            {
              id_almacen: selectedWarehouseId,
              id_producto: parseInt(modalProdId),
              stock_real: newStock,
              stock_minimo: minStock,
              estado_semaforo: semaforo
            },
            { onConflict: 'id_producto,id_almacen' }
          )

          // 5. Registrar movimiento en Kardex
          await supabase.from('movimiento').insert({
            id_etiqueta: tagId,
            id_producto: parseInt(modalProdId),
            tipo: 'INGRESO_COMPLETO',
            cantidad_afectada: 1,
            destino_almacen: selectedWarehouseId,
            motivo: modalMotivo.trim() || `Ingreso de maquinaria serializada [${cleanSerie}] con RFID [${cleanTag}]`
          })

          // Auditoría
          void logCatalogChange({
            tabla: 'unidad_serializada',
            operacion: 'INSERT',
            id_registro: cleanSerie,
            datos_nuevos: {
              id_producto: parseInt(modalProdId),
              id_almacen: selectedWarehouseId,
              uid_tag: cleanTag,
              numero_serie: cleanSerie,
              estado: modalSerialEstado
            }
          })

          onSaveSuccess(
            `Equipo serializado [${cleanSerie}] con Tag RFID [${cleanTag}] registrado exitosamente (+1 unidad ingresada al inventario).`
          )
          onClose()
        } catch (err: any) {
          onError(`Error al registrar equipo serializado: ${err.message}`)
        } finally {
          setSavingAdjust(false)
        }
        return
      } else {
        // Modo Manual Contable para Serializado
        const unidades = Math.max(0, parseInt(modalSerialUnidadesAjuste) || 0)
        try {
          const { data: invRow } = await supabase
            .from('inventario')
            .select('stock_real, stock_minimo')
            .eq('id_almacen', selectedWarehouseId)
            .eq('id_producto', parseInt(modalProdId))
            .maybeSingle()

          const currStock = invRow ? Number(invRow.stock_real) : 0
          const newStock = currStock + unidades
          const minStock = invRow?.stock_minimo ?? 1
          const semaforo = newStock <= 0 ? 'ROJO' : newStock <= minStock ? 'AMARILLO' : 'VERDE'

          const { error: invErr } = await supabase.from('inventario').upsert(
            {
              id_almacen: selectedWarehouseId,
              id_producto: parseInt(modalProdId),
              stock_real: newStock,
              stock_minimo: minStock,
              estado_semaforo: semaforo
            },
            { onConflict: 'id_producto,id_almacen' }
          )

          if (invErr) throw invErr

          if (unidades > 0) {
            await supabase.from('movimiento').insert({
              id_producto: parseInt(modalProdId),
              tipo: 'INGRESO_COMPLETO',
              cantidad_afectada: unidades,
              destino_almacen: selectedWarehouseId,
              motivo: modalMotivo.trim() || `Ajuste manual de unidades de maquinaria (+${unidades})`
            })
          }

          onSaveSuccess(`Ajuste de inventario serializado aplicado correctamente (+${unidades} unidades).`)
          onClose()
        } catch (err: any) {
          onError(`Error en ajuste contable: ${err.message}`)
        } finally {
          setSavingAdjust(false)
        }
        return
      }
    }

    // =========================================================
    // FLUJO 2: PRODUCTO PALETIZADO ESTÁNDAR
    // =========================================================
    const prodIdNum = parseInt(modalProdId)

    if (modalMode === 'rfid') {
      const cleanUidTag = modalUidTag.trim().toUpperCase()
      if (!cleanUidTag) {
        onError('El código UID del Tag RFID es obligatorio.')
        setSavingAdjust(false)
        return
      }

      try {
        const cPaleta = modalSelectedProd?.cajas_por_paleta || 1
        const uCaja = modalSelectedProd?.unidades_por_caja || 1
        const cantPaquetes = modalTipoPaleta === 'COMPLETO' ? cPaleta : Math.max(1, parseInt(modalCajasPucho) || 1)
        const unidadesAfectadas = cantPaquetes * uCaja

        await locationService.createPallet({
          id_almacen: selectedWarehouseId,
          id_producto: prodIdNum,
          uid_tag: cleanUidTag,
          tipo_paleta: modalTipoPaleta,
          cantidad_paquetes: cantPaquetes
        })

        const { data: invRow } = await supabase
          .from('inventario')
          .select('stock_real, stock_minimo')
          .eq('id_almacen', selectedWarehouseId)
          .eq('id_producto', prodIdNum)
          .maybeSingle()

        const currStock = invRow ? Number(invRow.stock_real) : 0
        const newStock = currStock + unidadesAfectadas
        const minStock = invRow?.stock_minimo ?? cPaleta * uCaja
        const semaforo = newStock <= 0 ? 'ROJO' : newStock <= minStock ? 'AMARILLO' : 'VERDE'

        await supabase.from('inventario').upsert(
          {
            id_almacen: selectedWarehouseId,
            id_producto: prodIdNum,
            stock_real: newStock,
            stock_minimo: minStock,
            estado_semaforo: semaforo
          },
          { onConflict: 'id_producto,id_almacen' }
        )

        const { data: tagRow } = await supabase
          .from('etiqueta_rfid')
          .select('id_etiqueta')
          .eq('uid_tag', cleanUidTag)
          .single()

        await supabase.from('movimiento').insert({
          id_etiqueta: tagRow?.id_etiqueta ?? null,
          id_producto: prodIdNum,
          tipo: modalTipoPaleta === 'COMPLETO' ? 'INGRESO_COMPLETO' : 'INGRESO_PUCHO',
          cantidad_afectada: unidadesAfectadas,
          destino_almacen: selectedWarehouseId,
          motivo: `${modalMotivo.trim() || 'Ingreso de paleta RFID'} (${cleanUidTag})`
        })

        onSaveSuccess(
          `Paleta [${cleanUidTag}] (${modalTipoPaleta}) registrada e ingresada con éxito (+${unidadesAfectadas.toLocaleString()} unid.).`
        )
        onClose()
      } catch (err: any) {
        onError(`Error registrando paleta RFID: ${err.message}`)
      } finally {
        setSavingAdjust(false)
      }
    } else {
      // Ajuste manual
      const cPaleta = modalSelectedProd?.cajas_por_paleta || 1
      const uCaja = modalSelectedProd?.unidades_por_caja || 1
      const pal = Math.max(0, parseInt(modalPaletas) || 0)
      const puch = Math.max(0, parseInt(modalPuchos) || 0)
      const totalCajas = pal * cPaleta + puch
      const targetStock = totalCajas * uCaja

      try {
        const { data: invRow } = await supabase
          .from('inventario')
          .select('stock_real, stock_minimo')
          .eq('id_almacen', selectedWarehouseId)
          .eq('id_producto', prodIdNum)
          .maybeSingle()

        const currStock = invRow ? Number(invRow.stock_real) : 0
        const delta = targetStock - currStock
        const minStock = invRow?.stock_minimo ?? cPaleta * uCaja
        const semaforo = targetStock <= 0 ? 'ROJO' : targetStock <= minStock ? 'AMARILLO' : 'VERDE'

        await supabase.from('inventario').upsert(
          {
            id_almacen: selectedWarehouseId,
            id_producto: prodIdNum,
            stock_real: targetStock,
            stock_minimo: minStock,
            estado_semaforo: semaforo
          },
          { onConflict: 'id_producto,id_almacen' }
        )

        if (delta !== 0) {
          await supabase.from('movimiento').insert({
            id_producto: prodIdNum,
            tipo: delta > 0 ? 'INGRESO_COMPLETO' : 'SALIDA',
            cantidad_afectada: Math.abs(delta),
            destino_almacen: selectedWarehouseId,
            motivo: `Ajuste manual de stock: ${modalMotivo.trim() || 'Conteo físico'}`
          })
        }

        onSaveSuccess(
          `Ajuste de inventario aplicado para [${modalSelectedProd.sku}]. Stock actualizado a ${targetStock.toLocaleString()} unidades.`
        )
        onClose()
      } catch (err: any) {
        onError(`Error aplicando ajuste: ${err.message}`)
      } finally {
        setSavingAdjust(false)
      }
    }
  }

  if (!isOpen) return null

  const isSerialModal = modalSelectedProd?.modo_manejo === 'SERIALIZADO'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              {isSerialModal
                ? 'Operación de entrada · Inventario serializado'
                : 'Operación de entrada · Inventario paletizado'}
            </p>
            <h3>
              {isSerialModal
                ? 'Ingreso de maquinaria y equipos serializados'
                : 'Ingreso de stock e identificación de paletas'}
            </h3>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.86rem' }}>
              Sede: <strong>{selectedWarehouseName}</strong> · Modo:{' '}
              <strong>{isSerialModal ? 'Serializado unitario' : 'Paletizado estándar'}</strong>
            </p>
          </div>
          <button className="modal-close-btn" type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Pestañas de Modo: RFID vs Ajuste Contable */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '10px'
          }}
        >
          <button
            type="button"
            onClick={() => setModalMode('rfid')}
            style={{
              background: modalMode === 'rfid' ? 'var(--color-brand)' : 'transparent',
              color: modalMode === 'rfid' ? '#FFFFFF' : 'var(--color-text-secondary)',
              border: `1px solid ${modalMode === 'rfid' ? 'var(--color-brand)' : 'var(--color-border)'}`,
              padding: '7px 14px',
              borderRadius: '6px',
              fontWeight: modalMode === 'rfid' ? 600 : 400,
              fontSize: '0.86rem',
              cursor: 'pointer'
            }}
          >
            {isSerialModal ? 'Enrolar equipo (Tag RFID + serie)' : 'Ingreso de paleta con tag RFID'}
          </button>
          <button
            type="button"
            onClick={() => setModalMode('manual')}
            style={{
              background: modalMode === 'manual' ? 'var(--color-brand)' : 'transparent',
              color: modalMode === 'manual' ? '#FFFFFF' : 'var(--color-text-secondary)',
              border: `1px solid ${modalMode === 'manual' ? 'var(--color-brand)' : 'var(--color-border)'}`,
              padding: '7px 14px',
              borderRadius: '6px',
              fontWeight: modalMode === 'manual' ? 600 : 400,
              fontSize: '0.86rem',
              cursor: 'pointer'
            }}
          >
            {isSerialModal ? 'Ajuste contable de unidades' : 'Ajuste contable masivo'}
          </button>
        </div>

        <form onSubmit={handleSave}>
          {modalMode === 'rfid' && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'var(--color-brand-soft)',
                border: '1px solid var(--color-border)',
                marginBottom: '16px',
                fontSize: '0.82rem',
                color: 'var(--color-text-primary)'
              }}
            >
              {isSerialModal ? (
                <>
                  <strong>Identificación de Maquinaria y Equipos:</strong> Cada unidad se identifica unitariamente con
                  su número de serie de fábrica y su Tag RFID individual. No se aplican reglas de empaque, cajas ni
                  cargas pucho. Al registrarla quedará activa en el almacén sumando +1 al inventario y al Kardex.
                </>
              ) : (
                <>
                  <strong>Entorno Web:</strong> Como este terminal web no cuenta con sensor NFC/RFID físico como el
                  móvil, debes ingresar manualmente el código alfanumérico leído del chip RFID (o pistola lectora USB).
                  La paleta quedará registrada en el inventario activo y sus unidades sumarán automáticamente al stock
                  real y Kardex.
                </>
              )}
            </div>
          )}

          <label style={{ display: 'grid', gap: '6px', marginBottom: '14px', fontWeight: 600, fontSize: '0.88rem' }}>
            Producto / SKU a Ingresar
            <select
              value={modalProdId}
              onChange={(e) => {
                setModalProdId(e.target.value)
                const sel = allProducts.find((p) => String(p.id_producto) === e.target.value)
                if (sel?.modo_manejo === 'SERIALIZADO') {
                  setModalNumeroSerie('')
                  setModalSerialUnidadesAjuste('1')
                }
              }}
              style={{
                padding: '10px',
                borderRadius: '6px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
              required
            >
              {allProducts.map((p) => {
                const isProdSerial = p.modo_manejo === 'SERIALIZADO'
                return (
                  <option key={p.id_producto} value={p.id_producto}>
                    [{p.sku}] {p.nombre} —{' '}
                    {isProdSerial
                      ? 'Modo: Serializado Unitario (1 equipo/serie)'
                      : `(${p.cajas_por_paleta} cajas/paleta, ${p.unidades_por_caja} unid/caja)`}
                  </option>
                )
              })}
            </select>
          </label>

          {isSerialModal ? (
            modalMode === 'rfid' ? (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '14px',
                    marginBottom: '14px'
                  }}
                >
                  <label style={{ display: 'grid', gap: '6px', fontWeight: 600, fontSize: '0.88rem' }}>
                    <span>
                      Número de Serie de Fábrica <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </span>
                    <input
                      type="text"
                      value={modalNumeroSerie}
                      onChange={(e) => setModalNumeroSerie(e.target.value)}
                      placeholder="Ej. SN-CAT-2026-9042"
                      required
                      style={{
                        padding: '10px',
                        fontWeight: 600,
                        letterSpacing: '0.5px'
                      }}
                    />
                    <span style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>
                      Identificador único troquelado o grabado en el equipo.
                    </span>
                  </label>

                  <label style={{ display: 'grid', gap: '6px', fontWeight: 600, fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        Código tag RFID <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </span>
                      <button
                        type="button"
                        className="btn-detail"
                        onClick={async () => {
                          if (!selectedWarehouseId) return
                          const suggested = await locationService.suggestNextRfidTag(
                            selectedWarehouseId,
                            selectedWarehousePrefix || undefined
                          )
                          setModalUidTag(suggested)
                        }}
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.74rem'
                        }}
                        title="Sugerir siguiente código secuencial según el prefijo oficial de este almacén"
                      >
                        Sugerir código ({selectedWarehousePrefix || 'TAG'})
                      </button>
                    </div>
                    <input
                      type="text"
                      value={modalUidTag}
                      onChange={(e) => setModalUidTag(e.target.value.toUpperCase())}
                      placeholder={`Ej. ${selectedWarehousePrefix || 'IMP'}00001`}
                      required
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        padding: '10px'
                      }}
                    />
                    <span style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>
                      Formato oficial: [{selectedWarehousePrefix || 'PREFIJO'}][5 dígitos].
                    </span>
                  </label>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '14px',
                    marginBottom: '14px'
                  }}
                >
                  <label style={{ display: 'grid', gap: '6px', fontWeight: 600, fontSize: '0.88rem' }}>
                    Estado operativo inicial
                    <select
                      value={modalSerialEstado}
                      onChange={(e) => setModalSerialEstado(e.target.value as EstadoUnidadSerial)}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      <option value="DISPONIBLE">Disponible — Operativo y listo</option>
                      <option value="EN_MANTENIMIENTO">En mantenimiento — Requiere revisión técnica</option>
                    </select>
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      Restricción logística:
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.76rem',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: 'var(--color-brand-soft)',
                          color: 'var(--color-brand)',
                          fontWeight: 600,
                          border: '1px solid var(--color-border)'
                        }}
                      >
                        Ubicación: {modalSelectedProd.ubicacion_permitida ?? 'AMBAS'}
                      </span>
                      {modalSelectedProd.requiere_equipo_izaje && (
                        <span
                          style={{
                            fontSize: '0.76rem',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'rgba(188, 121, 31, 0.1)',
                            color: 'var(--color-warning)',
                            fontWeight: 600,
                            border: '1px solid rgba(188, 121, 31, 0.28)'
                          }}
                        >
                          Requiere equipo de izaje
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'grid', gap: '6px', fontWeight: 600, fontSize: '0.88rem' }}>
                  Unidades Físicas a Ajustar
                  <input
                    type="number"
                    min="1"
                    value={modalSerialUnidadesAjuste}
                    onChange={(e) => setModalSerialUnidadesAjuste(e.target.value)}
                    required
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      fontSize: '1.05rem',
                      fontWeight: 600
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>
                    Ajuste contable directo del stock disponible. Para asociar chips RFID individuales con número de
                    serie, use la pestaña de enrolamiento con tag.
                  </span>
                </label>
              </div>
            )
          ) : modalMode === 'rfid' ? (
            <>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'grid', gap: '6px', fontWeight: 600, fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      Código de la Paleta (Tag RFID) <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedWarehouseId) return
                        const suggested = await locationService.suggestNextRfidTag(
                          selectedWarehouseId,
                          selectedWarehousePrefix || undefined
                        )
                        setModalUidTag(suggested)
                      }}
                      style={{
                        padding: '3px 10px',
                        fontSize: '0.74rem',
                        borderRadius: '4px',
                        background: 'var(--color-brand-soft)',
                        color: 'var(--color-brand)',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                      title="Sugerir siguiente código secuencial según el prefijo oficial de este almacén"
                    >
                      Sugerir ({selectedWarehousePrefix || 'TAG'})
                    </button>
                  </div>
                  <input
                    type="text"
                    value={modalUidTag}
                    onChange={(e) => setModalUidTag(e.target.value.toUpperCase())}
                    placeholder={`Ej. ${selectedWarehousePrefix || 'IMP'}00001`}
                    required
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      padding: '10px'
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>
                    Formato oficial: [{selectedWarehousePrefix || 'PREFIJO'}][5 dígitos]. Ingréselo manualmente o presione
                    Sugerir.
                  </span>
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '14px',
                  marginBottom: '14px'
                }}
              >
                <label style={{ display: 'grid', gap: '6px', fontWeight: 600, fontSize: '0.88rem' }}>
                  Tipo de Paleta / Carga
                  <select
                    value={modalTipoPaleta}
                    onChange={(e) => setModalTipoPaleta(e.target.value as 'COMPLETO' | 'PUCHO')}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    <option value="COMPLETO">
                      Paleta Completa Estándar ({modalSelectedProd?.cajas_por_paleta ?? 0} cajas)
                    </option>
                    <option value="PUCHO">Pucho / Carga Incompleta</option>
                  </select>
                </label>

                {modalTipoPaleta === 'PUCHO' ? (
                  <label style={{ display: 'grid', gap: '6px', fontWeight: 600, fontSize: '0.88rem' }}>
                    Cajas en este Pucho
                    <input
                      type="number"
                      min="1"
                      value={modalCajasPucho}
                      onChange={(e) => setModalCajasPucho(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>
                      Cajas físicas que contiene este pucho
                    </span>
                  </label>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      Estiba estándar automática:
                    </span>
                    <strong style={{ fontSize: '1rem', color: 'var(--color-brand)' }}>
                      {modalSelectedProd?.cajas_por_paleta ?? 0} cajas (
                      {(
                        (modalSelectedProd?.cajas_por_paleta ?? 0) * (modalSelectedProd?.unidades_por_caja ?? 1)
                      ).toLocaleString()}{' '}
                      unid.)
                    </strong>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                marginBottom: '16px'
              }}
            >
              <label style={{ display: 'grid', gap: '6px', fontWeight: 600, fontSize: '0.88rem' }}>
                Paletas Completas
                <input
                  type="number"
                  min="0"
                  value={modalPaletas}
                  onChange={(e) => setModalPaletas(e.target.value)}
                  required
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    fontSize: '1.05rem',
                    fontWeight: 600
                  }}
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>
                  Estiba estándar ({modalSelectedProd?.cajas_por_paleta ?? 1} cajas c/u)
                </span>
              </label>

              <label style={{ display: 'grid', gap: '6px', fontWeight: 600, fontSize: '0.88rem' }}>
                Puchos (cajas sueltas)
                <input
                  type="number"
                  min="0"
                  value={modalPuchos}
                  onChange={(e) => setModalPuchos(e.target.value)}
                  required
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    fontSize: '1.05rem',
                    fontWeight: 600
                  }}
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>
                  Cajas que no completan una paleta
                </span>
              </label>
            </div>
          )}

          {/* Previsualización en Tiempo Real */}
          {isSerialModal ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '6px',
                background: 'var(--color-brand-soft)',
                border: '1px solid var(--color-border)',
                marginBottom: '16px'
              }}
            >
              <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-brand-deep)' }}>
                Ficha técnica del equipo a ingresar
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                    Cantidad a ingresar:
                  </span>
                  <strong style={{ color: 'var(--color-brand)', fontSize: '1.05rem' }}>
                    {modalMode === 'rfid' ? '+1 unidad única' : `+${modalSerialUnidadesAjuste} unid.`}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                    Peso unitario:
                  </span>
                  <strong>
                    {modalSelectedProd.peso_unitario_kg ? `${modalSelectedProd.peso_unitario_kg} kg` : '—'}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                    Dimensiones (L×An×Al):
                  </span>
                  <strong>
                    {modalSelectedProd.largo_cm && modalSelectedProd.ancho_cm && modalSelectedProd.alto_cm
                      ? `${modalSelectedProd.largo_cm}×${modalSelectedProd.ancho_cm}×${modalSelectedProd.alto_cm} cm`
                      : '—'}
                  </strong>
                </div>
                {modalPreview?.volumenM3 && (
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                      Volumen:
                    </span>
                    <strong>{modalPreview.volumenM3} m³</strong>
                  </div>
                )}
              </div>
            </div>
          ) : (
            modalPreview && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  background: 'var(--color-brand-soft)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '16px'
                }}
              >
                <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-brand-deep)' }}>
                  Cálculo logístico de conversión
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                      Cajas por paleta:
                    </span>
                    <strong>{modalPreview.cajasPorPaleta} cajas</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                      Total cajas:
                    </span>
                    <strong>{modalPreview.totalCajas} cajas</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                      Total unidades:
                    </span>
                    <strong style={{ color: 'var(--color-brand)', fontSize: '1.05rem' }}>
                      {modalPreview.totalUnidades.toLocaleString()} unid.
                    </strong>
                  </div>
                  {modalPreview.volumenM3 && (
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                        Volumen:
                      </span>
                      <strong>{modalPreview.volumenM3} m³</strong>
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          <label style={{ display: 'grid', gap: '6px', marginBottom: '20px', fontWeight: 600, fontSize: '0.88rem' }}>
            Motivo del Movimiento / Ajuste
            <input
              type="text"
              value={modalMotivo}
              onChange={(e) => setModalMotivo(e.target.value)}
              placeholder="Ej. Ingreso inicial de lote, conteo físico, etc."
              required
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn-secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" type="submit" disabled={savingAdjust}>
              {savingAdjust
                ? 'Guardando en almacén…'
                : isSerialModal
                ? modalMode === 'rfid'
                  ? 'Registrar equipo e ingresar stock (+1 unid.)'
                  : `Confirmar e impactar stock (+${modalSerialUnidadesAjuste} unid.)`
                : modalMode === 'rfid'
                ? `Registrar paleta e ingresar stock (+${modalPreview?.totalUnidades?.toLocaleString() ?? 0} unid.)`
                : 'Confirmar e impactar stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
