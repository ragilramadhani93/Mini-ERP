export class DebtPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.payables = []
    this.suppliers = []
    this.purchases = []
    this.showModal = false
    this.payingDebt = null
    this.activeTab = 'supplier'
    this.loading = false
    this.editingDebt = null
  }

  async loadData() {
    const [payablesRes, suppliersRes, purchasesRes] = await Promise.all([
      this.supabase.from('payables').select('*').order('created_at', { ascending: false }).limit(50),
      this.supabase.from('suppliers').select('id, supplier_name').order('supplier_name'),
      this.supabase.from('purchases').select('id, po_number, total_amount, status, suppliers(supplier_name)').order('created_at', { ascending: false })
    ])
    this.payables = payablesRes.data || []
    this.suppliers = suppliersRes.data || []
    this.purchases = purchasesRes.data || []
  }

  render() {
    const filtered = this.activeTab === 'supplier' ? this.payables.filter(p => p.due_type === 'supplier') : this.payables.filter(p => p.due_type === 'customer')

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Hutang & Piutang</h2>
            <p class="text-sm text-gray-500">Total hutang: Rp ${this.formatNumber(this.calcTotal('supplier'))} • Piutang: Rp ${this.formatNumber(this.calcTotal('customer'))}</p>
          </div>
          <button id="add-debt-btn" class="btn-primary">
            <i data-lucide="plus" class="w-5 h-5"></i> Tambah Hutang/Piutang
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${this.renderStatCard('Hutang Supplier', this.calcTotal('supplier'), this.payables.filter(p => p.due_type === 'supplier' && p.status !== 'paid').length, 'truck', 'danger')}
          ${this.renderStatCard('Piutang Customer', this.calcTotal('customer'), this.payables.filter(p => p.due_type === 'customer' && p.status !== 'paid').length, 'users', 'warning')}
          ${this.renderStatCard('Tertagih', this.calcPaid(), 0, 'check-circle', 'success')}
        </div>

        <div class="flex gap-2">
          <button class="tab-btn px-4 py-2 rounded-lg text-sm font-medium ${this.activeTab === 'supplier' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}" data-tab="supplier">
            <i data-lucide="truck" class="w-4 h-4 inline"></i> Hutang Supplier
          </button>
          <button class="tab-btn px-4 py-2 rounded-lg text-sm font-medium ${this.activeTab === 'customer' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}" data-tab="customer">
            <i data-lucide="users" class="w-4 h-4 inline"></i> Piutang Customer
          </button>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Referensi</th>
                  <th>${this.activeTab === 'supplier' ? 'Supplier' : 'Customer'}</th>
                  <th class="text-right">Total</th>
                  <th class="text-right">Terbayar</th>
                  <th class="text-right">Sisa</th>
                  <th>Jatuh Tempo</th>
                  <th>Status</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="8" class="text-center py-12 text-stone-400">
                      <i data-lucide="receipt" class="w-8 h-8 mx-auto mb-2 text-stone-300"></i>
                      <p class="text-sm font-medium text-stone-600">Belum ada catatan ${this.activeTab === 'supplier' ? 'hutang supplier' : 'piutang customer'}</p>
                      <p class="text-xs text-stone-400 mt-0.5">Daftar jatuh tempo dan pembayaran akan ditampilkan di sini</p>
                    </td>
                  </tr>
                ` : filtered.map(p => {
                  const remaining = p.amount - p.paid_amount
                  const isOverdue = new Date(p.due_date) < new Date() && p.status !== 'paid'
                  return `
                    <tr class="${isOverdue ? 'bg-danger-50/30' : ''}">
                      <td class="font-mono text-xs">${p.reference_type === 'purchase' ? `#${this.getPoNumber(p.reference_id)}` : 'Manual'}</td>
                      <td class="font-medium text-stone-900">${this.getDueName(p)}</td>
                      <td class="text-right font-semibold tnum">Rp ${this.formatNumber(p.amount)}</td>
                      <td class="text-right tnum">Rp ${this.formatNumber(p.paid_amount)}</td>
                      <td class="text-right font-semibold tnum ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}">Rp ${this.formatNumber(remaining)}</td>
                      <td class="text-sm whitespace-nowrap ${isOverdue ? 'text-danger-600 font-semibold' : ''}">
                        <div class="flex items-center gap-1.5">
                          <span>${this.formatDate(p.due_date)}</span>
                          ${isOverdue ? '<span class="inline-flex items-center gap-0.5 text-xs text-danger-600 font-semibold"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> Lewat</span>' : ''}
                        </div>
                      </td>
                      <td><span class="badge ${p.status === 'paid' ? 'badge-success' : p.status === 'partial' ? 'badge-warning' : 'badge-danger'}">
                        ${p.status === 'paid' ? 'Lunas' : p.status === 'partial' ? 'Sebagian' : 'Pending'}
                      </span></td>
                      <td class="text-right">
                        ${p.status !== 'paid' ? `
                          <button class="btn-success btn-sm pay-debt" data-id="${p.id}">
                            <i data-lucide="check" class="w-4 h-4"></i> Bayar
                          </button>
                        ` : ''}
                      </td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        ${this.showModal ? this.renderModal() : ''}
        ${this.payingDebt ? this.renderPayModal() : ''}
      </div>
    `
  }

  renderPayModal() {
    const debt = this.payingDebt
    const remaining = debt.amount - debt.paid_amount
    return `
      <div class="modal-overlay" id="pay-modal-overlay">
        <div class="modal-content p-6" style="max-width: 440px;">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Pembayaran</h3>
            <button id="close-pay-modal" class="text-gray-400 hover:text-gray-600"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form id="pay-form" class="space-y-4">
            <div>
              <p class="text-xs text-gray-500 mb-1">Pihak Terkait</p>
              <p class="font-medium text-gray-800">${this.getDueName(debt)}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Sisa Pembayaran</p>
              <p class="font-semibold text-danger-600">Rp ${this.formatNumber(remaining)}</p>
            </div>
            <div>
              <label for="pay-amount">Nominal Pembayaran (Rp)</label>
              <input type="number" id="pay-amount" name="pay-amount" required min="1" max="${remaining}" value="${remaining}" class="w-full text-base font-semibold">
            </div>
            <div class="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button type="button" id="cancel-pay-modal" class="btn-secondary">Batal</button>
              <button type="submit" class="btn-success">Konfirmasi Bayar</button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  renderStatCard(label, total, count, icon, color) {
    const colors = { success: 'bg-success-50 text-success-600', danger: 'bg-danger-50 text-danger-600', warning: 'bg-warning-50 text-warning-600', info: 'bg-primary-50 text-primary-600' }
    return `
      <div class="card p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-gray-500">${label}</p>
            <p class="text-lg font-bold text-gray-900 mt-1">Rp ${this.formatNumber(total)}</p>
            <p class="text-xs text-gray-500">${count} outstanding</p>
          </div>
          <div class="p-2 rounded-xl ${colors[color]}"><i data-lucide="${icon}" class="w-5 h-5"></i></div>
        </div>
      </div>
    `
  }

  renderModal() {
    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold">Tambah Hutang/Piutang</h3>
            <button id="close-modal" class="text-gray-400 hover:text-gray-600"><i data-lucide="x" class="w-6 h-6"></i></button>
          </div>
          <form id="debt-form" class="space-y-4">
            <div>
              <label for="due_type">Tipe</label>
              <select id="due_type" name="due_type" required>
                <option value="supplier">Hutang Supplier</option>
                <option value="customer">Piutang Customer</option>
              </select>
            </div>
            <div id="due-select-container">
              <label for="due_id">Supplier</label>
              <select id="due_id" name="due_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Pilih</option>
                ${this.suppliers.map(s => `<option value="${s.id}">${s.supplier_name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label for="reference_type">Referensi</label>
              <select id="reference_type" name="reference_type">
                <option value="">Tidak ada</option>
                <option value="purchase">Purchase Order</option>
              </select>
            </div>
            <div>
              <label for="amount">Jumlah (Rp)</label>
              <input type="number" id="amount" name="amount" required min="1" placeholder="0">
            </div>
            <div>
              <label for="due_date">Jatuh Tempo</label>
              <input type="date" id="due_date" name="due_date" required>
            </div>
            <div>
              <label for="description">Keterangan</label>
              <textarea id="description" name="description" rows="2" placeholder="Keterangan"></textarea>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" id="cancel-modal" class="btn-secondary">Batal</button>
              <button type="submit" class="btn-primary" ${this.loading ? 'disabled' : ''}>${this.loading ? 'Memproses...' : 'Simpan'}</button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  calcTotal(type) {
    return this.payables.filter(p => p.due_type === type && p.status !== 'paid')
      .reduce((s, p) => s + (p.amount - p.paid_amount), 0)
  }

  calcPaid() {
    return this.payables.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  }

  getDueName(p) {
    if (p.due_type === 'supplier') {
      const s = this.suppliers.find(sp => sp.id === p.due_id)
      return s?.supplier_name || '-'
    }
    return `Customer #${p.due_id?.slice(0, 8) || '-'}`
  }

  getPoNumber(id) {
    const po = this.purchases.find(p => p.id === id)
    return po?.po_number || '-'
  }

  formatNumber(num) { return num ? num.toLocaleString('id-ID') : '0' }
  formatDate(date) {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  async bindEvents() {
    await this.loadData()
    this.renderAndBind()
  }

  _bindListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => { this.activeTab = btn.dataset.tab; this.renderAndBind() })
    })

    document.getElementById('add-debt-btn')?.addEventListener('click', () => {
      this.showModal = true; this.renderAndBind()
    })

    document.querySelectorAll('.pay-debt').forEach(btn => {
      btn.addEventListener('click', () => {
        const debt = this.payables.find(p => p.id === btn.dataset.id)
        if (!debt) return
        this.payingDebt = debt
        this.renderAndBind()
      })
    })

    this._bindModalEvents()
  }

  _bindModalEvents() {
    const onModalKeydown = (e) => {
      if (e.key === 'Escape') {
        if (this.showModal || this.payingDebt) {
          this.showModal = false
          this.payingDebt = null
          document.removeEventListener('keydown', onModalKeydown)
          this.renderAndBind()
        }
      }
    }
    document.addEventListener('keydown', onModalKeydown)

    document.getElementById('close-modal')?.addEventListener('click', () => {
      document.removeEventListener('keydown', onModalKeydown)
      this.showModal = false
      this.renderAndBind()
    })
    document.getElementById('cancel-modal')?.addEventListener('click', () => {
      document.removeEventListener('keydown', onModalKeydown)
      this.showModal = false
      this.renderAndBind()
    })
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        document.removeEventListener('keydown', onModalKeydown)
        this.showModal = false
        this.renderAndBind()
      }
    })

    document.getElementById('close-pay-modal')?.addEventListener('click', () => {
      document.removeEventListener('keydown', onModalKeydown)
      this.payingDebt = null
      this.renderAndBind()
    })
    document.getElementById('cancel-pay-modal')?.addEventListener('click', () => {
      document.removeEventListener('keydown', onModalKeydown)
      this.payingDebt = null
      this.renderAndBind()
    })
    document.getElementById('pay-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        document.removeEventListener('keydown', onModalKeydown)
        this.payingDebt = null
        this.renderAndBind()
      }
    })

    const payForm = document.getElementById('pay-form')
    payForm?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const debt = this.payingDebt
      if (!debt) return
      const payAmount = parseInt(document.getElementById('pay-amount')?.value) || 0
      if (payAmount <= 0) return

      const newPaid = debt.paid_amount + payAmount
      const newStatus = newPaid >= debt.amount ? 'paid' : 'partial'

      await this.supabase.from('payables').update({ paid_amount: newPaid, status: newStatus }).eq('id', debt.id)
      await this.supabase.from('cash_transactions').insert({
        type: 'out',
        category: 'purchase',
        amount: payAmount,
        description: `Pembayaran hutang: ${this.getDueName(debt)}`,
        created_by: this.auth.user.id
      })
      this.payingDebt = null
      await this.loadData()
      this.renderAndBind()
    })

    const form = document.getElementById('debt-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault(); this.loading = true; this.renderAndBind()
      const fd = new FormData(form)
      const { error } = await this.supabase.from('payables').insert({
        due_type: fd.get('due_type'),
        due_id: fd.get('due_id') || null,
        reference_type: fd.get('reference_type') || null,
        amount: parseInt(fd.get('amount')),
        due_date: fd.get('due_date'),
        description: fd.get('description') || null
      })
      if (error) { alert('Gagal: ' + error.message); this.loading = false; this.renderAndBind(); return }
      this.showModal = false; this.loading = false
      await this.loadData(); this.renderAndBind()
    })
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) { outlet.innerHTML = this.render() }
    this._bindListeners()
    if (window.lucide) window.lucide.createIcons()
  }
}