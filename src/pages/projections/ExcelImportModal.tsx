import { useState, useRef, useMemo } from 'react'
import { projectionService } from '../../services/projectionService'
import type { ExcelImportResult, ProjectionItem, ProjectionTemplate } from '../../types/projections'

interface ExcelImportModalProps {
  isOpen: boolean
  onClose: () => void
  template: ProjectionTemplate
  items: ProjectionItem[]
  catalogProducts?: Array<{ id_producto?: number | null; sku?: string; nombre: string }>
  onApply: (updatedItems: ProjectionItem[], detectedMonths: string[]) => void
}

export function ExcelImportModal({
  isOpen,
  onClose,
  template,
  items,
  catalogProducts,
  onApply
}: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null)
  const [parsedItems, setParsedItems] = useState<ProjectionItem[] | null>(null)
  const [activeTab, setActiveTab] = useState<'poseo' | 'no_poseo'>('poseo')
  const [filterTerm, setFilterTerm] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filtrado de productos según término de búsqueda (declarados antes de cualquier return condicional)
  const filteredPoseo = useMemo(() => {
    if (!importResult?.productosPoseo) return []
    if (!filterTerm.trim()) return importResult.productosPoseo
    const term = filterTerm.toLowerCase().trim()
    return importResult.productosPoseo.filter(
      (p) =>
        p.nombre_producto.toLowerCase().includes(term) ||
        p.nombre_en_excel.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
    )
  }, [importResult?.productosPoseo, filterTerm])

  const filteredNoPoseo = useMemo(() => {
    if (!importResult?.productosNoPoseo) return []
    if (!filterTerm.trim()) return importResult.productosNoPoseo
    const term = filterTerm.toLowerCase().trim()
    return importResult.productosNoPoseo.filter((p) =>
      p.nombre_en_excel.toLowerCase().includes(term)
    )
  }, [importResult?.productosNoPoseo, filterTerm])

  if (!isOpen) return null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setErrorMsg(null)
    setImportResult(null)
    setParsedItems(null)
    setActiveTab('poseo')
    setFilterTerm('')
    setParsing(true)

    try {
      const res = await projectionService.parseMonthlyOutputsExcel(
        selectedFile,
        template,
        items,
        catalogProducts
      )
      if (!res.success || !res.result || !res.updatedItems) {
        setErrorMsg(res.error || 'No se pudieron extraer datos del archivo Excel.')
      } else {
        setImportResult(res.result)
        setParsedItems(res.updatedItems)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado al leer el archivo Excel.')
    } finally {
      setParsing(false)
    }
  }

  const handleConfirmApply = () => {
    if (!parsedItems || !importResult) return
    onApply(parsedItems, importResult.detectedMonths)
    onClose()
  }

  return (
    <div className="modal-backdrop">
      <div
        className="modal-card"
        style={{
          width: '880px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {/* Cabecera del Modal (Fija) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '20px 24px 16px 24px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            flexShrink: 0
          }}
        >
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-brand)' }}>
              Módulo 06 · Consumos y demanda real
            </span>
            <h2 className="section-title" style={{ margin: '4px 0 0 0', fontSize: '20px', color: 'var(--color-brand-deep)' }}>
              Cargar salidas hacia agencias desde Excel
            </h2>
            <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
              Importa el reporte de salidas mensuales. Solo se incorporarán a la proyección los productos que existan en tu catálogo de Maestros y Empaque para evitar incongruencias.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={parsing}>
            ✕
          </button>
        </div>

        {/* Cuerpo Desplazable del Modal */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
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

          {/* Guía de Encabezados Requeridos en el Excel (Plegable si ya hay resultado) */}
          <details
            open={!importResult}
            style={{
              background: 'var(--color-canvas)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '16px'
            }}
          >
            <summary style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-brand-deep)', cursor: 'pointer', userSelect: 'none' }}>
              Estructura requerida del archivo Excel (haz clic para {importResult ? 'ver' : 'ocultar'})
            </summary>
            <p style={{ margin: '8px 0 10px 0', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
              El archivo debe contener una fila de encabezados con las siguientes columnas para identificar fecha, producto y salida:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '10px' }}>
              <div style={{ background: 'var(--color-surface)', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                <strong style={{ fontSize: '12px', color: 'var(--color-brand)' }}>1. Fecha *</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  Fecha del despacho (ej. 15/06/2026). Genera automáticamente los meses reales (ej. JUN a SET).
                </p>
              </div>
              <div style={{ background: 'var(--color-surface)', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                <strong style={{ fontSize: '12px', color: 'var(--color-brand)' }}>2. Producto / SKU *</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  Nombre del producto o SKU. Se valida contra el catálogo maestro (Maestros y Empaque).
                </p>
              </div>
              <div style={{ background: 'var(--color-surface)', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                <strong style={{ fontSize: '12px', color: 'var(--color-brand)' }}>3. Cantidad *</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  Número de unidades despachadas. Se acumularán automáticamente por mes para cada producto.
                </p>
              </div>
              <div style={{ background: 'var(--color-surface)', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                <strong style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>4. Agencia (opcional)</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  Sede destino o agencia remitente.
                </p>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', background: 'var(--color-brand-soft)', padding: '6px 10px', borderRadius: '4px' }}>
              <em>Nota: También se acepta el formato donde los meses vienen como columnas directas (ej. JUN, JUL, AGO, SET).</em>
            </div>
          </details>

        {/* Zona de Selección de Archivo */}
        <div
          style={{
            border: '2px dashed var(--color-border)',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
            background: 'var(--color-canvas)',
            cursor: 'pointer',
            marginBottom: '16px',
            transition: 'border-color 0.15s ease'
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-brand-deep)', marginBottom: '4px' }}>
            {file ? file.name : 'Haz clic para seleccionar o arrastra el archivo Excel (.xlsx, .xls, .csv)'}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: '13px' }}>
            {file
              ? `Tamaño: ${(file.size / 1024).toFixed(1)} KB · Haz clic para cambiar de archivo`
              : 'Compatible con reportes de salidas mensuales de almacén o Kardex consolidado de agencias'}
          </p>
        </div>

        {parsing && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
            Procesando hojas y cruzando contra Maestros y Empaque...
          </div>
        )}

        {/* Resumen del Análisis de Excel */}
        {importResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Tira de 4 Indicadores Clave */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px'
              }}
            >
              <div
                style={{
                  background: 'rgba(47, 125, 79, 0.08)',
                  border: '1px solid var(--color-success)',
                  padding: '12px 14px',
                  borderRadius: '6px'
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--color-success)', display: 'block', fontWeight: 600 }}>
                  Productos que poseo
                </span>
                <strong style={{ fontSize: '24px', color: 'var(--color-success)', display: 'block', margin: '2px 0' }}>
                  {importResult.productosPoseo.length}
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>
                  En Maestros y Empaque (a incorporar)
                </span>
              </div>

              <div
                style={{
                  background: importResult.productosNoPoseo.length > 0 ? 'rgba(188, 121, 31, 0.08)' : 'var(--color-canvas)',
                  border: importResult.productosNoPoseo.length > 0 ? '1px solid var(--color-warning)' : '1px solid var(--color-border)',
                  padding: '12px 14px',
                  borderRadius: '6px'
                }}
              >
                <span style={{ fontSize: '12px', color: importResult.productosNoPoseo.length > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)', display: 'block', fontWeight: 600 }}>
                  Productos no registrados
                </span>
                <strong style={{ fontSize: '24px', color: importResult.productosNoPoseo.length > 0 ? 'var(--color-warning)' : 'var(--color-text-primary)', display: 'block', margin: '2px 0' }}>
                  {importResult.productosNoPoseo.length}
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>
                  Omitidos (no se cargarán a la tabla)
                </span>
              </div>

              <div
                style={{
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--color-border)',
                  padding: '12px 14px',
                  borderRadius: '6px'
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 600 }}>
                  Meses identificados
                </span>
                <strong style={{ fontSize: '24px', color: 'var(--color-brand-deep)', display: 'block', margin: '2px 0' }}>
                  {importResult.detectedMonths.length}
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>
                  {importResult.detectedMonths.join(', ')}
                </span>
              </div>

              <div
                style={{
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--color-border)',
                  padding: '12px 14px',
                  borderRadius: '6px'
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 600 }}>
                  Total filas leídas
                </span>
                <strong style={{ fontSize: '24px', color: 'var(--color-text-primary)', display: 'block', margin: '2px 0' }}>
                  {importResult.totalExcelRows}
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>
                  En la hoja del archivo
                </span>
              </div>
            </div>

            {/* Aviso Operativo de Exclusión Preventiva */}
            {importResult.productosNoPoseo.length > 0 ? (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: 'rgba(188, 121, 31, 0.1)',
                  border: '1px solid var(--color-warning)',
                  fontSize: '13px',
                  color: 'var(--color-text-primary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>⚠</span>
                <div>
                  <strong>Control de consistencia:</strong> Se detectaron {importResult.productosNoPoseo.length} productos en el archivo Excel que no están registrados en el catálogo de <em>Maestros y Empaque</em>.
                  <strong> Solo se incorporarán a la tabla los {importResult.productosPoseo.length} productos que posees</strong> para evitar incongruencias en los cálculos de empaque, estiba y recepción física.
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: 'rgba(47, 125, 79, 0.08)',
                  border: '1px solid var(--color-success)',
                  fontSize: '13px',
                  color: 'var(--color-success)',
                  fontWeight: 500
                }}
              >
                ✔ Todos los productos detectados en el archivo coinciden con tu catálogo de Maestros y Empaque.
              </div>
            )}

            {/* Selector de Pestañas: Poseo vs No Poseo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('poseo')
                    setFilterTerm('')
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: activeTab === 'poseo' ? 'var(--color-brand)' : 'var(--color-border)',
                    background: activeTab === 'poseo' ? 'var(--color-brand-soft)' : 'var(--color-surface)',
                    color: activeTab === 'poseo' ? 'var(--color-brand-deep)' : 'var(--color-text-secondary)',
                    fontWeight: activeTab === 'poseo' ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Productos que poseo ({importResult.productosPoseo.length} a cargar)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('no_poseo')
                    setFilterTerm('')
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: activeTab === 'no_poseo' ? 'var(--color-warning)' : 'var(--color-border)',
                    background: activeTab === 'no_poseo' ? 'rgba(188, 121, 31, 0.1)' : 'var(--color-surface)',
                    color: activeTab === 'no_poseo' ? 'var(--color-warning)' : 'var(--color-text-secondary)',
                    fontWeight: activeTab === 'no_poseo' ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Productos no registrados ({importResult.productosNoPoseo.length} omitidos)
                </button>
              </div>

              {/* Filtro de búsqueda rápido */}
              <div>
                <input
                  type="text"
                  placeholder="Buscar en la lista..."
                  value={filterTerm}
                  onChange={(e) => setFilterTerm(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    fontSize: '12px',
                    width: '200px'
                  }}
                />
              </div>
            </div>

            {/* TABLA 1: PRODUCTOS QUE POSEO (A INCORPORAR A LA MATRIZ) */}
            {activeTab === 'poseo' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Lista de productos en catálogo que se cargarán a la tabla ({filteredPoseo.length} de {importResult.productosPoseo.length}):
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600 }}>
                    ✔ Se agregarán a la proyección
                  </span>
                </div>

                {filteredPoseo.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', background: 'var(--color-canvas)', borderRadius: '6px', fontSize: '13px', color: 'var(--color-text-secondary)', border: '1px dashed var(--color-border)' }}>
                    {importResult.productosPoseo.length === 0
                      ? 'Ningún producto del archivo Excel coincide con los productos registrados en Maestros y Empaque.'
                      : 'No hay coincidencias con el término de búsqueda.'}
                  </div>
                ) : (
                  <div className="table-wrap" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>N°</th>
                          <th style={{ width: '100px' }}>SKU</th>
                          <th>Producto en Maestros y Empaque</th>
                          <th>Nombre en Excel</th>
                          {importResult.detectedMonths.map((m) => (
                            <th key={m} style={{ textAlign: 'right' }}>
                              {m}
                            </th>
                          ))}
                          <th style={{ textAlign: 'right' }}>Total salidas</th>
                          <th style={{ width: '120px', textAlign: 'center' }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPoseo.map((p, idx) => (
                          <tr key={p.id_producto}>
                            <td>{idx + 1}</td>
                            <td>
                              <span style={{ fontWeight: 600, color: 'var(--color-brand)', fontSize: '12px' }}>
                                {p.sku || '-'}
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: 'var(--color-text-primary)' }}>{p.nombre_producto}</strong>
                            </td>
                            <td style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                              {p.nombre_en_excel}
                            </td>
                            {importResult.detectedMonths.map((m) => {
                              const val = p.valoresMeses[m]
                              return (
                                <td key={m} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                  {val !== undefined ? Math.abs(val).toLocaleString('es-PE') : '-'}
                                </td>
                              )
                            })}
                            <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                              {p.totalSalidas.toLocaleString('es-PE')}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                style={{
                                  background: 'rgba(47, 125, 79, 0.12)',
                                  color: 'var(--color-success)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                ✓ A cargar
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TABLA 2: PRODUCTOS NO REGISTRADOS (OMITIDOS) */}
            {activeTab === 'no_poseo' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Lista de productos detectados no registrados en el sistema ({filteredNoPoseo.length} de {importResult.productosNoPoseo.length}):
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-warning)', fontWeight: 600 }}>
                    ⛔ Omitidos de la proyección
                  </span>
                </div>

                {filteredNoPoseo.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', background: 'var(--color-canvas)', borderRadius: '6px', fontSize: '13px', color: 'var(--color-text-secondary)', border: '1px dashed var(--color-border)' }}>
                    {importResult.productosNoPoseo.length === 0
                      ? 'No hay productos omitidos. Todos los productos del archivo están registrados en tu sistema.'
                      : 'No hay coincidencias con el término de búsqueda.'}
                  </div>
                ) : (
                  <div>
                    <div className="table-wrap" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>N°</th>
                            <th>Nombre del producto en Excel</th>
                            {importResult.detectedMonths.map((m) => (
                              <th key={m} style={{ textAlign: 'right' }}>
                                {m}
                              </th>
                            ))}
                            <th style={{ textAlign: 'right' }}>Total salidas</th>
                            <th style={{ width: '150px', textAlign: 'center' }}>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredNoPoseo.map((p, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>
                                <strong style={{ color: 'var(--color-text-primary)' }}>{p.nombre_en_excel}</strong>
                              </td>
                              {importResult.detectedMonths.map((m) => {
                                const val = p.valoresMeses[m]
                                return (
                                  <td key={m} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                    {val !== undefined ? Math.abs(val).toLocaleString('es-PE') : '-'}
                                  </td>
                                )
                              })}
                              <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                                {p.totalSalidas.toLocaleString('es-PE')}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span
                                  style={{
                                    background: 'rgba(188, 121, 31, 0.12)',
                                    color: 'var(--color-warning)',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  ⛔ No registrado
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                      Nota: Para incluir estos productos en tu cálculo de proyección, primero debes registrarlos en el módulo <strong>Maestros y Empaque (MOD-01)</strong> con sus factores de empaque y estiba.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'var(--color-brand-soft)',
                border: '1px solid var(--color-border)',
                fontSize: '13px',
                color: 'var(--color-brand-deep)'
              }}
            >
              Al confirmar, los consumos mensuales se incorporarán únicamente a los <strong>{importResult.productosPoseo.length} productos que posees</strong> y el promedio de cada mes se recalculará automáticamente según las salidas hacia agencias.
            </div>
          </div>
        )}
        </div>

        {/* Footer Fijo de Acciones del Modal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {importResult ? (
              <span>
                <strong>{importResult.productosPoseo.length}</strong> de {importResult.totalExcelProducts} productos listos para incorporar
              </span>
            ) : (
              <span>Selecciona un archivo Excel (.xlsx o .xls) para comenzar</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="button secondary" onClick={onClose} disabled={parsing}>
              Cancelar
            </button>
            <button
              type="button"
              className="button primary"
              onClick={handleConfirmApply}
              disabled={!parsedItems || !importResult || importResult.productosPoseo.length === 0 || parsing}
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              {importResult
                ? `Cargar ${importResult.productosPoseo.length} productos a la matriz`
                : 'Cargar salidas a la matriz'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
