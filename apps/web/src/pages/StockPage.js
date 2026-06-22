export class StockPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.movements = []
    this.activeTab = 'in'
  }

  async loadData() {
    const { data: movements } = await this.supabase.from('stock_movements')
      .select('*, products(name, sku), created_by_user:users(full_name)')
      .order('created_at', { ascending: false })
      .limit(50)
    this.movements = movements || []
  }

  render() {
    const filtered = this.activeTab === 'in'
      ? this.movements.filter(m => m.type === 'in')
      : this.activeTab === 'out'
        ? this.movements.filter(m => m.type === 'out')
        : this.movements

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Riwayat Stok</h2>
        </div>

        <div class="border-b border-gray-200">
          <nav class="flex gap-4 -mb-px">
            <button class="tab-btn pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              this.activeTab === 'in' ? 'text-primary-600 border-primary-600' : 'text-gray-500 border-transparent hover:text-gray-700'
            }" data-tab="in">
              <i data-lucide="arrow-down-left" class="w-4 h-4 inline"></i> Stok Masuk
            </button>
            <button class="tab-btn pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              this.activeTab === 'out' ? 'text-primary-600 border-primary-600' : 'text-gray-500 border-transparent hover:text-gray-700'
            }" data-tab="out">
              <i data-lucide="arrow-up-right" class="w-4 h-4 inline"></i> Stok Keluar
            </button>
            <button class="tab-btn pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              this.activeTab === 'all' ? 'text-primary-600 border-primary-600' : 'text-gray-500 border-transparent hover:text-gray-700'
            }" data-tab="all">
              <i data-lucide="list" class="w-4 h-4 inline"></i> Semua Riwayat
            </button>
          </nav>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Produk</th>
                  <th>SKU</th>
                  <th>Tipe</th>
                  <th>Alasan</th>
                  <th class="text-right">Qty</th>
                  <th>Oleh</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr><td colspan="7" class="text-center text-gray-500 py-8">Belum ada pergerakan stok</td></tr>
                ` : filtered.map(m => `
                  <tr>
                    <td class="text-sm text-gray-500 whitespace-nowrap">${this.formatDate(m.created_at)}</td>
                    <td class="font-medium">${m.products?.name || '-'}</td>
                    <td class="font-mono text-xs">${m.products?.sku || '-'}</td>
                    <td>
                      <span class="badge ${m.type === 'in' ? 'badge-success' : 'badge-danger'}">
                        ${m.type === 'in' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td>${this.getReasonLabel(m.reason)}</td>
                    <td class="text-right font-semibold">${m.type === 'in' ? '+' : '-'}${m.quantity}</td>
                    <td class="text-sm text-gray-500">${m.created_by_user?.full_name || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
  }

  getReasonLabel(reason) {
    const labels = {
      purchase: 'Pembelian',
      sale: 'Penjualan',
      return_in: 'Retur Masuk',
      return_out: 'Retur Keluar',
      damage: 'Barang Rusak',
      adjustment: 'Penyesuaian',
      opname: 'Stock Opname'
    }
    return labels[reason] || reason
  }

  formatDate(date) {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', time: 'short', hour: '2-digit', minute: '2-digit' })
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
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) {
      outlet.innerHTML = this.render()
    }
    this._bindListeners()
    if (window.lucide) window.lucide.createIcons()
  }
}