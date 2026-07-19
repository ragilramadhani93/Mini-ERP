import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)
import { SkeletonPage } from '../components/Skeleton.js'
import { toast } from '../components/ToastNotification.js'

export class AnalyticsPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.sales = []
    this.products = []
    this.categories = []
    this.charts = {}
    this.period = '30'
    this.tipsDismissed = false
  }

  async loadData() {
    try {
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
    } catch (err) {
      console.error('Load analytics error:', err)
      toast.error('Gagal', 'Gagal memuat data analitik: ' + err.message)
      this.sales = []
      this.products = []
      this.categories = []
    }
  }

  destroyCharts() {
    Object.values(this.charts).forEach(c => { if (c) c.destroy() })
    this.charts = {}
  }

  render() {
    const tips = this.generateTips()

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

        ${tips.length > 0 ? `
          <div class="card" style="border-left:4px solid #f59e0b;background:linear-gradient(135deg,#fffbeb,#fef3c7)">
            <div class="p-4 flex items-start justify-between">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                <i data-lucide="lightbulb" style="width:18px;height:18px;color:#f59e0b"></i>
                <h3 style="font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px">Tips Hari Ini</h3>
              </div>
              <button id="close-tips" style="background:none;border:none;cursor:pointer;color:#94a3b8;padding:2px" title="Tutup">
                <i data-lucide="x" style="width:16px;height:16px"></i>
              </button>
            </div>
            <div class="px-4 pb-4" style="display:flex;flex-direction:column;gap:10px">
              ${tips.map(tip => `
                <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;background:white;border-radius:10px;border:1px solid #fde68a">
                  <div style="width:32px;height:32px;border-radius:8px;background:${tip.color}15;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <i data-lucide="${tip.icon}" style="width:16px;height:16px;color:${tip.color}"></i>
                  </div>
                  <div>
                    <p style="font-weight:600;color:#1e293b;font-size:13px">${tip.title}</p>
                    <p style="font-size:12px;color:#64748b;margin-top:2px">${tip.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

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

  generateTips() {
    if (this.tipsDismissed) return []
    const tips = []

    const productSales = {}
    this.sales.forEach(s => {
      (s.sale_items || []).forEach(item => {
        const pid = item.product_id
        if (!productSales[pid]) {
          productSales[pid] = { id: pid, name: item.products?.name || 'Unknown', qty: 0, stock: 0 }
        }
        productSales[pid].qty += item.quantity
      })
    })
    this.products.forEach(p => {
      if (productSales[p.id]) {
        productSales[p.id].stock = p.current_stock || 0
      }
    })

    const lowStock = Object.values(productSales)
      .filter(p => p.stock > 0 && p.stock <= 5 && p.qty > 0)
      .sort((a, b) => a.stock - b.stock)
    if (lowStock.length > 0) {
      const p = lowStock[0]
      tips.push({
        icon: 'alert-triangle',
        color: '#f59e0b',
        title: `${p.name} stok menipis`,
        desc: `Sisa ${p.stock} item. Pertimbangkan restock segera.`
      })
    }

    const bestSeller = Object.values(productSales).sort((a, b) => b.qty - a.qty)
    if (bestSeller.length > 0 && bestSeller[0].qty > 2) {
      const p = bestSeller[0]
      const stock = this.products.find(pr => pr.id === p.id)?.current_stock || 0
      if (stock > 0 && stock <= 10) {
        tips.push({
          icon: 'trending-up',
          color: '#22c55e',
          title: `${p.name} sering terjual`,
          desc: `Terjual ${p.qty} item. Stok tersisa ${stock}. Pertimbangkan menambah stok.`
        })
      }
    }

    const noSales = this.products.filter(p => {
      const sold = productSales[p.id]?.qty || 0
      return sold === 0 && (p.current_stock || 0) > 0
    }).slice(0, 3)
    if (noSales.length > 0) {
      tips.push({
        icon: 'package-x',
        color: '#ef4444',
        title: `${noSales.length} produk belum terjual`,
        desc: `${noSales.map(p => p.name).join(', ')}. Pertimbangkan promosi atau diskon.`
      })
    }

    const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
    const todaySales = this.sales.filter(s => {
      const d = new Date(s.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      return d === today
    })
    const todayTotal = todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0)
    if (todayTotal > 0) {
      tips.push({
        icon: 'calendar-check',
        color: '#0ea5e9',
        title: `Penjualan hari ini: Rp ${this.formatNumber(todayTotal)}`,
        desc: `${todaySales.length} transaksi tercatat hari ini.`
      })
    }

    return tips.slice(0, 3)
  }

  async bindEvents() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) outlet.innerHTML = SkeletonPage()
    await this.loadData()
    this.destroyCharts()
    this.renderAndBind()

    document.getElementById('period-select')?.addEventListener('change', async (e) => {
      this.period = e.target.value
      await this.loadData()
      this.destroyCharts()
      this.renderAndBind()
    })

    document.getElementById('close-tips')?.addEventListener('click', () => {
      this.tipsDismissed = true
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