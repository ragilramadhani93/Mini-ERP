import { SkeletonPage } from '../components/Skeleton.js'
import { toast } from '../components/ToastNotification.js'

export class SettingsRolePage {
  constructor({ supabase, auth, router }) {
    this.supabase = supabase
    this.auth = auth
    this.router = router
    this.roles = []
    this.permissions = {}
    this.loading = false
    this.saving = false
    this.menuItems = [
      { path: '/', label: 'Dashboard', section: 'Utama' },
      { path: '/profile', label: 'Profil', section: 'Utama' },
      { path: '/products', label: 'Produk', section: 'Inventori' },
      { path: '/categories', label: 'Kategori', section: 'Inventori' },
      { path: '/stock', label: 'Stok Masuk', section: 'Inventori' },
      { path: '/stock/opname', label: 'Opname', section: 'Inventori' },
      { path: '/barcode', label: 'Scanner', section: 'Inventori' },
      { path: '/sales', label: 'Penjualan', section: 'Transaksi' },
      { path: '/shopee', label: 'Import Marketplace', section: 'Transaksi' },
      { path: '/purchase-orders', label: 'PO', section: 'Transaksi' },
      { path: '/suppliers', label: 'Supplier', section: 'Transaksi' },
      { path: '/users', label: 'Pengguna', section: 'Transaksi' },
      { path: '/analytics', label: 'Analitik', section: 'Analitik' },
      { path: '/forecasting', label: 'Forecasting', section: 'Analitik' },
      { path: '/ai-assistant', label: 'AI', section: 'Analitik' },
      { path: '/import-export', label: 'Laporan', section: 'Lainnya' },
      { path: '/finance', label: 'Keuangan', section: 'Lainnya' },
      { path: '/debts', label: 'Hutang', section: 'Lainnya' },
      { path: '/assets', label: 'Aset', section: 'Lainnya' },
      { path: '/settings', label: 'Pengaturan', section: 'Lainnya' }
    ]
    this.dirty = false
  }

  async loadData() {
    const [rolesRes, permsRes] = await Promise.all([
      this.supabase.from('roles').select('*').order('name'),
      this.supabase.from('role_permissions').select('*, roles!inner(name)')
    ])
    this.roles = rolesRes.data || []
    this.permissions = {}
    if (permsRes.data) {
      permsRes.data.forEach(p => {
        const key = `${p.role_id}:${p.menu_path}`
        this.permissions[key] = p.can_view
      })
    }
  }

