export class LoginPage {
  constructor({ auth, router }) {
    this.auth = auth
    this.router = router
    this.error = ''
    this.loading = false
  }

  render() {
    return `
      <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div class="w-full max-w-md">
          <div class="text-center mb-8">
            <img src="https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=StokCuan%20logo%20with%20checklist%2C%20growth%20chart%2C%20and%20Indonesian%20rupiah%20coin&image_size=square" 
                 alt="StokCuan Logo" 
                 class="w-20 h-20 mx-auto mb-4 object-contain">
            <h1 class="text-3xl font-bold text-primary-600">StokCuan</h1>
            <p class="text-gray-500 mt-2">Sistem Manajemen Stok & Bisnis</p>
          </div>
          <div class="card p-6">
            ${this.error ? `
              <div class="mb-4 p-3 bg-danger-50 text-danger-600 rounded-lg text-sm" role="alert">
                ${this.error}
              </div>
            ` : ''}
            <form id="login-form" class="space-y-4">
              <div>
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required autocomplete="email" placeholder="admin@toko.com" class="${this.error ? 'input-error' : ''}">
              </div>
              <div>
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required autocomplete="current-password" placeholder="••••••••" class="${this.error ? 'input-error' : ''}">
              </div>
              <button type="submit" class="btn-primary w-full" :disabled="${this.loading}">
                ${this.loading ? '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Memproses...' : '<i data-lucide="log-in" class="w-5 h-5"></i> Masuk'}
              </button>
            </form>
          </div>
          <div class="text-center text-sm text-gray-500 mt-6">
            <p>Masuk dengan akun Anda</p>
          </div>
        </div>
      </div>
    `
  }

  async bindEvents() {
    this.renderAndBind()
  }

  _bindListeners() {
    const form = document.getElementById('login-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      this.loading = true
      this.error = ''
      this.renderAndBind()

      const email = form.email.value
      const password = form.password.value

      try {
        await this.auth.login(email, password)
        this.router.navigate('/')
      } catch (err) {
        this.error = err.message || 'Login gagal. Periksa email dan password.'
        this.loading = false
        this.renderAndBind()
      }
    })
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) { outlet.innerHTML = this.render() }
    this._bindListeners()
    if (window.lucide) {
      window.lucide.createIcons()
    }
  }
}