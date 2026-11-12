import {
  projectionFormulaEngine,
  type FormulaEvaluationContext
} from '../../../services/projectionFormulaEngine'
import type {
  CalculableColumnKey,
  CalculatedProjectionRow,
  ColumnDisplayFormat,
  ProjectionTemplate
} from '../../../types/projections'

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

interface EquationBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  activeTemplate: ProjectionTemplate
  selectedColumnForEquation: CalculableColumnKey
  setSelectedColumnForEquation: (col: CalculableColumnKey) => void
  setFormulaBarColumn: (col: CalculableColumnKey) => void
  draftFormula: string
  setDraftFormula: (formula: string) => void
  draftCustomName: string
  setDraftCustomName: (name: string) => void
  draftCustomFormat: ColumnDisplayFormat
  setDraftCustomFormat: (fmt: ColumnDisplayFormat) => void
  onInsertToken: (token: string) => void
  formulaValidation: { valid: boolean; error?: string }
  simulationSampleRows: CalculatedProjectionRow[]
  isSavingFormula: boolean
  onApplyEquation: () => Promise<void> | void
  onDeleteCustomColumn: (colId: string, colName: string) => Promise<void> | void
}

export function EquationBuilderModal({
  isOpen,
  onClose,
  activeTemplate,
  selectedColumnForEquation,
  setSelectedColumnForEquation,
  setFormulaBarColumn,
  draftFormula,
  setDraftFormula,
  draftCustomName,
  setDraftCustomName,
  draftCustomFormat,
  setDraftCustomFormat,
  onInsertToken,
  formulaValidation,
  simulationSampleRows,
  isSavingFormula,
  onApplyEquation,
  onDeleteCustomColumn
}: EquationBuilderModalProps) {
  if (!isOpen || !activeTemplate) return null

  const activeEquationConfig = projectionFormulaEngine.getColumnEquationConfig(
    selectedColumnForEquation,
    activeTemplate
  )

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '680px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px'
          }}
        >
          <div>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-brand)',
                fontWeight: 600,
                textTransform: 'uppercase'
              }}
            >
              Editor de Fórmulas y Ecuaciones
            </span>
            <h2
              style={{
                margin: '2px 0 0 0',
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--color-text-primary)'
              }}
            >
              Configurar ecuación: {activeEquationConfig.label}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Elige las variables de datos y operadores matemáticos para construir la fórmula que
          calculará el valor de esta columna por cada producto, al igual que en una hoja de Excel.
        </p>

        {/* Explicación didáctica interactiva si se edita la Duración */}
        {selectedColumnForEquation === 'meses_duracion' && (
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--color-brand-soft)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              marginBottom: '14px',
              fontSize: '13px',
              color: 'var(--color-brand-deep)'
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>
              ¿Cómo funciona el cálculo de duración?
            </div>
            <div style={{ lineHeight: '1.4' }}>
              Indica cuántos meses y días te durará tu inventario físico actual antes de quedarte en cero (quiebre de existencias).
              <br />
              <strong>Ejemplo intuitivo:</strong> Si tienes <strong>1,200 unidades</strong> en almacén y el promedio mensual de salida a agencias es de <strong>400 unid/mes</strong>:
              <br />
              <code style={{ background: '#FFF', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginTop: '6px', border: '1px solid var(--color-border)' }}>
                Duración = 1,200 ÷ 400 = 3.0 meses (90 días de cobertura)
              </code>
            </div>
          </div>
        )}

        {/* Pestañas para cambiar rápidamente de columna si lo desea */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            marginBottom: '14px',
            paddingBottom: '4px'
          }}
        >
          {[
            'stock_min',
            'seguridad',
            'stock_min_f',
            'stock_min_redondeado',
            'compra_sugerida',
            'meses_duracion',
            ...(activeTemplate.columnas_personalizadas?.map((c) => c.id) || [])
          ].map((k) => {
            const isSelected = selectedColumnForEquation === k
            const cfg = projectionFormulaEngine.getColumnEquationConfig(k, activeTemplate)
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setSelectedColumnForEquation(k)
                  setFormulaBarColumn(k)
                  setDraftFormula(cfg.currentFormula)
                  if (cfg.isCustom) {
                    setDraftCustomName(cfg.label)
                    setDraftCustomFormat(cfg.format || 'entero')
                  }
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: isSelected
                    ? '1px solid var(--color-brand)'
                    : '1px solid var(--color-border)',
                  background: isSelected ? 'var(--color-brand-soft)' : 'var(--color-surface)',
                  color: isSelected ? 'var(--color-brand-deep)' : 'var(--color-text-secondary)',
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: '12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {cfg.isCustom ? `[+] ${cfg.headerTitle}` : cfg.headerTitle}
              </button>
            )
          })}
        </div>

        {/* Si es columna personalizada, permitir editar nombre y formato de celda */}
        {activeEquationConfig.isCustom && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '14px',
              padding: '10px 12px',
              background: 'var(--color-canvas)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px'
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: '4px'
                }}
              >
                Nombre de la columna
              </label>
              <input
                type="text"
                value={draftCustomName}
                onChange={(e) => setDraftCustomName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  background: 'var(--color-surface)',
                  fontSize: '13px'
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: '4px'
                }}
              >
                Formato de visualización
              </label>
              <select
                value={draftCustomFormat}
                onChange={(e) => setDraftCustomFormat(e.target.value as ColumnDisplayFormat)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  background: 'var(--color-surface)',
                  fontSize: '13px'
                }}
              >
                <option value="entero">Número entero (ej. 1,000)</option>
                <option value="decimal">Número decimal (ej. 1,000.50)</option>
                <option value="moneda_pen">Moneda Soles (S/ 1,000)</option>
                <option value="moneda_usd">Moneda Dólares ($ 1,000)</option>
                <option value="porcentaje">Porcentaje (15%)</option>
              </select>
            </div>
          </div>
        )}

        {/* Paso 1: Fórmulas predefinidas / recomendadas con 1 clic */}
        <div style={{ marginBottom: '14px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: '6px'
            }}
          >
            Opciones y modelos de cálculo predefinidos:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
            {activeEquationConfig.presets.map((preset) => (
              <div
                key={preset.id}
                onClick={() => setDraftFormula(preset.formula)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border:
                    draftFormula.trim() === preset.formula.trim()
                      ? '1px solid var(--color-brand)'
                      : '1px solid var(--color-border)',
                  background:
                    draftFormula.trim() === preset.formula.trim()
                      ? 'var(--color-brand-soft)'
                      : 'var(--color-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '13px',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    {preset.label}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {preset.description}
                  </div>
                </div>
                <code
                  style={{
                    fontSize: '12px',
                    background: '#F1F5F9',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: 'var(--color-brand-deep)'
                  }}
                >
                  {preset.formula}
                </code>
              </div>
            ))}
          </div>
        </div>

        {/* Paso 2: Variables disponibles para insertar */}
        <div style={{ marginBottom: '12px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: '6px'
            }}
          >
            Insertar datos de la fila (clic para añadir a la ecuación):
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {activeEquationConfig.availableVariables.map((v) => (
              <button
                key={v.token}
                type="button"
                onClick={() => onInsertToken(v.token)}
                title={v.description}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-brand)',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                + {v.token}
              </button>
            ))}
          </div>
        </div>

        {/* Paso 3: Operadores matemáticos */}
        <div style={{ marginBottom: '14px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: '6px'
            }}
          >
            Operadores y funciones:
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {['+', '-', '*', '/', '(', ')', 'MAX(', 'MIN(', 'ROUND(', 'CEIL('].map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => onInsertToken(op)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  background: '#F8FAFC',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        {/* Paso 4: Editor de ecuación */}
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px'
            }}
          >
            <label
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary)'
              }}
            >
              Ecuación activa:
            </label>
            <span
              style={{
                fontSize: '12px',
                color: formulaValidation.valid
                  ? 'var(--color-success)'
                  : 'var(--color-danger)',
                fontWeight: 600
              }}
            >
              {formulaValidation.valid ? 'Sintaxis válida' : `Error: ${formulaValidation.error}`}
            </span>
          </div>
          <input
            type="text"
            value={draftFormula}
            onChange={(e) => setDraftFormula(e.target.value)}
            placeholder="Ej. STOCK_REDONDEADO * FACTOR_COMPRA"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontFamily: 'monospace',
              fontSize: '14px',
              borderRadius: '6px',
              border: formulaValidation.valid
                ? '1px solid var(--color-brand)'
                : '1px solid var(--color-danger)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>

        {/* Paso 5: Simulación en vivo por producto */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: '6px'
            }}
          >
            Simulación en tiempo real (muestra de productos de la matriz):
          </label>
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              background: 'var(--color-canvas)',
              overflow: 'hidden'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#EAEFF2', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Producto</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Promedio</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Stock real</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Redondeado</th>
                  <th
                    style={{
                      padding: '6px 10px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: 'var(--color-brand)'
                    }}
                  >
                    Resultado {activeEquationConfig.headerTitle}
                  </th>
                </tr>
              </thead>
              <tbody>
                {simulationSampleRows.map((sample) => {
                  const sampleCtx: FormulaEvaluationContext = {
                    PROM_MEN: sample.promedio_final,
                    STOCK_REAL: sample.stock_real,
                    LEAD_TIME: activeTemplate.lead_time_meses || 3,
                    STOCK_MIN: sample.stock_min,
                    SEG: sample.seguridad,
                    STOCK_MIN_F: sample.stock_min_f,
                    STOCK_REDONDEADO: sample.stock_min_redondeado,
                    FACTOR_COMPRA: activeTemplate.factor_compra || 2,
                    SEGURIDAD_PCT: activeTemplate.seguridad_pct || 0.2,
                    DIAS_MES: activeTemplate.dias_por_mes || 30
                  }
                  const simVal = projectionFormulaEngine.evaluateFormula(
                    draftFormula,
                    sampleCtx
                  )
                  return (
                    <tr key={sample.id_item} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 500 }}>
                        {sample.nombre_producto}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        {sample.promedio_final.toLocaleString('es-PE')}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        {sample.stock_real.toLocaleString('es-PE')}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        {sample.stock_min_redondeado.toLocaleString('es-PE')}
                      </td>
                      <td
                        style={{
                          padding: '6px 10px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: 'var(--color-brand-deep)',
                          background: 'var(--color-brand-soft)'
                        }}
                      >
                        {formatCustomColumnValue(simVal, activeEquationConfig.format)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Acciones del Modal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {activeEquationConfig.isCustom && (
            <button
              type="button"
              className="button secondary"
              style={{
                marginRight: 'auto',
                color: 'var(--color-danger)',
                borderColor: 'var(--color-danger)'
              }}
              onClick={() =>
                void onDeleteCustomColumn(
                  activeEquationConfig.key,
                  draftCustomName || activeEquationConfig.label
                )
              }
              title="Eliminar permanentemente esta columna de la matriz"
            >
              Eliminar columna
            </button>
          )}
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
          {!activeEquationConfig.isCustom && (
            <button
              type="button"
              className="button secondary"
              onClick={() => setDraftFormula(activeEquationConfig.defaultFormula)}
              title="Restaurar a la fórmula estándar del reporte original"
            >
              Restablecer fórmula original
            </button>
          )}
          <button
            type="button"
            className="button primary"
            disabled={!formulaValidation.valid || isSavingFormula}
            onClick={() => void onApplyEquation()}
          >
            {isSavingFormula ? 'Aplicando...' : 'Aplicar ecuación a toda la columna'}
          </button>
        </div>
      </div>
    </div>
  )
}
