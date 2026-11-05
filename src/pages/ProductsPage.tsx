import { useEffect, useState } from 'react'
import { logCatalogChange } from '../lib/audit'
import { ProductDetailModal } from './products/ProductDetailModal'
import { categoriaRepository } from './products/repositories/CategoryRepository'
import { productoRepository } from './products/repositories/ProductRepository'
import { CategoriesSubView } from './products/subviews/CategoriesSubView'
import { DataImportSubView } from './products/subviews/DataImportSubView'
import { ProductsSubView } from './products/subviews/ProductsSubView'
import { SuppliersSubView } from './products/subviews/SuppliersSubView'
import type { Category, Product, ViewTab } from './products/types'

export function ProductsPage({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<ViewTab>('productos')
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'warning'; text: string } | null>(null)

  // Ficha técnica modal seleccionada para visualización detallada consolidada
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)

  // Estado para confirmación de eliminación de producto
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirmDelete() {
    if (!deletingProduct) return
    setIsDeleting(true)
    setError(null)
    setFeedbackNotice(null)

    try {
      const res = await productoRepository.eliminar(deletingProduct.id_producto)
      await logCatalogChange({
        tabla: 'producto',
        operacion: 'DELETE',
        id_registro: Number(deletingProduct.id_producto),
        datos_anteriores: deletingProduct
      })

      if (res.softDeleted) {
        setFeedbackNotice({ type: 'warning', text: res.message })
      } else {
        setFeedbackNotice({
          type: 'success',
          text: `Producto ${deletingProduct.sku} (${deletingProduct.nombre ?? deletingProduct.descripcion}) eliminado permanentemente del catálogo.`
        })
      }

      setDeletingProduct(null)
      await loadProducts()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al eliminar el producto.'
      setError(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  async function loadCategories() {
    setLoadingCategories(true)
    try {
      const data = await categoriaRepository.obtenerTodas()
      setCategories(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar categorías.'
      setError(msg)
    } finally {
      setLoadingCategories(false)
    }
  }

  async function loadProducts() {
    setLoadingProducts(true)
    try {
      const data = await productoRepository.obtenerTodos()
      setProducts(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar productos.'
      setError(msg)
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    void loadCategories()
    void loadProducts()
  }, [])

  const refreshAll = () => {
    setError(null)
    void loadCategories()
    void loadProducts()
  }

  return (
    <section className="products-page">
      {/* Encabezado del Módulo 1 */}
      <div className="page-heading">
        <div>
          <button className="link-back" type="button" onClick={onBack}>
            <span aria-hidden="true">‹</span> Volver al panel principal
          </button>
          <div className="view-title-row">
            <h2>Maestros y empaque</h2>
            <span className="module-code-badge">MOD-01</span>
          </div>
          <p className="page-lead">
            Gestión unificada de productos, modos de manejo (paletizado y serializado), especificaciones técnicas, categorías y proveedores.
          </p>
        </div>
        <button className="button secondary" type="button" onClick={refreshAll}>
          Actualizar datos
        </button>
      </div>

      {/* Pestañas de Navegación Unificadas */}
      <nav className="module-tabs" aria-label="Secciones del Módulo 1">
        <button
          className={activeTab === 'productos' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('productos')}
        >
          Productos y empaque
        </button>
        <button
          className={activeTab === 'categorias' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('categorias')}
        >
          Categorías
        </button>
        <button
          className={activeTab === 'proveedores' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('proveedores')}
        >
          Proveedores
        </button>
        <button
          className={activeTab === 'importacion' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('importacion')}
        >
          Importación CSV
        </button>
      </nav>

      {/* Alerta de Notificación / Error */}
      {error && (
        <p className="error notice" role="alert" style={{ margin: '14px 0' }}>
          {error}
        </p>
      )}

      {/* Banner de Feedback / Confirmación */}
      {feedbackNotice && (
        <div
          role="status"
          style={{
            margin: '14px 0',
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: '0.9rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: feedbackNotice.type === 'success' ? '#eefbf3' : '#fffbeb',
            color: feedbackNotice.type === 'success' ? 'var(--color-success)' : 'var(--color-warning)',
            border: `1px solid ${feedbackNotice.type === 'success' ? '#c7f0d6' : '#fde68a'}`
          }}
        >
          <span>{feedbackNotice.text}</span>
          <button
            type="button"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}
            onClick={() => setFeedbackNotice(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Módulo Unificado: Productos y Empaque */}
      {activeTab === 'productos' && (
        <ProductsSubView
          products={products}
          categories={categories}
          loading={loadingProducts}
          onRefresh={() => void loadProducts()}
          onError={setError}
          onViewDetail={(p) => setViewingProduct(p)}
          onDeleteProduct={(p) => setDeletingProduct(p)}
        />
      )}

      {/* 2. Subvista Categorías */}
      {activeTab === 'categorias' && (
        <CategoriesSubView
          categories={categories}
          loading={loadingCategories}
          onRefresh={() => void loadCategories()}
          onError={setError}
        />
      )}

      {/* 3. Subvista Proveedores */}
      {activeTab === 'proveedores' && (
        <SuppliersSubView onError={setError} />
      )}

      {/* 4. Subvista Importación CSV */}
      {activeTab === 'importacion' && (
        <DataImportSubView
          onRefreshAll={refreshAll}
          onError={setError}
        />
      )}

      {/* Modal / Ficha Técnica Consolidada */}
      <ProductDetailModal
        product={viewingProduct}
        onClose={() => setViewingProduct(null)}
        onPackagingUpdated={async () => {
          await loadProducts()
          if (viewingProduct) {
            const updated = await productoRepository.obtenerPorId(viewingProduct.id_producto)
            if (updated) setViewingProduct(updated)
          }
        }}
        onDeleteProduct={(p) => setDeletingProduct(p)}
      />

      {/* Modal de Confirmación de Eliminación de Producto */}
      {deletingProduct && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-window" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                Confirmar eliminación de producto
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => !isDeleting && setDeletingProduct(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ margin: '16px 0', fontSize: '14px', lineHeight: 1.5, color: 'var(--color-text-primary)' }}>
              <p style={{ margin: '0 0 12px' }}>
                ¿Estás seguro de que deseas eliminar el producto <strong style={{ color: 'var(--color-brand)' }}>{deletingProduct.sku}</strong> — <strong>{deletingProduct.nombre ?? deletingProduct.descripcion}</strong>?
              </p>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--color-border)',
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.45
                }}
              >
                <strong style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '6px' }}>
                  Comportamiento operativo:
                </strong>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>Si es un producto de prueba o nuevo sin transacciones, se eliminará permanentemente junto con su regla de empaque o perfil técnico.</li>
                  <li>Si ya cuenta con movimientos en kardex, órdenes de compra o etiquetas RFID, se desactivará automáticamente para preservar la trazabilidad contable.</li>
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setDeletingProduct(null)}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button primary"
                style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Eliminando…' : 'Eliminar producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
