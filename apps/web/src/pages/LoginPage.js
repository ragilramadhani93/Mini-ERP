export class LoginPage {
  constructor({ auth, router }) {
    this.auth = auth
    this.router = router
    this.error = ''
    this.loading = false
  }

  render() {
    return `
      <style>
        .lp{font-family:'Inter',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F4F7FB;padding:16px;transform:scale(0.85);transform-origin:center center;margin-top:-7vh}
        .lpw{background:#fff;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,.08);width:100%;max-width:1100px;display:flex;flex-direction:row;gap:8px;padding:12px;overflow:hidden}
        .lp-left{width:50%;display:flex;flex-direction:column;justify-content:center;padding:48px 32px 48px 64px}
        .lp-logo-wrap{display:flex;justify-content:center;margin-bottom:32px;margin-top:-16px}
        .lp-logo{height:199px;object-fit:contain}
        .lp-left h1{font-size:30px;font-weight:700;color:#111827;margin-bottom:12px}
        .lp-sub{font-size:14px;color:#6B7280;line-height:1.6;margin-bottom:32px}
        .lp-field{margin-bottom:20px}
        .lp-field label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px}
        .lp-field input{width:100%;padding:12px 16px;border-radius:8px;border:1px solid #E5E7EB;font-size:14px;outline:none;transition:all .2s}
        .lp-field input:focus{border-color:#9D5B7A;box-shadow:0 0 0 3px rgba(157,91,122,.15)}
        .lp-field input::placeholder{color:#9CA3AF}
        .lp-pw-wrap{position:relative}
        .lp-pw-toggle{position:absolute;right:16px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9CA3AF;padding:0}
        .lp-pw-toggle:hover{color:#6B7280}
        .lp-check{display:flex;align-items:center;gap:8px;margin-top:16px;margin-bottom:24px}
        .lp-check input{width:16px;height:16px;accent-color:#9D5B7A;border-radius:4px}
        .lp-check label{font-size:13px;color:#4B5563;font-weight:500}
        .lp-btn{width:100%;background:#E58C96;color:#fff;font-weight:600;padding:14px 16px;border-radius:12px;border:none;font-size:15px;cursor:pointer;transition:all .2s;box-shadow:0 4px 14px rgba(229,140,150,.3)}
        .lp-btn:hover{background:#D47A84}
        .lp-btn:disabled{opacity:.6;cursor:not-allowed}
        .lp-right{width:50%;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
        @media(max-width:992px){
          .lpw{flex-direction:column}
          .lp-left,.lp-right{width:100%}
          .lp-left{padding:32px 24px}
          .lp-right{min-height:280px;border-radius:16px}
          .lp-logo{height:60px}
        }
      </style>

      <div class="lp">
        <div class="lpw">
          <div class="lp-left">
            <div class="lp-logo-wrap">
              <img class="lp-logo"
                src="https://wpnejkrfjlblxkcakzrg.supabase.co/storage/v1/object/public/Logo/ChatGPT%20Image%20Jun%2021,%202026,%2010_58_16%20PM.png"
                alt="Jenna Shop Logo">
            </div>

            <h1>Masuk ke Akun Anda</h1>
            <p class="lp-sub">Kelola stok, penjualan, dan keuntungan toko Anda dalam satu dashboard.</p>

            ${this.error ? `<div class="lp-error">${this.error}</div>` : ''}

            <form id="lp-form">
              <div class="lp-field">
                <label>Email</label>
                <input type="email" id="lp-email" required placeholder="nama@email.com">
              </div>

              <div class="lp-field">
                <label>Password</label>
                <div class="lp-pw-wrap">
                  <input type="password" id="lp-pass" required placeholder="••••••••••••" value="password123" style="padding-right:48px">
                  <button type="button" class="lp-pw-toggle" id="lp-tog">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="lp-check">
                <input type="checkbox" id="lp-remember">
                <label for="lp-remember">Ingat Saya</label>
              </div>

              <button class="lp-btn" type="submit" ${this.loading ? 'disabled' : ''}>
                ${this.loading ? 'Memproses...' : 'Masuk ke Dashboard'}
              </button>
            </form>
          </div>

          <div class="lp-right">
            <img src="https://wpnejkrfjlblxkcakzrg.supabase.co/storage/v1/object/public/Logo/ChatGPT%20Image%20Jun%2021,%202026,%2011_32_20%20PM.png" alt="Jenna Shop" style="width:100%;height:100%;object-fit:cover;border-radius:20px">
          </div>
        </div>
      </div>
    `
  }

  async bindEvents() {
    this.renderAndBind()
  }

  _bindListeners() {
    const form = document.getElementById('lp-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const email = document.getElementById('lp-email').value
      const password = document.getElementById('lp-pass').value
      this.loading = true
      this.error = ''
      this.renderAndBind()

      try {
        await this.auth.login(email, password)
        this.router.navigate('/')
      } catch (err) {
        this.error = err.message || 'Login gagal. Periksa email dan password.'
        this.loading = false
        this.renderAndBind()
      }
    })

    const toggle = document.getElementById('lp-tog')
    const pw = document.getElementById('lp-pass')
    toggle?.addEventListener('click', () => {
      const svg = toggle.querySelector('svg')
      if (pw.type === 'password') {
        pw.type = 'text'
        svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />'
      } else {
        pw.type = 'password'
        svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />'
      }
    })
  }

  renderAndBind() {
    const app = document.getElementById('app')
    if (app) { app.innerHTML = this.render() }
    this._bindListeners()
  }
}
