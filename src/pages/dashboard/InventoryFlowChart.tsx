import { useState, useMemo, useRef } from 'react'

export interface DailyFlowPoint {
  date: string
  label: string
  entradas: number
  salidas: number
}

interface Props {
  data7Days?: DailyFlowPoint[]
  data4Weeks?: DailyFlowPoint[]
}

export function InventoryFlowChart({ data7Days, data4Weeks }: Props) {
  const [period, setPeriod] = useState<'7d' | '4w'>('7d')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Datos base por defecto
  const default7Days: DailyFlowPoint[] = useMemo(() => [
    { date: '03 Nov', label: 'Lunes 03', entradas: 4200, salidas: 3100 },
    { date: '04 Nov', label: 'Martes 04', entradas: 6800, salidas: 4200 },
    { date: '05 Nov', label: 'Miércoles 05', entradas: 5100, salidas: 4900 },
    { date: '06 Nov', label: 'Jueves 06', entradas: 8900, salidas: 5300 },
    { date: '07 Nov', label: 'Viernes 07', entradas: 7400, salidas: 6100 },
    { date: '08 Nov', label: 'Sábado 08', entradas: 3600, salidas: 2800 },
    { date: '09 Nov', label: 'Domingo 09', entradas: 5800, salidas: 3900 }
  ], [])

  const default4Weeks: DailyFlowPoint[] = useMemo(() => [
    { date: 'Sem 1', label: 'Semana 1 (Oct)', entradas: 28500, salidas: 22100 },
    { date: 'Sem 2', label: 'Semana 2 (Oct)', entradas: 34200, salidas: 27900 },
    { date: 'Sem 3', label: 'Semana 3 (Oct)', entradas: 31800, salidas: 29400 },
    { date: 'Sem 4', label: 'Semana 4 (Nov)', entradas: 41800, salidas: 30300 }
  ], [])

  const activeData = period === '7d' ? (data7Days || default7Days) : (data4Weeks || default4Weeks)

  // Totales acumulados
  const totalEntradas = useMemo(() => activeData.reduce((acc, d) => acc + d.entradas, 0), [activeData])
  const totalSalidas = useMemo(() => activeData.reduce((acc, d) => acc + d.salidas, 0), [activeData])
  const balanceNeto = totalEntradas - totalSalidas

  // Dimensiones del gráfico SVG
  const width = 640
  const height = 240
  const padding = { top: 20, right: 24, bottom: 32, left: 44 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  // Escalas
  const maxVal = useMemo(() => {
    const highest = Math.max(...activeData.map((d) => Math.max(d.entradas, d.salidas)), 1000)
    return Math.ceil(highest * 1.15 / 1000) * 1000
  }, [activeData])

  const getX = (idx: number) => {
    if (activeData.length <= 1) return padding.left + chartW / 2
    return padding.left + (idx / (activeData.length - 1)) * chartW
  }

  const getY = (val: number) => {
    return padding.top + chartH - (val / maxVal) * chartH
  }

  // Generar trazados de curvas Bézier suaves
  const { pathEntradas, areaEntradas, pathSalidas } = useMemo(() => {
    if (activeData.length === 0) return { pathEntradas: '', areaEntradas: '', pathSalidas: '' }

    const ptsEntradas = activeData.map((d, i) => ({ x: getX(i), y: getY(d.entradas) }))
    const ptsSalidas = activeData.map((d, i) => ({ x: getX(i), y: getY(d.salidas) }))

    const createSpline = (pts: { x: number; y: number }[]) => {
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
      let path = `M ${pts[0].x} ${pts[0].y}`
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[i + 2 >= pts.length ? pts.length - 1 : i + 2]
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
      }
      return path
    }

    const pathE = createSpline(ptsEntradas)
    const pathS = createSpline(ptsSalidas)

    const areaE = `${pathE} L ${ptsEntradas[ptsEntradas.length - 1].x} ${padding.top + chartH} L ${ptsEntradas[0].x} ${padding.top + chartH} Z`

    return { pathEntradas: pathE, areaEntradas: areaE, pathSalidas: pathS }
  }, [activeData, maxVal])

  // Mouse interaction
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * width - padding.left
    const segmentWidth = chartW / (activeData.length - 1)
    const index = Math.round(mouseX / segmentWidth)
    if (index >= 0 && index < activeData.length) {
      setHoverIndex(index)
    }
  }

  const handleMouseLeave = () => {
    setHoverIndex(null)
  }

  const hoveredPoint = hoverIndex !== null ? activeData[hoverIndex] : null

  return (
    <div
      ref={containerRef}
      className="panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '20px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        position: 'relative'
      }}
    >
      {/* Cabecera del Gráfico con Totales y Selector de Período */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="section-title" style={{ margin: 0, fontSize: '16px', color: 'var(--color-brand-deep)' }}>
              Flujo de inventario en muelle y despacho
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                background: balanceNeto >= 0 ? '#EAF5ED' : '#FDF2F0',
                color: balanceNeto >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                border: `1px solid ${balanceNeto >= 0 ? '#CBE5D3' : '#F8CECA'}`
              }}
            >
              {balanceNeto >= 0 ? `+${balanceNeto.toLocaleString('es-PE')} neto` : `${balanceNeto.toLocaleString('es-PE')} neto`}
            </span>
          </div>
          <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
            Comparativa temporal de entradas físicas por importación vs salidas despachadas hacia agencias.
          </p>
        </div>

        {/* Botones de Selección de Período */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--color-canvas)', padding: '3px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={() => setPeriod('7d')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
              border: 0,
              background: period === '7d' ? 'var(--color-surface)' : 'transparent',
              color: period === '7d' ? 'var(--color-brand-deep)' : 'var(--color-text-secondary)',
              boxShadow: period === '7d' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer'
            }}
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            onClick={() => setPeriod('4w')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
              border: 0,
              background: period === '4w' ? 'var(--color-surface)' : 'transparent',
              color: period === '4w' ? 'var(--color-brand-deep)' : 'var(--color-text-secondary)',
              boxShadow: period === '4w' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer'
            }}
          >
            Últimas 4 semanas
          </button>
        </div>
      </div>

      {/* Métricas Resumen y Leyenda */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '8px 12px', background: 'var(--color-canvas)', borderRadius: '6px' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-brand)' }} />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Entradas (Recepción)</span>
              <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>{totalEntradas.toLocaleString('es-PE')} unid</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-brand-deep)' }} />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block' }}>Salidas (Despacho)</span>
              <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>{totalSalidas.toLocaleString('es-PE')} unid</strong>
            </div>
          </div>
        </div>

        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
          Pasa el cursor sobre la curva para ver el detalle diario
        </span>
      </div>

      {/* Gráfico SVG Interactivo */}
      <div style={{ position: 'relative', width: '100%' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="flowAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Líneas Guía Horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padding.top + chartH * (1 - pct)
            const val = Math.round(maxVal * pct)
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeDasharray={pct === 0 ? 'none' : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--color-text-secondary)"
                  fontFamily="monospace"
                >
                  {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                </text>
              </g>
            )
          })}

          {/* Área sombreada bajo la curva de entradas */}
          <path d={areaEntradas} fill="url(#flowAreaGrad)" />

          {/* Curva de Salidas (Línea roja discontinua suave) */}
          <path
            d={pathSalidas}
            fill="none"
            stroke="var(--color-brand-deep)"
            strokeWidth="2.5"
            strokeDasharray="4 2"
          />

          {/* Curva de Entradas (Línea continua turquesa principal) */}
          <path
            d={pathEntradas}
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth="2.5"
          />

          {/* Etiquetas del Eje X */}
          {activeData.map((d, i) => (
            <text
              key={d.date}
              x={getX(i)}
              y={height - 8}
              textAnchor="middle"
              fontSize="11"
              fill={hoverIndex === i ? 'var(--color-brand-deep)' : 'var(--color-text-secondary)'}
              fontWeight={hoverIndex === i ? 700 : 500}
            >
              {d.date}
            </text>
          ))}

          {/* Cursor Vertical Interactivo */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + chartH}
                stroke="var(--color-text-primary)"
                strokeDasharray="2 2"
                strokeWidth="1.5"
              />
              {/* Punto Entradas */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(activeData[hoverIndex].entradas)}
                r="5"
                fill="var(--color-brand)"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              {/* Punto Salidas */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(activeData[hoverIndex].salidas)}
                r="5"
                fill="var(--color-brand-deep)"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Tooltip Flotante */}
        {hoveredPoint && hoverIndex !== null && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: `${Math.min(80, Math.max(10, (hoverIndex / (activeData.length - 1)) * 100))}%`,
              transform: 'translateX(-50%)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '8px 12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              pointerEvents: 'none',
              zIndex: 10,
              minWidth: '150px'
            }}
          >
            <strong style={{ fontSize: '12px', color: 'var(--color-text-primary)', display: 'block', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', marginBottom: '4px' }}>
              {hoveredPoint.label}
            </strong>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span style={{ color: 'var(--color-brand)', fontWeight: 600 }}>Entradas:</span>
              <strong style={{ fontFamily: 'monospace' }}>{hoveredPoint.entradas.toLocaleString('es-PE')} unid</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span style={{ color: 'var(--color-brand-deep)', fontWeight: 600 }}>Salidas:</span>
              <strong style={{ fontFamily: 'monospace' }}>{hoveredPoint.salidas.toLocaleString('es-PE')} unid</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px dashed var(--color-border)', paddingTop: '3px', marginTop: '3px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Neto diario:</span>
              <strong style={{ fontFamily: 'monospace', color: hoveredPoint.entradas >= hoveredPoint.salidas ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {hoveredPoint.entradas >= hoveredPoint.salidas ? `+${(hoveredPoint.entradas - hoveredPoint.salidas).toLocaleString('es-PE')}` : (hoveredPoint.entradas - hoveredPoint.salidas).toLocaleString('es-PE')}
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
