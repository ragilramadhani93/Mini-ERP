/**
 * ToastNotification — global toast notification system.
 *
 * Usage:
 *   import { toast } from '../components/ToastNotification.js'
 *
 *   toast.success('Berhasil', 'Data penjualan berhasil disimpan')
 *   toast.error('Gagal', 'Terjadi kesalahan saat menyimpan')
 *   toast.warning('Perhatian', 'Stok produk hampir habis')
 *   toast.info('Info', 'Data sedang diproses')
 *
 * The toast container is created lazily on first use.
 * Toasts auto-dismiss after 4 seconds (configurable).
 * Multiple toasts stack vertically with slide-in animation.
 */

const TOAST_DURATION = 4000 // ms
let toastIdCounter = 0
let containerEl = null

// Icon SVGs per variant
const ICONS = {
  success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
}

/**
 * Ensure the toast container DOM element exists.
 */
function ensureContainer() {
  if (containerEl && document.body.contains(containerEl)) return
  containerEl = document.createElement('div')
  containerEl.className = 'toast-container'
  containerEl.setAttribute('aria-live', 'polite')
  containerEl.setAttribute('role', 'status')
  document.body.appendChild(containerEl)
}

/**
 * Remove a toast by its ID with exit animation.
 */
function dismissToast(id) {
  const el = document.getElementById(`toast-${id}`)
  if (!el) return
  el.classList.add('removing')
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el)
  }, 250)
}

/**
 * Internal: create and show a toast.
 */
function show(variant, title, message, duration = TOAST_DURATION) {
  ensureContainer()
  const id = ++toastIdCounter
  const iconSvg = ICONS[variant] || ICONS.info
  const variantClass = `toast-${variant}`

  const toastEl = document.createElement('div')
  toastEl.id = `toast-${id}`
  toastEl.className = `toast ${variantClass}`
  toastEl.style.animation = 'none' // reset for re-entry

  toastEl.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-body">
      ${title ? `<div class="toast-title">${title}</div>` : ''}
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" onclick="window.__dismissToast(${id})" aria-label="Tutup notifikasi">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `

  containerEl.appendChild(toastEl)

  // Trigger animation by reflow
  requestAnimationFrame(() => {
    toastEl.style.animation = ''
  })

  // Auto-dismiss
  const timer = setTimeout(() => dismissToast(id), duration)

  // Store timer so we can cancel if manually closed
  toastEl.dataset.timerId = timer
}

// Expose dismiss function globally for inline onclick
window.__dismissToast = dismissToast

/**
 * Public API — ToastManager
 */
export const toast = {
  success: (title, message, duration) => show('success', title, message, duration),
  error: (title, message, duration) => show('error', title, message, duration),
  warning: (title, message, duration) => show('warning', title, message, duration),
  info: (title, message, duration) => show('info', title, message, duration),
  /**
   * Dismiss all visible toasts immediately.
   */
  dismissAll: () => {
    if (!containerEl) return
    const toasts = containerEl.querySelectorAll('.toast')
    toasts.forEach(el => {
      const id = el.id.replace('toast-', '')
      dismissToast(parseInt(id))
    })
  },
  /**
   * Dismiss a specific toast by ID.
   */
  dismiss: (id) => dismissToast(id),
}
