export class ForecastingPage {
  constructor({ supabase }) {
    this.supabase = supabase
    this.forecastPeriod = 30
    this.restockDays = 14
    this.products = []
    this.sales = []
    this.forecasts = []
    this.loading = true
  }

  async loadData() {
    this.loading = true
    const since = new Date()
    since.setDate(since.getDate() - this.forecastPeriod)

    const [productsRes, salesRes] = await Promise.all([
      this.supabase.from('products')
        .select('*, suppliers(supplier_name), categories(name)')
        .order('name'),
      this.supabase.from('sale_items')
        .select('quantity, product_id, sales!inner(created_at)')
        .gte('sales.created_at', since.toISOString())
    ])
    this.products = productsRes.data || []
    this.sales = salesRes.data || []
    this.calculateForecasts()
    this.loading = false
  }

  calculateForecasts() {
    const dailySales = {}
    this.sales.forEach(s => {
      const pid = s.product_id
      dailySales[pid] = (dailySales[pid] || 0) + s.quantity
    })

    this.forecasts = this.products.map(p => {
      const totalSold = dailySales[p.id] || 0
      const avgDaily = this.forecastPeriod > 0 ? totalSold / this.forecastPeriod : 0
      const daysUntilEmpty = avgDaily > 0 ? Math.floor(p.current_stock / avgDaily) : Infinity
      const needsRestock = p.current_stock <= p.min_stock || (avgDaily > 0 && daysUntilEmpty <= this.restockDays)
      const recommendQty = avgDaily > 0 ? Math.ceil(avgDaily * this.restockDays) - p.current_stock : 0
      const restockCost = recommendQty > 0 ? recommendQty * p.cost_price : 0
      const totalValue = p.current_stock * p.sell_price

      return {
        ...p,
        totalSold,
        avgDaily: Math.round(avgDaily * 10) / 10,
        daysUntilEmpty,
        needsRestock,
        recommendQty: Math.max(0, recommendQty),
        restockCost,
        totalValue,
        profitMargin: p.sell_price > 0 ? ((p.sell_price - p.cost_price) / p.sell_price * 100).toFixed(1) : 0
      }
    })

    this.forecasts.sort((a, b) => {
      if (a.needsRestock && !b.needsRestock) return -1
      if (!a.needsRestock && b.needsRestock) return 1
      return (a.daysUntilEmpty || 99999) - (b.daysUntilEmpty || 99999)
    })
  }

