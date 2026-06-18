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
        .lp *{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif}
        .lp{min-height:100vh;display:flex;justify-content:center;align-items:center;background:linear-gradient(135deg,#f5f7ff,#eef7ff);padding:15px}
        .lpw{width:100%;max-width:1200px;min-height:600px;background:#fff;border-radius:30px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.08);display:flex}
        .lpl{width:42%;padding:35px 50px;display:flex;flex-direction:column;justify-content:center}
        .lplogo{width:140px;margin-bottom:25px}
        .lpl h1{font-size:30px;color:#0f172a;line-height:1.2;margin-bottom:6px;font-weight:700}
        .lpsub{color:#64748b;font-size:14px;line-height:1.5;margin-bottom:20px}
        .lpfg{margin-bottom:14px}
        .lpfg label{display:block;margin-bottom:6px;font-weight:600;color:#334155;font-size:14px}
        .lpin{position:relative}
        .lpin input{width:100%;height:48px;border:1px solid #dbe1ea;border-radius:12px;padding:0 16px;font-size:14px;outline:none;transition:.3s;font-family:'Poppins',sans-serif}
        .lpin input:focus{border-color:#2563eb;box-shadow:0 0 0 4px rgba(37,99,235,.1)}
        .lptog{position:absolute;right:16px;top:50%;transform:translateY(-50%);cursor:pointer;color:#94a3b8;font-size:14px}
        .lpopt{display:flex;justify-content:space-between;align-items:center;margin:8px 0 16px;font-size:13px}
        .lpopt a{color:#2563eb;text-decoration:none;font-weight:500}
        .lpbtn{width:100%;height:48px;border:none;border-radius:12px;background:#f59e0b;color:white;font-size:16px;font-weight:700;cursor:pointer;transition:.3s;font-family:'Poppins',sans-serif}
        .lpbtn:hover{background:#d97706;transform:translateY(-2px)}
        .lpreg{margin-top:30px;text-align:center;color:#64748b;font-size:14px}
        .lpreg a{color:#2563eb;text-decoration:none;font-weight:600}
        .lpr{width:58%;background:linear-gradient(135deg,#dbeafe,#dcfce7);display:flex;justify-content:center;align-items:center;position:relative;overflow:hidden}
        .lpr::before{content:'';position:absolute;width:700px;height:700px;border-radius:50%;background:rgba(255,255,255,.15);right:-200px;top:-150px}
        .lph{width:100%;height:100%;position:relative;z-index:2;display:flex;align-items:center;justify-content:center}
        .lph img{width:100%;height:auto;transform:scale(1.05)}
        @media(max-width:992px){
          .lpw{flex-direction:column}
          .lpl,.lpr{width:100%}
          .lpr{order:-1;min-height:250px;padding:20px}
          .lpl h1{font-size:26px}
          .lpl{padding:25px}
          .lplogo{width:120px}
          .lpsub{font-size:14px}
        }
      </style>

      <div class="lp">
        <div class="lpw">

          <div class="lpl">
            <img class="lplogo"
              src="https://wpnejkrfjlblxkcakzrg.supabase.co/storage/v1/object/public/Logo/ChatGPT%20Image%20Jun%2014,%202026,%2002_58_56%20PM.png"
              alt="StokCuan">

            <h1>Masuk ke Akun Anda</h1>

            <p class="lpsub">
              Kelola stok, penjualan, dan keuntungan toko Anda dalam satu dashboard.
            </p>

            ${this.error ? `
              <div style="margin-bottom:22px;padding:14px 18px;background:#fef2f2;color:#dc2626;border-radius:14px;font-size:14px;border:1px solid #fecaca">
                ${this.error}
              </div>
            ` : ''}

            <form id="lp-form">
              <div class="lpfg">
                <label>Email</label>
                <div class="lpin">
                  <input type="email" id="lp-email" required placeholder="nama@email.com">
                </div>
              </div>

              <div class="lpfg">
                <label>Password</label>
                <div class="lpin">
                  <input type="password" id="lp-pass" required placeholder="Masukkan password" value="password123">
                  <i class="fa-solid fa-eye lptog" id="lp-tog"></i>
                </div>
              </div>

              <div class="lpopt">
                <label style="display:flex;align-items:center;gap:6px;color:#334155">
                  <input type="checkbox" style="width:auto;height:auto">
                  Ingat Saya
                </label>
              </div>

              <button class="lpbtn" type="submit">
                ${this.loading ? 'Memproses...' : 'Masuk ke Dashboard'}
              </button>
            </form>


          </div>

          <div class="lpr">
            <div class="lph">
              <img
                src="https://wpnejkrfjlblxkcakzrg.supabase.co/storage/v1/object/public/Logo/74661e31-4de1-4bbe-b153-5def29639fa7.png"
                alt="StokCuan Illustration">
            </div>
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
      if (pw.type === 'password') {
        pw.type = 'text'
        toggle.classList.remove('fa-eye')
        toggle.classList.add('fa-eye-slash')
      } else {
        pw.type = 'password'
        toggle.classList.remove('fa-eye-slash')
        toggle.classList.add('fa-eye')
      }
    })
  }

  renderAndBind() {
    const app = document.getElementById('app')
    if (app) { app.innerHTML = this.render() }
    this._bindListeners()
  }
}