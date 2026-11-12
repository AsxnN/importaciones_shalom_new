import { useState, useMemo, type FormEvent } from 'react'
import type { PalletRecord } from '../../../types/locations'
import type { Warehouse, DestinationMode, TipoSalida } from '../types'

interface TransferOrDispatchSubViewProps {
  selectedWarehouse: Warehouse | null
  availableDestinations: Warehouse[]
  activePallets: PalletRecord[]
  selectedPalletId: string
  onSelectPalletId: (id: string) => void
  destinationMode: DestinationMode
  onChangeDestinationMode: (mode: DestinationMode) => void
  targetWarehouseId: string
  onChangeTargetWarehouseId: (id: string) => void
  tipoSalida: TipoSalida
  onChangeTipoSalida: (tipo: TipoSalida) => void
  destinatario: string
  onChangeDestinatario: (val: string) => void
  documentoRef: string
  onChangeDocumentoRef: (val: string) => void
  motivo: string
  onChangeMotivo: (val: string) => void
  dispatchUnits: string
  onChangeDispatchUnits: (val: string) => void
  executing: boolean
  onSubmit: (e: FormEvent) => void
}

export function TransferOrDispatchSubView({
  selectedWarehouse,
  availableDestinations,
  activePallets,
  selectedPalletId,
  onSelectPalletId,
  destinationMode,
  onChangeDestinationMode,
  targetWarehouseId,
  onChangeTargetWarehouseId,
  tipoSalida,
  onChangeTipoSalida,
  destinatario,
  onChangeDestinatario,
  documentoRef,
  onChangeDocumentoRef,
  motivo,
  onChangeMotivo,
  dispatchUnits,
  onChangeDispatchUnits,
  executing,
  onSubmit
}: TransferOrDispatchSubViewProps) {
  const [palletSearch, setPalletSearch] = useState('')

  // Paleta seleccionada actualmente
  const currentPallet = useMemo(() => {
    if (!selectedPalletId) return null
    return activePallets.find((p) => String(p.id_etiqueta) === selectedPalletId) || null
  }, [selectedPalletId, activePallets])

  // Filtrado de paletas para el buscador del select
  const filteredPalletsForSelect = useMemo(() => {
    if (!palletSearch.trim()) return activePallets
    const q = palletSearch.toLowerCase().trim()
    return activePallets.filter(
      (p) =>
        p.uid_tag.toLowerCase().includes(q) ||
        (p.producto?.sku && p.producto.sku.toLowerCase().includes(q)) ||
        (p.producto?.nombre && p.producto.nombre.toLowerCase().includes(q)) ||
        (p.codigo_ubicacion && p.codigo_ubicacion.toLowerCase().includes(q))
    )
  }, [activePallets, palletSearch])

  // Destino seleccionado para resumen explicativo
  const selectedTargetWarehouse = useMemo(() => {
    if (!targetWarehouseId) return null
    return availableDestinations.find((w) => String(w.id_almacen) === targetWarehouseId) || null
  }, [availableDestinations, targetWarehouseId])

  // Cálculos de unidades
  const totalUnits = Number(currentPallet?.cantidad_actual) || Number(currentPallet?.cantidad_paquetes) || 1
  const numericDispatchUnits = Number(dispatchUnits) || totalUnits
  const isPartialDispatch = destinationMode === 'OUTSIDE' && numericDispatchUnits > 0 && numericDispatchUnits < totalUnits

  return (
    <div className="panel" style={{ padding: '24px' }}>
      <form onSubmit={onSubmit}>
        {/* Cabecera del panel */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'none',
                  letterSpacing: '0.04em',
                  color: 'var(--color-brand)',
                  background: 'var(--color-brand-soft)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(22, 125, 141, 0.25)'
                }}
              >
                Operación táctica
              </span>
              <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                Sede de origen: <strong>{selectedWarehouse?.nombre}</strong>
              </span>
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px',
                fontWeight: 600,
                color: 'var(--color-brand-deep)',
                margin: 0
              }}
            >
              Transferir o dar salida a una paleta física
            </h3>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '13.5px' }}>
              Selecciona la carga física con chip RFID y define si su destino es otra área interna o un despacho definitivo fuera de la empresa.
            </p>
          </div>
        </div>

        {/* =========================================================================
            PASO 1: SELECCIÓN DE LA PALETA FÍSICA
           ========================================================================= */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '18px 20px',
            marginBottom: '24px',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--color-brand-deep)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                1
              </div>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                Selecciona la paleta física a mover
              </label>
            </div>

            {activePallets.length > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {activePallets.length} paleta(s) física(s) disponibles en {selectedWarehouse?.nombre}
              </span>
            )}
          </div>

          {activePallets.length === 0 ? (
            <div
              style={{
                padding: '28px 20px',
                textAlign: 'center',
                background: 'var(--color-canvas)',
                borderRadius: '6px',
                border: '1px dashed var(--color-border)'
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '14px' }}>
                No hay paletas físicas registradas en esta sede
              </p>
              <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: '12.5px' }}>
                Para realizar transferencias o salidas, ingresa existencias desde el módulo de inventario o recepción RFID.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Buscador rápido de paleta */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px' }}>
                  <select
                    className="form-control"
                    value={selectedPalletId}
                    onChange={(e) => onSelectPalletId(e.target.value)}
                    required
                    style={{
                      fontSize: '13.5px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      width: '100%'
                    }}
                  >
                    <option value="">-- Elige una paleta física de la lista ({activePallets.length} disponibles) --</option>
                    {filteredPalletsForSelect.map((p) => {
                      const esSerial = p.producto?.modo_manejo === 'SERIALIZADO'
                      return (
                        <option key={p.id_etiqueta} value={String(p.id_etiqueta)}>
                          [{p.uid_tag}] {p.producto?.sku} — {p.producto?.nombre} (
                          {esSerial ? '1 unid. serializada' : `${p.cantidad_paquetes} cajas, ${p.cantidad_actual} unid.`}
                          ) {p.codigo_ubicacion ? `| Ubic: ${p.codigo_ubicacion}` : '| Piso libre'}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div style={{ flex: '0 1 240px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Filtrar por Tag o SKU..."
                    value={palletSearch}
                    onChange={(e) => setPalletSearch(e.target.value)}
                    style={{ fontSize: '13px', padding: '10px 12px', width: '100%' }}
                  />
                </div>
              </div>

              {/* Ficha de Inspección Detallada de la Paleta Seleccionada */}
              {currentPallet && (
                <div
                  style={{
                    background: 'var(--color-canvas)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '16px',
                    marginTop: '4px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '4px',
                      background: 'var(--color-brand)'
                    }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    {/* Código Tag RFID */}
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', textTransform: 'none' }}>
                        Código de tag RFID activo
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--color-brand-deep)',
                            background: 'var(--color-surface)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(22, 125, 141, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 9h16" />
                            <path d="M4 15h16" />
                            <path d="M10 3 8 21" />
                            <path d="M16 3l-2 18" />
                          </svg>
                          {currentPallet.uid_tag}
                        </span>
                      </div>
                    </div>

                    {/* SKU y Nombre */}
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block' }}>
                        Artículo / Producto
                      </span>
                      <div style={{ marginTop: '2px' }}>
                        <span className="sku-badge" style={{ marginRight: '6px' }}>{currentPallet.producto?.sku}</span>
                        <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                          {currentPallet.producto?.nombre}
                        </strong>
                      </div>
                    </div>

                    {/* Contenido Físico y Tipo */}
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block' }}>
                        Carga física y formato
                      </span>
                      <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                          {currentPallet.producto?.modo_manejo === 'SERIALIZADO'
                            ? '1 unidad serializada'
                            : `${currentPallet.cantidad_paquetes} cajas (${Number(currentPallet.cantidad_actual || 0).toLocaleString()} unid.)`}
                        </strong>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background:
                              currentPallet.tipo_paleta === 'COMPLETO'
                                ? 'var(--color-brand-soft)'
                                : 'rgba(188, 121, 31, 0.1)',
                            color:
                              currentPallet.tipo_paleta === 'COMPLETO'
                                ? 'var(--color-brand)'
                                : 'var(--color-warning)',
                            border: `1px solid ${
                              currentPallet.tipo_paleta === 'COMPLETO'
                                ? 'rgba(22, 125, 141, 0.25)'
                                : 'rgba(188, 121, 31, 0.28)'
                            }`
                          }}
                        >
                          {currentPallet.tipo_paleta === 'COMPLETO' ? 'Paleta completa' : 'Pucho suelto'}
                        </span>
                      </div>
                    </div>

                    {/* Ubicación Física */}
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block' }}>
                        Ubicación física en sede
                      </span>
                      <div style={{ marginTop: '3px' }}>
                        <span
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: currentPallet.codigo_ubicacion ? 'var(--color-brand-deep)' : 'var(--color-text-secondary)',
                            background: 'var(--color-surface)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--color-border)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect width="18" height="18" x="3" y="3" rx="2" />
                            <path d="M3 9h18" />
                            <path d="M9 21V9" />
                          </svg>
                          {currentPallet.codigo_ubicacion || 'Zona Campo / Piso libre'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================================
            PASO 2: DESTINO OPERATIVO DE LA CARGA (Estilo Sidebar con Active Bar)
           ========================================================================= */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--color-brand-deep)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              2
            </div>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              ¿Hacia dónde se traslada la paleta física?
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Opción 1: Transferencia Interalmacén */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onChangeDestinationMode('INTERNAL')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onChangeDestinationMode('INTERNAL')
                }
              }}
              style={{
                background: destinationMode === 'INTERNAL' ? 'var(--color-surface)' : 'var(--color-canvas)',
                border: destinationMode === 'INTERNAL' ? '2px solid var(--color-brand)' : '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '18px 20px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.16s ease'
              }}
            >
              {/* Barra indicadora lateral izquierda (inspirada en .sidebar-nav-item.active::before) */}
              {destinationMode === 'INTERNAL' && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '12%',
                    bottom: '12%',
                    width: '4px',
                    borderRadius: '0 4px 4px 0',
                    background: 'var(--color-brand)',
                    boxShadow: '0 0 8px rgba(22, 125, 141, 0.4)'
                  }}
                />
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    id="mode-internal"
                    name="destinationMode"
                    checked={destinationMode === 'INTERNAL'}
                    onChange={() => onChangeDestinationMode('INTERNAL')}
                    style={{ accentColor: 'var(--color-brand)', cursor: 'pointer' }}
                  />
                  <strong style={{ fontSize: '15px', color: 'var(--color-brand-deep)' }}>
                    Transferencia a otra área interna
                  </strong>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'var(--color-brand-soft)',
                    color: 'var(--color-brand)',
                    border: '1px solid rgba(22, 125, 141, 0.25)'
                  }}
                >
                  Red Shalom
                </span>
              </div>

              <p style={{ margin: '6px 0 0 24px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                Traslada la mercadería a otro almacén o tienda de la empresa. El código de origen se libera y se genera un <strong>nuevo código oficial con el prefijo de la sede destino</strong>.
              </p>

              <div
                style={{
                  marginTop: '12px',
                  marginLeft: '24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-brand)',
                  background: 'var(--color-brand-soft)',
                  padding: '3px 8px',
                  borderRadius: '4px'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m16 3 4 4-4 4" />
                  <path d="M20 7H4" />
                  <path d="m8 21-4-4 4-4" />
                  <path d="M4 17h16" />
                </svg>
                Genera correlativo oficial en sede destino
              </div>
            </div>

            {/* Opción 2: Salida Definitiva Fuera de la Empresa */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onChangeDestinationMode('OUTSIDE')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onChangeDestinationMode('OUTSIDE')
                }
              }}
              style={{
                background: destinationMode === 'OUTSIDE' ? '#FFFBFB' : 'var(--color-canvas)',
                border: destinationMode === 'OUTSIDE' ? '2px solid var(--color-danger)' : '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '18px 20px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.16s ease'
              }}
            >
              {/* Barra indicadora lateral izquierda en rojo de atención */}
              {destinationMode === 'OUTSIDE' && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '12%',
                    bottom: '12%',
                    width: '4px',
                    borderRadius: '0 4px 4px 0',
                    background: 'var(--color-danger)',
                    boxShadow: '0 0 8px rgba(179, 64, 42, 0.4)'
                  }}
                />
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    id="mode-outside"
                    name="destinationMode"
                    checked={destinationMode === 'OUTSIDE'}
                    onChange={() => onChangeDestinationMode('OUTSIDE')}
                    style={{ accentColor: 'var(--color-danger)', cursor: 'pointer' }}
                  />
                  <strong style={{ fontSize: '15px', color: 'var(--color-danger)' }}>
                    Salida definitiva fuera de la empresa
                  </strong>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(179, 64, 42, 0.08)',
                    color: 'var(--color-danger)',
                    border: '1px solid rgba(179, 64, 42, 0.22)'
                  }}
                >
                  Despacho exterior
                </span>
              </div>

              <p style={{ margin: '6px 0 0 24px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                Venta a cliente final, transportista o desecho. <strong>Libera el tag RFID original para su reutilización y descuenta el stock contable, SIN crear paletas en otros almacenes</strong>.
              </p>

              <div
                style={{
                  marginTop: '12px',
                  marginLeft: '24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-danger)',
                  background: 'rgba(179, 64, 42, 0.08)',
                  padding: '3px 8px',
                  borderRadius: '4px'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                Libera código RFID para nueva carga
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            PASO 3A: CAMPOS SI ES TRANSFERENCIA INTERALMACÉN
           ========================================================================= */}
        {destinationMode === 'INTERNAL' && (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--color-brand-deep)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                3
              </div>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                Datos de la sede destino y justificación
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                  Sede o almacén de destino:
                </label>
                <select
                  className="form-control"
                  value={targetWarehouseId}
                  onChange={(e) => onChangeTargetWarehouseId(e.target.value)}
                  required={destinationMode === 'INTERNAL'}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px' }}
                >
                  <option value="">-- Elige el almacén receptor --</option>
                  {availableDestinations.map((w) => (
                    <option key={w.id_almacen} value={String(w.id_almacen)}>
                      {w.nombre} (Prefijo RFID: {w.prefijo_rfid || 'SIN PREFIJO'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                  Motivo del traslado interalmacén:
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Reposición de tienda central, balanceo de stock..."
                  value={motivo}
                  onChange={(e) => onChangeMotivo(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px' }}
                />
              </div>
            </div>

            {/* Sugerencias rápidas de motivo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>Sugerencias rápidas:</span>
              {[
                'Reposición para tienda central',
                'Balanceo de inventario entre sedes',
                'Reordenamiento por saturación de racks',
                'Traslado preventivo para despacho local'
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChangeMotivo(s)}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-canvas)',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  + {s}
                </button>
              ))}
            </div>

            {/* Diagrama de Impacto Operativo */}
            {selectedTargetWarehouse && currentPallet && (
              <div
                style={{
                  background: 'var(--color-brand-soft)',
                  border: '1px solid rgba(22, 125, 141, 0.25)',
                  borderRadius: '6px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ flex: '1 1 200px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block' }}>
                    Origen ({selectedWarehouse?.nombre})
                  </span>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-brand-deep)', fontSize: '13px' }}>
                    [{currentPallet.uid_tag}]
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                    Tag quedará liberado
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-brand)' }}>
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </div>

                <div style={{ flex: '1 1 220px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block' }}>
                    Destino ({selectedTargetWarehouse.nombre})
                  </span>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-brand)', fontSize: '13px' }}>
                    [{selectedTargetWarehouse.prefijo_rfid || 'DEST'}-PAL-XXXX]
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                    Nuevo correlativo generado automáticamente
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            PASO 3B: CAMPOS SI ES SALIDA DEFINITIVA FUERA DE LA EMPRESA
           ========================================================================= */}
        {destinationMode === 'OUTSIDE' && (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid rgba(179, 64, 42, 0.25)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--color-danger)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                3
              </div>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                Datos de salida definitiva, destinatario y picking
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              {/* Tipo de Salida Externa */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                  Tipo de salida externa:
                </label>
                <select
                  className="form-control"
                  value={tipoSalida}
                  onChange={(e) => onChangeTipoSalida(e.target.value as TipoSalida)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px' }}
                >
                  <option value="VENTA_CLIENTE">Venta a cliente final</option>
                  <option value="DISTRIBUCION_EXTERNA">Distribución a transportista / tercero</option>
                  <option value="MERMA_EXTERNA">Merma definitiva o desecho</option>
                  <option value="DEVOLUCION_PROVEEDOR">Devolución a proveedor</option>
                  <option value="OTRO">Otro retiro extraordinario</option>
                </select>
              </div>

              {/* Destinatario */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                  Destinatario / Cliente / Razón social:
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Shalom Logística SAC / Cliente Mayorista"
                  value={destinatario}
                  onChange={(e) => onChangeDestinatario(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px' }}
                />
              </div>

              {/* Documento de Referencia */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                  Documento de referencia:
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Guía GR-001-4459 / Factura F01-120"
                  value={documentoRef}
                  onChange={(e) => onChangeDocumentoRef(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px' }}
                />
              </div>
            </div>

            {/* Picking de Unidades / Despacho Parcial vs Completo */}
            {currentPallet && (
              <div
                style={{
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  padding: '14px 16px',
                  marginBottom: '16px'
                }}
              >
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                  Cantidad a despachar (Picking de unidades / Bulto completo):
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    min="1"
                    max={totalUnits}
                    value={dispatchUnits}
                    onChange={(e) => onChangeDispatchUnits(e.target.value)}
                    className="form-control"
                    style={{ width: '140px', fontWeight: 700, padding: '8px 10px', fontSize: '15px' }}
                    required
                  />
                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    de un total de <strong>{totalUnits.toLocaleString()} unidades</strong> disponibles en esta carga
                  </span>

                  {numericDispatchUnits < totalUnits && (
                    <button
                      type="button"
                      className="btn-detail"
                      onClick={() => onChangeDispatchUnits(String(totalUnits))}
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                    >
                      Restablecer al total ({totalUnits})
                    </button>
                  )}
                </div>

                {/* Alerta interactiva de fraccionamiento / pucho restante */}
                {isPartialDispatch && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 14px',
                      background: 'rgba(188, 121, 31, 0.08)',
                      border: '1px solid rgba(188, 121, 31, 0.28)',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      color: 'var(--color-warning)',
                      lineHeight: 1.45,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <div>
                      <strong>Fraccionamiento táctico (Picking parcial):</strong> Se despacharán <strong>{numericDispatchUnits} unidades</strong>. La etiqueta <code>[{currentPallet.uid_tag}]</code> permanecerá activa en el almacén como <strong>pucho con {totalUnits - numericDispatchUnits} unidades restantes</strong>.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Motivo o Detalle */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                Motivo o detalle de la salida:
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. Despacho directo a cliente con orden verificada por ventanilla"
                value={motivo}
                onChange={(e) => onChangeMotivo(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px' }}
              />
            </div>

            {/* Resumen de Impacto Inmutable */}
            {currentPallet && (
              <div
                style={{
                  background: '#FFF5F5',
                  border: '1px solid rgba(179, 64, 42, 0.22)',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  fontSize: '12.5px',
                  color: 'var(--color-danger)',
                  lineHeight: 1.5
                }}
              >
                <strong>Garantía de salida definitiva:</strong>
                <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                  <li>El código RFID <strong>[{currentPallet.uid_tag}]</strong> quedará liberado (estado <code>VACIA</code>) para nueva reutilización física.</li>
                  <li>Se descontarán <strong>{numericDispatchUnits} unidades</strong> de {selectedWarehouse?.nombre}.</li>
                  <li><strong>NO se generará ninguna paleta en ningún otro almacén</strong> (la mercancía sale formalmente del circuito Shalom).</li>
                  <li>Quedará asentado el movimiento inmutable en el Kardex como <code>DESPACHO_COMPLETO</code> o <code>RETIRO_PARCIAL</code>.</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            BARRA DE CONFIRMACIÓN / ACCIÓN PRINCIPAL
           ========================================================================= */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={executing || !currentPallet}
            style={{
              padding: '12px 24px',
              fontSize: '14.5px',
              fontWeight: 600,
              background: destinationMode === 'OUTSIDE' ? 'var(--color-danger)' : 'var(--color-brand)',
              borderColor: destinationMode === 'OUTSIDE' ? 'var(--color-danger)' : 'var(--color-brand)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {executing ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="spinning">
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
                Procesando movimiento…
              </>
            ) : destinationMode === 'OUTSIDE' ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                Confirmar salida definitiva fuera de sede
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m16 3 4 4-4 4" />
                  <path d="M20 7H4" />
                  <path d="m8 21-4-4 4-4" />
                  <path d="M4 17h16" />
                </svg>
                Ejecutar transferencia interalmacén
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
