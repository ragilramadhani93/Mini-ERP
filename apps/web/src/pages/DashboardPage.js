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
      this.error = null
    } catch (error) {
      console.error('Error loading data:', error)
      this.error = error.message || 'Terjadi kesalahan saat menghubungkan ke database.'
      this.data = { sales: [], cash: [], products: [], purchaseOrders: [], stockMovements: [], saleItems: [] }
    }
  }

  render() {
    if (this.error) {
      return `
        <div class="dashboard-container">
          <div class="p-8 text-center bg-rose-50 rounded-2xl border border-rose-200 my-8 max-w-lg mx-auto">
            <div style="width:48px;height:48px;border-radius:50%;background:#fee2e2;color:#dc2626;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3 style="font-size:16px;font-weight:700;color:#991b1b;margin-bottom:4px">Gagal Memuat Data Dashboard</h3>
            <p style="font-size:13px;color:#7f1d1d;margin-bottom:16px">${this.error}</p>
            <button id="retry-dashboard-btn" class="btn-primary" style="padding:8px 20px">Muat Ulang</button>
          </div>
        </div>
      `
    }
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
    const omsetComparisonText = yesterdayAmount > 0
      ? `${omsetChange >= 0 ? '+' : ''}${omsetChange.toFixed(1)}% vs kemarin`
      : 'Hari pertama periode'

    const chartData = this.generateChartData(sales, this.chartPeriod)
    const topProducts = this.getTopProducts(sales, products)
    const recentActivities = this.getRecentActivities(sales, cash)
    const pendingPO = purchaseOrders.filter(po => po.status === 'approved' || po.status === 'pending')
    const expenseBreakdown = this.getExpenseBreakdown(cash)

    return `
      <div class="dashboard-container">
        <!-- HEADER -->
        <section class="welcome-card mb-6">
          <div>
            <h1 class="text-2xl font-bold text-stone-900 tracking-tight">Selamat datang, <span class="text-primary-600">${userName}</span></h1>
            <p class="text-sm text-stone-500 mt-1">Ringkasan performa penjualan dan inventori toko hari ini</p>
          </div>
          <div class="quick-actions flex items-center gap-2 flex-wrap">
            <a href="#/sales" class="btn-primary inline-flex items-center gap-2 h-9 px-4 rounded-md font-medium text-sm shadow whitespace-nowrap">
              <i data-lucide="plus-circle" class="w-4 h-4 shrink-0"></i>
              <span>Transaksi Baru</span>
            </a>
            <a href="#/products" class="btn-outline inline-flex items-center gap-2 h-9 px-4 rounded-md font-medium text-sm shadow-sm whitespace-nowrap">
              <i data-lucide="box" class="w-4 h-4 shrink-0"></i>
              <span>Kelola Produk</span>
            </a>
            <a href="#/stock" class="btn-outline inline-flex items-center gap-2 h-9 px-4 rounded-md font-medium text-sm shadow-sm whitespace-nowrap">
              <i data-lucide="arrow-down-left" class="w-4 h-4 shrink-0"></i>
              <span>Stok Masuk</span>
            </a>
            <a href="#/purchase-orders" class="btn-outline inline-flex items-center gap-2 h-9 px-4 rounded-md font-medium text-sm shadow-sm whitespace-nowrap">
              <i data-lucide="file-text" class="w-4 h-4 shrink-0"></i>
              <span>Purchase Order</span>
            </a>
          </div>
        </section>

        <!-- KPI -->
        <section class="kpi-grid">
          <div class="hero-kpi relative overflow-hidden">
            <span class="text-xs uppercase tracking-wider text-rose-100/90 font-medium">Omset Hari Ini</span>
            <h2 class="text-3xl font-bold tracking-tight text-white my-1 tnum">Rp ${this.formatNumber(todaySalesAmount)}</h2>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/15 text-white backdrop-blur-sm">
              <i data-lucide="${omsetChange >= 0 ? 'trending-up' : 'trending-down'}" class="w-3.5 h-3.5"></i>
              <span>${omsetComparisonText}</span>
            </div>
          </div>
          <div class="mini-kpi card p-5 border border-stone-200/80">
            <div class="flex items-center justify-between text-stone-500 mb-2">
              <span class="text-xs font-medium">Estimasi Profit</span>
              <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <i data-lucide="wallet" class="w-4 h-4"></i>
              </div>
            </div>
            <h3 class="text-xl font-bold text-stone-900 tnum">Rp ${this.formatNumber(todayProfit)}</h3>
            <p class="text-xs text-stone-400 mt-1 font-medium">${profitMargin}% margin penjualan</p>
          </div>
          <div class="mini-kpi card p-5 border border-stone-200/80">
            <div class="flex items-center justify-between text-stone-500 mb-2">
              <span class="text-xs font-medium">Total Pesanan</span>
              <div class="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                <i data-lucide="shopping-bag" class="w-4 h-4"></i>
              </div>
            </div>
            <h3 class="text-xl font-bold text-stone-900 tnum">${totalOrder} <span class="text-xs font-normal text-stone-500">transaksi</span></h3>
            <p class="text-xs text-stone-400 mt-1 font-medium">Hari ini tercatat</p>
          </div>
          <div class="mini-kpi card p-5 border border-stone-200/80">
            <div class="flex items-center justify-between text-stone-500 mb-2">
              <span class="text-xs font-medium">Saldo Kas & Bank</span>
              <div class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <i data-lucide="credit-card" class="w-4 h-4"></i>
              </div>
            </div>
            <h3 class="text-xl font-bold text-stone-900 tnum">Rp ${this.formatNumber(cashBalance)}</h3>
            <p class="text-xs text-stone-400 mt-1 font-medium">Posisi kas aktif</p>
          </div>
        </section>

        <!-- CHART + ALERT -->
        <section class="grid-2">
          <div class="card p-5 border border-stone-200/80">
            <div class="card-header flex items-center justify-between mb-4">
              <div>
                <h3 class="text-base font-semibold text-stone-900">Tren Penjualan</h3>
                <p class="text-xs text-stone-500">Histori omset kotor toko harian</p>
              </div>
              <div class="relative">
                <button id="chart-filter-btn" class="text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border border-stone-200">
                  <i data-lucide="calendar" class="w-3.5 h-3.5 text-stone-500"></i>
                  <span>${this.chartPeriod} Hari</span>
                  <i data-lucide="chevron-down" class="w-3 h-3 text-stone-400"></i>
                </button>
                <div id="chart-filter-dropdown" class="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-10 hidden min-w-[120px] p-1">
                  <button data-days="7" class="chart-filter-option w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-stone-50 ${this.chartPeriod === 7 ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-stone-700'}">7 Hari</button>
                  <button data-days="14" class="chart-filter-option w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-stone-50 ${this.chartPeriod === 14 ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-stone-700'}">14 Hari</button>
                  <button data-days="30" class="chart-filter-option w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-stone-50 ${this.chartPeriod === 30 ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-stone-700'}">30 Hari</button>
                </div>
              </div>
            </div>
            <div style="height:240px;">
              ${this.renderChart(chartData)}
            </div>
          </div>
          <div class="card p-5 border border-stone-200/80">
            <div class="card-header mb-4">
              <h3 class="text-base font-semibold text-stone-900">Alert Center</h3>
              <p class="text-xs text-stone-500">Pemberitahuan operasional mendesak</p>
            </div>
            <div class="space-y-2.5">
              ${lowStock.length > 0 ? `
                <a href="#/products?filter=low-stock" class="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70 hover:bg-amber-100/60 transition-colors">
                  <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-amber-900">${lowStock.length} Produk Menipis</p>
                    <p class="text-[11px] text-amber-700">Stok berada di bawah batas minimum</p>
                  </div>
                  <i data-lucide="chevron-right" class="w-4 h-4 text-amber-500"></i>
                </a>
              ` : ''}
              ${pendingPO.length > 0 ? `
                <a href="#/purchase-orders" class="flex items-center gap-3 p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/70 hover:bg-sky-100/60 transition-colors">
                  <div class="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="clipboard-list" class="w-4 h-4"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-sky-900">${pendingPO.length} PO Perlu Diproses</p>
                    <p class="text-[11px] text-sky-700">Purchase order menunggu approval atau penerimaan</p>
                  </div>
                  <i data-lucide="chevron-right" class="w-4 h-4 text-sky-500"></i>
                </a>
              ` : ''}
              ${lowStock.length === 0 && pendingPO.length === 0 ? `
                <div class="flex items-center gap-3 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-emerald-800">
                  <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-emerald-900">Operasional Terkendali</p>
                    <p class="text-[11px] text-emerald-700">Semua stok dan status pesanan dalam kondisi normal</p>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </section>

        <!-- TOP PRODUCT + EXPENSE BREAKDOWN -->
        <section class="grid-2">
          <div class="card p-5 border border-stone-200/80">
            <div class="card-header flex items-center justify-between mb-4">
              <div>
                <h3 class="text-base font-semibold text-stone-900">Produk Terlaris</h3>
                <p class="text-xs text-stone-500">Penjualan tertinggi periode ini</p>
              </div>
              <a href="#/analytics" class="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                Analitik <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </a>
            </div>
            <div class="space-y-3">
              ${topProducts.length === 0 ? `
                <div class="p-8 text-center text-stone-400 text-xs">Belum ada data penjualan</div>
              ` : topProducts.slice(0, 4).map((p, idx) => `
                <div class="flex items-center justify-between p-2.5 rounded-lg hover:bg-stone-50 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg ${idx === 0 ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'} flex items-center justify-center font-bold text-xs">
                      ${idx + 1}
                    </div>
                    <div>
                      <p class="font-medium text-stone-900 text-xs truncate max-w-[160px] sm:max-w-[200px]">${p.name}</p>
                      <p class="text-[11px] text-stone-400">${p.sold} terjual</p>
                    </div>
                  </div>
                  <span class="font-semibold text-stone-900 text-xs tnum">Rp ${this.formatNumber(p.revenue)}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card p-5 border border-stone-200/80">
            <div class="card-header mb-4">
              <h3 class="text-base font-semibold text-stone-900">Alokasi Pengeluaran</h3>
              <p class="text-xs text-stone-500">Kategori operasional terbesar bulan ini</p>
            </div>
            ${expenseBreakdown.length === 0 ? `
              <div class="p-8 text-center text-stone-400 text-xs">Belum ada catatan pengeluaran</div>
            ` : expenseBreakdown.slice(0, 4).map((item, i) => {
              const barW = item.percentage
              const colors = ['bg-[#7A3B58]', 'bg-amber-600', 'bg-sky-600', 'bg-emerald-600']
              return `
                <div class="mb-3.5 last:mb-0">
                  <div class="flex justify-between items-center mb-1 text-xs">
                    <span class="font-medium text-stone-700">${item.label}</span>
                    <span class="font-semibold text-stone-900 tnum">Rp ${this.formatNumber(item.total)}</span>
                  </div>
                  <div class="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div class="h-full ${colors[i % colors.length]} rounded-full transition-all duration-300" style="width:${barW}%"></div>
                  </div>
                  <span class="text-[10px] text-stone-400">${item.percentage}% dari total pengeluaran</span>
                </div>
              `
            }).join('')}
          </div>
        </section>

        <!-- AKTIVITAS & PERFORMA -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <div class="card p-5 border border-stone-200/80">
            <div class="card-header flex items-center justify-between mb-4">
              <div>
                <h3 class="text-base font-semibold text-stone-900">Aktivitas Transaksi</h3>
                <p class="text-xs text-stone-500">Penjualan dan mutasi kas terakhir</p>
              </div>
              <a href="#/sales" class="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                Semua <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </a>
            </div>
            <div class="divide-y divide-stone-100">
              ${recentActivities.length === 0 ? `
                <div class="p-6 text-center text-stone-400 text-xs">Belum ada aktivitas tercatat</div>
              ` : recentActivities.slice(0, 4).map(a => `
                <div class="py-3 flex items-center justify-between text-xs">
                  <div class="flex items-center gap-3">
                    <div class="w-7 h-7 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center">
                      <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
                    </div>
                    <span class="font-medium text-stone-800">${a.text}</span>
                  </div>
                  <span class="font-semibold text-stone-900 tnum">${a.amount}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card p-5 border border-stone-200/80">
            <div class="card-header flex items-center justify-between mb-4">
              <div>
                <h3 class="text-base font-semibold text-stone-900">Status Stok Produk</h3>
                <p class="text-xs text-stone-500">Ringkasan kondisi inventori saat ini</p>
              </div>
              <a href="#/products" class="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                Katalog <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </a>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="p-3.5 rounded-xl bg-stone-50 border border-stone-200/60">
                <p class="text-[11px] text-stone-500 mb-1">Total Produk</p>
                <p class="text-lg font-bold text-stone-900 tnum">${products.length}</p>
              </div>
              <div class="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                <p class="text-[11px] text-emerald-800 mb-1">Stok Aman</p>
                <p class="text-lg font-bold text-emerald-900 tnum">${products.filter(p => p.current_stock > p.min_stock).length}</p>
              </div>
              <div class="p-3.5 rounded-xl ${lowStock.length > 0 ? 'bg-amber-50/70 border border-amber-200/60' : 'bg-stone-50 border border-stone-200/60'}">
                <p class="text-[11px] ${lowStock.length > 0 ? 'text-amber-800' : 'text-stone-500'} mb-1">Menipis</p>
                <p class="text-lg font-bold ${lowStock.length > 0 ? 'text-amber-900' : 'text-stone-900'} tnum">${lowStock.length}</p>
              </div>
            </div>
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
        <div class="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center mb-3">
          <i data-lucide="${icon}" class="w-4.5 h-4.5 text-primary-600"></i>
        </div>
        <p class="text-[11px] text-gray-500 mb-0.5">${label}</p>
        <p class="text-sm font-bold text-gray-900">${value}</p>
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

  getExpenseBreakdown(cash) {
    const expenses = cash.filter(c => c.type === 'out')
    const byCategory = {}
    expenses.forEach(c => {
      const cat = c.category || 'lainnya'
      if (!byCategory[cat]) byCategory[cat] = 0
      byCategory[cat] += c.amount
    })
    const total = Object.values(byCategory).reduce((s, v) => s + v, 0)
    if (total === 0) return []
    const labels = {
      purchase: 'Pembelian Stok', operational: 'Operasional', salary: 'Gaji',
      advertising: 'Iklan', platform_fee: 'Biaya Platform', other_income: 'Lainnya',
      lainnya: 'Lainnya'
    }
    return Object.entries(byCategory)
      .map(([cat, amount]) => ({
        category: cat,
        label: labels[cat] || cat,
        total: amount,
        percentage: Math.round((amount / total) * 100)
      }))
      .sort((a, b) => b.total - a.total)
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
            <stop offset="0" stop-color="#7A3B58" stop-opacity="0.12"/>
            <stop offset="1" stop-color="#7A3B58" stop-opacity="0.01"/>
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

        <path d="${smoothPath}" fill="none" stroke="#7A3B58" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

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
              <circle class="point-ring" cx="${p.x}" cy="${p.y}" r="9" fill="white" stroke="#7A3B58" stroke-width="2" opacity="0"/>
              <circle class="point-dot" cx="${p.x}" cy="${p.y}" r="4" fill="white" stroke="#7A3B58" stroke-width="2.5"/>
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

    document.getElementById('retry-dashboard-btn')?.addEventListener('click', async () => {
      await this.bindEvents()
    })

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
