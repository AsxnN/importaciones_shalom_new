import { useMemo, useState } from 'react'
import type { PalletRecord } from '../../../types/locations'
import type { UnidadSerializada } from '../../products/types'
import type { InventoryItem, PalletCountSummary, ProductOption } from '../types'

type Props = {
  warehouseName?: string
  inventory: InventoryItem[]
  allProducts: ProductOption[]
  activePallets: PalletRecord[]
  palletCountsMap: Map<number, PalletCountSummary>
  serialUnitsMap: Map<number, UnidadSerializada[]>
  loadingStock: boolean
  showZeroStock: boolean
  onToggleShowZeroStock: (show: boolean) => void
  onOpenAdjustModal: (
    productId: number,
    isSerial: boolean,
    paletasCompletas?: number,
    cajasPuchos?: number
  ) => void
  onInspectSerial: (product: ProductOption, units: UnidadSerializada[]) => void
  onViewPallets: (sku: string) => void
}

export function StockPalletsSubView({
  warehouseName,
  inventory,
  allProducts,
  activePallets,
  palletCountsMap,
  serialUnitsMap,
  loadingStock,
  showZeroStock,
  onToggleShowZeroStock,
  onOpenAdjustModal,
  onInspectSerial,
  onViewPallets
}: Props) {
  // Filtros reactivos internos para la vista
  const [stockSearch, setStockSearch] = useState('')
  const [stockCategoryFilter, setStockCategoryFilter] = useState('')
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'VERDE' | 'AMARILLO' | 'ROJO'>('ALL')

  // Categorías presentes en los productos con inventario
  const categoriesList = useMemo(() => {
    const set = new Set<string>()
    for (const item of inventory) {
      const cat = item.producto?.categoria?.nombre
      if (cat) set.add(cat)
    }
    return Array.from(set).sort()
  }, [inventory])

  // Segregación de inventario con existencias vs agotados
  const { activeItems, zeroStockItems } = useMemo(() => {
    const active: InventoryItem[] = []
    const zero: InventoryItem[] = []

    for (const item of inventory) {
      const stock = Number(item.stock_real) || 0
      const countSummary = palletCountsMap.get(item.id_producto)
      const paletasFisicas = countSummary
        ? (Number(countSummary.paletas_completas) || 0) + (Number(countSummary.puchos) || 0)
        : activePallets.filter((p) => p.id_producto === item.id_producto).length

      if (stock > 0 || paletasFisicas > 0) {
        active.push(item)
      } else {
        zero.push(item)
      }
    }
    return { activeItems: active, zeroStockItems: zero }
  }, [inventory, palletCountsMap, activePallets])

  const displayedInventory = showZeroStock ? inventory : activeItems

  // Filtrado reactivo en tiempo real
  const filteredStockItems = useMemo(() => {
    return displayedInventory.filter((item) => {
      if (stockCategoryFilter && item.producto?.categoria?.nombre !== stockCategoryFilter) {
        return false
      }
      if (stockStatusFilter !== 'ALL' && item.estado_semaforo !== stockStatusFilter) {
        return false
      }
      if (stockSearch) {
        const query = stockSearch.toLowerCase().trim()
        const skuMatch = item.producto?.sku?.toLowerCase().includes(query)
        const nameMatch = item.producto?.nombre?.toLowerCase().includes(query)
        if (!skuMatch && !nameMatch) return false
      }
      return true
    })
  }, [displayedInventory, stockCategoryFilter, stockStatusFilter, stockSearch])

  return (
    <div className="panel" style={{ padding: '20px' }}>
      {/* Barra de Filtros y Búsqueda Efferd */}
      <div className="table-controls">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <div className="search-group" style={{ flex: '1 1 240px', maxWidth: '380px' }}>
            <input
              type="text"
              placeholder="Buscar por SKU o descripción..."
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="cat-filter">Categoría:</label>
            <select
              id="cat-filter"
              value={stockCategoryFilter}
              onChange={(e) => setStockCategoryFilter(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="status-filter">Semáforo:</label>
            <select
              id="status-filter"
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="VERDE">Óptimo (verde)</option>
              <option value="AMARILLO">Stock bajo (amarillo)</option>
              <option value="ROJO">Crítico (rojo)</option>
            </select>
          </div>

          {(stockSearch || stockCategoryFilter || stockStatusFilter !== 'ALL') && (
            <button
              type="button"
              className="btn-detail"
              onClick={() => {
                setStockSearch('')
                setStockCategoryFilter('')
                setStockStatusFilter('ALL')
              }}
              style={{ padding: '6px 12px' }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {zeroStockItems.length > 0 && (
          <label
            style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <input
              type="checkbox"
              checked={showZeroStock}
              onChange={(e) => onToggleShowZeroStock(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Mostrar productos sin existencias ({zeroStockItems.length})</span>
          </label>
        )}
      </div>

      <div style={{ marginBottom: '10px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        Mostrando <strong>{filteredStockItems.length}</strong> de {displayedInventory.length} productos en {warehouseName || 'la sede'}.
      </div>

      {loadingStock ? (
        <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
          Cargando existencias del almacén…
        </p>
      ) : filteredStockItems.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '36px' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-brand-deep)', margin: '0 0 8px' }}>
            Sin existencias coincidentes en {warehouseName || 'este almacén'}
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {zeroStockItems.length > 0 && !showZeroStock
              ? `Hay ${zeroStockItems.length} productos sin existencias en este almacén. Marca la casilla "Mostrar productos sin existencias" para visualizarlos.`
              : 'No se encontraron registros con los filtros seleccionados o este almacén aún no tiene stock cargado.'}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU y producto</th>
                <th>Categoría</th>
                <th>Paletas completas</th>
                <th>Puchos (cajas)</th>
                <th className="num-col">Stock total</th>
                <th className="num-col">Volumen estimado</th>
                <th style={{ textAlign: 'center' }}>Estado de stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredStockItems.map((item) => {
                const stock = Number(item.stock_real) || 0
                const prodOpt = allProducts.find((p) => p.id_producto === item.id_producto)
                const isSerialItem =
                  prodOpt?.modo_manejo === 'SERIALIZADO' ||
                  item.producto?.categoria?.modo_manejo === 'SERIALIZADO' ||
                  serialUnitsMap.has(item.id_producto)
                const prodUnits = serialUnitsMap.get(item.id_producto) || []

                const r = Array.isArray(item.producto?.regla_empaque)
                  ? item.producto.regla_empaque[0]
                  : item.producto?.regla_empaque

                const uCaja = Math.max(1, r?.unidades_por_caja || 1)
                const cCamada = Math.max(1, r?.cajas_por_camada || r?.cajas_por_camita || 1)
                const nCamadas = Math.max(1, r?.numero_camadas || r?.camitas_por_paleta || 1)
                const cPaleta = cCamada * nCamadas

                const totalCajas = Math.floor(stock / uCaja)
                const countSummary = palletCountsMap.get(item.id_producto)
                const prodPallets = activePallets.filter((p) => p.id_producto === item.id_producto)
                const paletasCompletas = countSummary
                  ? Number(countSummary.paletas_completas) || 0
                  : prodPallets.filter((p) => p.tipo_paleta === 'COMPLETO').length
                const puchosCount = countSummary
                  ? Number(countSummary.puchos) || 0
                  : prodPallets.filter((p) => p.tipo_paleta === 'PUCHO').length
                const cajasPuchos = prodPallets
                  .filter((p) => p.tipo_paleta === 'PUCHO')
                  .reduce((acc, p) => acc + (Number(p.cantidad_paquetes) || 1), 0)
                const totalPaletasFisicas = paletasCompletas + puchosCount

                let volM3 = r?.volumen_caja_m3 ? totalCajas * Number(r.volumen_caja_m3) : null
                if (isSerialItem && prodOpt?.largo_cm && prodOpt?.ancho_cm && prodOpt?.alto_cm) {
                  volM3 = stock * ((prodOpt.largo_cm * prodOpt.ancho_cm * prodOpt.alto_cm) / 1000000)
                }

                return (
                  <tr key={item.id_inventario}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="sku-badge">{item.producto?.sku}</span>
                        <strong>{item.producto?.nombre}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="category-pill">
                        {item.producto?.categoria?.nombre ?? 'General'}
                      </span>
                    </td>
                    <td>
                      {isSerialItem ? (
                        <div>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              background: 'var(--color-brand-soft)',
                              color: 'var(--color-brand)',
                              border: '1px solid var(--color-border)'
                            }}
                          >
                            Serializado unitario
                          </span>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            {prodUnits.length} {prodUnits.length === 1 ? 'equipo registrado' : 'equipos registrados'}
                          </div>
                          <div
                            style={{
                              fontSize: '11.5px',
                              marginTop: '1px',
                              fontWeight: 600,
                              color: prodUnits.length > 0 ? 'var(--color-success)' : 'var(--color-text-secondary)'
                            }}
                          >
                            {prodUnits.length > 0 ? `${prodUnits.length} con tag activo` : 'Sin chips enrolados'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <strong
                            style={{
                              fontSize: '14px',
                              color: paletasCompletas > 0 ? 'var(--color-brand)' : 'var(--color-text-primary)'
                            }}
                          >
                            {paletasCompletas} {paletasCompletas === 1 ? 'paleta' : 'paletas'}
                          </strong>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            ({paletasCompletas * cPaleta} cajas)
                          </div>
                          <div
                            style={{
                              fontSize: '11.5px',
                              marginTop: '1px',
                              fontWeight: 600,
                              color: paletasCompletas > 0 ? 'var(--color-brand)' : 'var(--color-text-secondary)'
                            }}
                          >
                            {paletasCompletas > 0 ? `${paletasCompletas} con tag activo` : '0 completas activas'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td>
                      {isSerialItem ? (
                        <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                          No aplica
                        </span>
                      ) : (
                        <div>
                          <span style={{ fontWeight: 600, color: puchosCount > 0 ? 'var(--color-warning)' : 'inherit' }}>
                            {puchosCount > 0 ? `${cajasPuchos} cajas (${puchosCount} pucho)` : '0 cajas'}
                          </span>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            ({cajasPuchos * uCaja} unid.)
                          </div>
                          {puchosCount > 1 && (
                            <div style={{ fontSize: '11px', color: 'var(--color-warning)', fontWeight: 600, marginTop: '2px' }}>
                              {puchosCount} puchos (unificar)
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="num-col">
                      <strong style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        {stock.toLocaleString()}
                      </strong>{' '}
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {item.producto?.unidad_medida ?? 'UNID'}
                      </span>
                    </td>
                    <td className="num-col">
                      {volM3 ? `${volM3.toFixed(3)} m³` : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          background:
                            item.estado_semaforo === 'VERDE'
                              ? 'rgba(47, 125, 79, 0.1)'
                              : item.estado_semaforo === 'AMARILLO'
                              ? 'rgba(188, 121, 31, 0.1)'
                              : 'rgba(179, 64, 42, 0.1)',
                          color:
                            item.estado_semaforo === 'VERDE'
                              ? 'var(--color-success)'
                              : item.estado_semaforo === 'AMARILLO'
                              ? 'var(--color-warning)'
                              : 'var(--color-danger)',
                          border: `1px solid ${
                            item.estado_semaforo === 'VERDE'
                              ? 'rgba(47, 125, 79, 0.28)'
                              : item.estado_semaforo === 'AMARILLO'
                              ? 'rgba(188, 121, 31, 0.28)'
                              : 'rgba(179, 64, 42, 0.28)'
                          }`
                        }}
                      >
                        {item.estado_semaforo === 'VERDE'
                          ? 'Óptimo'
                          : item.estado_semaforo === 'AMARILLO'
                          ? 'Stock bajo'
                          : 'Crítico'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-detail"
                          type="button"
                          onClick={() => {
                            onOpenAdjustModal(
                              item.id_producto,
                              isSerialItem,
                              paletasCompletas,
                              cajasPuchos
                            )
                          }}
                        >
                          Ajustar stock
                        </button>
                        {isSerialItem ? (
                          <button
                            className="btn-detail"
                            type="button"
                            onClick={() => {
                              if (prodOpt) {
                                onInspectSerial(prodOpt, prodUnits)
                              }
                            }}
                            style={{
                              color: prodUnits.length > 0 ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                              borderColor: prodUnits.length > 0 ? undefined : 'var(--color-border)'
                            }}
                            title={
                              prodUnits.length > 0
                                ? `Ver los ${prodUnits.length} equipos serializados en almacén`
                                : 'No hay equipos registrados con serie en este almacén'
                            }
                          >
                            {prodUnits.length > 0 ? `Ver equipos (${prodUnits.length})` : 'Equipos seriales (0)'}
                          </button>
                        ) : (
                          <button
                            className="btn-detail"
                            type="button"
                            onClick={() => onViewPallets(item.producto?.sku || '')}
                            style={{
                              color: totalPaletasFisicas > 0 ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                              borderColor: totalPaletasFisicas > 0 ? undefined : 'var(--color-border)'
                            }}
                            title={
                              totalPaletasFisicas > 0
                                ? `Ver las ${totalPaletasFisicas} paletas físicas con tag RFID en almacén`
                                : 'No hay paletas físicas con tag RFID para este producto'
                            }
                          >
                            {totalPaletasFisicas > 0 ? `Ver paletas (${totalPaletasFisicas})` : 'Paletas físicas (0)'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
