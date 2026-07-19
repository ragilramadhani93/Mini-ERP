/* ── ConfirmModal ──
 * Async, Promise-based replacement for native window.confirm()
 *
 * Usage:
 *   import { ConfirmModal } from '../components/ConfirmModal.js'
 *   if (await ConfirmModal.show('Hapus data ini?')) { ... }
 *   if (await ConfirmModal.show({ title: 'Konfirmasi', message: 'Yakin?', confirmText: 'Ya, Hapus', cancelText: 'Batal', variant: 'danger' })) { ... }
 */

export const ConfirmModal = {
  /**
   * @param {string|{title?: string, message: string, confirmText?: string, cancelText?: string, variant?: 'danger'|'primary'|'success'}} options
   * @returns {Promise<boolean>}
   */
  show(options) {
    return new Promise((resolve) => {
      const isObj = typeof options === 'object'
      const title = isObj ? (options.title || 'Konfirmasi') : 'Konfirmasi'
      const message = isObj ? options.message : options
      const confirmText = isObj ? (options.confirmText || 'Ya') : 'Ya'
      const cancelText = isObj ? (options.cancelText || 'Batal') : 'Batal'
      const variant = isObj ? (options.variant || 'primary') : 'primary'

      const confirmClass = variant === 'danger' ? 'modal-confirm-btn-danger'
        : variant === 'success' ? 'modal-confirm-btn-success'
        : 'modal-confirm-btn-primary'

      const overlay = document.createElement('div')
      overlay.className = 'modal-premium-overlay'
      overlay.style.animation = 'modalFadeIn 0.15s ease'
      overlay.innerHTML = `
        <div class="modal-premium" style="max-width:420px;animation:modalSlideUp 0.2s ease">
          <div class="modal-premium-body" style="text-align:center;padding:32px 24px 24px">
            <div class="confirm-icon ${variant}">
              ${variant === 'danger'
                ? `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
                : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
              }
            </div>
            <h3 class="modal-confirm-title">${title}</h3>
            <p class="modal-confirm-message">${message}</p>
          </div>
          <div class="modal-premium-footer" style="justify-content:center;gap:12px;padding:16px 24px 24px">
            <button class="modal-confirm-btn-cancel" id="confirm-cancel">${cancelText}</button>
            <button class="${confirmClass}" id="confirm-ok">${confirmText}</button>
          </div>
        </div>
      `

      document.body.appendChild(overlay)

      const cleanup = (result) => {
        overlay.style.opacity = '0'
        overlay.style.transition = 'opacity 0.15s ease'
        setTimeout(() => {
          if (document.body.contains(overlay)) document.body.removeChild(overlay)
          resolve(result)
        }, 150)
      }

      // Defer to let the DOM render, then focus
      requestAnimationFrame(() => {
        document.getElementById('confirm-ok')?.focus()
      })

      document.getElementById('confirm-ok')?.addEventListener('click', () => cleanup(true))
      document.getElementById('confirm-cancel')?.addEventListener('click', () => cleanup(false))

      // Click outside → cancel
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup(false)
      })

      // Keyboard: Enter → confirm, Escape → cancel
      const keyHandler = (e) => {
        if (e.key === 'Escape') { cleanup(false) }
        if (e.key === 'Enter') { cleanup(true) }
      }
      document.addEventListener('keydown', keyHandler)

      // Clean up key listener
      const origCleanup = cleanup
      const cleanupWithKey = (result) => {
        document.removeEventListener('keydown', keyHandler)
        origCleanup(result)
      }
      overlay.cleanup = cleanupWithKey

      // Override the cleanup
      document.getElementById('confirm-ok')?.addEventListener('click', () => cleanupWithKey(true))
      document.getElementById('confirm-cancel')?.addEventListener('click', () => cleanupWithKey(false))
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanupWithKey(false)
      })
    })
  }
}
