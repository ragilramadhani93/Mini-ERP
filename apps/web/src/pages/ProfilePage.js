export class ProfilePage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.saving = false
  }

  render() {
    const p = this.auth.profile
    return `
      <div class="max-w-2xl mx-auto space-y-6">
        <div class="card p-6">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <i data-lucide="user" class="w-8 h-8 text-primary-600"></i>
            </div>
            <div>
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
                <input type="text" class="bg-gray-50" value="${this.getRoleLabel(p?.roles?.name)}" readonly disabled>
              </div>
            </div>
            <div>
              <label for="phone">Telepon</label>
              <input type="text" id="phone" name="phone" value="${p?.phone || ''}" placeholder="08xxxxxxxxxx">
            </div>
            <div>
              <label for="avatar_url">URL Foto Profil</label>
              <input type="url" id="avatar_url" name="avatar_url" value="${p?.avatar_url || ''}" placeholder="https://example.com/avatar.jpg">
            </div>
            <div class="pt-4 border-t border-gray-100">
              <button type="submit" class="btn-primary" ${this.saving ? 'disabled' : ''}>
                ${this.saving ? '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Menyimpan...' : '<i data-lucide="save" class="w-5 h-5"></i> Simpan Profil'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  getRoleLabel(role) {
    const labels = {
      owner: 'Pemilik',
      admin: 'Admin',
      staff_gudang: 'Staff Gudang',
      staff_keuangan: 'Staff Keuangan'
    }
    return labels[role] || role
  }

  async bindEvents() {
    this.renderAndBind()
  }

  _bindListeners() {
    const form = document.getElementById('profile-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      this.saving = true
      this.renderAndBind()

      const formData = new FormData(form)
      const data = {
        full_name: formData.get('full_name'),
        phone: formData.get('phone'),
        avatar_url: formData.get('avatar_url')
      }

      await this.supabase.from('users').update(data).eq('id', this.auth.user.id)
      this.saving = false
      await this.auth.setUser(this.auth.user)
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