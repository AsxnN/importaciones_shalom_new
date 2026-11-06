import { useEffect, useMemo, useState } from 'react'
import type { OrderPackingPlan, PuchoConsolidationItem } from '../../services/packingListService'
import { packingListService } from '../../services/packingListService'

interface PackingListSubViewProps {
  plan: OrderPackingPlan
  onBack: () => void
  onOpenReceptions?: () => void
}

export function PackingListSubView({
  plan,
  onBack,
  onOpenReceptions
}: PackingListSubViewProps) {
  const [selectedTab, setSelectedTab] = useState<'both' | 'summary' | 'pallets'>('both')
  const [copiedTag, setCopiedTag] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [palletSearch, setPalletSearch] = useState('')
  const [palletTypeFilter, setPalletTypeFilter] = useState<'TODOS' | 'COMPLETO' | 'PUCHO' | 'RESERVA_EXCEDENTE'>('TODOS')
  const [verifiedTags, setVerifiedTags] = useState<Set<string>>(new Set())

  // Consolidaciones de puchos detectadas contra el inventario físico en almacén
  const [puchoConsolidations, setPuchoConsolidations] = useState<PuchoConsolidationItem[]>([])

  useEffect(() => {
    let isMounted = true
    const checkConsolidations = async () => {
      try {
        const items = await packingListService.detectWarehousePuchosForPlan(
          plan.productos,
          plan.prefijo_almacen
        )
        if (isMounted) setPuchoConsolidations(items)
      } catch (err) {
        console.warn('Error al verificar consolidaciones de pucho:', err)
      }
    }
    checkConsolidations()
    return () => {
      isMounted = false
    }
  }, [plan])

  // Mapeo rápido de consolidaciones por id_producto
  const consolidationByProdId = useMemo(() => {
    return new Map(puchoConsolidations.map((c) => [c.id_producto, c]))
  }, [puchoConsolidations])

  // Lista detallada de todas las paletas individuales
  const allPallets = useMemo(() => {
    const list: Array<{
      correlativo: number
      uid_tag: string
      sku: string
      nombre: string
      tipo: 'COMPLETO' | 'PUCHO' | 'RESERVA_EXCEDENTE'
      cajas: number
      unidades: number
      unidadesPorPaleta: number
      notas?: string
    }> = []

    let idx = 1
    for (const prod of plan.productos) {
      const consol = consolidationByProdId.get(prod.id_producto)
      for (const pal of prod.paletas) {
        const notasItem =
          pal.tipo === 'PUCHO' && consol
            ? `Consolidar con ${consol.tag_existente} (${consol.cajas_existentes} cajas en ${consol.ubicacion_existente}) · ${consol.titulo_caso}`
            : pal.notas

        list.push({
          correlativo: idx++,
          uid_tag: pal.uid_tag,
          sku: prod.sku,
          nombre: prod.nombre,
          tipo: pal.tipo,
          cajas: pal.cajas,
          unidades: pal.unidades,
          unidadesPorPaleta: prod.unidades_por_paleta,
          notas: notasItem
        })
      }
    }

    for (const res of plan.etiquetas_reserva) {
      list.push({
        correlativo: idx++,
        uid_tag: res.uid_tag,
        sku: 'RESERVA',
        nombre: 'Etiqueta de contingencia para excedentes en muelle',
        tipo: 'RESERVA_EXCEDENTE',
        cajas: 0,
        unidades: 0,
        unidadesPorPaleta: 0,
        notas: 'Reserva para bultos imprevistos'
      })
    }

    return list
  }, [plan, consolidationByProdId])

  // Filtrado de paletas individuales
  const filteredPallets = useMemo(() => {
    return allPallets.filter((p) => {
      const matchSearch =
        !palletSearch.trim() ||
        p.uid_tag.toLowerCase().includes(palletSearch.toLowerCase().trim()) ||
        p.nombre.toLowerCase().includes(palletSearch.toLowerCase().trim()) ||
        p.sku.toLowerCase().includes(palletSearch.toLowerCase().trim())

      const matchType =
        palletTypeFilter === 'TODOS' || p.tipo === palletTypeFilter

      return matchSearch && matchType
    })
  }, [allPallets, palletSearch, palletTypeFilter])

  // Copia de un código individual
  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag)
    setCopiedTag(tag)
    setTimeout(() => setCopiedTag(null), 2000)
  }

  // Copia masiva de todos los códigos de paletas
  const handleCopyAllTags = () => {
    const allCodes = allPallets.map((p) => p.uid_tag).join(', ')
    navigator.clipboard.writeText(allCodes)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2500)
  }

  // Marcar / desmarcar verificación de paleta
  const handleToggleVerified = (uid_tag: string) => {
    setVerifiedTags((prev) => {
      const next = new Set(prev)
      if (next.has(uid_tag)) {
        next.delete(uid_tag)
      } else {
        next.add(uid_tag)
      }
      return next
    })
  }

  const handleToggleSelectAllVerified = () => {
    if (verifiedTags.size === filteredPallets.length && filteredPallets.length > 0) {
      setVerifiedTags(new Set())
    } else {
      setVerifiedTags(new Set(filteredPallets.map((p) => p.uid_tag)))
    }
  }

  // Totales acumulados para la fila de resumen
  const totals = useMemo(() => {
    return plan.productos.reduce(
      (acc, p) => ({
        cantidadPedida: acc.cantidadPedida + p.cantidad_pedida,
        cajasTotales: acc.cajasTotales + p.cajas_totales,
        paletasCompletas: acc.paletasCompletas + p.paletas_completas,
        cajasPucho: acc.cajasPucho + p.cajas_pucho,
        unidadesPucho: acc.unidadesPucho + p.unidades_pucho,
        totalBultos: acc.totalBultos + p.total_bultos
      }),
      {
        cantidadPedida: 0,
        cajasTotales: 0,
        paletasCompletas: 0,
        cajasPucho: 0,
        unidadesPucho: 0,
        totalBultos: 0
      }
    )
  }, [plan])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Encabezado Maestro de Vista Completa */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '16px'
        }}
      >
        <div>
          <button
            type="button"
            className="button secondary button-sm no-print"
            onClick={onBack}
            style={{ marginBottom: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            ← Volver a la proyección
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-brand)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Módulo 06 · Plan Oficial de Paletizado y Rótulos de Muelle
            </span>
          </div>

          <h1
            style={{
              margin: '4px 0 6px 0',
              fontSize: '28px',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              color: 'var(--color-brand-deep)'
            }}
          >
            Packing List — Orden {plan.numero_orden}
          </h1>

          {/* Cinta de Metadatos del Embarque */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            <div>
              <span>Proveedor: </span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{plan.proveedor || 'Sin proveedor asignado'}</strong>
            </div>
            <div>
              <span>Contenedor: </span>
              <strong style={{ color: 'var(--color-brand)' }}>{plan.contenedor}</strong>
            </div>
            <div>
              <span>Fecha de emisión: </span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{plan.fecha_emision || 'Reciente'}</strong>
            </div>
            <div>
              <span>Prefijo oficial: </span>
              <code style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand-deep)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                {plan.prefijo_almacen}
              </code>
            </div>
            <div>
              <span>Total líneas de producto: </span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{plan.productos.length}</strong>
            </div>
          </div>
        </div>

        {/* Acciones Superiores */}
        <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {copiedTag && (
            <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600 }}>
              Código {copiedTag} copiado
            </span>
          )}
          {copiedAll && (
            <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600 }}>
              Todos los códigos copiados
            </span>
          )}

          <button
            type="button"
            className="button secondary"
            onClick={handleCopyAllTags}
            title="Copiar todos los códigos correlativos al portapapeles"
          >
            Copiar todos los códigos
          </button>

          <button
            type="button"
            className="button secondary"
            onClick={() => window.print()}
            title="Imprimir el packing list oficial en hoja A4"
          >
            Imprimir
          </button>

          <button
            type="button"
            className="button primary"
            onClick={() => packingListService.exportPackingListToExcel(plan)}
            title="Descargar archivo Excel con la hoja de resumen y la lista de rótulos con casillas para muelle"
          >
            Descargar Excel para muelle (.xlsx)
          </button>

          {onOpenReceptions && (
            <button
              type="button"
              className="button secondary"
              onClick={onOpenReceptions}
              title="Abrir el Módulo 04 de Recepciones para validar descargas en muelle"
            >
              Ir a Recepciones RFID
            </button>
          )}
        </div>
      </div>

      {/* 2. Tira Horizontal de Indicadores Clave del Embarque (skill_design.md) */}
      <section className="indicator-strip" aria-label="Resumen global del contenedor">
        <div className="indicator-card">
          <span className="indicator-label">Unidades requeridas</span>
          <span className="indicator-value">{plan.total_unidades.toLocaleString('es-PE')}</span>
          <span className="indicator-context">En contenedor {plan.contenedor}</span>
        </div>

        <div className="indicator-card">
          <span className="indicator-label">Cajas calculadas</span>
          <span className="indicator-value">{plan.total_cajas.toLocaleString('es-PE')}</span>
          <span className="indicator-context">Bultos secundarios totales</span>
        </div>

        <div className="indicator-card">
          <span className="indicator-label">Paletas completas</span>
          <span className="indicator-value" style={{ color: 'var(--color-brand)' }}>
            {plan.total_paletas_completas}
          </span>
          <span className="indicator-context">Estiba estándar homogénea</span>
        </div>

        <div className="indicator-card">
          <span className="indicator-label">Cajas pucho (sueltas)</span>
          <span
            className="indicator-value"
            style={{ color: plan.total_puchos > 0 ? 'var(--color-warning)' : 'inherit' }}
          >
            {plan.total_puchos}
          </span>
          <span className="indicator-context">
            {puchoConsolidations.length > 0
              ? `${puchoConsolidations.length} SKU(s) a consolidar`
              : plan.total_puchos > 0
              ? 'Paleta con cajas parciales'
              : 'Sin sobrantes sueltos'}
          </span>
        </div>

        <div className="indicator-card">
          <span className="indicator-label">Total paletas físicas</span>
          <span className="indicator-value" style={{ color: 'var(--color-success)' }}>
            {plan.total_bultos_previstos}
          </span>
          <span className="indicator-context">Bultos a descargar en muelle</span>
        </div>

        <div className="indicator-card">
          <span className="indicator-label">Buffer de contingencia</span>
          <span className="indicator-value" style={{ color: 'var(--color-brand-deep)' }}>
            +{plan.etiquetas_reserva.length}
          </span>
          <span className="indicator-context">Rótulos para excedentes</span>
        </div>
      </section>

      {/* 2.5 Panel de Alerta Operativa: Consolidación de Puchos Requerida */}
      {puchoConsolidations.length > 0 && (
        <section
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderLeft: '4px solid var(--color-warning)',
            borderRadius: '6px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
          aria-label="Alerta de consolidación de puchos"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: '#FFF8EE',
                    color: 'var(--color-warning)',
                    border: '1px solid #F6E2C5',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  Regla Operativa · Máximo 1 pucho por producto
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {puchoConsolidations.length} {puchoConsolidations.length === 1 ? 'producto requiere' : 'productos requieren'} consolidación física en muelle
                </span>
              </div>
              <h2
                style={{
                  margin: '6px 0 0 0',
                  fontSize: '18px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  color: 'var(--color-brand-deep)'
                }}
              >
                Consolidación preventiva de paletas pucho en almacén
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '900px' }}>
                Se detectaron productos en este embarque que traen cajas sueltas (puchos) y que ya cuentan con un pucho previo en almacén.
                Para evitar ocupar dos posiciones de paleta con el mismo producto, los estibadores deben unificar físicamente las cajas al momento de descargar.
              </p>
            </div>
          </div>

          {/* Tabla de Consolidaciones */}
          <div className="table-wrap" style={{ overflowX: 'auto', margin: '4px 0 0 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '8px 10px' }}>Producto</th>
                  <th style={{ padding: '8px 10px' }}>Pucho actual en almacén</th>
                  <th style={{ padding: '8px 10px' }}>Pucho en contenedor</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Total cajas</th>
                  <th style={{ padding: '8px 10px' }}>Diagnóstico de estiba</th>
                  <th style={{ padding: '8px 10px' }}>Instrucción para descarga</th>
                </tr>
              </thead>
              <tbody>
                {puchoConsolidations.map((item) => (
                  <tr key={item.id_producto} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.nombre}</div>
                      <code style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{item.sku}</code>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div>
                        <strong style={{ color: 'var(--color-warning)' }}>{item.cajas_existentes} cajas</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        Tag: <code style={{ fontWeight: 600 }}>{item.tag_existente}</code> ({item.ubicacion_existente})
                      </div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div>
                        <strong style={{ color: 'var(--color-brand)' }}>+{item.cajas_nuevas} cajas</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        Tag previsto: <code style={{ fontWeight: 600 }}>{item.tag_nuevo}</code>
                      </div>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        {item.total_cajas} / {item.cajas_por_paleta}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>cajas / paleta</div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          border: '1px solid var(--color-border)',
                          background:
                            item.tipo_caso === 'CASO_2_COMPLETO'
                              ? '#EEF8F1'
                              : item.tipo_caso === 'CASO_3_COMPLETO_MAS_PUCHO'
                              ? 'var(--color-brand-soft)'
                              : '#FFF8EE',
                          color: item.badge_color
                        }}
                      >
                        {item.badge_texto}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontSize: '12px', color: 'var(--color-text-primary)', maxWidth: '340px' }}>
                      {item.instruccion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. Selector de Pestañas de la Vista Completa */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '8px'
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`button ${selectedTab === 'both' ? 'primary' : 'secondary'} button-sm`}
            onClick={() => setSelectedTab('both')}
          >
            Ver todo el desglose completo
          </button>
          <button
            type="button"
            className={`button ${selectedTab === 'summary' ? 'primary' : 'secondary'} button-sm`}
            onClick={() => setSelectedTab('summary')}
          >
            1. Resumen técnico por producto ({plan.productos.length})
          </button>
          <button
            type="button"
            className={`button ${selectedTab === 'pallets' ? 'primary' : 'secondary'} button-sm`}
            onClick={() => setSelectedTab('pallets')}
          >
            2. Hoja maestra de paletas y rótulos ({allPallets.length})
          </button>
        </div>

        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {verifiedTags.size > 0 ? (
            <strong style={{ color: 'var(--color-success)' }}>
              {verifiedTags.size} de {allPallets.length} paletas punteadas en muelle
            </strong>
          ) : (
            'Todas las paletas cuentan con códigos únicos reservados de forma inmutable'
          )}
        </span>
      </div>

      {/* =========================================================================
          SECCIÓN 1: RESUMEN TÉCNICO Y REGLAS DE ESTIBA POR PRODUCTO
          ========================================================================= */}
      {(selectedTab === 'both' || selectedTab === 'summary') && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  color: 'var(--color-brand-deep)'
                }}
              >
                1. Resumen técnico y desglose de estiba por producto
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Cálculo de descomposición según las reglas oficiales de empaque registradas en catálogo (cajas/camada, camadas/paleta y unidades/caja).
              </p>
            </div>

            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', background: 'var(--color-canvas)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
              {plan.productos.length} productos proyectados
            </span>
          </div>

          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-canvas)', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '10px 8px', width: '36px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '10px 10px', minWidth: '110px' }}>SKU</th>
                  <th style={{ padding: '10px 12px', minWidth: '220px' }}>Producto</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right' }}>Unid. pedidas</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Unid/Caja</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Cajas/Paleta</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right' }}>Unid/Paleta</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600 }}>Total cajas</th>
                  <th style={{ padding: '10px 10px', textAlign: 'center', background: 'var(--color-brand-soft)' }}>
                    Paletas completas
                  </th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Cajas pucho</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Unid. pucho</th>
                  <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>Total paletas</th>
                  <th style={{ padding: '10px 12px', minWidth: '240px' }}>Códigos asignados</th>
                </tr>
              </thead>
              <tbody>
                {plan.productos.map((prod, idx) => {
                  const completasTags = prod.paletas.filter((p) => p.tipo === 'COMPLETO').map((p) => p.uid_tag)
                  const puchoTag = prod.paletas.find((p) => p.tipo === 'PUCHO')?.uid_tag

                  return (
                    <tr
                      key={prod.id_producto}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: idx % 2 === 0 ? 'var(--color-surface)' : '#FAFCFD'
                      }}
                    >
                      <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <code style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-brand-deep)' }}>
                          {prod.sku}
                        </code>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <strong style={{ color: 'var(--color-text-primary)' }}>{prod.nombre}</strong>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600 }}>
                        {prod.cantidad_pedida.toLocaleString('es-PE')}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                        {prod.unidades_por_caja}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                        {prod.cajas_por_paleta}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--color-brand)' }}>
                        {prod.unidades_por_paleta.toLocaleString('es-PE')}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600 }}>
                        {prod.cajas_totales.toLocaleString('es-PE')}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center', background: '#F4F9FA' }}>
                        <span
                          style={{
                            background: 'var(--color-brand-soft)',
                            color: 'var(--color-brand-deep)',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '12px'
                          }}
                        >
                          {prod.paletas_completas}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {prod.cajas_pucho > 0 ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                            <span
                              style={{
                                background: '#FFF8EE',
                                color: 'var(--color-warning)',
                                border: '1px solid #F5D399',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontWeight: 600,
                                fontSize: '12px'
                              }}
                            >
                              {prod.cajas_pucho} caja(s)
                            </span>
                            {consolidationByProdId.has(prod.id_producto) && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  background: '#FFF8EE',
                                  color: 'var(--color-warning)',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  border: '1px solid #F6E2C5',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Existe un pucho en almacén para este SKU. Se debe unificar en muelle."
                              >
                                Unificar pucho
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>0</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: prod.unidades_pucho > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}>
                        {prod.unidades_pucho > 0 ? prod.unidades_pucho.toLocaleString('es-PE') : '0'}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {prod.total_bultos}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {completasTags.map((t) => (
                            <code
                              key={t}
                              onClick={() => handleCopyTag(t)}
                              style={{
                                background: 'var(--color-canvas)',
                                border: '1px solid var(--color-border)',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                color: 'var(--color-text-primary)'
                              }}
                              title="Clic para copiar código"
                            >
                              {t}
                            </code>
                          ))}
                          {puchoTag && (
                            <code
                              key={puchoTag}
                              onClick={() => handleCopyTag(puchoTag)}
                              style={{
                                background: '#FFF8EE',
                                border: '1px solid #F5D399',
                                color: 'var(--color-warning)',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title={
                                consolidationByProdId.has(prod.id_producto)
                                  ? `Código previsto para pucho. Requiere unificación con ${consolidationByProdId.get(prod.id_producto)?.tag_existente}. Clic para copiar.`
                                  : 'Código reservado para la paleta pucho (Clic para copiar)'
                              }
                            >
                              {puchoTag} (Pucho)
                            </code>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Fila de Totales Generales */}
              <tfoot>
                <tr style={{ background: 'var(--color-canvas)', borderTop: '2px solid var(--color-border)', fontWeight: 700 }}>
                  <td colSpan={3} style={{ padding: '12px 12px', textAlign: 'right', color: 'var(--color-brand-deep)' }}>
                    Totales acumulados del embarque:
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                    {totals.cantidadPedida.toLocaleString('es-PE')}
                  </td>
                  <td colSpan={3} style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                    —
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                    {totals.cajasTotales.toLocaleString('es-PE')}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--color-brand)' }}>
                    {totals.paletasCompletas} paleta(s)
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--color-warning)' }}>
                    {totals.cajasPucho} caja(s)
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--color-warning)' }}>
                    {totals.unidadesPucho.toLocaleString('es-PE')}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--color-success)', fontSize: '14px' }}>
                    {totals.totalBultos} paleta(s)
                  </td>
                  <td style={{ padding: '12px 12px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                    +{plan.etiquetas_reserva.length} etiquetas de contingencia
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECCIÓN 2: HOJA MAESTRA DE RÓTULOS PALETA POR PALETA (PARA DESCARGA EN MUELLE)
          ========================================================================= */}
      {(selectedTab === 'both' || selectedTab === 'pallets') && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  color: 'var(--color-brand-deep)'
                }}
              >
                2. Hoja maestra de rótulos individuales paleta por paleta (Checklist de descarga en muelle)
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Cada fila representa una paleta física con su código correlativo oficial reservado para impresión o escaneo RFID/NFC en el muelle de recepción.
              </p>
            </div>

            {/* Barra de Filtros y Búsqueda de Paletas */}
            <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="search"
                placeholder="Buscar código, SKU o producto..."
                value={palletSearch}
                onChange={(e) => setPalletSearch(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  minWidth: '220px'
                }}
              />

              <select
                value={palletTypeFilter}
                onChange={(e) => setPalletTypeFilter(e.target.value as any)}
                style={{
                  padding: '6px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  background: 'var(--color-surface)'
                }}
              >
                <option value="TODOS">Todos los tipos ({allPallets.length})</option>
                <option value="COMPLETO">Solo paletas estándar completas</option>
                <option value="PUCHO">Solo puchos (cajas sueltas)</option>
                <option value="RESERVA_EXCEDENTE">Solo etiquetas de contingencia</option>
              </select>

              <button
                type="button"
                className="button secondary button-sm"
                onClick={handleToggleSelectAllVerified}
              >
                {verifiedTags.size === filteredPallets.length && filteredPallets.length > 0
                  ? 'Desmarcar verificación'
                  : 'Marcar todas verificadas'}
              </button>
            </div>
          </div>

          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-canvas)', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '10px 8px', width: '36px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filteredPallets.length > 0 && verifiedTags.size === filteredPallets.length}
                      onChange={handleToggleSelectAllVerified}
                      title="Marcar todas como punteadas en muelle"
                    />
                  </th>
                  <th style={{ padding: '10px 8px', width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '10px 10px', minWidth: '120px' }}>Código / Tag RFID</th>
                  <th style={{ padding: '10px 10px', minWidth: '160px' }}>Tipo de bulto</th>
                  <th style={{ padding: '10px 10px', minWidth: '110px' }}>SKU</th>
                  <th style={{ padding: '10px 12px', minWidth: '220px' }}>Producto</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Cajas</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right' }}>Unidades</th>
                  <th style={{ padding: '10px 12px', minWidth: '120px' }}>Nivel de estiba</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', width: '80px' }}>Copiar</th>
                </tr>
              </thead>
              <tbody>
                {filteredPallets.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No se encontraron paletas con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredPallets.map((item) => {
                    const isVerified = verifiedTags.has(item.uid_tag)
                    const percent = item.unidadesPorPaleta > 0 && item.unidades > 0
                      ? Math.min(100, Math.round((item.unidades / item.unidadesPorPaleta) * 100))
                      : item.tipo === 'COMPLETO' ? 100 : 0

                    return (
                      <tr
                        key={item.uid_tag + '-' + item.correlativo}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          backgroundColor: isVerified
                            ? '#F1F9F4'
                            : item.tipo === 'PUCHO'
                            ? '#FFFDF9'
                            : item.tipo === 'RESERVA_EXCEDENTE'
                            ? '#FBFBFC'
                            : 'var(--color-surface)'
                        }}
                      >
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isVerified}
                            onChange={() => handleToggleVerified(item.uid_tag)}
                            title="Marcar como recibida y conforme en muelle"
                          />
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                          {item.correlativo}
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <code
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color:
                                item.tipo === 'PUCHO'
                                  ? 'var(--color-warning)'
                                  : item.tipo === 'RESERVA_EXCEDENTE'
                                  ? 'var(--color-text-secondary)'
                                  : 'var(--color-brand)',
                              background:
                                item.tipo === 'PUCHO'
                                  ? '#FFF8EE'
                                  : item.tipo === 'RESERVA_EXCEDENTE'
                                  ? 'var(--color-canvas)'
                                  : 'var(--color-brand-soft)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border:
                                item.tipo === 'RESERVA_EXCEDENTE'
                                  ? '1px dashed var(--color-border)'
                                  : '1px solid transparent'
                            }}
                          >
                            {item.uid_tag}
                          </code>
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          {item.tipo === 'COMPLETO' && (
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-brand-deep)' }}>
                              Paleta estándar completa
                            </span>
                          )}
                          {item.tipo === 'PUCHO' && (
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-warning)' }}>
                              Pucho (Cajas sueltas)
                            </span>
                          )}
                          {item.tipo === 'RESERVA_EXCEDENTE' && (
                            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                              Reserva de muelle (Contingencia)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <code style={{ fontSize: '12px', color: 'var(--color-brand-deep)' }}>{item.sku}</code>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {item.nombre}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>
                          {item.cajas > 0 ? item.cajas.toLocaleString('es-PE') : '—'}
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600 }}>
                          {item.unidades > 0 ? item.unidades.toLocaleString('es-PE') : '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {item.tipo === 'RESERVA_EXCEDENTE' ? (
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Disponible muelle</span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, background: '#E2E8F0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${percent}%`,
                                    height: '100%',
                                    background: item.tipo === 'PUCHO' ? 'var(--color-warning)' : 'var(--color-success)'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: item.tipo === 'PUCHO' ? 'var(--color-warning)' : 'var(--color-success)', width: '34px', textAlign: 'right' }}>
                                {percent}%
                              </span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="button secondary button-sm no-print"
                            style={{ padding: '2px 8px', fontSize: '11px' }}
                            onClick={() => handleCopyTag(item.uid_tag)}
                          >
                            {copiedTag === item.uid_tag ? 'Copiado' : 'Copiar'}
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECCIÓN 3: RÓTULOS DE CONTINGENCIA / RESERVA DE MUELLE
          ========================================================================= */}
      <div
        style={{
          background: 'var(--color-canvas)',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
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
            Etiquetas pre-asignadas de contingencia para excedentes en muelle ({plan.etiquetas_reserva.length} códigos):
          </strong>
          <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '640px' }}>
            Si durante la descarga física en muelle el contenedor presenta paletas o bultos adicionales no contemplados, el operario debe rotular con estos códigos reservados para conciliar sin detener la operación.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {plan.etiquetas_reserva.map((r) => (
            <code
              key={r.uid_tag}
              onClick={() => handleCopyTag(r.uid_tag)}
              style={{
                background: 'var(--color-surface)',
                border: '1px dashed var(--color-brand)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-brand)',
                cursor: 'pointer'
              }}
              title="Clic para copiar código de contingencia"
            >
              {r.uid_tag}
            </code>
          ))}
        </div>
      </div>
    </div>
  )
}
