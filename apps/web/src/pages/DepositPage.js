export class DepositPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.deposits = []
    this.selectedCustomer = ''
    this.showModal = false
    this.saving = false
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
        <section class="welcome-card">
          <div>
            <h1 style="font-size:24px; font-weight:700; color:#111827;">💰 Deposit Pelanggan</h1>
            <p style="font-size:14px; color:#6b7280; margin-top:4px;">Kelola dan pantau deposit pelanggan</p>
          </div>
          <button id="add-deposit-btn" class="btn-primary" style="display:inline-flex; align-items:center; gap:8px; white-space:nowrap;">
            <i data-lucide="plus" class="w-5 h-5"></i> Tambah Deposit
          </button>
        </section>

        <section class="kpi-grid">
          <div class="hero-kpi">
            <span>Total Pelanggan dengan Deposit</span>
            <h2>${customers.length}</h2>
          </div>
          <div class="mini-kpi">
            <span>Total Semua Deposit</span>
            <h3>Rp ${this.formatNumber(Object.values(balances).reduce((a, b) => a + b, 0))}</h3>
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <h3>Saldo Deposit Pelanggan</h3>
          </div>
          ${customers.length === 0 ? `
            <p style="color:#9ca3af; text-align:center; padding:40px 0;">Belum ada deposit</p>
          ` : `
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom:1px solid #e5e7eb;">
                    <th style="text-align:left; padding:12px 8px; font-size:12px; color:#6b7280; font-weight:600;">Pelanggan</th>
                    <th style="text-align:right; padding:12px 8px; font-size:12px; color:#6b7280; font-weight:600;">Saldo Deposit</th>
                    <th style="text-align:center; padding:12px 8px; font-size:12px; color:#6b7280; font-weight:600;">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  ${customers.map(customer => `
                    <tr style="border-bottom:1px solid #f3f4f6;">
                      <td style="padding:12px 8px; font-weight:600;">${customer}</td>
                      <td style="padding:12px 8px; text-align:right;">
                        <span style="${balances[customer] > 0 ? 'color:#16a34a;' : balances[customer] < 0 ? 'color:#ef4444;' : 'color:#6b7280;'} font-weight:700;">
                          Rp ${this.formatNumber(balances[customer])}
                        </span>
                      </td>
                      <td style="padding:12px 8px; text-align:center;">
                        <button class="view-history-btn" data-customer="${customer}" style="background:#7A3B58; color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600;">
                          Lihat Riwayat
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
          <section class="card">
            <div class="card-header">
              <h3>Riwayat Deposit - ${this.selectedCustomer}</h3>
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom:1px solid #e5e7eb;">
                    <th style="text-align:left; padding:12px 8px; font-size:12px; color:#6b7280; font-weight:600;">Tanggal</th>
                    <th style="text-align:left; padding:12px 8px; font-size:12px; color:#6b7280; font-weight:600;">Deskripsi</th>
                    <th style="text-align:right; padding:12px 8px; font-size:12px; color:#6b7280; font-weight:600;">Jumlah</th>
                    <th style="text-align:left; padding:12px 8px; font-size:12px; color:#6b7280; font-weight:600;">Referensi</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.getCustomerHistory(this.selectedCustomer).map(dep => `
                    <tr style="border-bottom:1px solid #f3f4f6;">
                      <td style="padding:12px 8px;">${this.formatDate(dep.created_at)}</td>
                      <td style="padding:12px 8px;">${dep.description || '-'}</td>
                      <td style="padding:12px 8px; text-align:right;">
                        <span style="${dep.amount > 0 ? 'color:#16a34a;' : 'color:#ef4444;'} font-weight:700;">
                          ${dep.amount > 0 ? '+' : ''}Rp ${this.formatNumber(dep.amount)}
                        </span>
                      </td>
                      <td style="padding:12px 8px;">${dep.reference_type || '-'} ${dep.reference_id ? `#${dep.reference_id}` : ''}</td>
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
        alert('Nama pelanggan wajib diisi')
        return
      }
      if (!amount || amount <= 0) {
        alert('Jumlah deposit harus lebih dari 0')
        return
      }

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
