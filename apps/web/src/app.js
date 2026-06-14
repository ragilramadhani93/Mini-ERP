import { AuthService } from './services/auth.js'
import { Router } from './utils/router.js'
import { Layout } from './components/Layout.js'
import { LoginPage } from './pages/LoginPage.js'
import { DashboardPage } from './pages/DashboardPage.js'
import { ProductsPage } from './pages/ProductsPage.js'
import { StockPage } from './pages/StockPage.js'
import { StockOpnamePage } from './pages/StockOpnamePage.js'
import { SalesPage } from './pages/SalesPage.js'
import { FinancePage } from './pages/FinancePage.js'
import { PurchaseOrderPage } from './pages/PurchaseOrderPage.js'
import { DebtPage } from './pages/DebtPage.js'
import { BarcodePage } from './pages/BarcodePage.js'
import { ImportExportPage } from './pages/ImportExportPage.js'
import { AnalyticsPage } from './pages/AnalyticsPage.js'
import { ForecastingPage } from './pages/ForecastingPage.js'
import { AIAssistantPage } from './pages/AIAssistantPage.js'
import { CategoriesPage } from './pages/CategoriesPage.js'
import { SuppliersPage } from './pages/SuppliersPage.js'
import { UsersPage } from './pages/UsersPage.js'
import { ProfilePage } from './pages/ProfilePage.js'

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'

async function createSupabase() {
  if (isDemo) {
    const { MockDatabase } = await import('./services/mockData.js')
    return new MockDatabase()
  }
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

const routes = {
  '/login': { component: LoginPage, public: true },
  '/': { component: DashboardPage, roles: ['owner', 'admin', 'staff_gudang', 'staff_keuangan'] },
  '/products': { component: ProductsPage, roles: ['owner', 'admin', 'staff_gudang'] },
  '/stock': { component: StockPage, roles: ['owner', 'admin', 'staff_gudang'] },
  '/stock/opname': { component: StockOpnamePage, roles: ['owner', 'admin', 'staff_gudang'] },
  '/sales': { component: SalesPage, roles: ['owner', 'admin'] },
  '/finance': { component: FinancePage, roles: ['owner', 'admin', 'staff_keuangan'] },
  '/purchase-orders': { component: PurchaseOrderPage, roles: ['owner', 'admin'] },
  '/debts': { component: DebtPage, roles: ['owner', 'admin', 'staff_keuangan'] },
  '/barcode': { component: BarcodePage, roles: ['owner', 'admin', 'staff_gudang'] },
  '/import-export': { component: ImportExportPage, roles: ['owner', 'admin'] },
  '/analytics': { component: AnalyticsPage, roles: ['owner', 'admin'] },
  '/forecasting': { component: ForecastingPage, roles: ['owner', 'admin'] },
  '/ai-assistant': { component: AIAssistantPage, roles: ['owner', 'admin'] },
  '/categories': { component: CategoriesPage, roles: ['owner', 'admin'] },
  '/suppliers': { component: SuppliersPage, roles: ['owner', 'admin'] },
  '/users': { component: UsersPage, roles: ['owner', 'admin'] },
  '/profile': { component: ProfilePage, roles: ['owner', 'admin', 'staff_gudang', 'staff_keuangan'] }
}

let layout

export async function initApp() {
  const app = document.getElementById('app')

  supabase = await createSupabase()
  auth = new AuthService(supabase)
  router = new Router(routes, auth)

  if (isDemo) {
    // In demo mode, don't auto-login - let user login manually
  } else {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await auth.setUser(session.user)
    }
  }

  renderApp()

  router.onRouteChange = (route) => {
    renderApp()
    const outlet = document.getElementById('router-outlet')
    if (outlet && route.component) {
      const page = new route.component({ supabase, auth, router })
      outlet.innerHTML = page.render()
      page.bindEvents?.()
    }
    if (layout) layout.updateActiveLink(route.path)
  }

  if (auth.isAuthenticated()) {
    router.navigate(window.location.hash.slice(1) || '/')
  } else {
    router.navigate('/login')
  }

  window.addEventListener('hashchange', () => router.navigate(window.location.hash.slice(1)))
}

function renderApp() {
  const app = document.getElementById('app')
  layout = new Layout(router, auth)
  app.innerHTML = layout.render()
  layout.bindEvents()
}