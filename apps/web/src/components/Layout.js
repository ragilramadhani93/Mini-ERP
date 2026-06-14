export class Layout {
  constructor(router, auth) {
    this.router = router
    this.auth = auth
    this.menuOpen = false
    this.sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true'
  }

  render() {
    const role = this.auth.getRole()
    const userName = this.auth.profile?.full_name || this.auth.user?.email

    if (!this.auth.isAuthenticated()) {
      return `<div id="router-outlet"></div>`
    }

    const allItems = this.getNavItems(role)

    return `
      <div class="flex h-screen overflow-hidden">
        ${this.renderSidebar(allItems)}
        ${this.renderMobileOverlay()}
        <div class="flex-1 flex flex-col overflow-hidden">
          ${this.renderHeader(userName, role)}
          <main id="router-outlet" class="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 pb-20 md:pb-6"></main>
        </div>
        ${this.renderBottomTab(allItems)}
      </div>
    `
  }

  getNavItems(role) {
    const all = [
      { path: '/', label: 'Dashboard', icon: 'layout-dashboard', roles: ['owner', 'admin', 'staff_gudang', 'staff_keuangan'] },
      { path: '/products', label: 'Produk', icon: 'package', roles: ['owner', 'admin', 'staff_gudang'] },
      { path: '/stock', label: 'Stok', icon: 'archive', roles: ['owner', 'admin', 'staff_gudang'] },
      { path: '/stock/opname', label: 'Opname', icon: 'clipboard-check', roles: ['owner', 'admin', 'staff_gudang'] },
      { path: '/barcode', label: 'Scanner', icon: 'scan', roles: ['owner', 'admin', 'staff_gudang'] },
      { path: '/import-export', label: 'Import/Export', icon: 'file-up', roles: ['owner', 'admin'] },
      { path: '/sales', label: 'Penjualan', icon: 'shopping-cart', roles: ['owner', 'admin'] },
      { path: '/categories', label: 'Kategori', icon: 'tag', roles: ['owner', 'admin'] },
      { path: '/suppliers', label: 'Supplier', icon: 'truck', roles: ['owner', 'admin'] },
      { path: '/purchase-orders', label: 'PO', icon: 'file-text', roles: ['owner', 'admin'] },
      { path: '/analytics', label: 'Analitik', icon: 'bar-chart-3', roles: ['owner', 'admin'] },
      { path: '/forecasting', label: 'Forecasting', icon: 'trending-up', roles: ['owner', 'admin'] },
      { path: '/ai-assistant', label: 'AI', icon: 'bot', roles: ['owner', 'admin'] },
      { path: '/finance', label: 'Keuangan', icon: 'wallet', roles: ['owner', 'admin', 'staff_keuangan'] },
      { path: '/debts', label: 'Hutang', icon: 'scale', roles: ['owner', 'admin', 'staff_keuangan'] },
      { path: '/users', label: 'Pengguna', icon: 'users', roles: ['owner', 'admin'] },
      { path: '/profile', label: 'Profil', icon: 'user', roles: ['owner', 'admin', 'staff_gudang', 'staff_keuangan'] }
    ]
    return all.filter(item => item.roles.includes(role))
  }

  mobileBottomItems(items) {
    const priority = ['/', '/products', '/stock', '/sales', '/finance']
    return items.filter(item => priority.includes(item.path)).slice(0, 5)
  }

  renderSidebar(items) {
    const collapsed = this.sidebarCollapsed
    const p = this.auth.profile
    const avatarUrl = p?.avatar_url || 'https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=default%20user%20avatar%20placeholder&image_size=square'
    return `
      <aside class="hidden md:flex ${collapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex-col transition-all duration-300" id="sidebar">
        <div class="p-4 border-b border-gray-200 flex justify-center">
          <img src="https://wpnejkrfjlblxkcakzrg.supabase.co/storage/v1/object/public/Logo/ChatGPT%20Image%20Jun%2014,%202026,%2002_58_56%20PM.png" 
               alt="StokCuan Logo" 
               class="${collapsed ? 'w-12 h-12' : 'w-full max-w-xs'} object-contain transition-all">
        </div>
        <nav class="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin" id="sidebar-nav">
          ${items.map(item => `
            <a href="#${item.path}" class="sidebar-link ${collapsed ? 'justify-center' : ''}" data-path="${item.path}">
              <i data-lucide="${item.icon}" class="${collapsed ? 'w-7 h-7' : 'w-5 h-5'}"></i>
              ${collapsed ? '' : item.label}
            </a>
          `).join('')}
        </nav>
        <div class="p-4 border-t border-gray-200 space-y-2">
          <div class="flex items-center gap-3 ${collapsed ? 'justify-center' : ''}">
            <div class="${collapsed ? 'w-12 h-12' : 'w-10 h-10'} rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
              <img src="${avatarUrl}" alt="Avatar" class="w-full h-full object-cover">
            </div>
            ${collapsed ? '' : `
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">${p?.full_name || 'Pengguna'}</p>
                <p class="text-xs text-gray-500 truncate">${p?.email}</p>
              </div>
            `}
          </div>
          <button id="toggle-sidebar-btn" class="w-full py-2 px-4 border-2 border-gray-300 text-gray-600 rounded-lg font-semibold hover:bg-gray-50 flex items-center justify-center gap-2">
            <i data-lucide="${collapsed ? 'chevron-right' : 'chevron-left'}" class="${collapsed ? 'w-6 h-6' : 'w-5 h-5'}"></i>
          </button>
          <button id="logout-btn" class="w-full py-2 px-4 border-2 border-red-600 text-red-600 rounded-lg font-semibold hover:bg-red-50 flex items-center justify-center gap-2">
            <i data-lucide="log-out" class="${collapsed ? 'w-6 h-6' : 'w-5 h-5'}"></i>
            ${collapsed ? '' : 'Keluar'}
          </button>
        </div>
      </aside>
    `
  }

  renderMobileOverlay() {
    return `
      <div id="mobile-menu-overlay" class="fixed inset-0 bg-black/50 z-30 hidden md:hidden" style="${this.menuOpen ? '' : 'display:none'}">
        <div class="w-72 h-full bg-white overflow-y-auto" id="mobile-menu-drawer">
          <div class="p-4 border-b border-gray-200 flex items-center justify-between">
            <h1 class="text-xl font-bold text-primary-600">StokCuan</h1>
            <button id="close-mobile-menu" class="text-gray-400 hover:text-gray-600">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          <nav class="p-4 space-y-1" id="mobile-nav">
            ${this.getNavItems(this.auth.getRole()).map(item => `
              <a href="#${item.path}" class="sidebar-link mobile-link" data-path="${item.path}">
                <i data-lucide="${item.icon}" class="w-5 h-5"></i>
                ${item.label}
              </a>
            `).join('')}
          </nav>
          <div class="p-4 border-t border-gray-200 mt-4">
            <button id="mobile-logout-btn" class="btn-outline w-full text-danger-600">
              <i data-lucide="log-out" class="w-5 h-5"></i> Keluar
            </button>
          </div>
        </div>
      </div>
    `
  }

  renderHeader(userName, role) {
    const roleLabels = { owner: 'Pemilik', admin: 'Admin', staff_gudang: 'Staff Gudang', staff_keuangan: 'Staff Keuangan' }
    const now = new Date()
    const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    const p = this.auth.profile
    const avatarUrl = p?.avatar_url || 'https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=default%20user%20avatar%20placeholder&image_size=square'
    
    return `
      <header class="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button id="hamburger-btn" class="md:hidden text-gray-600 hover:text-gray-900">
              <i data-lucide="menu" class="w-6 h-6"></i>
            </button>
            <h2 class="text-base md:text-lg font-semibold text-gray-900" id="page-title">Dashboard Overview</h2>
          </div>
          
          <div class="flex items-center gap-4">
            <div class="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-2">
              <i data-lucide="search" class="w-4 h-4 text-gray-500 mr-2"></i>
              <input type="text" placeholder="Cari data..." class="bg-transparent border-none outline-none text-sm w-40">
            </div>
            
            <button class="p-2 hover:bg-gray-100 rounded-full">
              <i data-lucide="bell" class="w-5 h-5 text-gray-700"></i>
            </button>
            
            <div class="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div class="text-right hidden sm:block">
                <p class="text-sm font-semibold text-gray-900">${userName}</p>
                <p class="text-xs text-gray-500">Last login: ${timeString}</p>
              </div>
              <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                <img src="${avatarUrl}" alt="Profile" class="w-full h-full object-cover">
              </div>
            </div>
          </div>
        </div>
      </header>
    `
  }

  renderBottomTab(items) {
    const tabs = this.mobileBottomItems(items)
    return `
      <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 safe-area-bottom">
        <div class="flex items-center justify-around h-16">
          ${tabs.map(tab => `
            <a href="#${tab.path}" class="bottom-tab flex flex-col items-center justify-center px-3 py-1 text-xs transition-colors" data-path="${tab.path}">
              <i data-lucide="${tab.icon}" class="w-5 h-5 mb-0.5"></i>
              <span>${tab.label}</span>
            </a>
          `).join('')}
        </div>
      </nav>
    `
  }

  bindEvents() {
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await this.auth.logout()
      this.router.navigate('/login')
    })

    document.getElementById('mobile-logout-btn')?.addEventListener('click', async () => {
      await this.auth.logout()
      this.closeMobileMenu()
      this.router.navigate('/login')
    })

    document.getElementById('hamburger-btn')?.addEventListener('click', () => {
      this.openMobileMenu()
    })

    document.getElementById('close-mobile-menu')?.addEventListener('click', () => {
      this.closeMobileMenu()
    })

    document.getElementById('mobile-menu-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeMobileMenu()
    })

    document.querySelectorAll('.sidebar-link, .bottom-tab, .mobile-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const path = link.dataset.path
        if (link.classList.contains('mobile-link')) this.closeMobileMenu()
        this.router.navigate(path)
      })
    })

    document.getElementById('toggle-sidebar-btn')?.addEventListener('click', () => {
      this.sidebarCollapsed = !this.sidebarCollapsed
      localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed)
      const app = document.getElementById('app')
      const page = window.location.hash.slice(1) || '/'
      this.router.navigate(page) // Re-render
    })

    if (window.lucide) window.lucide.createIcons()
  }

  openMobileMenu() {
    const overlay = document.getElementById('mobile-menu-overlay')
    const drawer = document.getElementById('mobile-menu-drawer')
    if (overlay && drawer) {
      overlay.style.display = 'block'
      drawer.style.transform = 'translateX(0)'
      this.menuOpen = true
    }
  }

  closeMobileMenu() {
    const overlay = document.getElementById('mobile-menu-overlay')
    const drawer = document.getElementById('mobile-menu-drawer')
    if (drawer) {
      drawer.style.transform = 'translateX(-100%)'
    }
    if (overlay) {
      overlay.style.display = 'none'
      this.menuOpen = false
    }
  }

  updateActiveLink(path) {
    document.querySelectorAll('.sidebar-link, .bottom-tab').forEach(link => {
      link.classList.toggle('active', link.dataset.path === path)
    })

    document.getElementById('mobile-menu-overlay')?.querySelectorAll('.mobile-link').forEach(link => {
      link.classList.toggle('active', link.dataset.path === path)
    })

    const titles = {
      '/': 'Dashboard', '/products': 'Produk', '/stock': 'Stok',
      '/stock/opname': 'Stock Opname', '/barcode': 'Barcode',
      '/import-export': 'Import / Export', '/sales': 'Penjualan',
      '/analytics': 'Analitik', '/forecasting': 'Forecasting',
      '/ai-assistant': 'AI Assistant', '/finance': 'Keuangan',
      '/purchase-orders': 'PO', '/debts': 'Hutang',
      '/categories': 'Kategori', '/suppliers': 'Supplier',
      '/users': 'Pengguna', '/profile': 'Profil'
    }
    const titleEl = document.getElementById('page-title')
    if (titleEl) titleEl.textContent = titles[path] || 'Dashboard'
  }
}