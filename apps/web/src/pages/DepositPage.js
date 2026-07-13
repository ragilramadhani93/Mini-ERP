export class DepositPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.deposits = []
    this.selectedCustomer = ''
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
  }
}
