export class SettingsPage {
  constructor({ supabase, auth, router }) {
    this.supabase = supabase
    this.auth = auth
    this.router = router
    this.paymentMethods = []
    this.showModal = false
    this.editingPayment = null
    this.loading = false
  }

  async loadData() {
    const { data } = await this.supabase
      .from('payment_methods')
      .select('*')
      .order('sort_order')
    this.paymentMethods = data || []
  }

  render() {
    const role = this.auth.getRole()
    const isOwnerOrAdmin = role === 'owner' || role === 'admin'

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold" style="color:#0f172a">Pengaturan</h2>
        </div>

        <div class="flex items-center gap-2" style="border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:16px">
          <a href="#/settings" class="tab-btn" style="padding:6px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none;background:#7A3B58;color:#fff">Metode Pembayaran</a>
          ${role === 'owner' ? '<a href="#/settings/roles" class="tab-btn" style="padding:6px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none;color:#64748b;background:transparent">Atur Peran</a>' : ''}
        </div>

        <div class="card">
          <div class="flex items-center justify-between p-4" style="border-bottom:1px solid #f1f5f9">
            <h3 class="font-semibold" style="color:#0f172a;font-size:14px">Metode Pembayaran</h3>
            ${isOwnerOrAdmin ? `
              <button id="add-payment-btn" class="btn-primary" style="padding:6px 12px;font-size:12px">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Tambah Metode
              </button>
            ` : ''}
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama</th>
                  <th>Warna</th>
                  <th>Urutan</th>
                  <th>Status</th>
                  ${isOwnerOrAdmin ? '<th style="text-align:center">Aksi</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${this.paymentMethods.length === 0 ? `
                  <tr><td colspan="${isOwnerOrAdmin ? 6 : 5}" class="text-center" style="color:#94a3b8;padding:24px">Belum ada metode pembayaran</td></tr>
                ` : this.paymentMethods.map(pm => `
                  <tr>
                    <td><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11px">${pm.code}</code></td>
                    <td style="font-weight:500">${pm.name}</td>
                    <td>
                      <span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${pm.color || '#94a3b8'};vertical-align:middle;margin-right:4px"></span>
                      <span style="font-size:12px;color:#64748b">${pm.color || '-'}</span>
                    </td>
                    <td>${pm.sort_order}</td>
                    <td>
                      <span class="badge ${pm.is_active ? 'badge-tunai' : ''}" style="${pm.is_active ? '' : 'background:#f1f5f9;color:#94a3b8'}">
                        ${pm.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    ${isOwnerOrAdmin ? `
                      <td style="text-align:center">
                        <button class="edit-payment-btn action-btn" data-id="${pm.id}" title="Edit" style="border:none;background:none;cursor:pointer;color:#7A3B58;padding:4px">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      </td>
                    ` : ''}
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
    const pm = this.editingPayment || { code: '', name: '', color: '#7A3B58', sort_order: this.paymentMethods.length + 1, is_active: true }
    const isEdit = !!this.editingPayment

    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content p-6" style="max-width:480px;border-radius:14px">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold" style="font-size:16px;font-weight:700;color:#0f172a">${isEdit ? 'Edit' : 'Tambah'} Metode Pembayaran</h3>
            <button id="close-modal" style="border:none;background:none;cursor:pointer;color:#94a3b8">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <form id="payment-form" class="space-y-4">
            <div>
              <label for="pm-code" style="font-size:12px;font-weight:600;color:#334155">Kode</label>
              <input type="text" id="pm-code" name="code" value="${pm.code}" required placeholder="cash, qris, bank_transfer..." ${isEdit ? 'readonly style="background:#f8fafc;color:#94a3b8"' : ''} style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px">
            </div>
            <div>
              <label for="pm-name" style="font-size:12px;font-weight:600;color:#334155">Nama</label>
              <input type="text" id="pm-name" name="name" value="${pm.name}" required placeholder="Tunai, QRIS..." style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px">
            </div>
            <div>
              <label for="pm-color" style="font-size:12px;font-weight:600;color:#334155">Warna Badge</label>
              <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
                <input type="color" id="pm-color" name="color" value="${pm.color || '#7A3B58'}" style="width:40px;height:36px;border:1px solid #e2e8f0;border-radius:6px;padding:2px;cursor:pointer">
                <span id="color-hex" style="font-size:12px;color:#64748b">${pm.color || '#7A3B58'}</span>
              </div>
            </div>
            <div>
              <label for="pm-sort" style="font-size:12px;font-weight:600;color:#334155">Urutan</label>
              <input type="number" id="pm-sort" name="sort_order" value="${pm.sort_order}" min="1" style="width:80px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px">
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" id="pm-active" name="is_active" ${pm.is_active ? 'checked' : ''} style="width:16px;height:16px;accent-color:#7A3B58">
              <label for="pm-active" style="font-size:13px;color:#334155">Aktif</label>
            </div>
            <div class="flex justify-end gap-3 pt-4" style="border-top:1px solid #f1f5f9">
              <button type="button" id="cancel-modal" class="btn-secondary" style="padding:7px 16px;font-size:13px">Batal</button>
              <button type="submit" class="btn-primary" ${this.loading ? 'disabled' : ''} style="padding:7px 16px;font-size:13px">
                ${this.loading ? 'Memproses...' : `${isEdit ? 'Simpan' : 'Tambah'}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  async bindEvents() {
    await this.loadData()
    this.renderAndBind()
  }

  _bindListeners() {
    document.getElementById('add-payment-btn')?.addEventListener('click', () => {
      this.editingPayment = null
      this.showModal = true
      this.renderAndBind()
    })

    document.querySelectorAll('.edit-payment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.editingPayment = this.paymentMethods.find(p => p.id === btn.dataset.id)
        this.showModal = true
        this.renderAndBind()
      })
    })

    this._bindModalEvents()
  }

  _bindModalEvents() {
    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.showModal = false; this.renderAndBind()
    })
    document.getElementById('cancel-modal')?.addEventListener('click', () => {
      this.showModal = false; this.renderAndBind()
    })
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) { this.showModal = false; this.renderAndBind() }
    })

    document.getElementById('pm-color')?.addEventListener('input', (e) => {
      document.getElementById('color-hex').textContent = e.target.value
    })

    const form = document.getElementById('payment-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      this.loading = true
      this.renderAndBind()
      const formData = new FormData(form)
      const isEdit = !!this.editingPayment
      const payload = {
        code: formData.get('code'),
        name: formData.get('name'),
        color: formData.get('color'),
        sort_order: parseInt(formData.get('sort_order')) || 1,
        is_active: formData.has('is_active')
      }

      let error
      if (isEdit) {
        const { error: e } = await this.supabase.from('payment_methods').update(payload).eq('id', this.editingPayment.id)
        error = e
      } else {
        const { error: e } = await this.supabase.from('payment_methods').insert(payload)
        error = e
      }

      if (error) { alert('Gagal: ' + error.message); this.loading = false; this.renderAndBind(); return }

      this.showModal = false; this.loading = false
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
