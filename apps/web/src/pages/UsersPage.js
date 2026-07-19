import { SkeletonPage } from '../components/Skeleton.js'
import { toast } from '../components/ToastNotification.js'

export class UsersPage {
  constructor({ supabase }) {
    this.supabase = supabase
    this.users = []
    this.roles = []
    this.showModal = false
    this.editingUser = null
  }

  async loadData() {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        this.supabase.from('users').select('*, roles(name)').order('created_at', { ascending: false }),
        this.supabase.from('roles').select('*').order('name')
      ])
      this.users = usersRes.data || []
      this.roles = rolesRes.data || []
    } catch (err) {
      console.error('Load users error:', err)
      toast.error('Gagal', 'Gagal memuat data pengguna: ' + err.message)
      this.users = []
      this.roles = []
    }
  }

  render() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Pengguna</h2>
          <button id="add-user-btn" class="btn-primary">
            <i data-lucide="plus" class="w-5 h-5"></i> Tambah Pengguna
          </button>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${this.users.length === 0 ? `
                  <tr><td colspan="5" class="text-center text-gray-500 py-8">Belum ada pengguna</td></tr>
                ` : this.users.map(u => `
                  <tr>
                    <td class="font-medium">${u.full_name || '-'}</td>
                    <td class="text-gray-500">${u.email}</td>
                    <td><span class="badge badge-info">${u.roles?.name || '-'}</span></td>
                    <td>
                      <span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">
                        ${u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td class="text-right">
                      <button class="btn-outline btn-sm edit-user" data-id="${u.id}">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                      </button>
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

  renderModal() {
    const u = this.editingUser
    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold">${u ? 'Edit Pengguna' : 'Tambah Pengguna'}</h3>
            <button id="close-modal" class="text-gray-400 hover:text-gray-600">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          <form id="user-form" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required ${u ? 'readonly' : ''} value="${u?.email || ''}" placeholder="user@toko.com">
              </div>
              <div>
                <label for="full_name">Nama Lengkap</label>
                <input type="text" id="full_name" name="full_name" required value="${u?.full_name || ''}" placeholder="Nama pengguna">
              </div>
            </div>
            ${!u ? `
            <div>
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required placeholder="Min 6 karakter">
            </div>
            ` : ''}
            <div>
              <label for="role_id">Role</label>
              <select id="role_id" name="role_id" required>
                <option value="">Pilih role</option>
                ${this.roles.map(r => `
                  <option value="${r.id}" ${u?.role_id === r.id ? 'selected' : ''}>${r.name}</option>
                `).join('')}
              </select>
            </div>
            ${u ? `
            <div class="flex items-center gap-2">
              <input type="checkbox" id="is_active" name="is_active" ${u.is_active ? 'checked' : ''} class="w-4 h-4">
              <label for="is_active" class="mb-0">Akun Aktif</label>
            </div>
            ` : ''}
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" id="cancel-modal" class="btn-secondary">Batal</button>
              <button type="submit" class="btn-primary">${u ? 'Simpan' : 'Tambah'}</button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  async bindEvents() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) outlet.innerHTML = SkeletonPage()
    await this.loadData()
    this.renderAndBind()
  }

  _bindListeners() {
    document.getElementById('add-user-btn')?.addEventListener('click', () => {
      this.editingUser = null
      this.showModal = true
      this.renderAndBind()
    })

    document.querySelectorAll('.edit-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id
        this.editingUser = this.users.find(u => u.id === id) || null
        this.showModal = true
        this.renderAndBind()
      })
    })

    this._bindModalEvents()
  }

  _bindModalEvents() {
    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.showModal = false
      this.editingUser = null
      this.renderAndBind()
    })
    document.getElementById('cancel-modal')?.addEventListener('click', () => {
      this.showModal = false
      this.editingUser = null
      this.renderAndBind()
    })
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.showModal = false
        this.editingUser = null
        this.renderAndBind()
      }
    })

    const form = document.getElementById('user-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const formData = new FormData(form)

      if (this.editingUser) {
        const data = {
          full_name: formData.get('full_name'),
          role_id: formData.get('role_id'),
          is_active: formData.get('is_active') === 'on'
        }
        await this.supabase.from('users').update(data).eq('id', this.editingUser.id)
      } else {
        const { data: authData, error: authError } = await this.supabase.auth.signUp({
          email: formData.get('email'),
          password: formData.get('password')
        })
        if (authError) {
          toast.error('Gagal Daftar', authError.message)
          return
        }
        if (authData.user) {
          await this.supabase.from('users').insert({
            id: authData.user.id,
            email: formData.get('email'),
            full_name: formData.get('full_name'),
            role_id: formData.get('role_id'),
            is_active: true
          })
        }
      }

      this.showModal = false
      this.editingUser = null
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