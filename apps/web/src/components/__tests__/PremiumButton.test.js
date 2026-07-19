/**
 * Smoke tests: PremiumButton component
 *
 * Verifies button rendering with all variants, icon support, disabled state, and link mode.
 */

import { describe, it, expect, beforeEach } from 'vitest'

let PremiumButton

beforeEach(async () => {
  cleanupDOM?.()
  PremiumButton = (await import('../../components/PremiumButton.js')).PremiumButton
})

describe('PremiumButton', () => {
  it('renders as a button by default', () => {
    const html = PremiumButton({}, 'Click Me')
    renderHTML(html)

    const btn = document.querySelector('button')
    expect(btn).not.toBeNull()
    expect(btn.textContent.trim()).toBe('Click Me')
  })

  it('renders with premium variant class by default', () => {
    const html = PremiumButton({}, 'Premium')
    renderHTML(html)

    const btn = document.querySelector('button')
    expect(btn.classList.contains('btn-premium')).toBe(true)
  })

  it('renders ghost variant', () => {
    const html = PremiumButton({ variant: 'ghost' }, 'Ghost')
    renderHTML(html)

    expect(document.querySelector('.btn-ghost')).not.toBeNull()
  })

  it('renders outline variant', () => {
    const html = PremiumButton({ variant: 'outline' }, 'Outline')
    renderHTML(html)

    expect(document.querySelector('.btn-outline-premium')).not.toBeNull()
  })

  it('renders danger variant', () => {
    const html = PremiumButton({ variant: 'danger' }, 'Danger')
    renderHTML(html)

    expect(document.querySelector('.btn-danger-premium')).not.toBeNull()
  })

  it('renders success variant', () => {
    const html = PremiumButton({ variant: 'success' }, 'Success')
    renderHTML(html)

    expect(document.querySelector('.btn-success-premium')).not.toBeNull()
  })

  it('renders with icon', () => {
    const html = PremiumButton({ icon: '+' }, 'Tambah')
    renderHTML(html)

    const btn = document.querySelector('button')
    expect(btn.innerHTML).toContain('+')
    expect(btn.textContent.trim()).toBe('+Tambah')
  })

  it('renders as an <a> tag when href is provided', () => {
    const html = PremiumButton({ href: '#/sales' }, 'Go to Sales')
    renderHTML(html)

    const link = document.querySelector('a')
    expect(link).not.toBeNull()
    expect(link.getAttribute('href')).toBe('#/sales')
    expect(link.textContent.trim()).toBe('Go to Sales')
  })

  it('renders disabled state', () => {
    const html = PremiumButton({ disabled: true }, 'Disabled')
    renderHTML(html)

    const btn = document.querySelector('button')
    expect(btn.hasAttribute('disabled')).toBe(true)
  })

  it('renders with custom className and id', () => {
    const html = PremiumButton({ className: 'my-btn', id: 'btn-1' }, 'Custom')
    renderHTML(html)

    const btn = document.querySelector('button')
    expect(btn.classList.contains('my-btn')).toBe(true)
    expect(btn.id).toBe('btn-1')
  })

  it('renders submit button type', () => {
    const html = PremiumButton({ type: 'submit' }, 'Submit')
    renderHTML(html)

    const btn = document.querySelector('button')
    expect(btn.getAttribute('type')).toBe('submit')
  })

  it('renders with custom onClick handler using single quotes', () => {
    const html = PremiumButton({ onClick: "alert('clicked')" }, 'Click')
    renderHTML(html)

    const btn = document.querySelector('button')
    expect(btn.getAttribute('onclick')).toBe("alert('clicked')")
  })
})
