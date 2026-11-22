export class DepositPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.deposits = []
    this.selectedCustomer = ''
    this.showModal = false
    this.saving = false
    this.modalError = null
  }

  async loadData() {
    const { data: depositsData } = await this.supabase
      .from('customer_deposits')
      .select('*')
      .order('created_at', { ascending: false })
    
    this.deposits = depositsData || []
  }

  getCustomerBalances() {
    const balances = {}
    this.deposits.forEach(dep => {
      if (!balances[dep.customer_name]) {
        balances[dep.customer_name] = 0
      }
      balances[dep.customer_name] += (dep.amount || 0)
    })
    return balances
  }

  getCustomerHistory(customerName) {
    return this.deposits.filter(dep => dep.customer_name === customerName)
  }

  formatDate(date) {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString('id-ID', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  formatNumber(num) {
    return num ? num.toLocaleString('id-ID') : '0'
  }

  render() {
    const balances = this.getCustomerBalances()
    const customers = Object.keys(balances).sort()
    
    return `
      <div class="dashboard-container">
        <section class="welcome-card mb-6">
          <div>
            <h1 class="text-2xl font-bold text-stone-900 tracking-tight">Deposit Pelanggan</h1>
            <p class="text-sm text-stone-500 mt-1">Kelola dan pantau saldo titipan atau lebih bayar pelanggan</p>
          </div>
          <button id="add-deposit-btn" class="btn-primary">
            <i data-lucide="plus-circle" class="w-4 h-4"></i> Tambah Deposit Baru
          </button>
        </section>

        <section class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="hero-kpi p-5 rounded-xl">
            <span class="text-xs uppercase tracking-wider text-rose-100/90 font-medium">Total Akun Deposit</span>
            <h2 class="text-3xl font-bold tracking-tight text-white my-1 tnum">${customers.length} <span class="text-sm font-normal text-rose-200">pelanggan</span></h2>
            <p class="text-xs text-rose-100/80">Pelanggan dengan riwayat saldo aktif</p>
          </div>
          <div class="card p-5 border border-stone-200/80 flex flex-col justify-between">
            <div class="flex items-center justify-between text-stone-500 mb-2">
              <span class="text-xs font-medium">Total Akumulasi Saldo</span>
              <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <i data-lucide="piggy-bank" class="w-4 h-4"></i>
              </div>
            </div>
            <h3 class="text-2xl font-bold text-stone-900 tnum">Rp ${this.formatNumber(Object.values(balances).reduce((a, b) => a + b, 0))}</h3>
            <p class="text-xs text-stone-400 mt-1 font-medium">Liabilitas saldo titipan berjalan</p>
          </div>
        </section>

        <section class="card p-5 border border-stone-200/80">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-base font-semibold text-stone-900">Saldo Deposit Pelanggan</h3>
              <p class="text-xs text-stone-500">Daftar saldo titipan aktif per pelanggan</p>
            </div>
            <span class="text-xs font-medium text-stone-500">${customers.length} Akun</span>
          </div>
          ${customers.length === 0 ? `
            <div class="p-12 text-center text-stone-400">
              <i data-lucide="piggy-bank" class="w-10 h-10 mx-auto mb-2 text-stone-300"></i>
              <p class="text-sm font-medium text-stone-600">Belum ada catatan deposit</p>
              <p class="text-xs text-stone-400 mt-0.5">Saldo deposit atau lebih bayar pelanggan akan muncul di sini</p>
            </div>
          ` : `
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Pelanggan</th>
                    <th class="text-right">Saldo Deposit</th>
                    <th class="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  ${customers.map(customer => `
                    <tr>
                      <td class="font-medium text-stone-900">${customer}</td>
                      <td class="text-right tnum">
                        <span class="font-bold ${balances[customer] > 0 ? 'text-emerald-700' : balances[customer] < 0 ? 'text-rose-700' : 'text-stone-500'}">
                          Rp ${this.formatNumber(balances[customer])}
                        </span>
                      </td>
                      <td class="text-right">
                        <button class="view-history-btn btn-outline btn-sm inline-flex items-center gap-1.5" data-customer="${customer}">
                          <i data-lucide="history" class="w-3.5 h-3.5"></i> Riwayat
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </section>

        ${this.selectedCustomer ? `
          <section class="card p-5 border border-stone-200/80">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-base font-semibold text-stone-900">Riwayat Deposit - ${this.selectedCustomer}</h3>
                <p class="text-xs text-stone-500">Mutasi saldo titipan dan pemakaian transaksi</p>
              </div>
              <button id="close-history-btn" class="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1">
                <i data-lucide="x" class="w-3.5 h-3.5"></i> Tutup
              </button>
            </div>
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Deskripsi</th>
                    <th class="text-right">Jumlah</th>
                    <th>Referensi</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.getCustomerHistory(this.selectedCustomer).map(dep => `
                    <tr>
                      <td class="text-stone-600 text-xs whitespace-nowrap">${this.formatDate(dep.created_at)}</td>
                      <td class="text-stone-800">${dep.description || '-'}</td>
                      <td class="text-right tnum">
                        <span class="font-bold ${dep.amount > 0 ? 'text-emerald-700' : 'text-rose-700'}">
                          ${dep.amount > 0 ? '+' : ''}Rp ${this.formatNumber(dep.amount)}
                        </span>
                      </td>
                      <td class="text-stone-600 font-mono text-xs">${dep.reference_type || '-'} ${dep.reference_id ? `#${dep.reference_id}` : ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </section>
        ` : ''}

        ${this.showModal ? this.renderModal() : ''}
      </div>
    `
  }

  renderModal() {
    const customers = Object.keys(this.getCustomerBalances()).sort()
    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold" style="color:#111827;">Tambah Deposit Manual</h3>
            <button id="close-modal" class="text-gray-400 hover:text-gray-600" type="button">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          <form id="deposit-form" class="space-y-4">
            ${this.modalError ? `
              <div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
                ${this.modalError}
              </div>
            ` : ''}
            <div>
              <label for="customer_name" style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;">Nama Pelanggan</label>
              <input type="text" id="customer_name" name="customer_name" list="customer-list" required placeholder="Nama pelanggan" style="width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px;">
              <datalist id="customer-list">
                ${customers.map(c => `<option value="${c}">`).join('')}
              </datalist>
              <p style="font-size:12px; color:#9ca3af; margin-top:4px;">Pilih pelanggan yang sudah ada atau ketik nama baru</p>
            </div>
            <div>
              <label for="amount" style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;">Jumlah Deposit (Rp)</label>
              <input type="number" id="amount" name="amount" required min="1" placeholder="0" style="width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px;">
            </div>
            <div>
              <label for="description" style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;">Deskripsi <span style="font-weight:400; color:#9ca3af;">(opsional)</span></label>
              <textarea id="description" name="description" rows="2" placeholder="Contoh: Titipan saldo untuk pembelian berikutnya" style="width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; resize:vertical;"></textarea>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100" style="border-color:#f1f5f9;">
              <button type="button" id="cancel-modal" class="btn-secondary">Batal</button>
              <button type="submit" class="btn-primary" ${this.saving ? 'disabled' : ''} style="display:inline-flex; align-items:center; gap:8px;">
                ${this.saving ? 'Memproses...' : 'Simpan Deposit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) {
      outlet.innerHTML = this.render()
    }
    if (window.lucide) window.lucide.createIcons()
    this._bindListeners()
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
  
  _bindListeners() {
    document.querySelectorAll('.view-history-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedCustomer = btn.dataset.customer
        this.renderAndBind()
      })
    })

    document.getElementById('close-history-btn')?.addEventListener('click', () => {
      this.selectedCustomer = null
      this.renderAndBind()
    })

    document.getElementById('add-deposit-btn')?.addEventListener('click', () => {
      this.showModal = true
      this.saving = false
      this.renderAndBind()
    })

    this._bindModalListeners()
  }

  _bindModalListeners() {
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

    const form = document.getElementById('deposit-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      if (this.saving) return

      const formData = new FormData(form)
      const customerName = formData.get('customer_name')?.toString().trim()
      const amount = parseInt(formData.get('amount'))
      const description = formData.get('description')?.toString().trim()

      if (!customerName) {
        this.modalError = 'Nama pelanggan wajib diisi'
        this.renderAndBind()
        return
      }
      if (!amount || amount <= 0) {
        this.modalError = 'Jumlah deposit harus lebih dari 0'
        this.renderAndBind()
        return
      }
      this.modalError = null

      this.saving = true
      this.renderAndBind()

      const { error } = await this.supabase.from('customer_deposits').insert({
        customer_name: customerName,
        amount,
        description: description || 'Tambah deposit manual',
        reference_type: 'manual',
        created_by: this.auth.user?.id || null
      })

      if (error) {
        alert('Gagal menyimpan deposit: ' + error.message)
        this.saving = false
        this.renderAndBind()
        return
      }

      this.saving = false
      this.showModal = false
      this.selectedCustomer = customerName
      await this.loadData()
      this.renderAndBind()
    })
  }
}
