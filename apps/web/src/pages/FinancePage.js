export class FinancePage {
  constructor({ supabase, auth, path }) {
    this.supabase = supabase
    this.auth = auth
    this.path = path
    this.transactions = []
    this.deposits = []
    this.activeTab = path === '/finance/expenses' ? 'out' : 'all'
    this.showModal = false
    this.transactionType = 'in'
    this.loading = false

    // Set default tanggal: 30 hari terakhir
    const now = new Date()
    const dateFrom = new Date(now)
    dateFrom.setDate(dateFrom.getDate() - 30)
    this.dateFrom = dateFrom.toISOString().slice(0, 10)
    this.dateTo = now.toISOString().slice(0, 10)

    this.salesByMethod = []
    this.transactionDate = new Date().toISOString().slice(0, 10)
  }

  async loadData() {
    const now = new Date()
    let dateFrom, dateTo

    if (this.dateFrom && this.dateTo) {
      dateFrom = new Date(this.dateFrom)
      dateTo = new Date(this.dateTo)
      dateTo.setDate(dateTo.getDate() + 1)
    } else {
      // Default: tampilkan 30 hari terakhir
      dateFrom = new Date(now)
      dateFrom.setDate(dateFrom.getDate() - 30)
      dateTo = new Date(now)
      dateTo.setDate(dateTo.getDate() + 1)
    }

    let txQuery = this.supabase.from('cash_transactions')
      .select('*, created_by:users(full_name)')
      .gte('created_at', dateFrom.toISOString())
      .lte('created_at', dateTo.toISOString())
      .order('created_at', { ascending: false })

    let salesQuery = this.supabase.from('sales')
      .select('id, payment_method, total_amount, platform_fee, total_received, status, split_payments(*), payment_details, created_at')
      .gte('created_at', dateFrom.toISOString())
      .lte('created_at', dateTo.toISOString())
      .eq('status', 'completed')

    let depositQuery = this.supabase.from('customer_deposits')
      .select('*')
      .gte('created_at', dateFrom.toISOString())
      .lte('created_at', dateTo.toISOString())
      .order('created_at', { ascending: false })

    const [txRes, salesRes, methodsRes, depositRes] = await Promise.all([
      txQuery,
      salesQuery,
      this.supabase.from('payment_methods')
        .select('*')
        .order('sort_order'),
      depositQuery
    ])

    this.transactions = txRes.data || []
    this.sales = salesRes.data || []
    this.paymentMethods = methodsRes.data || []
    this.deposits = depositRes.data || []

    const saleIds = [...new Set(this.transactions.filter(t => t.reference_type === 'sales' && t.reference_id).map(t => t.reference_id))]
    if (saleIds.length > 0) {
      const { data: relatedSales } = await this.supabase.from('sales').select('id, created_at').in('id', saleIds)
      this.saleDateMap = {}
      ;(relatedSales || []).forEach(s => { this.saleDateMap[s.id] = s.created_at })
    } else {
      this.saleDateMap = {}
    }

    this.calcSalesByMethod()
  }

  calcSalesByMethod() {
    const grouped = {}
    this.sales.forEach(s => {
      const splits = s.split_payments?.length > 0
        ? s.split_payments
        : (s.payment_details?.splits?.length > 0 ? s.payment_details.splits : [])
      const hasSplits = splits.length > 0 && splits.some(sp => sp.amount > 0)

      if (hasSplits) {
        const mainAmount = s.payment_details?.main_amount || 0
        if (mainAmount > 0) {
          const m = s.payment_method || 'unknown'
          if (!grouped[m]) grouped[m] = { count: 0, total: 0, fee: 0, received: 0 }
          grouped[m].count++
          grouped[m].total += mainAmount
          grouped[m].received += mainAmount
        }
        splits.filter(sp => sp.amount > 0).forEach(sp => {
          const code = sp.method || 'unknown'
          if (!grouped[code]) grouped[code] = { count: 0, total: 0, fee: 0, received: 0 }
          grouped[code].count++
          grouped[code].total += sp.amount
          grouped[code].received += sp.amount
        })
      } else {
        const method = s.payment_method || 'unknown'
        if (!grouped[method]) grouped[method] = { count: 0, total: 0, fee: 0, received: 0 }
        grouped[method].count++
        grouped[method].total += s.total_amount
        grouped[method].fee += s.platform_fee || 0
        grouped[method].received += s.total_received || (s.total_amount - (s.platform_fee || 0))
      }
    })
    this.salesByMethod = Object.entries(grouped).map(([code, data]) => {
      const pm = this.paymentMethods.find(p => p.code === code)
      return { code, name: pm?.name || code, color: pm?.color || '#64748b', ...data }
    }).sort((a, b) => b.total - a.total)
  }

  render() {
    const stats = this.calcStats()

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Keuangan</h2>
          <button id="add-transaction-btn" class="btn-primary">
            <i data-lucide="plus" class="w-5 h-5"></i> Tambah Transaksi
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          ${this.renderStatCard('Saldo Kas', stats.balance, 'wallet', stats.balance >= 0 ? 'success' : 'danger')}
          ${this.renderStatCard('Pemasukan', stats.income, 'trending-up', 'success')}
          ${this.renderStatCard('Pengeluaran', stats.expense, 'trending-down', 'danger')}
          ${this.renderStatCard('Profit', stats.profit, 'bar-chart-3', stats.profit >= 0 ? 'primary' : 'danger')}
          ${this.renderStatCard('Total Deposit', stats.deposit, 'coins', 'warning')}
        </div>

        <div class="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white p-4 rounded-xl border border-gray-100">
          <div class="flex flex-wrap gap-2 items-center">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Filter</span>
            ${['all', 'in', 'out', 'methods'].map(tab => `
              <button class="tab-btn px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                this.activeTab === tab ? 'bg-primary-50 text-primary-600 ring-2 ring-primary-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }" data-tab="${tab}">
                ${tab === 'all' ? 'Semua' : tab === 'in' ? 'Pemasukan' : tab === 'out' ? 'Pengeluaran' : 'Metode'}
              </button>
            `).join('')}
          </div>
          <div class="flex flex-wrap gap-2 items-center">
            <div class="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg">
              <i data-lucide="calendar" class="w-4 h-4 text-gray-400 ml-1"></i>
              <input type="date" id="date-from" value="${this.dateFrom}" class="bg-transparent border-none text-sm focus:ring-0 text-gray-700 w-36">
              <span class="text-gray-400 text-sm">-</span>
              <input type="date" id="date-to" value="${this.dateTo}" class="bg-transparent border-none text-sm focus:ring-0 text-gray-700 w-36">
            </div>
            <button id="reset-filter" class="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-lg transition-colors">
              <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
              Reset
            </button>
          </div>
        </div>

        ${this.activeTab === 'methods' ? this.renderMethodsTab() : this.renderTransactionsTab()}

        ${this.showModal ? this.renderModal() : ''}
      </div>
    `
  }

  renderTransactionsTab() {
    return `
      <div class="card">
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Tipe</th>
                <th>Kategori</th>
                <th>Deskripsi</th>
                <th class="text-right">Jumlah</th>
                <th>Oleh</th>
              </tr>
            </thead>
            <tbody>
              ${this.getFiltered().length === 0 ? `
                <tr><td colspan="6" class="text-center text-gray-500 py-8">Belum ada transaksi</td></tr>
              ` : this.getFiltered().map(t => `
                <tr>
                  <td class="text-sm text-gray-500 whitespace-nowrap">${this.formatDate((t.reference_type === 'sales' && t.reference_id && this.saleDateMap?.[t.reference_id]) || t.created_at)}</td>
                  <td>
                    <span class="badge ${t.type === 'in' ? 'badge-success' : 'badge-danger'}">
                      ${t.type === 'in' ? 'Masuk' : 'Keluar'}
                    </span>
                  </td>
                  <td>${this.getCategoryLabel(t.category)}</td>
                  <td class="max-w-xs truncate">${t.description}</td>
                  <td class="text-right font-semibold ${t.type === 'in' ? 'text-success-600' : 'text-danger-600'}">
                    ${t.type === 'in' ? '+' : '-'}Rp ${this.formatNumber(t.amount)}
                  </td>
                  <td class="text-sm text-gray-500">${t.created_by?.full_name || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  }

  renderMethodsTab() {
    const total = this.salesByMethod.reduce((s, m) => s + m.total, 0)
    const totalReceived = this.salesByMethod.reduce((s, m) => s + m.received, 0)

    return `
      <div class="card">
        <div class="p-4" style="border-bottom:1px solid #f1f5f9">
          <h3 class="font-semibold" style="font-size:14px;color:#0f172a">Penjualan per Metode Pembayaran</h3>
          <p style="font-size:12px;color:#64748b;margin-top:2px">Total: Rp ${this.formatNumber(total)} (Diterima: Rp ${this.formatNumber(totalReceived)})</p>
        </div>
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Metode Pembayaran</th>
                <th style="text-align:right">Transaksi</th>
                <th style="text-align:right">Total Penjualan</th>
                <th style="text-align:right">Potongan</th>
                <th style="text-align:right">Diterima</th>
                <th style="text-align:right">%</th>
              </tr>
            </thead>
            <tbody>
              ${this.salesByMethod.length === 0 ? `
                <tr><td colspan="6" class="text-center text-gray-500 py-8">Belum ada penjualan lunas</td></tr>
              ` : this.salesByMethod.map(m => {
                const pct = total > 0 ? ((m.total / total) * 100).toFixed(1) : 0
                return `
                  <tr>
                    <td>
                      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${m.color};margin-right:6px;vertical-align:middle"></span>
                      <span style="font-weight:500">${m.name}</span>
                    </td>
                    <td style="text-align:right">${m.count}</td>
                    <td style="text-align:right;font-weight:600">Rp ${this.formatNumber(m.total)}</td>
                    <td style="text-align:right;color:#ef4444">${m.fee > 0 ? `Rp ${this.formatNumber(m.fee)}` : '-'}</td>
                    <td style="text-align:right;color:#16a34a;font-weight:700">Rp ${this.formatNumber(m.received)}</td>
                    <td style="text-align:right">
                      <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end">
                        <span style="font-size:12px;color:#64748b">${pct}%</span>
                        <div style="width:50px;height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden">
                          <div style="height:100%;width:${pct}%;background:${m.color};border-radius:3px"></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  }

  renderStatCard(label, value, icon, color) {
    const colors = {
      primary: 'bg-primary-50 text-primary-600',
      success: 'bg-success-50 text-success-600',
      danger: 'bg-danger-50 text-danger-600',
      warning: 'bg-warning-50 text-warning-600'
    }
    return `
      <div class="card p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-gray-500">${label}</p>
            <p class="text-lg font-bold text-gray-900 mt-1">Rp ${this.formatNumber(value)}</p>
          </div>
          <div class="p-2 rounded-xl ${colors[color]}">
            <i data-lucide="${icon}" class="w-5 h-5"></i>
          </div>
        </div>
      </div>
    `
  }

  renderModal() {
    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold">Tambah Transaksi Kas</h3>
            <button id="close-modal" class="text-gray-400 hover:text-gray-600">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          <div class="flex items-center gap-2 mb-6">
            <button class="type-toggle px-4 py-2 rounded-lg text-sm font-medium ${
              this.transactionType === 'in' ? 'bg-success-50 text-success-600' : 'bg-gray-100 text-gray-500'
            }" data-type="in">
              <i data-lucide="arrow-down-left" class="w-4 h-4 inline"></i> Pemasukan
            </button>
            <button class="type-toggle px-4 py-2 rounded-lg text-sm font-medium ${
              this.transactionType === 'out' ? 'bg-danger-50 text-danger-600' : 'bg-gray-100 text-gray-500'
            }" data-type="out">
              <i data-lucide="arrow-up-right" class="w-4 h-4 inline"></i> Pengeluaran
            </button>
          </div>
          <form id="transaction-form" class="space-y-4">
            <div>
              <label for="category">Kategori</label>
              <select id="category" name="category" required>
                ${this.transactionType === 'in'
                  ? `<option value="sales">Penjualan</option>
                     <option value="other_income">Pendapatan Lain</option>
                     <option value="refund">Refund</option>`
                  : `<option value="purchase">Pembelian Barang</option>
                     <option value="operational">Operasional</option>
                     <option value="salary">Gaji</option>
                     <option value="advertising">Biaya Iklan</option>
                     <option value="platform_fee">Potongan Marketplace</option>
                     <option value="other_expense">Pengeluaran Lain</option>`
                }
              </select>
            </div>
            <div>
              <label for="amount">Jumlah (Rp)</label>
              <input type="number" id="amount" name="amount" required min="1" placeholder="0">
            </div>
            <div>
              <label for="tx-date">Tanggal Transaksi</label>
              <input type="date" id="tx-date" name="tx_date" value="${this.transactionDate}">
            </div>
            <div>
              <label for="description">Deskripsi</label>
              <textarea id="description" name="description" required rows="2" placeholder="Deskripsi transaksi"></textarea>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" id="cancel-modal" class="btn-secondary">Batal</button>
              <button type="submit" class="btn-primary" ${this.loading ? 'disabled' : ''}>
                ${this.loading ? 'Memproses...' : 'Simpan Transaksi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  getFiltered() {
    if (this.activeTab === 'all') return this.transactions
    return this.transactions.filter(t => t.type === this.activeTab)
  }

  calcStats() {
    const { transactions, deposits } = this
    const income = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0)
    const deposit = deposits.reduce((s, d) => s + (d.amount || 0), 0)
    return {
      income,
      expense,
      balance: income - expense,
      profit: income - expense,
      deposit
    }
  }

  getCategoryLabel(cat) {
    const labels = {
      sales: 'Penjualan',
      purchase: 'Pembelian',
      operational: 'Operasional',
      salary: 'Gaji',
      advertising: 'Iklan',
      platform_fee: 'Potongan Marketplace',
      other_income: 'Pendapatan Lain',
      other_expense: 'Pengeluaran Lain',
      refund: 'Refund',
      adjustment: 'Penyesuaian'
    }
    return labels[cat] || cat
  }

  formatNumber(num) {
    return num ? num.toLocaleString('id-ID') : '0'
  }

  formatDate(date) {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', time: 'short', hour: '2-digit', minute: '2-digit' })
  }

  async bindEvents() {
    await this.loadData()
    this.renderAndBind()
  }

  _bindListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab
        this.renderAndBind()
      })
    })

    document.getElementById('date-from')?.addEventListener('change', (e) => {
      this.dateFrom = e.target.value
      this.loadData().then(() => this.renderAndBind())
    })
    document.getElementById('date-to')?.addEventListener('change', (e) => {
      this.dateTo = e.target.value
      this.loadData().then(() => this.renderAndBind())
    })

    document.getElementById('reset-filter')?.addEventListener('click', () => {
      // Reset ke default (30 hari terakhir)
      const now = new Date()
      const dateFrom = new Date(now)
      dateFrom.setDate(dateFrom.getDate() - 30)

      this.dateFrom = dateFrom.toISOString().slice(0, 10)
      this.dateTo = now.toISOString().slice(0, 10)
      this.loadData().then(() => this.renderAndBind())
    })

    document.getElementById('add-transaction-btn')?.addEventListener('click', () => {
      this.showModal = true
      this.transactionType = 'in'
      this.transactionDate = new Date().toISOString().slice(0, 10)
      this.renderAndBind()
    })

    this._bindModalEvents()
  }

  _bindModalEvents() {
    document.querySelectorAll('.type-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        this.transactionType = btn.dataset.type
        this.renderAndBind()
      })
    })

    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.showModal = false
      this.transactionDate = new Date().toISOString().slice(0, 10)
      this.renderAndBind()
    })
    document.getElementById('cancel-modal')?.addEventListener('click', () => {
      this.showModal = false
      this.transactionDate = new Date().toISOString().slice(0, 10)
      this.renderAndBind()
    })
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.showModal = false
        this.transactionDate = new Date().toISOString().slice(0, 10)
        this.renderAndBind()
      }
    })

    const form = document.getElementById('transaction-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      this.loading = true
      this.renderAndBind()
      const formData = new FormData(form)

      const txDate = formData.get('tx_date') || new Date().toISOString().slice(0, 10)
      const txCreatedAt = new Date(txDate + 'T' + new Date().toTimeString().slice(0, 8)).toISOString()

      const { error } = await this.supabase.from('cash_transactions').insert({
        type: this.transactionType,
        category: formData.get('category'),
        amount: parseInt(formData.get('amount')),
        description: formData.get('description'),
        created_by: this.auth.user.id,
        created_at: txCreatedAt
      })

      if (error) {
        alert('Gagal: ' + error.message)
        this.loading = false
        this.renderAndBind()
        return
      }

      this.showModal = false
      this.transactionDate = new Date().toISOString().slice(0, 10)
      this.loading = false
      await this.loadData()
      this.renderAndBind()
    })
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) {
      outlet.innerHTML = this.render()
      this._bindListeners()
      if (window.lucide) window.lucide.createIcons()
    }
  }
}