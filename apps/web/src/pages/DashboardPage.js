export class DashboardPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.data = {}
    this.chartPeriod = 7
  }

  async loadData() {
    try {
      const { data: sales } = await this.supabase
        .from('sales')
        .select('total_amount, created_at, invoice_number, customer_name, sale_items(quantity, unit_price, discount, products(name, cost_price))')
        .gte('created_at', this.getDateRange(30).toISOString())

      const { data: cash } = await this.supabase
        .from('cash_transactions')
        .select('type, amount, created_at, description')

      const { data: products } = await this.supabase
        .from('products')
        .select('id, name, sku, current_stock, min_stock, cost_price, sell_price')
        .order('name')

      const { data: purchaseOrders } = await this.supabase
        .from('purchases')
        .select('po_number, total_amount, status, created_at')

      const { data: stockMovements } = await this.supabase
        .from('stock_movements')
        .select('product_id, quantity, type, reason, created_at, notes')

      const { data: saleItems } = await this.supabase
        .from('sale_items')
        .select('product_id, quantity, unit_price, discount, sale_id')

      this.data = {
        sales: sales || [],
        cash: cash || [],
        products: products || [],
        purchaseOrders: purchaseOrders || [],
        stockMovements: stockMovements || [],
        saleItems: saleItems || []
      }
    } catch (error) {
      console.error('Error loading data:', error)
      this.data = { sales: [], cash: [], products: [], purchaseOrders: [], stockMovements: [], saleItems: [] }
    }
  }

  render() {
    const products = this.data.products || []
    const sales = this.data.sales || []
    const cash = this.data.cash || []
    const purchaseOrders = this.data.purchaseOrders || []

    const todayStr = new Date().toDateString()
    const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === todayStr)
    const todayCashIn = cash.filter(t => t.type === 'in' && new Date(t.created_at).toDateString() === todayStr)
    const todayCashOut = cash.filter(t => t.type === 'out' && new Date(t.created_at).toDateString() === todayStr)
    const lowStock = products.filter(p => p.current_stock <= p.min_stock)
    const todaySalesAmount = todaySales.reduce((s, sale) => s + (sale.total_amount || 0), 0)
    const todayIncome = todayCashIn.reduce((s, t) => s + t.amount, 0)
    const todayExpense = todayCashOut.reduce((s, t) => s + t.amount, 0)
    const todayProfit = todayIncome - todayExpense

    const totalCashIn = cash.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0)
    const totalCashOut = cash.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0)
    const cashBalance = totalCashIn - totalCashOut

    const yesterdaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date(Date.now() - 86400000).toDateString())
    const yesterdayAmount = yesterdaySales.reduce((s, sale) => s + (sale.total_amount || 0), 0)
    const omsetChange = yesterdayAmount > 0 ? ((todaySalesAmount - yesterdayAmount) / yesterdayAmount * 100) : 0
    const totalOrder = todaySales.length

    const userName = this.auth.profile?.full_name || 'Pengguna'
    const profitMargin = todaySalesAmount > 0 ? Math.round((todayProfit / todaySalesAmount) * 100) : 0
    const cuanTarget = 500000
    const cuanProgress = Math.min((todayProfit / cuanTarget) * 100, 100)

    const chartData = this.generateChartData(sales, this.chartPeriod)
    const topProducts = this.getTopProducts(sales, products)
    const recentActivities = this.getRecentActivities(sales, cash)
    const pendingPO = purchaseOrders.filter(po => po.status === 'approved' || po.status === 'pending')

    return `
      <div class="dashboard-container">
        <!-- HEADER -->
        <section class="welcome-card">
          <div>
            <h1 style="font-size:24px; font-weight:700; color:#111827;">Halo kembali, ${userName} 👋</h1>
            <p style="font-size:14px; color:#6b7280; margin-top:4px;">Berikut ringkasan bisnis tokomu hari ini</p>
          </div>
          <div class="quick-actions">
            <a href="#/sales" class="action-btn primary">+ Penjualan</a>
            <a href="#/products" class="action-btn">+ Produk</a>
            <a href="#/stock" class="action-btn">+ Stok Masuk</a>
            <a href="#/suppliers" class="action-btn">+ Supplier</a>
          </div>
        </section>

        <!-- KPI -->
        <section class="kpi-grid">
          <div class="hero-kpi">
            <span>Omset Hari Ini</span>
            <h2>Rp ${this.formatNumber(todaySalesAmount)}</h2>
            <small>Target Rp ${this.formatNumber(cuanTarget)} • ${Math.round(cuanProgress)}%</small>
          </div>
          <div class="mini-kpi">
            <span>Profit</span>
            <h3>Rp ${this.formatNumber(todayProfit)}</h3>
          </div>
          <div class="mini-kpi">
            <span>Order</span>
            <h3>${totalOrder}</h3>
          </div>
          <div class="mini-kpi">
            <span>Saldo Kas</span>
            <h3>Rp ${this.formatNumber(cashBalance)}</h3>
          </div>
        </section>

        <!-- CHART + ALERT -->
        <section class="grid-2">
          <div class="card">
            <div class="card-header" style="display:flex; align-items:center; justify-content:space-between;">
              <h3>Tren Penjualan</h3>
              <div class="relative">
                <button id="chart-filter-btn" class="text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-gray-200 transition-colors">
                  ${this.chartPeriod} Hari <i data-lucide="chevron-down" class="w-3 h-3"></i>
                </button>
                <div id="chart-filter-dropdown" class="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden min-w-[100px]">
                  <button data-days="7" class="chart-filter-option w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${this.chartPeriod === 7 ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}">7 Hari</button>
                  <button data-days="14" class="chart-filter-option w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${this.chartPeriod === 14 ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}">14 Hari</button>
                  <button data-days="30" class="chart-filter-option w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${this.chartPeriod === 30 ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}">30 Hari</button>
                </div>
              </div>
            </div>
            <div style="height:240px;">
              ${this.renderChart(chartData)}
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <h3>Alert Center</h3>
            </div>
            ${lowStock.length > 0 ? `
              <div class="alert-item warning">
                ⚠ ${lowStock.length} Produk Hampir Habis
              </div>
            ` : ''}
            ${pendingPO.length > 0 ? `
              <div class="alert-item info">
                📦 ${pendingPO.length} PO Menunggu Persetujuan
              </div>
            ` : ''}
            ${lowStock.length === 0 && pendingPO.length === 0 ? `
              <div class="alert-item" style="background:#f0fdf4; color:#16a34a;">
                ✅ Semua dalam kondisi baik
              </div>
            ` : ''}
          </div>
        </section>

        <!-- TOP PRODUCT + MARKETPLACE -->
        <section class="grid-2">
          <div class="card">
            <div class="card-header">
              <h3>Top Produk</h3>
            </div>
            ${topProducts.length === 0 ? `
              <p style="color:#9ca3af; text-align:center; padding:20px 0;">Belum ada data</p>
            ` : topProducts.slice(0, 2).map(p => `
              <div class="product-row">
                <div style="width:44px; height:44px; border-radius:10px; background:#f3f4f6; display:flex; align-items:center; justify-content:center;">
                  <i data-lucide="package" style="width:22px; height:22px; color:#6b7280;"></i>
                </div>
                <div>
                  <strong>${p.name}</strong>
                  <small>${p.sold} terjual</small>
                </div>
                <span>Rp ${this.formatNumber(p.revenue)}</span>
              </div>
            `).join('')}
          </div>
          <div class="card">
            <div class="card-header">
              <h3>Marketplace Performance</h3>
            </div>
            <div class="market-row">
              <span>Shopee</span>
              <strong>45%</strong>
            </div>
            <div class="progress">
              <div style="width:45%"></div>
            </div>
            <div class="market-row">
              <span>TikTok Shop</span>
              <strong>25%</strong>
            </div>
            <div class="progress">
              <div style="width:25%"></div>
            </div>
            <div class="market-row">
              <span>Tokopedia</span>
              <strong>18%</strong>
            </div>
            <div class="progress">
              <div style="width:18%"></div>
            </div>
          </div>
        </section>

        <!-- AI FORECAST -->
        <section class="card" style="margin-bottom: 20px;">
          <div class="card-header">
            <h3>AI Forecast</h3>
          </div>
          <div class="forecast-grid">
            <div class="forecast-box">
              <h4>Prediksi Omset</h4>
              <span style="color:#16a34a;">↑ 12%</span>
            </div>
            <div class="forecast-box">
              <h4>Produk Restok</h4>
              <span>${topProducts[0]?.name || 'Produk Populer'}</span>
            </div>
            <div class="forecast-box">
              <h4>Produk Potensial</h4>
              <span>${topProducts[1]?.name || 'Produk Terlaris'}</span>
            </div>
          </div>
        </section>

        <!-- AKTIVITAS -->
        <section class="card">
          <div class="card-header">
            <h3>Aktivitas Terbaru</h3>
          </div>
          <div class="activity-list">
            ${recentActivities.length === 0 ? `
              <p style="color:#9ca3af; text-align:center; padding:20px 0;">Belum ada aktivitas</p>
            ` : recentActivities.slice(0, 3).map(a => `
              <div class="activity-item">
                <span>${a.text}</span>
                <strong>${a.amount}</strong>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    `
  }

  renderCuanCard(profit, target, progress) {
    return `
      <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
        <p class="text-xs font-medium text-emerald-100">Cuan Hari Ini</p>
        <p class="text-xl font-bold mt-1">Rp ${this.formatNumber(profit)}</p>
        <div class="mt-2">
          <div class="flex items-center justify-between text-[10px] text-emerald-100 mb-1">
            <span>Target Rp ${this.formatNumber(target)}</span>
            <span>${Math.round(progress)}%</span>
          </div>
          <div class="w-full h-1.5 bg-emerald-400/30 rounded-full overflow-hidden">
            <div class="h-full bg-white rounded-full" style="width:${progress}%"></div>
          </div>
        </div>
      </div>
    `
  }

  renderStatCard(label, value, icon) {
    return `
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
          <i data-lucide="${icon}" class="w-4.5 h-4.5 text-blue-600"></i>
        </div>
        <p class="text-[11px] text-gray-500 mb-0.5">${label}</p>
        <p class="text-sm font-bold text-gray-900">${value}</p>
      </div>
    `
  }

  renderMarketplace(name, amount, pct) {
    const icons = { 'Shopee': 'shopping-bag', 'TikTok Shop': 'video', 'Tokopedia': 'shopping-cart', 'Lazada': 'package' }
    return `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
          ${name.charAt(0)}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1">
            <p class="text-sm font-medium text-gray-900">${name}</p>
            <span class="text-xs font-semibold text-gray-700">Rp ${this.formatNumber(amount)}</span>
          </div>
          <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full bg-blue-500 rounded-full" style="width:${pct}%"></div>
          </div>
        </div>
      </div>
    `
  }

  generateChartData(sales, days = 7) {
    const data = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      const daySales = sales.filter(s => new Date(s.created_at).toDateString() === date.toDateString())
      const total = daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0)
      data.push({ date: dateStr, sales: total, dateRaw: date.toISOString() })
    }
    return data
  }

  getTopProducts(sales, products) {
    const productSales = {}
    sales.forEach(sale => {
      const items = sale.sale_items || []
      items.forEach(item => {
        const pid = item.product_id
        if (!productSales[pid]) productSales[pid] = { revenue: 0, sold: 0 }
        productSales[pid].revenue += (item.unit_price * item.quantity) - (item.discount || 0)
        productSales[pid].sold += item.quantity
      })
    })
    return products.map(p => ({
      ...p,
      revenue: productSales[p.id]?.revenue || 0,
      sold: productSales[p.id]?.sold || 0
    })).sort((a, b) => b.revenue - a.revenue)
  }

  getRecentActivities(sales, cash) {
    const activities = []
    sales.forEach(s => {
      activities.push({
        text: `Penjualan ${s.customer_name || 'perorangan'}`,
        time: this.formatTimeAgo(s.created_at),
        amount: `Rp ${this.formatNumber(s.total_amount)}`,
        icon: 'shopping-cart',
        date: new Date(s.created_at)
      })
    })
    cash.forEach(c => {
      activities.push({
        text: c.description || (c.type === 'in' ? 'Pemasukan' : 'Pengeluaran'),
        time: this.formatTimeAgo(c.created_at),
        amount: `${c.type === 'in' ? '+' : '-'} Rp ${this.formatNumber(c.amount)}`,
        icon: c.type === 'in' ? 'arrow-down' : 'arrow-up',
        date: new Date(c.created_at)
      })
    })
    activities.sort((a, b) => b.date - a.date)
    return activities
  }

  getReminders(lowStock, pendingPO) {
    const reminders = []
    lowStock.slice(0, 3).forEach(p => {
      reminders.push({
        title: `Restok ${p.name}`,
        desc: `Stok tersisa ${p.current_stock} dari min ${p.min_stock}`,
        icon: 'package',
        type: 'stock',
        action: 'Restok',
        link: '#/stock'
      })
    })
    pendingPO.slice(0, 2).forEach(po => {
      reminders.push({
        title: `PO ${po.po_number}`,
        desc: `Menunggu ${po.status === 'approved' ? 'penerimaan' : 'persetujuan'}`,
        icon: 'file-text',
        type: 'po',
        action: 'Verifikasi',
        link: '#/purchase-orders'
      })
    })
    return reminders
  }

  renderChart(data) {
    const rawMax = Math.max(...data.map(d => d.sales), 1)
    const niceMax = this.niceMax(rawMax)
    const ticks = 5
    const tickValues = Array.from({ length: ticks + 1 }, (_, i) => (niceMax / ticks) * i)

    const w = 700, h = 240
    const pad = { top: 20, bottom: 30, left: 50, right: 30 }
    const cw = w - pad.left - pad.right
    const ch = h - pad.top - pad.bottom

    const points = data.map((d, i) => ({
      x: pad.left + (i / (data.length - 1)) * cw,
      y: pad.top + ch - (d.sales / niceMax) * ch,
      ...d
    }))

    const smoothPath = this.smoothCurve(points)
    const areaPath = smoothPath + ` L ${points[points.length - 1].x} ${pad.top + ch} L ${points[0].x} ${pad.top + ch} Z`

    return `
      <svg viewBox="0 0 ${w} ${h}" class="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#2563eb" stop-opacity="0.12"/>
            <stop offset="1" stop-color="#2563eb" stop-opacity="0.01"/>
          </linearGradient>
        </defs>

        <style>
          .chart-point-group { cursor: pointer; }
          .chart-point-group .hover-tooltip { opacity: 0; transition: opacity 0.15s ease; pointer-events: none; }
          .chart-point-group:hover .hover-tooltip { opacity: 1; }
          .chart-point-group:hover .point-dot { r: 6; }
          .chart-point-group:hover .point-ring { r: 9; opacity: 1; }
        </style>

        ${tickValues.map(v => {
          const y = pad.top + ch - (v / niceMax) * ch
          return `
            <line x1="${pad.left}" y1="${y}" x2="${w - pad.right}" y2="${y}" stroke="#f0f0f0" stroke-width="1"/>
            <text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" class="text-[10px] fill-gray-400">${this.formatAxis(v)}</text>
          `
        }).join('')}

        <path d="${areaPath}" fill="url(#areaFill)"/>

        <path d="${smoothPath}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

        ${points.map((p, i) => {
          const dateStr = new Date(data[i].dateRaw || Date.now() - (data.length - 1 - i) * 86400000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
          const tipW = 140
          const tipH = 44
          let tipX = p.x - tipW / 2
          if (tipX < pad.left) tipX = pad.left
          if (tipX + tipW > w - pad.right) tipX = w - pad.right - tipW
          const tipY = p.y - tipH - 10
          return `
            <g class="chart-point-group">
              <circle class="point-ring" cx="${p.x}" cy="${p.y}" r="9" fill="white" stroke="#2563eb" stroke-width="2" opacity="0"/>
              <circle class="point-dot" cx="${p.x}" cy="${p.y}" r="4" fill="white" stroke="#2563eb" stroke-width="2.5"/>
              <g class="hover-tooltip">
                <rect x="${tipX}" y="${tipY}" width="${tipW}" height="${tipH}" rx="8" fill="white" stroke="#e5e7eb" stroke-width="1" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.1))"/>
                <text x="${tipX + tipW / 2}" y="${tipY + 16}" text-anchor="middle" class="text-[10px] fill-gray-500">${dateStr}</text>
                <text x="${tipX + tipW / 2}" y="${tipY + 34}" text-anchor="middle" class="text-[12px] fill-gray-900" style="font-weight:700">Rp ${this.formatNumber(p.sales)}</text>
              </g>
            </g>
          `
        }).join('')}

        ${points.map(p => `
          <text x="${p.x}" y="${pad.top + ch + 18}" text-anchor="middle" class="text-[10px] fill-gray-500">${p.date}</text>
        `).join('')}
      </svg>
    `
  }

  niceMax(val) {
    if (val <= 0) return 1000
    const mag = Math.pow(10, Math.floor(Math.log10(val)))
    const res = val / mag
    if (res <= 1.5) return mag * 1.5
    if (res <= 2) return mag * 2
    if (res <= 3) return mag * 3
    if (res <= 5) return mag * 5
    if (res <= 7.5) return mag * 7.5
    return mag * 10
  }

  formatAxis(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1).replace('.', ',') + 'jt'
    if (v >= 1000) return (v / 1000).toFixed(0) + 'rb'
    return v.toString()
  }

  smoothCurve(points) {
    if (points.length < 2) return ''
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`

    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]

      const tension = 0.3
      const cp1x = p1.x + (p2.x - p0.x) * tension
      const cp1y = p1.y + (p2.y - p0.y) * tension
      const cp2x = p2.x - (p3.x - p1.x) * tension
      const cp2y = p2.y - (p3.y - p1.y) * tension

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
    return d
  }

  getDateRange(days) {
    const date = new Date()
    date.setDate(date.getDate() - days)
    date.setHours(0, 0, 0, 0)
    return date
  }

  formatNumber(num) {
    return num ? num.toLocaleString('id-ID') : '0'
  }

  formatTimeAgo(dateStr) {
    const now = new Date()
    const date = new Date(dateStr)
    const diff = Math.floor((now - date) / 1000)
    if (diff < 60) return 'Baru saja'
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  async bindEvents() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) {
      outlet.innerHTML = '<div class="flex items-center justify-center min-h-[300px]"><div class="text-gray-400 text-sm">Memuat data...</div></div>'
    }
    await this.loadData()
    this.renderAndBind()
    if (window.lucide) window.lucide.createIcons()
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) {
      outlet.innerHTML = this.render()
    }
    if (window.lucide) window.lucide.createIcons()

    const filterBtn = document.getElementById('chart-filter-btn')
    const dropdown = document.getElementById('chart-filter-dropdown')
    if (filterBtn && dropdown) {
      filterBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        dropdown.classList.toggle('hidden')
      })
      document.querySelectorAll('.chart-filter-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation()
          this.chartPeriod = parseInt(opt.dataset.days)
          this.renderAndBind()
        })
      })
      document.addEventListener('click', () => dropdown.classList.add('hidden'))
    }
  }
}
