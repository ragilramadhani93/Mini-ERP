import { AuthService } from './services/auth.js'
import { Router } from './utils/router.js'
import { Layout } from './components/Layout.js'

async function createSupabase() {
  const { createClient } = await import('@supabase/supabase-js')
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
    return null
  }
  return createClient(url, key)
}

let supabase
let auth
let router
let layout
let activePage = null

const routes = {
  '/login': { load: () => import('./pages/LoginPage.js').then(m => m.LoginPage), public: true },
  '/register': { load: () => import('./pages/RegisterPage.js').then(m => m.RegisterPage), public: true },
  '/': { load: () => import('./pages/DashboardPage.js').then(m => m.DashboardPage), roles: ['owner', 'admin', 'staff_gudang', 'staff_keuangan'] },
  '/products': { load: () => import('./pages/ProductsPage.js').then(m => m.ProductsPage), roles: ['owner', 'admin', 'staff_gudang'] },
  '/stock': { load: () => import('./pages/StockPage.js').then(m => m.StockPage), roles: ['owner', 'admin', 'staff_gudang'] },
  '/stock/opname': { load: () => import('./pages/StockOpnamePage.js').then(m => m.StockOpnamePage), roles: ['owner', 'admin', 'staff_gudang'] },
  '/sales': { load: () => import('./pages/SalesPage.js').then(m => m.SalesPage), roles: ['owner', 'admin'] },
  '/finance': { load: () => import('./pages/FinancePage.js').then(m => m.FinancePage), roles: ['owner', 'admin', 'staff_keuangan'] },
  '/finance/expenses': { load: () => import('./pages/FinancePage.js').then(m => m.FinancePage), roles: ['owner', 'admin', 'staff_keuangan'] },
  '/purchase-orders': { load: () => import('./pages/PurchaseOrderPage.js').then(m => m.PurchaseOrderPage), roles: ['owner', 'admin'] },
  '/debts': { load: () => import('./pages/DebtPage.js').then(m => m.DebtPage), roles: ['owner', 'admin', 'staff_keuangan'] },
  '/deposits': { load: () => import('./pages/DepositPage.js').then(m => m.DepositPage), roles: ['owner', 'admin', 'staff_keuangan'] },
  '/returns': { load: () => import('./pages/ReturPage.js').then(m => m.ReturPage), roles: ['owner', 'admin'] },
  '/retur': { load: () => import('./pages/ReturPage.js').then(m => m.ReturPage), roles: ['owner', 'admin'] },
  '/barcode': { load: () => import('./pages/BarcodePage.js').then(m => m.BarcodePage), roles: ['owner', 'admin', 'staff_gudang'] },
  '/import-export': { load: () => import('./pages/ImportExportPage.js').then(m => m.ImportExportPage), roles: ['owner', 'admin'] },
  '/analytics': { load: () => import('./pages/AnalyticsPage.js').then(m => m.AnalyticsPage), roles: ['owner', 'admin'] },
  '/forecasting': { load: () => import('./pages/ForecastingPage.js').then(m => m.ForecastingPage), roles: ['owner', 'admin'] },
  '/ai-assistant': { load: () => import('./pages/AIAssistantPage.js').then(m => m.AIAssistantPage), roles: ['owner', 'admin'] },
  '/categories': { load: () => import('./pages/CategoriesPage.js').then(m => m.CategoriesPage), roles: ['owner', 'admin'] },
  '/suppliers': { load: () => import('./pages/SuppliersPage.js').then(m => m.SuppliersPage), roles: ['owner', 'admin'] },
  '/users': { load: () => import('./pages/UsersPage.js').then(m => m.UsersPage), roles: ['owner'] },
  '/profile': { load: () => import('./pages/ProfilePage.js').then(m => m.ProfilePage), roles: ['owner', 'admin', 'staff_gudang', 'staff_keuangan'] },
  '/shopee': { load: () => import('./pages/ShopeePage.js').then(m => m.ShopeePage), roles: ['owner', 'admin'] },
  '/settings': { load: () => import('./pages/SettingsPage.js').then(m => m.SettingsPage), roles: ['owner', 'admin'] },
  '/settings/roles': { load: () => import('./pages/SettingsRolePage.js').then(m => m.SettingsRolePage), roles: ['owner'] },
  '/assets': { load: () => import('./pages/AssetsPage.js').then(m => m.AssetsPage), roles: ['owner', 'admin'] }
}

export async function initApp() {
  const app = document.getElementById('app')

  // Bersihkan state sidebar yang rusak
  localStorage.removeItem('sidebarCollapsed')

  supabase = await createSupabase()
  auth = new AuthService(supabase)
  router = new Router(routes, auth)

  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    await auth.setUser(session.user)
  }

  // Setup auto-logout callback
  auth.onLogoutCallback = () => {
    router.navigate('/login')
  }

  // Only setup idle listeners if not in Capacitor (Android/iOS app)
  const isCapacitor = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()
  if (!isCapacitor) {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, () => auth.resetIdleTimer(), true)
    })
  }

  renderApp()

  router.onRouteChange = async (route) => {
    if (activePage?.destroy) {
      try { await activePage.destroy() } catch (e) { console.warn('Destroy error:', e) }
      activePage = null
    }

    const ComponentClass = route.load ? await route.load() : route.component
    if (!ComponentClass) return

    if (route.public) {
      const appEl = document.getElementById('app')
      activePage = new ComponentClass({ auth, router, supabase, path: route.path })
      appEl.innerHTML = activePage.render()
      activePage.bindEvents?.()
    } else {
      renderApp()
      const outlet = document.getElementById('router-outlet')
      if (outlet) {
        activePage = new ComponentClass({ supabase, auth, router, path: route.path })
        outlet.innerHTML = activePage.render()
        activePage.bindEvents?.()
      }
      if (layout) layout.updateActiveLink(route.path)
    }
  }

  if (auth.isAuthenticated()) {
    const initialPath = window.location.hash.slice(1) || '/'
    router.navigate(initialPath)
  } else {
    router.navigate('/login')
  }

  window.addEventListener('hashchange', () => router.navigate(window.location.hash.slice(1)))
}

function renderApp() {
  const app = document.getElementById('app')
  if (!layout) {
    layout = new Layout(router, auth)
    app.innerHTML = layout.render()
    layout.bindEvents()
  } else {
    // Check if layout DOM is still attached
    if (!document.getElementById('router-outlet')) {
      app.innerHTML = layout.render()
      layout.bindEvents()
    }
  }
}
