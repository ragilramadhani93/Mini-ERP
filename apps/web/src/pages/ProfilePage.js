import { SkeletonPage } from '../components/Skeleton.js'
import { toast } from '../components/ToastNotification.js'

export class ProfilePage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.saving = false
    this.uploading = false
    this.roles = []
    this.activeTab = 'profil'
    this.users = []
    this.permissions = {}
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
    this.addUserForm = { full_name: '', email: '', phone: '', password: '', role_id: '' }
    this.addUserMsg = ''
    this.addUserLoading = false
    this.permSaving = false
  }

  async loadData() {
    try {
      const isOwner = this.auth.getRole() === 'owner'
      const isAdmin = this.auth.getRole() === 'admin'
      const queries = [
        this.supabase.from('roles').select('*').order('name')
      ]
      if (isAdmin) {
        queries.push(this.supabase.from('users').select('id, full_name, email, phone, is_active, role_id, roles!inner(name)').order('full_name'))
      }
      if (isOwner) {
        queries.push(this.supabase.from('role_permissions').select('role_id, menu_path, can_view'))
      }
      const results = await Promise.all(queries)
      this.roles = results[0].data || []
      if (isAdmin) this.users = results[1]?.data || []
      if (isOwner) {
        this.permissions = {}
        ;(results[isOwner ? 1 : 0]?.data || []).forEach(p => {
          this.permissions[`${p.role_id}:${p.menu_path}`] = p.can_view
        })
      }
      this.addUserForm.role_id = this.roles.find(r => r.name === 'admin')?.id || ''
    } catch (err) {
      console.error('Load profile error:', err)
      toast.error('Gagal', 'Gagal memuat data: ' + err.message)
    }
  }

  render() {
    const p = this.auth.profile
    const avatarUrl = p?.avatar_url || 'https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=default%20user%20avatar%20placeholder&image_size=square'
    const isOwner = p?.roles?.name === 'owner'
    const isAdmin = p?.roles?.name === 'admin'
    const canChangeRole = isOwner || isAdmin

    return `
      <div class="max-w-2xl mx-auto space-y-6">
        <div class="flex items-center gap-2" style="border-bottom:1px solid #e2e8f0;padding-bottom:12px">
          <button class="tab-btn" data-tab="profil" style="padding:6px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;border:none;${this.activeTab === 'profil' ? 'background:#7A3B58;color:#fff' : 'color:#64748b;background:transparent'}">Profil</button>
          ${isAdmin || isOwner ? `<button class="tab-btn" data-tab="add-user" style="padding:6px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;border:none;${this.activeTab === 'add-user' ? 'background:#7A3B58;color:#fff' : 'color:#64748b;background:transparent'}">Tambah User</button>` : ''}
          ${isOwner ? `<button class="tab-btn" data-tab="atur-role" style="padding:6px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;border:none;${this.activeTab === 'atur-role' ? 'background:#7A3B58;color:#fff' : 'color:#64748b;background:transparent'}">Atur Peran</button>` : ''}
        </div>

        <div id="tab-content">
          ${this.activeTab === 'profil' ? this.renderProfil(p, avatarUrl, canChangeRole, isOwner) : ''}
          ${this.activeTab === 'add-user' ? this.renderAddUser() : ''}
          ${this.activeTab === 'atur-role' ? this.renderAturRole() : ''}
        </div>
      </div>
    `
  }

  renderProfil(p, avatarUrl, canChangeRole, isOwner) {
    return `
      <div class="card p-6">
        <div class="flex flex-col items-center mb-6">
          <div class="relative mb-4">
            <div class="w-24 h-24 rounded-full overflow-hidden border-4 border-primary-100 bg-gray-100">
              <img src="${avatarUrl}" alt="Avatar" class="w-full h-full object-cover" id="avatar-preview">
            </div>
            <label class="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-700 transition-colors shadow-lg">
              <i data-lucide="camera" class="w-4 h-4 text-white"></i>
              <input type="file" id="avatar-file" accept="image/*" class="hidden">
            </label>
          </div>
          <div class="text-center">
            <h3 class="text-lg font-semibold">${p?.full_name || 'Pengguna'}</h3>
            <p class="text-sm text-gray-500">${p?.email}</p>
          </div>
        </div>

        <form id="profile-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="full_name">Nama Lengkap</label>
              <input type="text" id="full_name" name="full_name" required value="${p?.full_name || ''}" placeholder="Nama lengkap">
            </div>
            <div>
              <label>Role</label>
              ${canChangeRole ? `
                <select id="role-select" name="role_id" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;background:#fff">
                  ${this.roles.map(r => `<option value="${r.id}" ${r.id === p?.role_id ? 'selected' : ''}>${this.getRoleLabel(r.name)}</option>`).join('')}
                </select>
              ` : `
                <input type="text" class="bg-gray-50" value="${this.getRoleLabel(p?.roles?.name)}" readonly disabled>
              `}
            </div>
          </div>
          <div>
            <label for="phone">Telepon</label>
            <input type="text" id="phone" name="phone" value="${p?.phone || ''}" placeholder="08xxxxxxxxxx">
          </div>
          <div class="pt-4 border-t border-gray-100">
            <button type="submit" class="btn-primary" ${this.saving ? 'disabled' : ''}>
              ${this.saving ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </div>
        </form>
      </div>
    `
  }

  renderAddUser() {
    const f = this.addUserForm
    return `
      <div class="card p-6">
        <h3 style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px">Tambah Pengguna Baru</h3>
        ${this.addUserMsg ? `<div class="mb-3 p-3 rounded-lg text-sm ${this.addUserMsg.includes('berhasil') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}">${this.addUserMsg}</div>` : ''}
        <form id="add-user-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label style="font-size:12px;font-weight:600;color:#334155">Nama Lengkap</label>
              <input type="text" id="au-name" required value="${f.full_name}" placeholder="Nama lengkap" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#334155">Email</label>
              <input type="email" id="au-email" required value="${f.email}" placeholder="email@contoh.com" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label style="font-size:12px;font-weight:600;color:#334155">Telepon</label>
              <input type="text" id="au-phone" value="${f.phone}" placeholder="08xxxxxxxxxx" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#334155">Password</label>
              <input type="password" id="au-password" required value="${f.password}" placeholder="Minimal 6 karakter" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px">
            </div>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#334155">Role</label>
            <select id="au-role" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;margin-top:4px;background:#fff">
              ${this.roles.map(r => `<option value="${r.id}" ${r.id === f.role_id ? 'selected' : ''}>${this.getRoleLabel(r.name)}</option>`).join('')}
            </select>
          </div>
          <div class="flex justify-end pt-4 border-t border-gray-100">
            <button type="submit" class="btn-primary" ${this.addUserLoading ? 'disabled' : ''} style="padding:8px 20px;font-size:13px">
              ${this.addUserLoading ? 'Menyimpan...' : 'Tambah Pengguna'}
            </button>
          </div>
        </form>

        <div style="margin-top:24px;border-top:1px solid #f1f5f9;padding-top:16px">
          <h4 style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:12px">Daftar Pengguna</h4>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${this.users.length === 0 ? `
                  <tr><td colspan="4" class="text-center" style="color:#94a3b8;padding:16px">Belum ada pengguna</td></tr>
                ` : this.users.map(u => `
                  <tr>
                    <td style="font-weight:500;font-size:13px">${u.full_name || '-'}</td>
                    <td style="font-size:12px;color:#64748b">${u.email}</td>
                    <td><span class="badge badge-tunai">${this.getRoleLabel(u.roles?.name)}</span></td>
                    <td><span class="badge ${u.is_active ? 'badge-tunai' : ''}" style="${u.is_active ? '' : 'background:#f1f5f9;color:#94a3b8'}">${u.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
  }

  renderAturRole() {
    const sections = {}
    this.menuItems.forEach(item => {
      if (!sections[item.section]) sections[item.section] = []
      sections[item.section].push(item)
    })

    return `
      <div class="card p-6">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <h3 style="font-size:15px;font-weight:700;color:#0f172a">Akses Menu per Role</h3>
          <div style="display:flex;gap:8px">
            <button id="perm-select-all" style="padding:5px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;cursor:pointer;background:#fff;color:#334155">Pilih Semua</button>
            <button id="perm-deselect-all" style="padding:5px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;cursor:pointer;background:#fff;color:#334155">Hapus Semua</button>
            <button id="perm-save" class="btn-primary" style="padding:5px 12px;font-size:12px" ${this.permSaving ? 'disabled' : ''}>
              ${this.permSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="table" style="min-width:700px">
            <thead>
              <tr>
                <th style="position:sticky;left:0;z-index:2;background:#f8fafc">Menu</th>
                ${this.roles.map(r => `
                  <th style="text-align:center;white-space:nowrap;font-size:12px">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                      <span>${this.getRoleLabel(r.name)}</span>
                      <span style="font-size:10px;color:#94a3b8;font-weight:400">${r.name}</span>
                    </div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${Object.entries(sections).map(([sectionName, items]) => `
                <tr>
                  <td colspan="${this.roles.length + 1}" style="font-weight:700;font-size:12px;color:#7A3B58;padding:12px 16px 4px;background:#faf5f7">
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
                          <input type="checkbox" class="perm-cb" data-role="${r.id}" data-path="${item.path}" ${checked ? 'checked' : ''} style="width:16px;height:16px;accent-color:#7A3B58;cursor:pointer">
                        </td>
                      `
                    }).join('')}
                  </tr>
                `).join('')}
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  }

  getRoleLabel(role) {
    const labels = { owner: 'Pemilik', admin: 'Admin', staff_gudang: 'Staff Gudang', staff_keuangan: 'Staff Keuangan' }
    return labels[role] || role
  }

  async uploadAvatar(file) {
    this.uploading = true
    this.renderAndBind()
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${this.auth.user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`
      const { error: uploadError } = await this.supabase.storage.from('avatars').upload(filePath, file, { cacheControl: '3600', upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = this.supabase.storage.from('avatars').getPublicUrl(filePath)
      await this.supabase.from('users').update({ avatar_url: publicUrl }).eq('id', this.auth.user.id)
      await this.auth.setUser(this.auth.user)
      toast.success('Berhasil', 'Foto profil berhasil diupload')
    } catch (err) {
      toast.error('Gagal Upload', err.message || 'Gagal upload foto profil')
    } finally {
      this.uploading = false
      this.renderAndBind()
    }
  }

  async bindEvents() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) outlet.innerHTML = SkeletonPage()
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

    if (this.activeTab === 'profil') this._bindProfilListeners()
    if (this.activeTab === 'add-user') this._bindAddUserListeners()
    if (this.activeTab === 'atur-role') this._bindAturRoleListeners()
  }

  _bindProfilListeners() {
    const form = document.getElementById('profile-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      this.saving = true
      this.renderAndBind()
      const formData = new FormData(form)
      const data = { full_name: formData.get('full_name'), phone: formData.get('phone') }
      if (formData.get('role_id')) data.role_id = formData.get('role_id')
      await this.supabase.from('users').update(data).eq('id', this.auth.user.id)
      this.saving = false
      await this.auth.setUser(this.auth.user)
      this.renderAndBind()
    })

    document.getElementById('avatar-file')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (ev) => { const preview = document.getElementById('avatar-preview'); if (preview) preview.src = ev.target.result }
        reader.readAsDataURL(file)
        await this.uploadAvatar(file)
      }
    })
  }

  _bindAddUserListeners() {
    document.getElementById('add-user-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      this.addUserLoading = true
      this.addUserMsg = ''
      this.renderAndBind()

      const name = document.getElementById('au-name')?.value.trim()
      const email = document.getElementById('au-email')?.value.trim()
      const phone = document.getElementById('au-phone')?.value.trim()
      const password = document.getElementById('au-password')?.value
      const roleId = document.getElementById('au-role')?.value

      if (!name || !email || !password) {
        this.addUserMsg = 'Nama, email, dan password wajib diisi'
        this.addUserLoading = false
        this.renderAndBind()
        return
      }
      if (password.length < 6) {
        this.addUserMsg = 'Password minimal 6 karakter'
        this.addUserLoading = false
        this.renderAndBind()
        return
      }

      try {
        const { data: existingUser } = await this.supabase.from('users').select('id').eq('email', email).maybeSingle()
        if (existingUser) {
          this.addUserMsg = `Email ${email} sudah terdaftar`
          this.addUserLoading = false
          this.renderAndBind()
          return
        }

        const { data: authData, error: authErr } = await this.supabase.auth.signUp({ email, password, options: { emailRedirectTo: undefined } })
        if (authErr) throw authErr

        const { error: insertErr } = await this.supabase.from('users').insert({
          id: authData.user.id,
          email,
          full_name: name,
          phone,
          role_id: roleId,
          is_active: true
        })
        if (insertErr) throw insertErr

        this.addUserMsg = `Pengguna ${name} berhasil ditambahkan!`
        this.addUserForm = { full_name: '', email: '', phone: '', password: '', role_id: this.roles.find(r => r.name === 'admin')?.id || '' }
        await this.loadData()
      } catch (err) {
        this.addUserMsg = `Gagal: ${err.message}`
      }
      this.addUserLoading = false
      this.renderAndBind()
    })
  }

  _bindAturRoleListeners() {
    document.getElementById('perm-select-all')?.addEventListener('click', () => {
      document.querySelectorAll('.perm-cb').forEach(cb => { cb.checked = true })
    })
    document.getElementById('perm-deselect-all')?.addEventListener('click', () => {
      document.querySelectorAll('.perm-cb').forEach(cb => { cb.checked = false })
    })

    document.getElementById('perm-save')?.addEventListener('click', async () => {
      if (this.permSaving) return
      this.permSaving = true
      this.renderAndBind()

      const changes = []
      document.querySelectorAll('.perm-cb').forEach(cb => {
        const key = `${cb.dataset.role}:${cb.dataset.path}`
        const currentVal = this.permissions[key] !== false
        if (cb.checked !== currentVal) {
          changes.push({ role_id: cb.dataset.role, menu_path: cb.dataset.path, can_view: cb.checked })
        }
      })

      if (changes.length === 0) {
        this.permSaving = false
        this.renderAndBind()
        return
      }

      for (const ch of changes) {
        await this.supabase.from('role_permissions').delete().eq('role_id', ch.role_id).eq('menu_path', ch.menu_path)
        await this.supabase.from('role_permissions').insert({ role_id: ch.role_id, menu_path: ch.menu_path, can_view: ch.can_view })
      }

      await this.loadData()
      this.permSaving = false
      this.renderAndBind()
      this.showToast('Akses menu berhasil diperbarui', 'success')
    })
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('router-outlet')
    if (!container) return
    const bg = type === 'success' ? '#065f46' : '#991b1b'
    const toast = document.createElement('div')
    toast.textContent = message
    toast.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:${bg};color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.15);opacity:0;transition:opacity 0.3s`
    document.body.appendChild(toast)
    requestAnimationFrame(() => { toast.style.opacity = '1' })
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300) }, 2500)
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) { outlet.innerHTML = this.render() }
    this._bindListeners()
    if (window.lucide) window.lucide.createIcons()
  }
}
