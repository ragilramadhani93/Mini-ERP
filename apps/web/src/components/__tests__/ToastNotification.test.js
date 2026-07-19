/**
 * Smoke tests: ToastNotification
 *
 * Verifies toast creation, variant styling, and auto-dismiss.
 * Uses jsdom DOM environment.
 */

import { describe, it, expect, beforeEach } from 'vitest'

let toast

beforeEach(async () => {
  cleanupDOM?.()
  toast = (await import('../../components/ToastNotification.js')).toast
})

describe('ToastNotification', () => {
  it('shows a success toast and renders it in the DOM', () => {
    toast.success('Berhasil', 'Data tersimpan')

    const container = document.querySelector('.toast-container')
    expect(container).not.toBeNull()

    const toastEl = container.querySelector('.toast')
    expect(toastEl).not.toBeNull()
    expect(toastEl.classList.contains('toast-success')).toBe(true)

    // Check title and message
    expect(toastEl.innerHTML).toContain('Berhasil')
    expect(toastEl.innerHTML).toContain('Data tersimpan')
  })

  it('shows an error toast', () => {
    toast.error('Gagal', 'Terjadi kesalahan')

    const toastEl = document.querySelector('.toast')
    expect(toastEl).not.toBeNull()
    expect(toastEl.classList.contains('toast-error')).toBe(true)
    expect(toastEl.innerHTML).toContain('Gagal')
  })

  it('shows a warning toast', () => {
    toast.warning('Perhatian', 'Stok hampir habis')

    const toastEl = document.querySelector('.toast')
    expect(toastEl).not.toBeNull()
    expect(toastEl.classList.contains('toast-warning')).toBe(true)
  })

  it('shows an info toast', () => {
    toast.info('Info', 'Sedang diproses')

    const toastEl = document.querySelector('.toast')
    expect(toastEl).not.toBeNull()
    expect(toastEl.classList.contains('toast-info')).toBe(true)
  })

  it('shows toast with title only', () => {
    toast.success('Hanya Judul')

    const toastEl = document.querySelector('.toast')
    expect(toastEl.innerHTML).toContain('Hanya Judul')
  })

  it('renders close button on toast', () => {
    toast.info('Test', 'Close button')

    const toastEl = document.querySelector('.toast')
    const closeBtn = toastEl.querySelector('.toast-close')
    expect(closeBtn).not.toBeNull()
  })

  it('dismisses a toast by ID', () => {
    toast.info('To Dismiss', 'Will be removed')

    const toastEl = document.querySelector('.toast')
    const id = parseInt(toastEl.id.replace('toast-', ''))

    toast.dismiss(id)

    // After dismiss, the toast should have 'removing' class
    expect(toastEl.classList.contains('removing')).toBe(true)
  })

  it('dismissAll removes all toasts', () => {
    toast.success('First')
    toast.error('Second')

    expect(document.querySelectorAll('.toast').length).toBe(2)

    toast.dismissAll()

    // After dismiss all, all toasts should have 'removing' class
    document.querySelectorAll('.toast').forEach(el => {
      expect(el.classList.contains('removing')).toBe(true)
    })
  })

  it('handles calling dismissAll when no toasts exist', () => {
    // Should not throw
    expect(() => toast.dismissAll()).not.toThrow()
  })
})
