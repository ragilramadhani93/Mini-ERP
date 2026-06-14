import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

export class AnalyticsPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.sales = []
    this.products = []
    this.categories = []
    this.charts = {}
    this.period = '30'
  }

  async loadData() {
    const days = parseInt(this.period)
    const since = new Date()
    since.setDate(since.getDate() - days)

    const [salesRes, productsRes, categoriesRes] = await Promise.all([
      this.supabase.from('sales')
        .select('*, sale_items(*, products(id, name, sku, cost_price, sell_price, category_id)), created_at')
        .gte('created_at', since.toISOString())
        .order('created_at'),
      this.supabase.from('products').select('*, categories(name)').order('name'),
      this.supabase.from('categories').select('*').order('name')
    ])
    this.sales = salesRes.data || []
    this.products = productsRes.data || []
    this.categories = categoriesRes.data || []
  }

  destroyCharts() {
    Object.values(this.charts).forEach(c => { if (c) c.destroy() })
    this.charts = {}
  }

  render() {
    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Dashboard Analitik</h2>
            <p class="text-sm text-gray-500">${this.sales.length} transaksi dalam periode ini</p>
          </div>
          <select id="period-select" class="w-auto">
            <option value="7" ${this.period === '7' ? 'selected' : ''}>7 Hari</option>
            <option value="30" ${this.period === '30' ? 'selected' : ''}>30 Hari</option>
            <option value="90" ${this.period === '90' ? 'selected' : ''}>90 Hari</option>
            <option value="365" ${this.period === '365' ? 'selected' : ''}>1 Tahun</option>
            <option value="all" ${this.period === 'all' ? 'selected' : ''}>Semua</option>
          </select>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div class="card p-6">
            <h3 class="font-semibold mb-4 flex items-center gap-2">
              <i data-lucide="trending-up" class="w-5 h-5 text-success-500"></i>
              Produk Terlaris (Top 10)
            </h3>
            <div class="h-80" id="chart-top-products"><canvas></canvas></div>
          </div>

          <div class="card p-6">
            <h3 class="font-semibold mb-4 flex items-center gap-2">
              <i data-lucide="trending-down" class="w-5 h-5 text-danger-500"></i>
              Produk Slow Moving (Bottom 10)
            </h3>
            <div class="h-80" id="chart-slow-moving"><canvas></canvas></div>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div class="card p-6">
            <h3 class="font-semibold mb-4 flex items-center gap-2">
              <i data-lucide="bar-chart-3" class="w-5 h-5 text-primary-500"></i>
              Produk Paling Profit (Top 10)
            </h3>
            <div class="h-80" id="chart-most-profit"><canvas></canvas></div>
          </div>

          <div class="card p-6">
            <h3 class="font-semibold mb-4 flex items-center gap-2">
              <i data-lucide="pie-chart" class="w-5 h-5 text-primary-500"></i>
              Penjualan per Kategori
            </h3>
            <div class="h-80" id="chart-sales-by-category"><canvas></canvas></div>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div class="card p-6">
            <h3 class="font-semibold mb-4 flex items-center gap-2">
              <i data-lucide="line-chart" class="w-5 h-5 text-primary-500"></i>
              Tren Penjualan per Hari
            </h3>
            <div class="h-80" id="chart-sales-trend"><canvas></canvas></div>
          </div>

          <div class="card p-6">
            <h3 class="font-semibold mb-4 flex items-center gap-2">
              <i data-lucide="users" class="w-5 h-5 text-primary-500"></i>
              Customer Terbaik
            </h3>
            ${this.renderTopCustomers()}
          </div>
        </div>
      </div>
    `
  }

  renderTopCustomers() {
    const customerMap = {}
    this.sales.forEach(s => {
      if (!s.customer_name) return
      if (!customerMap[s.customer_name]) {
        customerMap[s.customer_name] = { count: 0, total: 0 }
      }
      customerMap[s.customer_name].count++
      customerMap[s.customer_name].total += s.total_amount
    })

    const sorted = Object.entries(customerMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)

    if (sorted.length === 0) {
      return `<p class="text-sm text-gray-500">Belum ada data customer</p>`
    }

    return `
      <div class="space-y-3">
        ${sorted.map(([name, data], i) => `
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="w-7 h-7 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">${i + 1}</span>
              <div>
                <p class="text-sm font-medium">${name}</p>
                <p class="text-xs text-gray-500">${data.count} transaksi</p>
              </div>
            </div>
            <p class="text-sm font-semibold">Rp ${this.formatNumber(data.total)}</p>
          </div>
        `).join('')}
      </div>
    `
  }

  buildCharts() {
    this.destroyCharts()

    const colorPalette = [
      '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ]

    // Compute product analytics
    const productSales = {}
    const productProfit = {}
    this.sales.forEach(s => {
      ;(s.sale_items || []).forEach(item => {
        const pid = item.product_id
        if (!productSales[pid]) {
          productSales[pid] = { id: pid, name: item.products?.name || 'Unknown', qty: 0, revenue: 0, cost: 0 }
          productProfit[pid] = { name: item.products?.name || 'Unknown', profit: 0 }
        }
        productSales[pid].qty += item.quantity
        productSales[pid].revenue += item.unit_price * item.quantity
        productSales[pid].cost += (item.products?.cost_price || 0) * item.quantity
        productProfit[pid].profit += ((item.unit_price - (item.products?.cost_price || 0)) * item.quantity) - item.discount
      })
    })

    // Top products by qty sold
    const topByQty = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 10)
    this.charts.topProducts = this.createBarChart('chart-top-products', 
      topByQty.map(p => p.name.length > 20 ? p.name.slice(0, 20) + '...' : p.name),
      [topByQty.map(p => p.qty)],
      ['Jumlah Terjual'],
      colorPalette
    )

    // Slow moving (bottom 10)
    const allProducts = this.products.map(p => ({
      name: p.name, qty: productSales[p.id]?.qty || 0
    })).sort((a, b) => a.qty - b.qty).slice(0, 10)

    this.charts.slowMoving = this.createBarChart('chart-slow-moving',
      allProducts.map(p => p.name.length > 20 ? p.name.slice(0, 20) + '...' : p.name),
      [allProducts.map(p => p.qty)],
      ['Terjual'],
      ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1', '#8b5cf6']
    )

    // Most profitable
    const topProfit = Object.values(productProfit).sort((a, b) => b.profit - a.profit).slice(0, 10)
    this.charts.mostProfit = this.createBarChart('chart-most-profit',
      topProfit.map(p => p.name.length > 20 ? p.name.slice(0, 20) + '...' : p.name),
      [topProfit.map(p => p.profit)],
      ['Profit (Rp)'],
      ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#0ea5e9', '#0284c7', '#6366f1', '#8b5cf6', '#a855f7']
    )

    // Sales by category
    const catSales = {}
    this.sales.forEach(s => {
      ;(s.sale_items || []).forEach(item => {
        const catName = item.products?.category_id 
          ? this.categories.find(c => c.id === item.products.category_id)?.name || 'Tanpa Kategori'
          : 'Tanpa Kategori'
        catSales[catName] = (catSales[catName] || 0) + item.quantity
      })
    })
    const catEntries = Object.entries(catSales).sort((a, b) => b[1] - a[1])
    this.charts.salesByCategory = this.createPieChart('chart-sales-by-category',
      catEntries.map(([name]) => name),
      catEntries.map(([, val]) => val),
      colorPalette
    )

    // Sales trend by day
    const dailyMap = {}
    this.sales.forEach(s => {
      const day = new Date(s.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      dailyMap[day] = (dailyMap[day] || 0) + (s.total_amount || 0)
    })
    const dailyEntries = Object.entries(dailyMap).sort((a, b) => new Date(a[0]) - new Date(b[0]))
    this.charts.salesTrend = this.createLineChart('chart-sales-trend',
      dailyEntries.map(([day]) => day),
      [dailyEntries.map(([, val]) => val)],
      ['Total Penjualan (Rp)'],
      ['#0ea5e9']
    )
  }

  createBarChart(canvasId, labels, datasets, labels2, colors) {
    const canvas = document.querySelector(`#${canvasId} canvas`)
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: datasets.map((data, i) => ({
          label: labels2[i],
          data,
          backgroundColor: colors.slice(0, data.length),
          borderRadius: 4,
          maxBarThickness: 32
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: datasets.length > 1 },
          tooltip: { callbacks: { label: (ctx) => `Rp ${this.formatNumber(ctx.raw)}` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v) => this.formatNumber(v) } },
          x: { ticks: { maxRotation: 0, font: { size: 10 } } }
        }
      }
    })
  }

  createLineChart(canvasId, labels, datasets, labels2, colors) {
    const canvas = document.querySelector(`#${canvasId} canvas`)
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((data, i) => ({
          label: labels2[i],
          data,
          borderColor: colors[i],
          backgroundColor: colors[i] + '20',
          fill: true,
          tension: 0.4,
          pointRadius: 3
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: { callbacks: { label: (ctx) => `Rp ${this.formatNumber(ctx.raw)}` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v) => this.formatNumber(v) } },
          x: { ticks: { maxTicksLimit: 15, font: { size: 10 } } }
        }
      }
    })
  }

  createPieChart(canvasId, labels, data, colors) {
    const canvas = document.querySelector(`#${canvasId} canvas`)
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { font: { size: 10 } } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} item` } }
        }
      }
    })
  }

  formatNumber(num) { return num ? num.toLocaleString('id-ID') : '0' }

  async bindEvents() {
    await this.loadData()
    this.destroyCharts()
    this.renderAndBind()

    document.getElementById('period-select')?.addEventListener('change', async (e) => {
      this.period = e.target.value
      await this.loadData()
      this.destroyCharts()
      this.renderAndBind()
    })

    if (window.lucide) window.lucide.createIcons()
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) {
      outlet.innerHTML = this.render()
      setTimeout(() => this.buildCharts(), 100)
    }
  }
}