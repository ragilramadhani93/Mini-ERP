export class AssetsPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.assets = []
    this.showModal = false
    this.loading = false
    this.editingAsset = null
    this.activeFilter = 'all'
  }

  async loadData() {
    const { data } = await this.supabase.from('assets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    this.assets = data || []
  }

  render() {
    const totalValue = this.assets
      .filter(a => a.status === 'active')
      .reduce((s, a) => s + (a.acquisition_value || 0), 0)

    const filtered = this.activeFilter === 'all'
      ? this.assets
      : this.assets.filter(a => a.status === this.activeFilter)

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Aset Perusahaan</h2>
            <p class="text-sm text-gray-500">Total nilai aset aktif: Rp ${this.formatNumber(totalValue)}</p>
          </div>
          <button id="add-asset-btn" class="btn-primary">
            <i data-lucide="plus" class="w-5 h-5"></i> Tambah Aset
          </button>
        </div>

        <div class="flex gap-2">
          <button class="filter-btn px-4 py-2 rounded-lg text-sm font-medium ${this.activeFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}" data-filter="all">
            <i data-lucide="list" class="w-4 h-4 inline"></i> Semua (${this.assets.length})
          </button>
          <button class="filter-btn px-4 py-2 rounded-lg text-sm font-medium ${this.activeFilter === 'active' ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-600'}" data-filter="active">
            <i data-lucide="check-circle" class="w-4 h-4 inline"></i> Aktif
          </button>
          <button class="filter-btn px-4 py-2 rounded-lg text-sm font-medium ${this.activeFilter === 'sold' ? 'bg-warning-500 text-white' : 'bg-gray-100 text-gray-600'}" data-filter="sold">
            <i data-lucide="tag" class="w-4 h-4 inline"></i> Terjual
          </button>
          <button class="filter-btn px-4 py-2 rounded-lg text-sm font-medium ${this.activeFilter === 'written_off' ? 'bg-danger-500 text-white' : 'bg-gray-100 text-gray-600'}" data-filter="written_off">
            <i data-lucide="trash-2" class="w-4 h-4 inline"></i> Dihapuskan
          </button>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Nama Aset</th>
                  <th>Jenis</th>
                  <th class="text-right">Nilai Perolehan</th>
                  <th>Tanggal Perolehan</th>
                  <th>Lokasi</th>
                  <th>Status</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr><td colspan="7" class="text-center text-gray-500 py-8">Belum ada aset</td></tr>
                ` : filtered.map(a => `
                  <tr>
                    <td class="font-medium">${a.name}</td>
                    <td><span class="badge badge-info">${this.getTypeLabel(a.type)}</span></td>
                    <td class="text-right font-semibold">Rp ${this.formatNumber(a.acquisition_value)}</td>
                    <td class="text-sm whitespace-nowrap">${this.formatDate(a.acquisition_date)}</td>
                    <td class="text-sm text-gray-500">${a.location || '-'}</td>
                    <td>${this.renderStatus(a.status)}</td>
                    <td class="text-right">
                      <div class="flex gap-1 justify-end">
                        <button class="btn-outline btn-sm edit-asset" data-id="${a.id}">
                          <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button class="btn-danger btn-sm delete-asset" data-id="${a.id}">
                          <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                      </div>
                    </td>
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

  renderStatus(status) {
    const map = {
      active: '<span class="badge badge-success">Aktif</span>',
      sold: '<span class="badge badge-warning">Terjual</span>',
      written_off: '<span class="badge badge-danger">Dihapuskan</span>'
    }
    return map[status] || status
  }

  renderModal() {
    const a = this.editingAsset
    const types = ['peralatan', 'kendaraan', 'bangunan', 'inventaris', 'elektronik', 'digital', 'lainnya']

    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold">${a ? 'Edit Aset' : 'Tambah Aset'}</h3>
            <button id="close-modal" class="text-gray-400 hover:text-gray-600">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          <form id="asset-form" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="name">Nama Aset</label>
                <input type="text" id="name" name="name" required value="${a?.name || ''}" placeholder="Nama aset">
              </div>
              <div>
                <label for="type">Jenis</label>
                <select id="type" name="type" required>
                  <option value="">Pilih jenis</option>
                  ${types.map(t => `
                    <option value="${t}" ${a?.type === t ? 'selected' : ''}>${this.getTypeLabel(t)}</option>
                  `).join('')}
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="acquisition_value">Nilai Perolehan (Rp)</label>
                <input type="number" id="acquisition_value" name="acquisition_value" required min="1" value="${a?.acquisition_value || ''}" placeholder="0">
              </div>
              <div>
                <label for="acquisition_date">Tanggal Perolehan</label>
                <input type="date" id="acquisition_date" name="acquisition_date" required value="${a?.acquisition_date || ''}">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="location">Lokasi</label>
                <input type="text" id="location" name="location" value="${a?.location || ''}" placeholder="Lokasi aset">
              </div>
              <div>
                <label for="status">Status</label>
                <select id="status" name="status" required>
                  <option value="active" ${a?.status === 'active' || !a ? 'selected' : ''}>Aktif</option>
                  <option value="sold" ${a?.status === 'sold' ? 'selected' : ''}>Terjual</option>
                  <option value="written_off" ${a?.status === 'written_off' ? 'selected' : ''}>Dihapuskan</option>
                </select>
              </div>
            </div>
            <div>
              <label for="description">Keterangan</label>
              <textarea id="description" name="description" rows="2" placeholder="Keterangan (opsional)">${a?.description || ''}</textarea>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" id="cancel-modal" class="btn-secondary">Batal</button>
              <button type="submit" class="btn-primary" ${this.loading ? 'disabled' : ''}>
                ${this.loading ? 'Memproses...' : (a ? 'Simpan' : 'Tambah')}
              </button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  getTypeLabel(type) {
    const labels = {
      peralatan: 'Peralatan',
      kendaraan: 'Kendaraan',
      bangunan: 'Bangunan',
      inventaris: 'Inventaris',
      elektronik: 'Elektronik',
      digital: 'Digital',
      lainnya: 'Lainnya'
    }
    return labels[type] || type
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
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeFilter = btn.dataset.filter
        this.renderAndBind()
      })
    })

    document.getElementById('add-asset-btn')?.addEventListener('click', () => {
      this.editingAsset = null
      this.showModal = true
      this.renderAndBind()
    })

    document.querySelectorAll('.edit-asset').forEach(btn => {
      btn.addEventListener('click', () => {
        this.editingAsset = this.assets.find(a => a.id === btn.dataset.id)
        this.showModal = true
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.delete-asset').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Hapus aset ini?')) return
        await this.supabase.from('assets').delete().eq('id', btn.dataset.id)
        await this.loadData()
        this.renderAndBind()
      })
    })

    this._bindModalEvents()
  }

  _bindModalEvents() {
    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.showModal = false; this.editingAsset = null; this.renderAndBind()
    })
    document.getElementById('cancel-modal')?.addEventListener('click', () => {
      this.showModal = false; this.editingAsset = null; this.renderAndBind()
    })
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.showModal = false; this.editingAsset = null; this.renderAndBind()
      }
    })

    const form = document.getElementById('asset-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      this.loading = true
      this.renderAndBind()

      const fd = new FormData(form)
      const data = {
        name: fd.get('name'),
        type: fd.get('type'),
        acquisition_value: parseInt(fd.get('acquisition_value')),
        acquisition_date: fd.get('acquisition_date'),
        location: fd.get('location') || null,
        status: fd.get('status'),
        description: fd.get('description') || null
      }

      if (this.editingAsset) {
        const { error } = await this.supabase.from('assets').update(data).eq('id', this.editingAsset.id)
        if (error) { alert('Gagal: ' + error.message); this.loading = false; this.renderAndBind(); return }
      } else {
        const { error } = await this.supabase.from('assets').insert(data)
        if (error) { alert('Gagal: ' + error.message); this.loading = false; this.renderAndBind(); return }

        await this.supabase.from('cash_transactions').insert({
          type: 'out',
          category: 'asset_purchase',
          amount: data.acquisition_value,
          description: `Pembelian aset: ${data.name}`,
          created_by: this.auth.user.id
        })
      }

      this.showModal = false
      this.editingAsset = null
      this.loading = false
      await this.loadData()
      this.renderAndBind()
    })
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) { outlet.innerHTML = this.render() }
    this._bindListeners()
    if (window.lucide) window.lucide.createIcons()
  }
}
