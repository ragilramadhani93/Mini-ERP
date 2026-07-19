/**
 * PremiumButton — reusable button component.
 *
 * Variants:
 *   'premium' — solid maroon with shadow      (.btn-premium)
 *   'ghost'   — subtle outline                (.btn-ghost)
 *   'outline' — maroon border, hollow         (.btn-outline-premium)
 *   'danger'  — coral/red solid               (.btn-danger-premium)
 *   'success' — emerald/green solid           (.btn-success-premium)
 *
 * Usage:
 *   import { PremiumButton } from '../components/PremiumButton.js'
 *   html = PremiumButton({ variant: 'premium', icon: '+' }, 'Tambah')
 */

const VARIANT_CLASSES = {
  premium: 'btn-premium',
  ghost:   'btn-ghost',
  outline: 'btn-outline-premium',
  danger:  'btn-danger-premium',
  success: 'btn-success-premium',
}

/**
 * @param {object}   opts
 * @param {string}   [opts.variant='premium']
 * @param {string}   [opts.icon='']           emoji or SVG string
 * @param {string}   [opts.className='']
 * @param {string}   [opts.id='']
 * @param {string}   [opts.type='button']     button | submit
 * @param {boolean}  [opts.disabled=false]
 * @param {string}   [opts.onClick='']        JS onclick string
 * @param {string}   [opts.href='']           if set, renders as <a> instead of <button>
 * @param {string}   children   Inner text or HTML
 * @returns {string} HTML string
 */
export function PremiumButton(opts = {}, children = '') {
  const {
    variant = 'premium',
    icon = '',
    className = '',
    id = '',
    type = 'button',
    disabled = false,
    onClick = '',
    href = '',
  } = opts

  const cls = [VARIANT_CLASSES[variant] || VARIANT_CLASSES.premium, className].filter(Boolean).join(' ')
  const idAttr = id ? ` id="${id}"` : ''
  const disabledAttr = disabled ? ' disabled' : ''
  const clickAttr = onClick ? ` onclick="${onClick}"` : ''
  const iconHtml = icon ? `<span style="display:inline-flex;align-items:center">${icon}</span>` : ''
  const gap = icon ? 'gap:6px' : 'gap:6px'

  const inner = `${iconHtml}<span>${children}</span>`

  if (href) {
    return `<a href="${href}" class="${cls}"${idAttr}${clickAttr}>${inner}</a>`
  }

  return `<button type="${type}" class="${cls}"${idAttr}${clickAttr}${disabledAttr}>${inner}</button>`
}
