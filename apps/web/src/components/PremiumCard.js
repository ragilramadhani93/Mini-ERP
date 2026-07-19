/**
 * PremiumCard — reusable card wrapper component.
 *
 * Variants:
 *   'default'         — white card with subtle shadow & border  (.premium-card)
 *   'accent'          — default + 3px gradient top bar           (.premium-card-accent)
 *   'glass'           — frosted glass effect                     (.glass-card)
 *   'ink'             — dark navy background                     (.card-ink)
 *   'gradient-maroon' — maroon gradient with white text          (.card-gradient-maroon)
 *   'gradient-warm'   — warm cream-to-maroon-tint gradient       (.card-gradient-warm)
 *
 * Usage:
 *   import { PremiumCard } from '../components/PremiumCard.js'
 *   html = PremiumCard({ variant: 'accent', padding: '20px' }, '<p>content</p>')
 */

const VARIANT_CLASSES = {
  default:      'premium-card',
  accent:       'premium-card premium-card-accent',
  glass:        'glass-card',
  ink:          'card-ink',
  'gradient-maroon': 'card-gradient-maroon',
  'gradient-warm':   'card-gradient-warm',
}

const VARIANT_STYLES = {
  default:      {},
  accent:       {},
  glass:        {},
  ink:          {},
  'gradient-maroon': {},
  'gradient-warm':   {},
}

/**
 * @param {object}                  options
 * @param {string}                  [options.variant='default']
 * @param {string}                  [options.padding='20px']
 * @param {string}                  [options.className='']
 * @param {string|false}            [options.onClick=false]   JS onclick string, e.g. "myHandler()"
 * @param {string}                  children  Inner HTML content
 * @returns {string}  HTML string
 */
export function PremiumCard(options = {}, children = '') {
  const {
    variant = 'default',
    padding = '20px',
    className = '',
    onClick = false,
    id = '',
  } = options

  const cls = [VARIANT_CLASSES[variant] || VARIANT_CLASSES.default, className].filter(Boolean).join(' ')
  const extras = id ? ` id="${id}"` : ''
  const clickAttr = onClick ? ` onclick="${onClick}"` : ''
  const cursorStyle = onClick ? 'cursor:pointer' : ''

  return `<div class="${cls}"${extras}${clickAttr} style="padding:${padding};${cursorStyle}">${children}</div>`
}
