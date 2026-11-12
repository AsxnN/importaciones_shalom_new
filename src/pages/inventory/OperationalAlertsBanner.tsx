import type { SystemAlert } from './types'

type Props = {
  alerts: SystemAlert[]
  onResolveAlert: (idAlerta: number) => void
}

export function OperationalAlertsBanner({ alerts, onResolveAlert }: Props) {
  if (alerts.length === 0) return null

  return (
    <div
      style={{
        margin: '16px 0',
        padding: '14px 18px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-warning)',
        borderRadius: '8px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div>
          <strong style={{ color: 'var(--color-warning)', fontSize: '13.5px' }}>
            Atención operativa pendiente ({alerts.length})
          </strong>
          <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
            Requieren verificación en piso de almacén
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {alerts.map((alt) => (
          <div
            key={alt.id_alerta}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--color-canvas)',
              padding: '9px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)'
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                [{alt.tipo}] {alt.mensaje}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', marginTop: '1px' }}>
                Registrada el {new Date(alt.created_at).toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              className="btn-detail"
              style={{
                color: 'var(--color-brand)',
                fontSize: '12px',
                padding: '4px 10px'
              }}
              onClick={() => onResolveAlert(alt.id_alerta)}
            >
              Marcar verificada
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
