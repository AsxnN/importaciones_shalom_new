export interface KpiDeltaCardProps {
  label: string
  value: string | number
  delta?: {
    text: string
    variant: 'success' | 'warning' | 'danger' | 'neutral' | 'brand'
    direction?: 'up' | 'down' | 'neutral'
  }
  context: string
  onClick?: () => void
  loading?: boolean
}

export function KpiDeltaCard({
  label,
  value,
  delta,
  context,
  onClick,
  loading = false
}: KpiDeltaCardProps) {
  const getDeltaColors = () => {
    switch (delta?.variant) {
      case 'success':
        return { bg: '#EAF5ED', color: 'var(--color-success)', border: '#CBE5D3' }
      case 'warning':
        return { bg: '#FFFBF0', color: 'var(--color-warning)', border: '#FCEAC4' }
      case 'danger':
        return { bg: '#FDF2F0', color: 'var(--color-danger)', border: '#F8CECA' }
      default:
        return { bg: 'var(--color-brand-soft)', color: 'var(--color-brand)', border: 'var(--color-border)' }
    }
  }

  const deltaStyle = getDeltaColors()

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px 18px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        minHeight: '116px',
        outline: 'none',
        width: '100%'
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.borderColor = 'var(--color-brand)'
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.borderColor = 'var(--color-border)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '8px' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            letterSpacing: '0.01em'
          }}
        >
          {label}
        </span>
        {delta && !loading && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '12px',
              background: deltaStyle.bg,
              color: deltaStyle.color,
              border: `1px solid ${deltaStyle.border}`,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            {delta.direction === 'up' && '↑'}
            {delta.direction === 'down' && '↓'}
            {delta.text}
          </span>
        )}
      </div>

      <div style={{ margin: '8px 0 4px 0' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--color-brand-deep)',
            letterSpacing: '-0.02em',
            lineHeight: 1.1
          }}
        >
          {loading ? '—' : value}
        </span>
      </div>

      <span
        style={{
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.3
        }}
      >
        {context}
      </span>
    </button>
  )
}