  render() {
    const role = this.auth.getRole()
    if (role !== 'owner') {
      return `
        <div class="flex items-center justify-center" style="min-height:300px">
          <p style="color:#94a3b8;font-size:14px">Hanya Owner yang dapat mengatur akses menu</p>
        </div>
      `
    }

    if (this.loading) {
      return `
        <div class="flex items-center justify-center" style="min-height:300px">
          <div class="spinner"></div>
        </div>
      `
    }

    const sections = {}
    this.menuItems.forEach(item => {
      if (!sections[item.section]) sections[item.section] = []
      sections[item.section].push(item)
    })

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold" style="color:#0f172a">Atur Akses Menu</h2>
          <div class="flex gap-2">
            <button id="select-all-btn" class="btn-secondary" style="padding:6px 12px;font-size:12px">Pilih Semua</button>
            <button id="deselect-all-btn" class="btn-secondary" style="padding:6px 12px;font-size:12px">Hapus Semua</button>
            <button id="save-permissions-btn" class="btn-primary" style="padding:6px 12px;font-size:12px" ${this.saving ? 'disabled' : ''}>
              ${this.saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="table" style="min-width:800px">
            <thead>
              <tr>
                <th style="position:sticky;left:0;z-index:2;background:#f8fafc">Menu</th>
                ${this.roles.map(r => `
                  <th style="text-align:center;white-space:nowrap;font-size:12px">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                      <span>${r.description || r.name}</span>
                      <span style="font-size:10px;color:#94a3b8;font-weight:400">${r.name}</span>
                    </div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${Object.entries(sections).map(([sectionName, items]) => `
                <tr>
                  <td colspan="${this.roles.length + 1}" style="font-weight:700;font-size:12px;color:#7A3B58;padding:12px 16px 4px;background:#faf5f7" colspan="${this.roles.length + 1}">
                    ${sectionName}
                  </td>
                </tr>
                ${items.map(item => `
                  <tr>
                    <td style="font-weight:500;font-size:13px;position:sticky;left:0;background:#fff;white-space:nowrap">
                      ${item.label}
                      <span style="font-size:10px;color:#94a3b8;font-weight:400;margin-left:6px">${item.path}</span>
                    </td>
                    ${this.roles.map(r => {
                      const key = `${r.id}:${item.path}`
                      const checked = this.permissions[key] !== false
                      return `
                        <td style="text-align:center">
                          <input type="checkbox" class="perm-checkbox" data-role-id="${r.id}" data-menu-path="${item.path}" ${checked ? 'checked' : ''} style="width:16px;height:16px;accent-color:#7A3B58;cursor:pointer">
                        </td>
                      `
                    }).join('')}
                  </tr>
                `).join('')}
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <button id="save-permissions-btn-bottom" class="btn-primary" style="padding:8px 20px;font-size:13px" ${this.saving ? 'disabled' : ''}>
            ${this.saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    `
  }

  async bindEvents() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) outlet.innerHTML = SkeletonPage()
    this.loading = true
    await this.loadData()
    this.loading = false
    this.renderAndBind()
  }

  _bindListeners() {
    document.querySelectorAll('.perm-checkbox').forEach(cb => {
      cb.addEventListener('change', () => { this.dirty = true })
    })

    document.getElementById('select-all-btn')?.addEventListener('click', () => {
      document.querySelectorAll('.perm-checkbox').forEach(cb => { cb.checked = true; this.dirty = true })
    })

    document.getElementById('deselect-all-btn')?.addEventListener('click', () => {
      document.querySelectorAll('.perm-checkbox').forEach(cb => { cb.checked = false; this.dirty = true })
    })

    const save = async () => {
      if (this.saving) return
      this.saving = true
      this.renderAndBind()

      const changes = []
      document.querySelectorAll('.perm-checkbox').forEach(cb => {
        const roleId = cb.dataset.roleId
        const menuPath = cb.dataset.menuPath
        const checked = cb.checked
        const key = `${roleId}:${menuPath}`
        const currentVal = this.permissions[key] !== false
        if (checked !== currentVal) {
          changes.push({ role_id: roleId, menu_path: menuPath, can_view: checked })
        }
      })

      if (changes.length === 0) {
        this.saving = false
        this.renderAndBind()
        toast.info('Info', 'Tidak ada perubahan yang perlu disimpan')
        return
      }

      let hasError = false
      for (const ch of changes) {
        const { error: delErr } = await this.supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', ch.role_id)
          .eq('menu_path', ch.menu_path)
        if (delErr) { hasError = true; continue }
        const { error: insErr } = await this.supabase
          .from('role_permissions')
          .insert({ role_id: ch.role_id, menu_path: ch.menu_path, can_view: ch.can_view })
        if (insErr) hasError = true
      }

      await this.loadData()
      this.saving = false
      this.dirty = false
      this.renderAndBind()
      if (hasError) {
        toast.error('Gagal', 'Beberapa perubahan gagal disimpan')
      } else {
        toast.success('Berhasil', 'Akses menu berhasil diperbarui')
      }
    }

    document.getElementById('save-permissions-btn')?.addEventListener('click', save)
    document.getElementById('save-permissions-btn-bottom')?.addEventListener('click', save)
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) {
      const currentPath = window.location.hash.slice(1) || '/'
      outlet.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center gap-2" style="border-bottom:1px solid #e2e8f0;padding-bottom:12px">
            <a href="#/settings" class="tab-btn ${currentPath === '/settings' ? 'active' : ''}" style="padding:6px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none;${currentPath === '/settings' ? 'background:#7A3B58;color:#fff' : 'color:#64748b;background:transparent'}">Metode Pembayaran</a>
            <a href="#/settings/roles" class="tab-btn ${currentPath === '/settings/roles' ? 'active' : ''}" style="padding:6px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none;${currentPath === '/settings/roles' ? 'background:#7A3B58;color:#fff' : 'color:#64748b;background:transparent'}">Atur Peran</a>
          </div>
          ${this.render()}
        </div>
      `
      this._bindListeners()
      if (window.lucide) window.lucide.createIcons()
    }
  }

}
