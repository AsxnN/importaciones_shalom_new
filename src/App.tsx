import { useState } from 'react'
import { useAuth } from './auth/AuthProvider'
import { ThemeToggle } from './lib/ThemeToggle'
import { canAccess } from './lib/roles'
import { AuditsPage } from './pages/AuditsPage'
import { ContainersPage } from './pages/ContainersPage'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryPage } from './pages/InventoryPage'
import { LoginPage } from './pages/LoginPage'
import { MovementsPage } from './pages/MovementsPage'
import { ProductsPage } from './pages/ProductsPage'
import { ProjectionsPage } from './pages/ProjectionsPage'
import { ReceptionsPage } from './pages/ReceptionsPage'
import { UsersPage } from './pages/UsersPage'

export default function App() {
  const { loading, user, profile, signOut } = useAuth()
  const [section, setSection] = useState<'dashboard' | 'productos' | 'inventario' | 'movimientos' | 'recepciones' | 'auditorias' | 'ordenes' | 'contenedores' | 'usuarios'>('dashboard')
  const [targetContainerForReception, setTargetContainerForReception] = useState<number | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('shalom_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev
      try {
        localStorage.setItem('shalom_sidebar_collapsed', String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  if (loading) return <main className="screen-message">Cargando sesión…</main>
  if (!user) return <LoginPage />

  const breadcrumbText =
    section === 'productos'
      ? 'Maestros y empaque'
      : section === 'inventario'
      ? 'Inventario y almacenes'
      : section === 'movimientos'
      ? 'Movimientos y transferencias'
      : section === 'recepciones'
      ? 'Recepciones RFID'
      : section === 'auditorias'
      ? 'Auditorías RFID (ERI)'
      : section === 'ordenes'
      ? 'Órdenes y proyecciones'
      : section === 'contenedores'
      ? 'Control de contenedores y patio'
      : section === 'usuarios'
      ? 'Usuarios y permisos'
      : 'Resumen operativo'

  return (
    <div className="app-layout">
      {/* Barra Lateral Fija e Interactiva (skill_design.md) */}
      <aside
        className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
        aria-label="Navegación principal"
      >
        <div>
          {/* Cabecera con logo y botón de colapso */}
          {sidebarCollapsed ? (
            <div className="sidebar-header collapsed">
              <div
                className="sidebar-brand-badge"
                title="SHALOM · Centro de operaciones (clic para expandir)"
                onClick={toggleSidebar}
                style={{ cursor: 'pointer' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              </div>
              <button
                type="button"
                className="sidebar-collapse-btn"
                onClick={toggleSidebar}
                title="Expandir menú lateral"
                aria-label="Expandir menú lateral"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="sidebar-header">
              <div className="sidebar-brand-group">
                <div className="sidebar-brand-badge" title="SHALOM · Logística e Importaciones">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                    <path d="m3.3 7 8.7 5 8.7-5" />
                    <path d="M12 22V12" />
                  </svg>
                </div>
                <div className="sidebar-brand-text">
                  <h1 className="sidebar-brand-title">SHALOM</h1>
                  <span className="sidebar-brand-subtitle">Centro de operaciones</span>
                </div>
              </div>
              <button
                type="button"
                className="sidebar-collapse-btn"
                onClick={toggleSidebar}
                title="Contraer menú lateral"
                aria-label="Contraer menú lateral"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </svg>
              </button>
            </div>
          )}

          <nav className="sidebar-nav">
            <button
              type="button"
              className={`sidebar-nav-item ${section === 'dashboard' ? 'active' : ''}`}
              onClick={() => setSection('dashboard')}
              title="Resumen ejecutivo y Centro de Operaciones"
            >
              <span className="sidebar-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="7" height="9" x="3" y="3" rx="1" />
                  <rect width="7" height="5" x="14" y="3" rx="1" />
                  <rect width="7" height="9" x="14" y="12" rx="1" />
                  <rect width="7" height="5" x="3" y="16" rx="1" />
                </svg>
              </span>
              {!sidebarCollapsed && <span className="sidebar-nav-label">Resumen</span>}
            </button>

            {sidebarCollapsed ? (
              <div className="sidebar-nav-divider" title="Módulos operativos" />
            ) : (
              <span className="sidebar-group-label">Módulos operativos</span>
            )}

            <button
              type="button"
              className={`sidebar-nav-item ${section === 'productos' ? 'active' : ''}`}
              onClick={() => setSection('productos')}
              title="Maestros y empaque: Catálogo, cubicaje, reglas de estiba y proveedores"
            >
              <span className="sidebar-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              </span>
              {!sidebarCollapsed && <span className="sidebar-nav-label">Maestros y empaque</span>}
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${section === 'inventario' ? 'active' : ''}`}
              onClick={() => setSection('inventario')}
              title="Inventario y almacenes: Kardex, existencias físicas, racks y stock en piso"
            >
              <span className="sidebar-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
                  <path d="m22 12.5-8.58 3.9a2 2 0 0 1-1.66 0L3.18 12.5" />
                  <path d="m22 17.5-8.58 3.9a2 2 0 0 1-1.66 0L3.18 17.5" />
                </svg>
              </span>
              {!sidebarCollapsed && <span className="sidebar-nav-label">Inventario y almacenes</span>}
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${section === 'movimientos' ? 'active' : ''}`}
              onClick={() => setSection('movimientos')}
              title="Movimientos y transferencias: Traslados entre almacenes y despacho a agencias"
            >
              <span className="sidebar-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m16 3 4 4-4 4" />
                  <path d="M20 7H4" />
                  <path d="m8 21-4-4 4-4" />
                  <path d="M4 17h16" />
                </svg>
              </span>
              {!sidebarCollapsed && <span className="sidebar-nav-label">Movimientos</span>}
            </button>

            {canAccess(profile, 'RECEPCIONES.VER', ['ADMINISTRADOR', 'OPERARIO', 'AUDITOR']) && (
              <button
                type="button"
                className={`sidebar-nav-item ${section === 'recepciones' ? 'active' : ''}`}
                onClick={() => setSection('recepciones')}
                title="Recepciones RFID: Descarga en muelle, asignación de tags y conciliación ciega"
              >
                <span className="sidebar-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
                    <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
                    <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
                  </svg>
                </span>
                {!sidebarCollapsed && <span className="sidebar-nav-label">Recepciones RFID</span>}
              </button>
            )}

            {/* Módulo 05: Auditorías RFID (ERI) */}
            {canAccess(profile, 'AUDITORIAS.VER', ['ADMINISTRADOR', 'AUDITOR']) && (
              <button
                type="button"
                className={`sidebar-nav-item ${section === 'auditorias' ? 'active' : ''}`}
                onClick={() => setSection('auditorias')}
                title="Auditorías RFID: Inspección cíclica y Exactitud de Registro de Inventario (ERI)"
              >
                <span className="sidebar-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <path d="m9 14 2 2 4-4" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  </svg>
                </span>
                {!sidebarCollapsed && <span className="sidebar-nav-label">Auditorías ERI</span>}
              </button>
            )}

            {canAccess(profile, 'ORDENES.VER', ['ADMINISTRADOR', 'COMPRADOR']) && (
              <button
                type="button"
                className={`sidebar-nav-item ${section === 'ordenes' ? 'active' : ''}`}
                onClick={() => setSection('ordenes')}
                title="Órdenes y proyecciones: Planificación de compras basada en demanda y Packing List"
              >
                <span className="sidebar-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                </span>
                {!sidebarCollapsed && <span className="sidebar-nav-label">Órdenes y proyecciones</span>}
              </button>
            )}

            {canAccess(profile, 'RECEPCIONES.VER', ['ADMINISTRADOR', 'OPERARIO', 'COMPRADOR', 'AUDITOR']) && (
              <button
                type="button"
                className={`sidebar-nav-item ${section === 'contenedores' ? 'active' : ''}`}
                onClick={() => setSection('contenedores')}
                title="Control de contenedores: Patio, garita, cuadrilla y registro fotográfico"
              >
                <span className="sidebar-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                    <path d="M15 18H9" />
                    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
                    <circle cx="17" cy="18" r="2" />
                    <circle cx="7" cy="18" r="2" />
                  </svg>
                </span>
                {!sidebarCollapsed && <span className="sidebar-nav-label">Control de contenedores</span>}
              </button>
            )}

            {canAccess(profile, 'USUARIOS.VER', ['ADMINISTRADOR']) && (
              <button
                type="button"
                className={`sidebar-nav-item ${section === 'usuarios' ? 'active' : ''}`}
                onClick={() => setSection('usuarios')}
                title="Usuarios y permisos: Control de cuentas, roles RBAC y auditoría forense"
              >
                <span className="sidebar-nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                {!sidebarCollapsed && <span className="sidebar-nav-label">Usuarios y roles</span>}
              </button>
            )}
          </nav>
        </div>

        {/* Información del Usuario y Cierre de Sesión */}
        {sidebarCollapsed ? (
          <div className="sidebar-footer">
            <div
              className="sidebar-user-avatar"
              title={`${profile?.nombre_completo ?? user.email ?? ''} (${profile?.roles?.join(', ') || 'Sin rol'})`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <button
              type="button"
              className="sidebar-logout-btn-mini"
              onClick={() => void signOut()}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="sidebar-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div className="sidebar-user-avatar" title={profile?.nombre_completo ?? user.email ?? ''}>
                {(profile?.nombre_completo || user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="sidebar-user-info" style={{ flex: 1, minWidth: 0 }}>
                <span className="sidebar-user-name" title={profile?.nombre_completo ?? user.email ?? ''}>
                  {profile?.nombre_completo ?? user.email}
                </span>
                <span className="sidebar-user-role" title={profile?.roles?.join(', ')}>
                  {profile?.roles?.length ? profile.roles.join(', ') : 'Sin rol'}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={() => void signOut()}
              title="Cerrar sesión actual"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}
      </aside>

      {/* Espacio Central de Trabajo (skill_design.md) */}
      <div className="app-main">
        {/* Cabecera Superior: breadcrumb, selector de contexto, acciones */}
        <header className="app-header">
          <div className="breadcrumb-bar">
            <span>Inicio</span>
            <span aria-hidden="true">/</span>
            <span className="breadcrumb-active">{breadcrumbText}</span>
          </div>

          <div className="header-actions">
            <div className="operational-status-pill">
              <span className="status-dot" aria-hidden="true" />
              <span>Operativo en línea</span>
            </div>
            <ThemeToggle showLabel={false} />
          </div>
        </header>

        {/* Contenedor de la Vista Activa */}
        <main className="app-workspace">
          {section === 'productos' ? (
            <ProductsPage onBack={() => setSection('dashboard')} />
          ) : section === 'inventario' ? (
            <InventoryPage onBack={() => setSection('dashboard')} />
          ) : section === 'movimientos' ? (
            <MovementsPage onBack={() => setSection('dashboard')} />
          ) : section === 'recepciones' ? (
            <ReceptionsPage
              onBack={() => setSection('dashboard')}
              onNavigateToInventory={() => setSection('inventario')}
              initialContainerId={targetContainerForReception}
            />
          ) : section === 'auditorias' ? (
            <AuditsPage onBack={() => setSection('dashboard')} />
          ) : section === 'ordenes' ? (
            <ProjectionsPage
              onBack={() => setSection('dashboard')}
              onOpenReceptions={() => setSection('recepciones')}
            />
          ) : section === 'contenedores' ? (
            <ContainersPage
              onBack={() => setSection('dashboard')}
              onOpenReceptions={(containerId) => {
                setTargetContainerForReception(containerId ?? null)
                setSection('recepciones')
              }}
            />
          ) : section === 'usuarios' ? (
            <UsersPage onBack={() => setSection('dashboard')} />
          ) : (
            <DashboardPage
              profile={profile}
              onOpenProducts={() => setSection('productos')}
              onOpenInventory={() => setSection('inventario')}
              onOpenMovements={() => setSection('movimientos')}
              onOpenReceptions={() => setSection('recepciones')}
              onOpenAudits={() => setSection('auditorias')}
              onOpenProjections={() => setSection('ordenes')}
              onOpenContainers={() => setSection('contenedores')}
              onOpenUsers={() => setSection('usuarios')}
            />
          )}
        </main>
      </div>
    </div>
  )
}
