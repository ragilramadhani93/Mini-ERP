import { toast } from '../components/ToastNotification.js'

export class LoginPage {
  constructor({ auth, router }) {
    this.auth = auth;
    this.router = router;
    this.error = '';
    this.loading = false;
  }

  render() {
    return `
      <style>
        .lp-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--silk-light);
          padding: 16px;
          position: relative;
          overflow: hidden;
        }
        .lp-wrap::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 600px 400px at 10% 20%, rgba(122,59,88,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 500px 300px at 90% 80%, rgba(212,168,83,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 300px 300px at 50% 50%, rgba(122,59,88,0.03) 0%, transparent 70%);
          pointer-events: none;
        }
        /* Geometric pattern overlay */
        .lp-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(30deg, var(--slate-100) 12%, transparent 12.5%, transparent 87%, var(--slate-100) 87.5%),
            linear-gradient(150deg, var(--slate-100) 12%, transparent 12.5%, transparent 87%, var(--slate-100) 87.5%),
            linear-gradient(30deg, var(--slate-100) 12%, transparent 12.5%, transparent 87%, var(--slate-100) 87.5%),
            linear-gradient(150deg, var(--slate-100) 12%, transparent 12.5%, transparent 87%, var(--slate-100) 87.5%);
          background-size: 60px 105px;
          background-position: 0 0, 0 0, 30px 54px, 30px 54px;
          opacity: 0.15;
          pointer-events: none;
        }
        .lp-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 0.5px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 20px 60px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04);
          width: 100%;
          max-width: 440px;
          padding: 48px 40px;
          position: relative;
          z-index: 1;
        }
        .lp-card::before {
          content: '';
          position: absolute;
          top: 0; left: 24px; right: 24px;
          height: 3px;
          background: linear-gradient(90deg, var(--brand-maroon), var(--brand-maroon-light), var(--gold));
          border-radius: 24px 24px 0 0;
        }
        .lp-logo-wrap {
          text-align: center;
          margin-bottom: 32px;
        }
        .lp-brand-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, var(--brand-maroon-dark), var(--brand-maroon-light));
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px var(--brand-maroon-glow);
          margin-bottom: 16px;
        }
        .lp-brand-icon svg {
          width: 26px;
          height: 26px;
          color: white;
        }
        .lp-brand-name {
          font-size: 22px;
          font-weight: 700;
          color: var(--slate-900);
          letter-spacing: -0.02em;
        }
        .lp-brand-name span {
          color: var(--brand-maroon);
        }
        .lp-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--slate-900);
          margin-bottom: 6px;
          letter-spacing: -0.01em;
        }
        .lp-subtitle {
          font-size: 14px;
          color: var(--slate-400);
          margin-bottom: 28px;
          line-height: 1.5;
        }
        .lp-field {
          margin-bottom: 20px;
        }
        .lp-field label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--slate-700);
          margin-bottom: 6px;
        }
        .lp-field input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1.5px solid var(--slate-200);
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
          background: #fff;
        }
        .lp-field input:focus {
          border-color: var(--brand-maroon-light);
          box-shadow: 0 0 0 3px var(--brand-maroon-glow);
        }
        .lp-field input::placeholder {
          color: var(--slate-300);
        }
        .lp-pw-wrap {
          position: relative;
        }
        .lp-pw-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--slate-300);
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s;
        }
        .lp-pw-toggle:hover {
          color: var(--slate-500);
        }
        .lp-pw-toggle svg {
          width: 18px;
          height: 18px;
        }
        .lp-error {
          background: var(--coral-light);
          border: 0.5px solid rgba(232,100,90,0.2);
          color: var(--coral);
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lp-btn {
          width: 100%;
          background: var(--brand-maroon);
          color: white;
          font-weight: 600;
          padding: 14px 16px;
          border-radius: 12px;
          border: none;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px var(--brand-maroon-glow);
        }
        .lp-btn:hover {
          background: var(--brand-maroon-dark);
          box-shadow: 0 6px 20px var(--brand-maroon-glow);
          transform: translateY(-1px);
        }
        .lp-btn:active {
          transform: translateY(0);
        }
        .lp-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .lp-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: var(--slate-400);
        }
        .lp-footer a {
          color: var(--brand-maroon);
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s;
        }
        .lp-footer a:hover {
          color: var(--brand-maroon-dark);
        }
        .lp-demo-hint {
          margin-top: 20px;
          padding: 12px 16px;
          background: var(--silk);
          border-radius: 12px;
          font-size: 12px;
          color: var(--slate-400);
          text-align: center;
          border: 0.5px solid var(--slate-200);
        }
        .lp-demo-hint code {
          color: var(--brand-maroon);
          font-weight: 600;
          background: var(--brand-maroon-subtle);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
        }
        @media (max-width: 480px) {
          .lp-card {
            padding: 32px 24px;
            border-radius: 20px;
          }
        }
      </style>

      <div class="lp-wrap">
        <div class="lp-card">
          <div class="lp-logo-wrap">
            <div class="lp-brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div class="lp-brand-name">Jenna <span>Shop</span></div>
          </div>

          <div class="lp-title">Masuk ke Akun Anda</div>
          <p class="lp-subtitle">Kelola stok, penjualan, dan keuntungan toko Anda dalam satu dashboard.</p>

          ${this.error ? `<div class="lp-error"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${this.error}</div>` : ''}

          <form id="lp-form">
            <div class="lp-field">
              <label for="lp-email">Email</label>
              <input type="email" id="lp-email" required placeholder="nama@email.com" autocomplete="email">
            </div>

            <div class="lp-field">
              <label for="lp-pass">Password</label>
              <div class="lp-pw-wrap">
                <input type="password" id="lp-pass" required placeholder="••••••••••••" value="password123" autocomplete="current-password" style="padding-right:44px">
                <button type="button" class="lp-pw-toggle" id="lp-tog" aria-label="Tampilkan/sembunyikan password">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>

            <button class="lp-btn" type="submit" ${this.loading ? 'disabled' : ''}>
              ${this.loading ? 'Memproses...' : 'Masuk ke Dashboard'}
            </button>
          </form>

          <div class="lp-demo-hint">
            Demo: gunakan <code>email@anda.com</code> / <code>password123</code>
          </div>
        </div>
      </div>
    `;
  }

  async bindEvents() {
    this.renderAndBind();
  }

  _bindListeners() {
    const form = document.getElementById('lp-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('lp-email').value;
      const password = document.getElementById('lp-pass').value;
      this.loading = true;
      this.error = '';
      this.renderAndBind();

      try {
        await this.auth.login(email, password);
        toast.success('Berhasil masuk', `Selamat datang kembali, ${email}`);
        this.router.navigate('/');
      } catch (err) {
        this.error = err.message || 'Login gagal. Periksa email dan password.';
        toast.error('Login gagal', err.message || 'Periksa email dan password Anda.');
        this.loading = false;
        this.renderAndBind();
      }
    });

    const toggle = document.getElementById('lp-tog');
    const pw = document.getElementById('lp-pass');
    toggle?.addEventListener('click', () => {
      const isPassword = pw.type === 'password';
      pw.type = isPassword ? 'text' : 'password';
      toggle.querySelector('svg').style.opacity = isPassword ? '0.5' : '1';
    });
  }

  renderAndBind() {
    const app = document.getElementById('app');
    if (app) app.innerHTML = this.render();
    this._bindListeners();
  }
}
