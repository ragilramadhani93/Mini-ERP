export class ProfilePage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.saving = false
    this.uploading = false
    this.ownerEmail = ''
    this.ownerMsg = ''
    this.ownerLoading = false
  }

  render() {
    const p = this.auth.profile
    const avatarUrl = p?.avatar_url || 'https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=default%20user%20avatar%20placeholder&image_size=square'
    const isOwner = p?.roles?.name === 'owner'
    
    return `
      <div class="max-w-2xl mx-auto space-y-6">
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
                <input type="text" class="bg-gray-50" value="${this.getRoleLabel(p?.roles?.name)}" readonly disabled>
              </div>
            </div>
            <div>
              <label for="phone">Telepon</label>
              <input type="text" id="phone" name="phone" value="${p?.phone || ''}" placeholder="08xxxxxxxxxx">
            </div>
            <div class="pt-4 border-t border-gray-100">
              <button type="submit" class="btn-primary" ${this.saving ? 'disabled' : ''}>
                ${this.saving ? '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Menyimpan...' : '<i data-lucide="save" class="w-5 h-5"></i> Simpan Profil'}
              </button>
            </div>
          </form>
        </div>

        ${isOwner ? `
          <div class="card p-6">
            <div class="card-header" style="padding:0;margin-bottom:16px">
              <h3>Jadikan Owner</h3>
              <p style="font-size:13px;color:#64748b;margin:4px 0 0">Beri akses owner ke pengguna lain</p>
            </div>
            ${this.ownerMsg ? `<div class="mb-3 p-3 rounded-lg text-sm ${this.ownerMsg.includes('sukses') || this.ownerMsg.includes('berhasil') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}">${this.ownerMsg}</div>` : ''}
            <div class="flex gap-3">
              <input type="email" id="owner-email" class="flex-1" placeholder="Email pengguna" value="${this.ownerEmail}">
              <button id="btn-jadikan-owner" class="btn-primary whitespace-nowrap" ${this.ownerLoading ? 'disabled' : ''}>
                ${this.ownerLoading ? 'Memproses...' : 'Jadikan Owner'}
              </button>
            </div>
          </div>
        ` : ''}
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

  async uploadAvatar(file) {
    this.uploading = true
    this.renderAndBind()

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${this.auth.user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload file ke Supabase Storage
      const { error: uploadError } = await this.supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Dapatkan public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update avatar_url di tabel users
      await this.supabase.from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', this.auth.user.id)

      // Refresh auth profile
      await this.auth.setUser(this.auth.user)
      alert('Foto profil berhasil diupload!')
    } catch (err) {
      alert('Gagal upload foto: ' + err.message)
    } finally {
      this.uploading = false
      this.renderAndBind()
    }
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
        phone: formData.get('phone')
      }

      await this.supabase.from('users').update(data).eq('id', this.auth.user.id)
      this.saving = false
      await this.auth.setUser(this.auth.user)
      this.renderAndBind()
    })

    const avatarFile = document.getElementById('avatar-file')
    avatarFile?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0]
      if (file) {
        // Preview image
        const reader = new FileReader()
        reader.onload = (e) => {
          const preview = document.getElementById('avatar-preview')
          if (preview) preview.src = e.target.result
        }
        reader.readAsDataURL(file)
        
        // Upload to Supabase
        await this.uploadAvatar(file)
      }
    })

    document.getElementById('btn-jadikan-owner')?.addEventListener('click', async () => {
      const email = document.getElementById('owner-email')?.value.trim()
      if (!email) { this.ownerMsg = 'Masukkan email pengguna'; this.renderAndBind(); return }
      this.ownerEmail = email
      this.ownerLoading = true
      this.ownerMsg = ''
      this.renderAndBind()

      try {
        const ownerRole = await this.supabase.from('roles').select('id').eq('name', 'owner').single()
        if (!ownerRole.data) throw new Error('Role owner tidak ditemukan')

        const { count } = await this.supabase.from('users').select('*', { count: 'exact', head: true }).eq('role_id', ownerRole.data.id)
        if (count > 1) { this.ownerMsg = 'Sudah ada owner lain, hanya bisa 1 owner'; this.ownerLoading = false; this.renderAndBind(); return }

        const { data: targetUser } = await this.supabase.from('users').select('id').eq('email', email).single()
        if (!targetUser) { this.ownerMsg = `User dengan email ${email} tidak ditemukan`; this.ownerLoading = false; this.renderAndBind(); return }

        await this.supabase.from('users').update({ role_id: ownerRole.data.id }).eq('id', targetUser.id)
        this.ownerMsg = `✅ ${email} berhasil dijadikan Owner!`
        this.ownerEmail = ''
      } catch (err) {
        this.ownerMsg = `Gagal: ${err.message}`
      }
      this.ownerLoading = false
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