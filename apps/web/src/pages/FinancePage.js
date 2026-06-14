export class FinancePage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.transactions = []
    this.activeTab = 'all'
    this.showModal = false
    this.transactionType = 'in'
    this.loading = false
    this.dateRange = '30'
  }

  async loadData() {
    const days = parseInt(this.dateRange)
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data } = await this.supabase
      .from('cash_transactions')
      .select('*, created_by_user:users(full_name)')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    this.transactions = data || []
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

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          ${this.renderStatCard('Saldo Kas', stats.balance, 'wallet', stats.balance >= 0 ? 'success' : 'danger')}
          ${this.renderStatCard('Pemasukan (30hr)', stats.income, 'trending-up', 'success')}
          ${this.renderStatCard('Pengeluaran (30hr)', stats.expense, 'trending-down', 'danger')}
          ${this.renderStatCard('Profit (30hr)', stats.profit, 'bar-chart-3', stats.profit >= 0 ? 'primary' : 'danger')}
        </div>

        <div class="flex items-center justify-between">
          <div class="flex gap-2">
            ${['all', 'in', 'out'].map(tab => `
              <button class="tab-btn px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                this.activeTab === tab ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }" data-tab="${tab}">
                ${tab === 'all' ? 'Semua' : tab === 'in' ? 'Pemasukan' : 'Pengeluaran'}
              </button>
            `).join('')}
          </div>
          <select id="date-range" class="w-auto">
            <option value="7" ${this.dateRange === '7' ? 'selected' : ''}>7 Hari</option>
            <option value="30" ${this.dateRange === '30' ? 'selected' : ''}>30 Hari</option>
            <option value="90" ${this.dateRange === '90' ? 'selected' : ''}>90 Hari</option>
            <option value="365" ${this.dateRange === '365' ? 'selected' : ''}>1 Tahun</option>
          </select>
        </div>

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
                    <td class="text-sm text-gray-500 whitespace-nowrap">${this.formatDate(t.created_at)}</td>
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
                    <td class="text-sm text-gray-500">${t.created_by_user?.full_name || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        ${this.showModal ? this.renderModal() : ''}
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
                     <option value="other_expense">Pengeluaran Lain</option>`
                }
              </select>
            </div>
            <div>
              <label for="amount">Jumlah (Rp)</label>
              <input type="number" id="amount" name="amount" required min="1" placeholder="0">
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
    const { transactions } = this
    const income = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0)
    return {
      income,
      expense,
      balance: income - expense,
      profit: income - expense
    }
  }

  getCategoryLabel(cat) {
    const labels = {
      sales: 'Penjualan',
      purchase: 'Pembelian',
      operational: 'Operasional',
      salary: 'Gaji',
      advertising: 'Iklan',
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

    document.getElementById('date-range')?.addEventListener('change', (e) => {
      this.dateRange = e.target.value
      this.loadData().then(() => this.renderAndBind())
    })

    document.getElementById('add-transaction-btn')?.addEventListener('click', () => {
      this.showModal = true
      this.transactionType = 'in'
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
      this.renderAndBind()
    })
    document.getElementById('cancel-modal')?.addEventListener('click', () => {
      this.showModal = false
      this.renderAndBind()
    })
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.showModal = false
        this.renderAndBind()
      }
    })

    const form = document.getElementById('transaction-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      this.loading = true
      this.renderAndBind()
      const formData = new FormData(form)

      const { error } = await this.supabase.from('cash_transactions').insert({
        type: this.transactionType,
        category: formData.get('category'),
        amount: parseInt(formData.get('amount')),
        description: formData.get('description'),
        created_by: this.auth.user.id
      })

      if (error) {
        alert('Gagal: ' + error.message)
        this.loading = false
        this.renderAndBind()
        return
      }

      this.showModal = false
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