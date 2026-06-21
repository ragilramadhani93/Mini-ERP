export class RegisterPage {
  constructor({ auth, router }) {
    this.auth = auth
    this.router = router
    this.error = null
    this.loading = false
  }

  render() {
    return `
      <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div class="w-full max-w-md">
          <div class="text-center mb-8">
              <img src="https://wpnejkrfjlblxkcakzrg.supabase.co/storage/v1/object/public/Logo/ChatGPT%20Image%20Jun%2021,%202026,%2010_58_16%20PM.png" 
                 alt="Jenna Shop Logo" 
                 class="w-48 mx-auto mb-4 object-contain">
            <h1 class="text-3xl font-bold text-primary-600">Jenna <span style="color:#7A3B58">Shop</span></h1>
            <p class="text-gray-500 mt-2">Daftarkan akun Anda</p>
          </div>
          
          <div class="card p-6">
            ${this.error ? `
              <div class="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm" role="alert">
                ${this.error}
              </div>
            ` : ''}
            
            <form id="register-form" class="space-y-4">
              <div>
                <label for="full_name">Nama Lengkap</label>
                <input type="text" id="full_name" name="full_name" required placeholder="Nama Anda">
              </div>
              <div>
                <label for="phone">Nomor Telepon</label>
                <input type="tel" id="phone" name="phone" required placeholder="081234567890">
              </div>
              <div>
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required placeholder="admin@toko.com">
              </div>
              <div>
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required placeholder="Minimal 6 karakter">
              </div>
              <button type="submit" class="btn-primary w-full" ${this.loading ? 'disabled' : ''}>
                ${this.loading ? '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Memproses...' : '<i data-lucide="user-plus" class="w-5 h-5"></i> Daftar'}
              </button>
            </form>
          </div>
          
          <div class="text-center text-sm text-gray-500 mt-6">
            Sudah punya akun? <a href="#/login" class="text-primary-600 font-medium hover:underline">Login disini</a>
          </div>
        </div>
      </div>
    `
  }

  async bindEvents() {
    this.renderAndBind()
  }

  _bindListeners() {
    const form = document.getElementById('register-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const formData = new FormData(form)
      this.error = null
      this.loading = true
      this.renderAndBind()

      try {
        await this.auth.register(
          formData.get('email'),
          formData.get('password'),
          formData.get('full_name'),
          formData.get('phone')
        )
        this.router.navigate('/')
      } catch (err) {
        this.error = err.message
        this.loading = false
        this.renderAndBind()
      }
    })
  }

  renderAndBind() {
    const app = document.getElementById('app')
    if (app) {
      app.innerHTML = this.render()
    }
    this._bindListeners()
    if (window.lucide) window.lucide.createIcons()
  }
}