  render() {
    const needsRestock = this.forecasts.filter(f => f.needsRestock)
    const totalRestockCost = needsRestock.reduce((s, f) => s + f.restockCost, 0)
    const noSales = this.forecasts.filter(f => f.totalSold === 0)

    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Forecasting Stok</h2>
            <p class="text-sm text-gray-500">Prediksi kebutuhan stok berdasarkan data penjualan</p>
          </div>
          <div class="flex items-center gap-3">
            <div>
              <label class="text-xs text-gray-500">Periode Analisa</label>
              <select id="period-select" class="w-auto text-sm">
                <option value="14" ${this.forecastPeriod === 14 ? 'selected' : ''}>14 Hari</option>
                <option value="30" ${this.forecastPeriod === 30 ? 'selected' : ''}>30 Hari</option>
                <option value="60" ${this.forecastPeriod === 60 ? 'selected' : ''}>60 Hari</option>
                <option value="90" ${this.forecastPeriod === 90 ? 'selected' : ''}>90 Hari</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-500">Hari Restock</label>
              <select id="restock-select" class="w-auto text-sm">
                <option value="7" ${this.restockDays === 7 ? 'selected' : ''}>7 Hari</option>
                <option value="14" ${this.restockDays === 14 ? 'selected' : ''}>14 Hari</option>
                <option value="30" ${this.restockDays === 30 ? 'selected' : ''}>30 Hari</option>
              </select>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          ${this.renderCard('Perlu Restock', needsRestock.length, 'alert-triangle', 'danger')}
          ${this.renderCard('Estimasi Biaya', `Rp ${this.formatNumber(totalRestockCost)}`, 'shopping-cart', 'warning')}
          ${this.renderCard('Produk Tanpa Penjualan', noSales.length, 'trending-down', 'danger')}
          ${this.renderCard('Total Produk', this.products.length, 'package', 'info')}
        </div>

        ${needsRestock.length > 0 ? `
          <div class="card p-6 bg-warning-50 border-warning-200">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-warning-600 flex items-center gap-2">
                  <i data-lucide="alert-triangle" class="w-5 h-5"></i>
                  Rekomendasi Restock
                </h3>
                <p class="text-sm text-gray-600 mt-1">${needsRestock.length} produk perlu segera di-restock. Estimasi kebutuhan dana: Rp ${this.formatNumber(totalRestockCost)}</p>
              </div>
              <a href="#/purchase-orders" class="btn-primary text-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Buat PO
              </a>
            </div>
          </div>
        ` : ''}

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>SKU</th>
                  <th class="text-right">Stok</th>
                  <th class="text-right">Min Stok</th>
                  <th class="text-right">Terjual (${this.forecastPeriod}hr)</th>
                  <th class="text-right">Rata-rata/hari</th>
                  <th class="text-right">Estimasi Habis</th>
                  <th class="text-right">Rekomendasi</th>
                  <th class="text-right">Estimasi Biaya</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${this.loading ? `
                  <tr><td colspan="10" class="text-center py-8 text-gray-500">Memuat data...</td></tr>
                ` : this.forecasts.map(f => {
                  const isEmpty = f.daysUntilEmpty === Infinity
                  const isUrgent = f.needsRestock
                  return `
                    <tr class="${isUrgent ? 'bg-warning-50/50' : ''}">
                      <td class="font-medium">${f.name}</td>
                      <td class="font-mono text-xs">${f.sku}</td>
                      <td class="text-right font-semibold">${f.current_stock}</td>
                      <td class="text-right">${f.min_stock}</td>
                      <td class="text-right">${f.totalSold}</td>
                      <td class="text-right">${f.avgDaily}</td>
                      <td class="text-right font-semibold ${isUrgent && !isEmpty ? 'text-danger-600' : ''}">
                        ${isEmpty ? '∞ (tdk ada data)' : f.daysUntilEmpty <= 0 ? 'Habis!' : `${f.daysUntilEmpty} hari`}
                      </td>
                      <td class="text-right font-semibold text-primary-600">
                        ${f.recommendQty > 0 ? `${f.recommendQty} pcs` : '-'}
                      </td>
                      <td class="text-right">${f.recommendQty > 0 ? `Rp ${this.formatNumber(f.restockCost)}` : '-'}</td>
                      <td>
                        <span class="badge ${isUrgent ? 'badge-danger' : isEmpty ? 'badge-warning' : 'badge-success'}">
                          ${isUrgent ? 'Restock' : isEmpty ? 'No Data' : 'Aman'}
                        </span>
                      </td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card p-6">
            <h3 class="font-semibold mb-3 flex items-center gap-2">
              <i data-lucide="trending-up" class="w-5 h-5 text-success-500"></i>
              Produk Paling Laris (${this.forecastPeriod}hr)
            </h3>
            ${this.renderTopList(
              this.forecasts.filter(f => f.totalSold > 0).sort((a, b) => b.totalSold - a.totalSold).slice(0, 5),
              f => `${f.totalSold} terjual • ${f.avgDaily}/hari`,
              f => `Stok: ${f.current_stock} (${f.daysUntilEmpty === Infinity ? '∞' : f.daysUntilEmpty + ' hari'})`
            )}
          </div>

          <div class="card p-6">
            <h3 class="font-semibold mb-3 flex items-center gap-2">
              <i data-lucide="trending-down" class="w-5 h-5 text-danger-500"></i>
              Produk Paling Tidak Laku (${this.forecastPeriod}hr)
            </h3>
            ${this.renderTopList(
              this.forecasts.filter(f => f.totalSold === 0).slice(0, 5),
              f => `0 terjual • Stok: ${f.current_stock}`,
              f => `Nilai: Rp ${this.formatNumber(f.totalValue)}`
            )}
          </div>
        </div>
      </div>
    `
  }

  renderCard(label, value, icon, color) {
    const colors = { danger: 'bg-danger-50 text-danger-600', warning: 'bg-warning-50 text-warning-600', success: 'bg-success-50 text-success-600', info: 'bg-primary-50 text-primary-600' }
    return `
      <div class="card p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-gray-500">${label}</p>
            <p class="text-lg font-bold text-gray-900 mt-1">${value}</p>
          </div>
          <div class="p-2 rounded-xl ${colors[color]}"><i data-lucide="${icon}" class="w-5 h-5"></i></div>
        </div>
      </div>
    `
  }

  renderTopList(items, line1, line2) {
    if (items.length === 0) return '<p class="text-sm text-gray-500">Tidak ada data</p>'
    return `
      <div class="space-y-3">
        ${items.map((item, i) => `
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}">${i + 1}</span>
              <div>
                <p class="text-sm font-medium">${item.name}</p>
                <p class="text-xs text-gray-500">${line1(item)}</p>
              </div>
            </div>
            <p class="text-xs text-gray-500">${line2(item)}</p>
          </div>
        `).join('')}
      </div>
    `
  }

  formatNumber(num) { return num ? num.toLocaleString('id-ID') : '0' }

  async bindEvents() {
    await this.loadData()
    this.renderAndBind()
  }

  _bindListeners() {
    document.getElementById('period-select')?.addEventListener('change', (e) => {
      this.forecastPeriod = parseInt(e.target.value); this.loadData().then(() => this.renderAndBind())
    })
    document.getElementById('restock-select')?.addEventListener('change', (e) => {
      this.restockDays = parseInt(e.target.value); this.calculateForecasts(); this.renderAndBind()
    })
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) { outlet.innerHTML = this.render() }
    this._bindListeners()
    if (window.lucide) window.lucide.createIcons()
  }
}