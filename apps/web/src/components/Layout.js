export class Layout {
  constructor(router, auth) {
    this.router = router;
    this.auth = auth;
    this.menuOpen = false;
    this.sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    this.openSubs = {};
    // Restore sub-menu state from session
    try {
      const saved = sessionStorage.getItem('sidebarOpenSubs');
      if (saved) this.openSubs = JSON.parse(saved);
    } catch (e) { /* ignore */ }
  }

  getSections(role) {
    const menuPerms = this.auth.menuPermissions;
    const canView = (item) => {
      if (item.path === '/deposits') return true;
      if (!menuPerms) return item.roles.includes(role);
      return menuPerms[item.path] === true;
    };
    const all = [
      {
        label: 'Utama',
        items: [
          { path: '/', label: 'Dashboard', icon: 'grid', roles: ['owner', 'admin', 'staff_gudang', 'staff_keuangan'] },
          { path: '/profile', label: 'Profil', icon: 'user', roles: ['owner', 'admin', 'staff_gudang', 'staff_keuangan'] }
        ]
      },
      {
        label: 'Inventori',
        items: [
          { path: '/products', label: 'Produk', icon: 'box', roles: ['owner', 'admin', 'staff_gudang'], hasSub: true,
            subs: [
              { path: '/products', label: 'Semua Produk' },
              { path: '/categories', label: 'Kategori' },
              { path: '/products?filter=low-stock', label: 'Stok Rendah' }
            ]
          },
          { path: '/stock', label: 'Stok Masuk', icon: 'trending-up', roles: ['owner', 'admin', 'staff_gudang'] },
          { path: '/stock/opname', label: 'Opname', icon: 'check-circle', roles: ['owner', 'admin', 'staff_gudang'] },
          { path: '/barcode', label: 'Scanner', icon: 'device', roles: ['owner', 'admin', 'staff_gudang'] }
        ]
      },
      {
        label: 'Transaksi',
        items: [
          { path: '/sales', label: 'Penjualan', icon: 'shopping-bag', roles: ['owner', 'admin'] },
          { path: '/returns', label: 'Retur', icon: 'refresh-ccw', roles: ['owner', 'admin'] },
          { path: '/shopee', label: 'Import Marketplace', icon: 'file', roles: ['owner', 'admin'] },
          { path: '/purchase-orders', label: 'PO', icon: 'file-text', roles: ['owner', 'admin'] },
          { path: '/suppliers', label: 'Supplier', icon: 'users', roles: ['owner', 'admin'] }
        ]
      },
      {
        label: 'Analitik',
        items: [
          { path: '/analytics', label: 'Analitik', icon: 'bar-chart', roles: ['owner', 'admin'] },
          { path: '/forecasting', label: 'Forecasting', icon: 'activity', roles: ['owner', 'admin'] },
          { path: '/ai-assistant', label: 'AI', icon: 'circle', roles: ['owner', 'admin'] }
        ]
      },
      {
        label: 'Lainnya',
        items: [
          { path: '/import-export', label: 'Laporan', icon: 'file', roles: ['owner', 'admin'] },
          { path: '/finance', label: 'Keuangan', icon: 'credit-card', roles: ['owner', 'admin', 'staff_keuangan'], hasSub: true,
            subs: [
              { path: '/finance', label: 'Kas & Bank' },
              { path: '/finance/expenses', label: 'Pengeluaran' }
            ]
          },
          { path: '/debts', label: 'Hutang', icon: 'dollar-sign', roles: ['owner', 'admin', 'staff_keuangan'] },
          { path: '/deposits', label: 'Deposit', icon: 'piggy-bank', roles: ['owner', 'admin', 'staff_keuangan'] },
          { path: '/assets', label: 'Aset', icon: 'package', roles: ['owner', 'admin'] },
          { path: '/settings', label: 'Pengaturan', icon: 'settings', roles: ['owner', 'admin'], hasSub: true,
            subs: [
              { path: '/settings', label: 'Metode Pembayaran' },
              { path: '/settings/roles', label: 'Atur Peran' }
            ]
          }
        ]
      }
    ];
    return all.map(section => ({
      ...section,
      items: section.items.filter(item => canView(item))
    })).filter(s => s.items.length > 0);
  }

  render() {
    const role = this.auth.getRole();
    if (!this.auth.isAuthenticated()) {
      return `<div id="router-outlet"></div>`;
    }
    const sections = this.getSections(role);
    const currentPath = window.location.hash.slice(1) || '/';
    return `
      <div class="flex h-screen overflow-hidden" style="background:var(--silk-light)">
        ${this.renderSidebar(sections, currentPath)}
        ${this.renderMobileOverlay(sections, currentPath)}
        <div class="main-content">
          ${this.renderHeader()}
          <main id="router-outlet" class="flex-1 overflow-y-auto pb-20 md:pb-6 scrollbar-premium fade-in"></main>
        </div>
        ${this.renderBottomTab(sections)}
      </div>
    `;
  }

  getNavIcons() {
    return {
      grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>',
      user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>',
      'trending-up': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
      'check-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      device: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>',
      'shopping-bag': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>',
      'file-text': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
      'bar-chart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
      activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
      circle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>',
      file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      'credit-card': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
      'dollar-sign': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
      package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
      'piggy-bank': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5c-1.5 0-2.8.8-3.5 2-1.4-1.2-3-2-5-2-5 0-9 4-9 9s4 9 9 9h.5A5.5 5.5 0 0020 19.5v-.5a5 5 0 00-1-3 5 5 0 001-3V5z"/><path d="M2 13l2 2 2-2"/><path d="M12 17v3"/><path d="M12 9v2"/></svg>',
      settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
    };
  }

  renderSidebar(sections, currentPath) {
    const p = this.auth.profile;
    const userName = p?.full_name || 'Pengguna';
    const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const role = this.auth.getRole();
    const roleLabels = { owner: 'Owner', admin: 'Admin', staff_gudang: 'Staff Gudang', staff_keuangan: 'Staff Keuangan' };
    const roleLabel = roleLabels[role] || role;
    const icons = this.getNavIcons();

    return `
      <aside class="sidebar ${this.sidebarCollapsed ? 'collapsed' : ''}" id="sidebar">
        <div class="sidebar-brand">
          <div class="sidebar-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span class="sidebar-brand-text">Jenna<span>Shop</span></span>
          <button class="sidebar-brand-toggle" id="toggle-sidebar" title="Ciutkan sidebar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        </div>

        <nav class="sidebar-nav scrollbar-premium">
          ${sections.map(section => `
            <span class="nav-section-label">${section.label}</span>
            ${section.items.map(item => {
              const isActive = item.path === currentPath || (item.hasSub && item.subs?.some(s => s.path === currentPath));
              const subKey = `sub-${item.path.replace(/\//g, '-')}`;
              const isOpen = this.openSubs[subKey];
              return `
                <a class="nav-item ${isActive && !item.hasSub ? 'active' : ''} ${item.hasSub && isOpen ? 'open' : ''}"
                   href="#${item.path}" data-path="${item.path}" data-label="${item.label}"
                   ${item.hasSub ? `data-hassub="true" onclick="event.preventDefault(); var l=document.querySelector('#sidebar').__layoutInstance; if(l){l.toggleSub('${subKey}', this)}"` : ''}>
                  ${icons[item.icon] || icons.grid}
                  <span>${item.label}</span>
                  ${item.hasSub ? `<svg width="14" height="14" class="nav-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>` : ''}
                </a>
                ${item.hasSub ? `
                  <div class="nav-sub ${isOpen ? 'open' : ''}" id="${subKey}">
                    ${item.subs.map(sub => `
                      <a class="nav-sub-item ${sub.path === currentPath ? 'active' : ''}" href="#${sub.path}" data-path="${sub.path}">
                        <span class="nav-sub-dot"></span>${sub.label}
                      </a>
                    `).join('')}
                  </div>
                ` : ''}
              `;
            }).join('')}
          `).join('')}
        </nav>

        <div class="sidebar-user-card" id="user-menu-btn" onclick="window.location.hash='/profile'">
          <div class="sidebar-user-avatar">${initials}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${userName}</div>
            <div class="sidebar-user-role">${roleLabel}</div>
          </div>
        </div>

        <a href="#" class="sidebar-logout-btn" id="logout-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Keluar</span>
        </a>

        <button class="sidebar-expand-btn" id="expand-sidebar" title="Buka sidebar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </aside>
    `;
  }

  renderMobileOverlay(sections, currentPath) {
    const icons = this.getNavIcons();
    return `
      <div id="mobile-menu-overlay" class="fixed inset-0 z-30 hidden md:hidden" style="background:rgba(26,26,46,0.4);backdrop-filter:blur(4px);${this.menuOpen ? 'display:block' : 'display:none'}">
        <div class="w-72 h-full bg-white overflow-y-auto" id="mobile-menu-drawer" style="transform:translateX(-100%);transition:transform 0.3s cubic-bezier(.4,0,.2,1)">
          <div class="p-4 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div style="width:32px;height:32px;background:linear-gradient(135deg,var(--brand-maroon-dark),var(--brand-maroon-light));border-radius:8px;display:flex;align-items:center;justify-content:center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <span style="font-size:17px;font-weight:700;color:var(--slate-900)">Jenna <span style="color:var(--brand-maroon)">Shop</span></span>
            </div>
            <button id="close-mobile-menu" style="border:none;background:none;cursor:pointer;color:var(--slate-400);padding:4px;border-radius:6px" aria-label="Tutup menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <nav class="p-4" style="display:flex;flex-direction:column;gap:2px">
            ${sections.map(section => `
              <p style="font-size:9px;font-weight:600;color:var(--slate-400);letter-spacing:.1em;text-transform:uppercase;padding:10px 4px 4px">${section.label}</p>
              ${section.items.map(item => {
                const isActive = item.path === currentPath;
                return `
                  <a href="#${item.path}" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                     style="${isActive ? 'background:var(--brand-maroon-subtle);color:var(--brand-maroon);font-weight:600' : 'color:var(--slate-600)'}"
                     data-path="${item.path}">
                    <span style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;opacity:${isActive ? 1 : .6}">${icons[item.icon] || ''}</span>
                    <span>${item.label}</span>
                  </a>
                `;
              }).join('')}
            `).join('')}
          </nav>
          <div class="p-4 border-t border-gray-100 mt-4">
            <a href="#/profile" class="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-xl transition-all"
               style="color:var(--slate-600);text-decoration:none" data-path="/profile">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Profil
            </a>
            <button id="mobile-logout-btn" class="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-xl mt-2 w-full"
                    style="color:var(--coral);border:1px solid rgba(232,100,90,0.2);background:var(--coral-light);cursor:pointer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Keluar
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderHeader() {
    const p = this.auth.profile;
    const initials = (p?.full_name || 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    return `
      <header class="header-premium">
        <button id="hamburger-btn" class="md:hidden" style="border:none;background:none;cursor:pointer;color:var(--slate-500);padding:4px;border-radius:6px" aria-label="Buka menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="header-premium-search hidden sm:block">
          <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--slate-300)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Cari data..." id="global-search-input" style="padding-left:34px">
        </div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;color:var(--slate-400);font-weight:500" class="hidden md:flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${dateStr}
          </span>
          <button style="width:34px;height:34px;border:0.5px solid var(--slate-200);border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;transition:all 0.15s" id="notif-btn" aria-label="Notifikasi">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            <span style="width:6px;height:6px;background:var(--coral);border-radius:50%;position:absolute;top:7px;right:7px;border:1.5px solid white"></span>
          </button>
          <div style="width:34px;height:34px;background:linear-gradient(135deg,var(--brand-maroon),var(--brand-maroon-light));border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;box-shadow:0 2px 6px var(--brand-maroon-glow)" id="header-avatar" onclick="window.location.hash='/profile'">${initials}</div>
        </div>
      </header>
    `;
  }

  renderBottomTab(sections) {
    const tabs = [];
    sections.forEach(s => s.items.forEach(item => {
      if (['/', '/products', '/stock', '/sales', '/finance'].includes(item.path)) {
        tabs.push({ path: item.path, label: item.label, icon: item.icon });
      }
    }));
    const icons = this.getNavIcons();
    const currentPath = window.location.hash.slice(1) || '/';

    return `
      <nav class="md:hidden fixed bottom-0 left-0 right-0 z-20" style="background:rgba(255,255,255,0.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:0.5px solid var(--slate-100);padding-bottom:env(safe-area-inset-bottom,0px)">
        <div class="flex items-center justify-around" style="height:56px">
          ${tabs.slice(0, 5).map(tab => `
            <a href="#${tab.path}" class="bottom-tab ${tab.path === currentPath ? 'active' : ''}" data-path="${tab.path}" style="padding:4px 12px">
              <span style="width:20px;height:20px;display:flex;align-items:center;justify-content:center">${icons[tab.icon] || ''}</span>
              <span style="font-size:9px;font-weight:${tab.path === currentPath ? '600' : '500'}">${tab.label}</span>
            </a>
          `).join('')}
        </div>
      </nav>
    `;
  }

  toggleSub(key, el) {
    this.openSubs[key] = !this.openSubs[key];
    const sub = document.getElementById(key);
    if (sub) sub.classList.toggle('open', this.openSubs[key]);
    if (el) el.classList.toggle('open', this.openSubs[key]);
    // Persist state
    try { sessionStorage.setItem('sidebarOpenSubs', JSON.stringify(this.openSubs)); } catch (e) { /* ignore */ }
  }

  bindEvents() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.__layoutInstance = this;

    document.getElementById('toggle-sidebar')?.addEventListener('click', () => {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      document.getElementById('sidebar')?.classList.toggle('collapsed', this.sidebarCollapsed);
      localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);
    });

    document.getElementById('expand-sidebar')?.addEventListener('click', () => {
      this.sidebarCollapsed = false;
      document.getElementById('sidebar')?.classList.remove('collapsed');
      localStorage.setItem('sidebarCollapsed', 'false');
    });

    document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.auth.logout();
      this.router.navigate('/login');
    });

    document.getElementById('mobile-logout-btn')?.addEventListener('click', async () => {
      await this.auth.logout();
      this.closeMobileMenu();
      this.router.navigate('/login');
    });

    document.getElementById('hamburger-btn')?.addEventListener('click', () => this.openMobileMenu());
    document.getElementById('close-mobile-menu')?.addEventListener('click', () => this.closeMobileMenu());
    document.getElementById('mobile-menu-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeMobileMenu();
    });

    document.querySelectorAll('.sidebar .nav-item:not([data-hassub]), .sidebar .nav-sub-item, #mobile-nav a, .bottom-tab').forEach(link => {
      link.addEventListener('click', (e) => {
        const path = link.dataset.path;
        if (!path) return;
        e.preventDefault();
        if (link.closest('#mobile-menu-overlay')) this.closeMobileMenu();
        this.router.navigate(path);
      });
    });

    // Mobile nav delegation
    document.querySelectorAll('#mobile-menu-overlay a[data-path]').forEach(link => {
      link.addEventListener('click', (e) => {
        const path = link.dataset.path;
        if (!path) return;
        e.preventDefault();
        this.closeMobileMenu();
        this.router.navigate(path);
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  openMobileMenu() {
    const overlay = document.getElementById('mobile-menu-overlay');
    const drawer = document.getElementById('mobile-menu-drawer');
    if (overlay && drawer) {
      overlay.style.display = 'block';
      requestAnimationFrame(() => { drawer.style.transform = 'translateX(0)'; });
      this.menuOpen = true;
    }
  }

  closeMobileMenu() {
    const drawer = document.getElementById('mobile-menu-drawer');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (drawer) drawer.style.transform = 'translateX(-100%)';
    if (overlay) {
      setTimeout(() => { overlay.style.display = 'none'; }, 300);
    }
    this.menuOpen = false;
  }

  updateActiveLink(path) {
    document.querySelectorAll('.nav-item').forEach(el => {
      const hasSub = el.dataset.hassub === 'true';
      if (hasSub) {
        const subKey = `sub-${el.dataset.path.replace(/\//g, '-')}`;
        const subEl = document.getElementById(subKey);
        const hasActiveSub = subEl?.querySelector('.nav-sub-item.active');
        el.classList.toggle('active', !!hasActiveSub);
        if (hasActiveSub) {
          el.classList.add('open');
          if (subEl) subEl.classList.add('open');
          this.openSubs[subKey] = true;
        } else {
          el.classList.remove('open');
          if (subEl) subEl.classList.remove('open');
        }
      } else {
        el.classList.toggle('active', el.dataset.path === path);
      }
    });
    document.querySelectorAll('.nav-sub-item').forEach(el => {
      el.classList.toggle('active', el.dataset.path === path);
    });
    document.querySelectorAll('.bottom-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.path === path);
    });
  }
}
