import type React from 'react'
import {
  projectionFormulaEngine,
  type FormulaEvaluationContext
} from '../../../services/projectionFormulaEngine'
import type {
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

interface AddCustomColumnModalProps {
  isOpen: boolean
  onClose: () => void
  activeTemplate: ProjectionTemplate
  newColName: string
  newColVariable: string
  newColFormula: string
  newColFormat: ColumnDisplayFormat
  onColNameChange: (val: string) => void
  setNewColVariable: (val: string) => void
  setNewColFormula: (val: string) => void
  setNewColFormat: (fmt: ColumnDisplayFormat) => void
  onInsertToken: (token: string) => void
  formulaValidation: { valid: boolean; error?: string }
  simulationSampleRows: CalculatedProjectionRow[]
  isAddingColumn: boolean
  onSubmit: (e: React.FormEvent) => Promise<void> | void
}

export function AddCustomColumnModal({
  isOpen,
  onClose,
  activeTemplate,
  newColName,
  newColVariable,
  newColFormula,
  newColFormat,
  onColNameChange,
  setNewColVariable,
  setNewColFormula,
  setNewColFormat,
  onInsertToken,
  formulaValidation,
  simulationSampleRows,
  isAddingColumn,
  onSubmit
}: AddCustomColumnModalProps) {
  if (!isOpen || !activeTemplate) return null

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
              Dinámica tipo Excel
            </span>
            <h2
              style={{
                margin: '2px 0 0 0',
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--color-text-primary)'
              }}
            >
              Nueva columna calculada
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
          Escribe el nombre de la nueva columna y define su ecuación matemática. Al agregarla, la columna
          se incorporará a la matriz y calculará su valor reactivamente para todos los productos.
        </p>

        <form
          onSubmit={(e) => void onSubmit(e)}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          {/* Campos: Nombre, Código de variable y Formato */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.9fr', gap: '12px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: '4px'
                }}
              >
                Nombre de la columna *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Costo de reposición"
                value={newColName}
                onChange={(e) => onColNameChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: '4px'
                }}
              >
                Variable (Token) *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. COSTO_TOTAL"
                value={newColVariable}
                onChange={(e) => setNewColVariable(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  fontFamily: 'monospace',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: '4px'
                }}
              >
                Formato numérico
              </label>
              <select
                value={newColFormat}
                onChange={(e) => setNewColFormat(e.target.value as ColumnDisplayFormat)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  fontSize: '13px'
                }}
              >
                <option value="entero">Entero (ej. 1,000)</option>
                <option value="decimal">Decimal (ej. 1,000.50)</option>
                <option value="moneda_pen">Moneda Soles (S/ 1,000)</option>
                <option value="moneda_usd">Moneda Dólares ($ 1,000)</option>
                <option value="porcentaje">Porcentaje (15%)</option>
              </select>
            </div>
          </div>

          {/* Fórmulas recomendadas comunes */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '6px'
              }}
            >
              Fórmulas sugeridas de Excel (un clic para cargar):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
              {[
                {
                  label: 'Costo total estimado (Compra × S/ 25.00)',
                  formula: 'COMPRA_SUGERIDA * 25',
                  desc: 'Multiplica la compra sugerida por un costo unitario estimado.'
                },
                {
                  label: 'Compra en cajas de 50 unidades (CEIL)',
                  formula: 'CEIL(COMPRA_SUGERIDA / 50)',
                  desc: 'Ajusta la compra a múltiplos de cajas o bultos de 50 unidades.'
                },
                {
                  label: 'Stock total proyectado (Stock actual + Compra)',
                  formula: 'STOCK_REAL + COMPRA_SUGERIDA',
                  desc: 'Total de existencias proyectadas al llegar el pedido de importación.'
                },
                {
                  label: 'Cobertura ampliada en meses post-llegada',
                  formula: '(STOCK_REAL + COMPRA_SUGERIDA) / (PROM_MEN > 0 ? PROM_MEN : 1)',
                  desc: 'Meses de duración total considerando existencias más compra sugerida.'
                },
                {
                  label: 'Déficit directo hacia stock mín final (Sin lote)',
                  formula: 'MAX(0, STOCK_MIN_F - STOCK_REAL)',
                  desc: 'Déficit estricto de unidades para alcanzar el stock mínimo final.'
                }
              ].map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => setNewColFormula(preset.formula)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border:
                      newColFormula.trim() === preset.formula
                        ? '1px solid var(--color-brand)'
                        : '1px solid var(--color-border)',
                    background:
                      newColFormula.trim() === preset.formula
                        ? 'var(--color-brand-soft)'
                        : 'var(--color-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--color-text-primary)' }}>
                      {preset.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      {preset.desc}
                    </div>
                  </div>
                  <code
                    style={{
                      fontSize: '11px',
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

          {/* Botones de variables disponibles */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '6px'
              }}
            >
              Insertar datos y columnas (clic para añadir a la ecuación):
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { token: 'PROM_MEN', label: 'Promedio mensual' },
                { token: 'STOCK_REAL', label: 'Stock real' },
                { token: 'LEAD_TIME', label: 'Lead time meses' },
                { token: 'STOCK_MIN', label: 'Stock mín base' },
                { token: 'SEG', label: 'Seguridad' },
                { token: 'STOCK_MIN_F', label: 'Stock mín final' },
                { token: 'STOCK_REDONDEADO', label: 'Stock redondeado' },
                { token: 'COMPRA_SUGERIDA', label: 'Compra sugerida' },
                { token: 'MESES_DURACION', label: 'Meses de duración' },
                ...(activeTemplate.columnas_personalizadas || []).map((c) => ({
                  token: (c.codigo_variable || c.id).toUpperCase(),
                  label: c.nombre
                }))
              ].map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => onInsertToken(v.token)}
                  title={`Insertar ${v.label}`}
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

          {/* Operadores y funciones */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '6px'
              }}
            >
              Operadores y funciones matemáticas:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['+', '-', '*', '/', '(', ')', 'MAX(', 'MIN(', 'ROUND(', 'CEIL(', 'FLOOR('].map((op) => (
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

          {/* Editor de la fórmula */}
          <div>
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
                Ecuación matemática (Fórmula Excel):
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
                {formulaValidation.valid
                  ? 'Sintaxis válida'
                  : `Error: ${formulaValidation.error}`}
              </span>
            </div>
            <input
              type="text"
              required
              value={newColFormula}
              onChange={(e) => setNewColFormula(e.target.value)}
              placeholder="Ej. COMPRA_SUGERIDA * 25"
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

          {/* Previsualización en vivo por producto */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '6px'
              }}
            >
              Simulación en tiempo real (muestra de productos):
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
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Stock real</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Compra</th>
                    <th
                      style={{
                        padding: '6px 10px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: 'var(--color-brand)'
                      }}
                    >
                      Resultado {newColName || 'Nueva columna'}
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
                      DIAS_MES: activeTemplate.dias_por_mes || 30,
                      COMPRA_SUGERIDA: sample.compra_sugerida,
                      MESES_DURACION: sample.meses_duracion
                    }
                    const simVal = projectionFormulaEngine.evaluateFormula(
                      newColFormula,
                      sampleCtx
                    )
                    return (
                      <tr key={sample.id_item} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 500 }}>
                          {sample.nombre_producto}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                          {sample.stock_real.toLocaleString('es-PE')}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                          {sample.compra_sugerida.toLocaleString('es-PE')}
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
                          {formatCustomColumnValue(simVal, newColFormat)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={!formulaValidation.valid || isAddingColumn || !newColName.trim()}
            >
              {isAddingColumn ? 'Guardando columna...' : 'Crear columna y calcular'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
