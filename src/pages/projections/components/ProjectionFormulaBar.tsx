import type { CalculableColumnKey, ProjectionTemplate } from '../../../types/projections'

interface ProjectionFormulaBarProps {
  activeTemplate: ProjectionTemplate
  formulaBarColumn: CalculableColumnKey
  setFormulaBarColumn: (col: CalculableColumnKey) => void
  columnChips: Record<string, string>
  onOpenEquationModal: (col: CalculableColumnKey) => void
  onOpenAddColumnModal: () => void
  onOpenParamsModal: () => void
  isOrderLocked: boolean
}

export function ProjectionFormulaBar({
  activeTemplate,
  formulaBarColumn,
  setFormulaBarColumn,
  columnChips,
  onOpenEquationModal,
  onOpenAddColumnModal,
  onOpenParamsModal,
  isOrderLocked
}: ProjectionFormulaBarProps) {
  if (!activeTemplate) return null

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}
    >
      {/* Logo FX */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          borderRadius: '4px',
          background: 'var(--color-brand-soft)',
          color: 'var(--color-brand-deep)',
          fontWeight: 700,
          fontSize: '13px'
        }}
      >
        <span>fx</span>
      </div>

      {/* Selector de Columna a inspeccionar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Ecuación de la columna:
        </span>
        <select
          value={formulaBarColumn}
          onChange={(e) => setFormulaBarColumn(e.target.value as CalculableColumnKey)}
          style={{
            padding: '6px 10px',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            background: 'var(--color-surface)',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-brand)'
          }}
        >
          <optgroup label="Columnas estándar del sistema">
            <option value="stock_min">Stock mínimo base (Stock mín)</option>
            <option value="seguridad">Stock de seguridad (Seguridad)</option>
            <option value="stock_min_f">Stock mínimo final (Stock mín final)</option>
            <option value="stock_min_redondeado">Stock redondeado (Redondeado)</option>
            <option value="compra_sugerida">Compra sugerida (Compra)</option>
            <option value="meses_duracion">Meses de duración (Duración)</option>
          </optgroup>
          {activeTemplate.columnas_personalizadas && activeTemplate.columnas_personalizadas.length > 0 && (
            <optgroup label="Columnas calculadas personalizadas">
              {activeTemplate.columnas_personalizadas.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.nombre} ({col.codigo_variable})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Fórmula activa actual en texto */}
      <div
        style={{
          flex: 1,
          minWidth: '220px',
          background: 'var(--color-canvas)',
          padding: '6px 12px',
          borderRadius: '4px',
          border: '1px solid var(--color-border)',
          fontFamily: 'monospace',
          fontSize: '13px',
          color: 'var(--color-text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
        title={columnChips[formulaBarColumn]}
      >
        = {columnChips[formulaBarColumn]}
      </div>

      {/* Botones de acción */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="button secondary button-sm"
          onClick={() => onOpenEquationModal(formulaBarColumn)}
          title="Abrir el constructor visual para cambiar la fórmula de esta columna"
          style={{ fontWeight: 600 }}
        >
          Diseñar ecuación de columna
        </button>

        {!isOrderLocked && (
          <button
            type="button"
            className="button secondary button-sm"
            onClick={onOpenAddColumnModal}
            title="Crear una nueva columna calculada tipo Excel"
            style={{ fontWeight: 600, borderColor: 'var(--color-brand)', color: 'var(--color-brand)' }}
          >
            + Nueva columna Excel
          </button>
        )}

        <button
          type="button"
          className="button secondary button-sm"
          onClick={onOpenParamsModal}
          title="Configurar Lead Time y Margen de Seguridad de la plantilla"
        >
          Parámetros globales
        </button>
      </div>
    </div>
  )
}
