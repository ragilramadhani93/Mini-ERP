/**
 * BadgePremium — reusable badge / tag component.
 *
 * Variants:
 *   'lunas'   — green (success / completed)
 *   'belum'   — amber (pending / incomplete)
 *   'maroon'  — brand maroon
 *   'gold'    — gold accent
 *   'coral'   — coral / danger
 *
 * Usage:
 *   import { BadgePremium } from '../components/BadgePremium.js'
 *   html = BadgePremium({ variant: 'lunas' }, 'Lunas')
 *   html = BadgePremium({ variant: 'maroon', icon: '📦' }, 'Diterima')
 */

const VARIANT_CLASSES = {
  lunas:  'badge-premium badge-lunas',
  belum:  'badge-premium badge-belum',
  maroon: 'badge-premium badge-maroon',
  gold:   'badge-premium badge-gold',
  coral:  'badge-premium badge-coral',
}

/**
 * @param {object}  opts
 * @param {string}  [opts.variant='maroon']
 * @param {string}  [opts.icon='']        optional emoji / inline SVG
 * @param {string}  [opts.className='']
 * @param {string}  children   Inner text or HTML
 * @returns {string} HTML string
 */
export function BadgePremium(opts = {}, children = '') {
  const {
    variant = 'maroon',
    icon = '',
    className = '',
  } = opts

  const cls = [VARIANT_CLASSES[variant] || VARIANT_CLASSES.maroon, className].filter(Boolean).join(' ')
  const iconHtml = icon ? `<span style="display:inline-flex">${icon}</span>` : ''
  const gap = icon ? 'gap:4px' : ''

  return `<span class="${cls}" style="display:inline-flex;align-items:center;${gap}">${iconHtml}${children}</span>`
}
