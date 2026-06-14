export class DashboardPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.data = {}
  }

  async loadData() {
    const { data: sales } = await this.supabase
      .from('sales')
      .select('total_amount, created_at, sale_items(quantity, unit_price, discount, products(cost_price))')
      .gte('created_at', this.getDateRange(30).toISOString())

    const { data: cash } = await this.supabase
      .from('cash_transactions')
      .select('type, amount, created_at')

    const { data: products } = await this.supabase
      .from('products')
      .select('id, name, sku, current_stock, min_stock, cost_price, sell_price')
      .order('name')

    const { data: categories } = await this.supabase
      .from('categories')
      .select('id, name')

    const { data: recentSales } = await this.supabase
      .from('sales')
      .select('*, sale_items(*, products(name, sku)), created_by_user:users(full_name)')
      .order('created_at', { ascending: false })
      .limit(5)

    this.data = { sales, cash, products, categories, recentSales }
  }

  render() {
    const products = this.data.products || []
    const sales = this.data.sales || []
    const cash = this.data.cash || []
    
    const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
    const todayCashIn = cash.filter(t => t.type === 'in' && new Date(t.created_at).toDateString() === new Date().toDateString())
    const todayCashOut = cash.filter(t => t.type === 'out' && new Date(t.created_at).toDateString() === new Date().toDateString())
    const lowStock = products.filter(p => p.current_stock <= p.min_stock)
    const todaySalesAmount = todaySales.reduce((s, sale) => s + (sale.total_amount || 0), 0)
    const todayIncome = todayCashIn.reduce((s, t) => s + t.amount, 0)
    const todayExpense = todayCashOut.reduce((s, t) => s + t.amount, 0)
    const profit = todayIncome - todayExpense

    // Data untuk chart 7 hari terakhir
    const chartData = this.generateChartData(sales)

    return `
      <div class="space-y-6">
        <!-- Stat Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${this.renderStatCard('Penjualan Hari Ini', `Rp ${this.formatNumber(todaySalesAmount)}`, 'camera', 'indigo', '')}
          ${this.renderStatCard('Profit', `Rp ${this.formatNumber(profit)}`, 'trending-up', 'cyan', profit >= 0 ? '+' : '')}
          ${this.renderStatCard('Pemasukan', `Rp ${this.formatNumber(todayIncome)}`, 'receipt', 'orange', '')}
          ${this.renderStatCard('Pengeluaran', `Rp ${this.formatNumber(todayExpense)}`, 'cart', 'red', '')}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Aksi Cepat & Tren Penjualan -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Aksi Cepat -->
            <div class="card p-6 rounded-xl border-2 border-gray-200">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-semibold text-gray-900">Aksi Cepat</h3>
                <p class="text-sm text-gray-500">Klik tombol untuk memproses data baru</p>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                ${this.renderQuickAction('Produk Baru', 'plus-square', '#/products')}
                ${this.renderQuickAction('Penjualan', 'cash-register', '#/sales')}
                ${this.renderQuickAction('Stok Masuk', 'package-check', '#/stock')}
                ${this.renderQuickAction('Kas Toko', 'wallet', '#/finance')}
              </div>
            </div>

            <!-- Tren Penjualan -->
            <div class="card p-6 rounded-xl border-2 border-gray-200">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h3 class="text-xl font-semibold text-gray-900">Tren Penjualan</h3>
                  <p class="text-sm text-gray-500">Performa penjualan 7 hari terakhir</p>
                </div>
              </div>
              
              <!-- Chart Placeholder -->
              <div class="relative h-64">
                ${this.renderChart(chartData)}
              </div>
            </div>
          </div>

          <!-- Stok Menipis -->
          <div class="card p-6 rounded-xl border-2 border-gray-200">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-semibold text-gray-900">Stok Menipis</h3>
              <span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <i data-lucide="alert-triangle" class="w-4 h-4"></i> ${lowStock.length} Item
              </span>
            </div>
            
            <div class="space-y-4">
              ${lowStock.length === 0 ? `
                <p class="text-center text-gray-500 py-4">Tidak ada stok yang menipis</p>
              ` : lowStock.slice(0, 4).map(item => `
                <div class="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div class="flex items-start justify-between mb-2">
                    <div>
                      <p class="font-semibold text-gray-900">${item.name}</p>
                      <p class="text-xs text-gray-500">SKU: ${item.sku}</p>
                    </div>
                    <span class="text-lg font-bold ${item.current_stock < item.min_stock * 0.2 ? 'text-red-600' : 'text-orange-600'}">
                      ${item.current_stock} / ${item.min_stock}
                    </span>
                  </div>
                  <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all ${item.current_stock < item.min_stock * 0.2 ? 'bg-orange-700' : 'bg-orange-500'}" 
                         style="width: ${Math.min((item.current_stock / item.min_stock) * 100, 100)}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <button class="w-full mt-6 py-3 border-2 border-blue-800 text-blue-800 font-semibold rounded-xl hover:bg-blue-50 flex items-center justify-center gap-2">
              <i data-lucide="shopping-basket" class="w-5 h-5"></i> Restok Sekarang
            </button>
          </div>
        </div>
      </div>
    `
  }

  generateChartData(sales) {
    const data = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      const daySales = sales.filter(s => new Date(s.created_at).toDateString() === date.toDateString())
      const total = daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0)
      data.push({ date: dateStr, sales: total })
    }
    return data
  }

  renderStatCard(label, value, icon, color, change) {
    const colorClasses = {
      indigo: { bg: 'bg-indigo-100', text: 'text-blue-600', iconBg: 'bg-indigo-100', iconColor: 'text-blue-800' },
      cyan: { bg: 'bg-cyan-100', text: 'text-teal-600', iconBg: 'bg-cyan-200', iconColor: 'text-cyan-700' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', iconBg: 'bg-orange-200', iconColor: 'text-orange-700' },
      red: { bg: 'bg-red-100', text: 'text-red-600', iconBg: 'bg-red-200', iconColor: 'text-red-700' },
    }
    const c = colorClasses[color] || colorClasses.indigo
    
    return `
      <div class="card p-6 rounded-xl border-2 border-gray-200">
        <div class="flex items-start justify-between mb-4">
          <div class="p-3 rounded-xl ${c.iconBg}">
            <i data-lucide="${icon}" class="w-6 h-6 ${c.iconColor}"></i>
          </div>
        </div>
        <p class="text-gray-600 mb-1">${label}</p>
        <p class="text-2xl font-bold ${c.text}">${value}</p>
      </div>
    `
  }

  renderQuickAction(label, icon, href) {
    return `
      <a href="${href}" class="flex flex-col items-center p-5 bg-gradient-to-b from-gray-100 to-gray-200 rounded-2xl hover:from-gray-200 hover:to-gray-300 transition-all">
        <div class="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-3">
          <i data-lucide="${icon}" class="w-7 h-7 text-blue-700"></i>
        </div>
        <p class="font-medium text-gray-800">${label}</p>
        <p class="text-xs text-gray-500 mt-1">Tambah item</p>
      </a>
    `
  }

  renderChart(data) {
    const maxValue = Math.max(...data.map(d => d.sales), 1000000)
    const chartHeight = 200
    const barWidth = 100 / data.length
    
    return `
      <svg viewBox="0 0 800 250" class="w-full h-full">
        <!-- Background Grid -->
        ${[0, 1, 2, 3, 4].map(i => `
          <line x1="0" y1="${50 + i * 40}" x2="800" y2="${50 + i * 40}" 
                stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4 4"/>
        `).join('')}
        
        <!-- Area Fill -->
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#1e40af" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#1e40af" stop-opacity="0"/>
          </linearGradient>
        </defs>
        
        <!-- Area Path -->
        <path d="M ${data.map((d, i) => {
          const x = 50 + i * (700 / (data.length - 1))
          const y = 200 - (d.sales / maxValue) * 150
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
        }).join(' ')} L 750 200 L 50 200 Z" 
              fill="url(#areaGradient)"/>
        
        <!-- Line -->
        <path d="${data.map((d, i) => {
          const x = 50 + i * (700 / (data.length - 1))
          const y = 200 - (d.sales / maxValue) * 150
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
        }).join(' ')}" 
              fill="none" stroke="#1e40af" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        
        <!-- Points -->
        ${data.map((d, i) => {
          const x = 50 + i * (700 / (data.length - 1))
          const y = 200 - (d.sales / maxValue) * 150
          return `<circle cx="${x}" cy="${y}" r="5" fill="#1e40af"/>
                  <circle cx="${x}" cy="${y}" r="9" fill="white" stroke="#1e40af" stroke-width="2"/>`
        }).join('')}
        
        <!-- Labels -->
        ${data.map((d, i) => {
          const x = 50 + i * (700 / (data.length - 1))
          return `<text x="${x}" y="235" text-anchor="middle" class="text-xs fill-gray-600" style="font-size: 12px;">${d.date}</text>`
        }).join('')}
      </svg>
    `
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

  async bindEvents() {
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
  }
}
