/**
 * StatPremium — reusable stat / KPI card component.
 *
 * Accent colors: 'maroon', 'emerald', 'amber', 'gold', 'coral'
 *
 * Usage:
 *   import { StatPremium } from '../components/StatPremium.js'
 *   html = StatPremium({
 *     accent: 'emerald',
 *     icon: '💰',
 *     label: 'Profit Hari Ini',
 *     value: 'Rp 500.000',
 *     trend: { text: '+12% dari kemarin', direction: 'up' }
 *   })
 *
 * Trend direction: 'up' (green), 'down' (red), 'neutral' (grey)
 */

const ACCENT_CLASS_MAP = {
  maroon:  'accent-maroon',
  emerald: 'accent-emerald',
  amber:   'accent-amber',
  gold:    'accent-gold',
  coral:   'accent-coral',
}

const ICON_CLASS_MAP = {
  maroon:  'maroon',
  emerald: 'emerald',
  amber:   'amber',
  gold:    'gold',
  coral:   'coral',
}

const TREND_ICON_SVG = {
  up:      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>',
  down:    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>',
  neutral: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
}

/**
 * @param {object}  opts
 * @param {string}  [opts.accent='maroon']
 * @param {string}  [opts.icon='']
 * @param {string}  [opts.label='']
 * @param {string}  [opts.value='0']
 * @param {object}  [opts.trend=null]    { text: string, direction: 'up'|'down'|'neutral' }
 * @param {string}  [opts.className='']
 * @param {string}  [opts.id='']
 * @returns {string} HTML
 */
export function StatPremium(opts = {}) {
  const {
    accent = 'maroon',
    icon = '',
    label = '',
    value = '0',
    trend = null,
    className = '',
    id = '',
  } = opts

  const accentClass = ACCENT_CLASS_MAP[accent] || 'accent-maroon'
  const iconClass = ICON_CLASS_MAP[accent] || 'maroon'
  const idAttr = id ? ` id="${id}"` : ''

  const trendHtml = trend
    ? `<span class="stat-premium-trend ${trend.direction || 'neutral'}">${TREND_ICON_SVG[trend.direction] || TREND_ICON_SVG.neutral} ${trend.text}</span>`
    : ''

  const iconHtml = icon
    ? `<div class="stat-premium-icon ${iconClass}">${icon}</div>`
    : ''

  return `
    <div class="stat-premium ${accentClass}${className ? ' ' + className : ''}"${idAttr}>
      ${iconHtml}
      <div class="stat-premium-label">${label}</div>
      <div class="stat-premium-value">${value}</div>
      ${trendHtml}
    </div>
  `
}

/**
 * HeroKPI — large hero-style KPI card with maroon gradient background.
 *
 * @param {object}  opts
 * @param {string}  [opts.label='']
 * @param {string}  [opts.value='0']
 * @param {string}  [opts.subLabel='']
 * @param {number}  [opts.progress=0]      0-100 progress bar value
 * @param {string}  [opts.icon='']
 * @param {string}  [opts.className='']
 * @returns {string} HTML
 */
export function HeroKPI(opts = {}) {
  const {
    label = '',
    value = '0',
    subLabel = '',
    progress = 0,
    icon = '',
    className = '',
  } = opts

  const progressHtml = progress > 0
    ? `<div style="width:180px;height:4px;background:rgba(255,255,255,0.15);border-radius:4px;margin-top:8px;overflow:hidden">
        <div style="height:100%;background:rgba(255,255,255,0.5);border-radius:4px;width:${Math.min(progress, 100)}%;transition:width 0.5s ease"></div>
       </div>`
    : ''

  const iconHtml = icon
    ? `<div style="width:56px;height:56px;background:rgba(255,255,255,0.1);border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon}</div>`
    : ''

  return `
    <div class="card-gradient-maroon ${className}" style="padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:13px;font-weight:500;opacity:0.85">${label}</div>
          <div style="font-size:34px;font-weight:700;margin-top:8px;letter-spacing:-0.02em">${value}</div>
          ${subLabel ? `<div style="font-size:13px;opacity:0.8;margin-top:4px">${subLabel}</div>` : ''}
          ${progressHtml}
        </div>
        ${iconHtml}
      </div>
    </div>
  `
}
