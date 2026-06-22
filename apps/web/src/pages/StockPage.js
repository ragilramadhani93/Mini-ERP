export class StockPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.movements = []
    this.products = []
    this.activeTab = 'in'
    this.showModal = false
    this.loading = false
  }

  async loadData() {
    const [movementsRes, productsRes] = await Promise.all([
      this.supabase.from('stock_movements')
        .select('*, products(name, sku), created_by_user:users(full_name)')
        .order('created_at', { ascending: false })
        .limit(50),
      this.supabase.from('products')
        .select('id, sku, name, current_stock')
        .order('name')
    ])
    this.movements = movementsRes.data || []
    this.products = productsRes.data || []
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
          <button id="add-stock-btn" class="btn-primary">
            <i data-lucide="plus" class="w-5 h-5"></i> Tambah Stok Masuk
          </button>
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

        ${this.showModal ? this.renderModal() : ''}
      </div>
    `
  }

  renderModal() {
    const reasonsIn = [
      { value: 'purchase', label: 'Pembelian Barang' },
      { value: 'return_in', label: 'Retur Customer Masuk' },
      { value: 'adjustment', label: 'Penyesuaian Stok' }
    ]

    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold">Tambah Stok Masuk</h3>
            <button id="close-modal" class="text-gray-400 hover:text-gray-600">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          <div class="p-3 bg-success-50 rounded-lg text-sm mb-6">
            <span class="text-success-700">Stok akan bertambah sesuai jumlah yang dimasukkan.</span>
          </div>
          <form id="stock-form" class="space-y-4">
            <div>
              <label for="product_id">Produk</label>
              <select id="product_id" name="product_id" required>
                <option value="">Pilih produk</option>
                ${this.products.map(p => `
                  <option value="${p.id}">${p.sku} - ${p.name} (Stok: ${p.current_stock})</option>
                `).join('')}
              </select>
            </div>
            <div>
              <label for="reason">Alasan</label>
              <select id="reason" name="reason" required>
                ${reasonsIn.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label for="quantity">Jumlah</label>
              <input type="number" id="quantity" name="quantity" required min="1" placeholder="0">
            </div>
            <div>
              <label for="notes">Catatan</label>
              <textarea id="notes" name="notes" rows="2" placeholder="Catatan (opsional)"></textarea>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" id="cancel-modal" class="btn-secondary">Batal</button>
              <button type="submit" class="btn-primary" ${this.loading ? 'disabled' : ''}>
                ${this.loading ? 'Memproses...' : 'Simpan'}
              </button>
            </div>
          </form>
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

    document.getElementById('add-stock-btn')?.addEventListener('click', () => {
      this.showModal = true
      this.renderAndBind()
    })

    this._bindModalEvents()
  }

  _bindModalEvents() {
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

    const form = document.getElementById('stock-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      this.loading = true
      this.renderAndBind()
      const formData = new FormData(form)

      const { error } = await this.supabase.rpc('add_stock_movement', {
        p_product_id: formData.get('product_id'),
        p_quantity: parseInt(formData.get('quantity')),
        p_type: 'in',
        p_reason: formData.get('reason'),
        p_notes: formData.get('notes') || null,
        p_created_by: this.auth.user.id
      })

      if (error) {
        alert('Gagal menyimpan: ' + error.message)
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
    }
    this._bindListeners()
    if (window.lucide) window.lucide.createIcons()
  }
}