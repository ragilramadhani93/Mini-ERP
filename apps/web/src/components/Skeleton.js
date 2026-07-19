/**
 * Skeleton — reusable loading placeholder components.
 *
 * Exports:
 *   SkeletonLine({ width, height, borderRadius, className })
 *   SkeletonCard({ rows, hasAvatar, hasImage, className })
 *   SkeletonTable({ rows, cols })
 *   SkeletonStats({ count })
 *   SkeletonPage() — full page skeleton for quick drop-in
 *
 * Usage:
 *   import { SkeletonCard, SkeletonTable } from '../components/Skeleton.js'
 *   html = SkeletonCard({ rows: 4, hasAvatar: true })
 */

/**
 * Single skeleton line with shimmer animation.
 * @param {object}  opts
 * @param {string}  [opts.width='100%']
 * @param {string}  [opts.height='12px']
 * @param {string}  [opts.borderRadius='4px']
 * @param {string}  [opts.className='']
 * @param {string}  [opts.style='']
 * @returns {string}
 */
export function SkeletonLine(opts = {}) {
  const {
    width = '100%',
    height = '12px',
    borderRadius = '4px',
    className = '',
    style = '',
  } = opts

  const inlineStyles = `width:${width};height:${height};border-radius:${borderRadius};${style}`
  return `<div class="skeleton ${className}" style="${inlineStyles}"></div>`
}

/**
 * Card skeleton with multiple lines and optional avatar/image placeholder.
 * @param {object}  opts
 * @param {number}  [opts.rows=3]         number of text lines inside the card
 * @param {boolean} [opts.hasAvatar=false] show a round avatar placeholder
 * @param {boolean} [opts.hasImage=false]  show a rectangular image placeholder
 * @param {string}  [opts.className='']    extra class for the card wrapper
 * @param {string}  [opts.padding='20px']
 * @returns {string}
 */
export function SkeletonCard(opts = {}) {
  const {
    rows = 3,
    hasAvatar = false,
    hasImage = false,
    className = '',
    padding = '20px',
  } = opts

  const widths = ['100%', '92%', '55%']
  let lines = ''

  if (hasAvatar) {
    lines += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div class="skeleton skeleton-avatar"></div>
      <div style="flex:1">
        ${SkeletonLine({ width: '50%', height: '14px' })}
        ${SkeletonLine({ width: '30%', height: '10px' })}
      </div>
    </div>`
  }

  if (hasImage) {
    lines += `<div class="skeleton" style="width:100%;height:140px;border-radius:10px;margin-bottom:14px"></div>`
  }

  for (let i = 0; i < rows; i++) {
    const w = widths[i % widths.length]
    lines += SkeletonLine({ width: w, height: '12px' })
  }

  return `
    <div class="premium-card ${className}" style="padding:${padding}">
      ${lines}
    </div>
  `
}

/**
 * Table skeleton with header row + body rows.
 * @param {object}   opts
 * @param {number}   [opts.rows=5]      number of body rows
 * @param {number}   [opts.cols=6]      number of columns
 * @param {string[]} [opts.colWidths]   optional array of column widths
 * @returns {string}
 */
export function SkeletonTable(opts = {}) {
  const {
    rows = 5,
    cols = 6,
    colWidths = null,
  } = opts

  const defaultWidths = Array(cols).fill(`${Math.floor(90 / cols)}%`)
  const widths = colWidths || defaultWidths

  const headerCells = widths.map(w => `
    <div class="skeleton" style="width:${w};height:12px;border-radius:4px"></div>
  `).join('')

  const headerRow = `
    <div style="display:flex;gap:16px;padding:12px 16px;background:var(--silk);border-radius:12px 12px 0 0;border-bottom:1px solid var(--slate-100)">
      ${headerCells}
    </div>
  `

  const bodyRows = Array.from({ length: rows }, (_, ri) => {
    const cells = widths.map(w => `
      <div class="skeleton" style="width:${w};height:10px;border-radius:4px"></div>
    `).join('')
    return `
      <div style="display:flex;gap:16px;padding:14px 16px;border-bottom:1px solid var(--slate-100)">
        ${cells}
      </div>
    `
  }).join('')

  return `
    <div class="premium-card" style="overflow:hidden">
      ${headerRow}
      ${bodyRows}
    </div>
  `
}

/**
 * Stats grid skeleton — simulates stat-premium cards.
 * @param {object} opts
 * @param {number} [opts.count=4]  number of stat cards
 * @returns {string}
 */
export function SkeletonStats(opts = {}) {
  const { count = 4 } = opts

  const cards = Array.from({ length: count }, () => `
    <div class="stat-premium" style="padding:20px">
      <div class="skeleton" style="width:36px;height:36px;border-radius:10px;margin-bottom:12px"></div>
      ${SkeletonLine({ width: '50%', height: '10px' })}
      ${SkeletonLine({ width: '70%', height: '22px' })}
      ${SkeletonLine({ width: '40%', height: '10px' })}
    </div>
  `).join('')

  return `<div class="stats-grid">${cards}</div>`
}

/**
 * Full dashboard page skeleton — quick drop-in replacement.
 * @returns {string}
 */
export function SkeletonDashboard() {
  return `
    <div class="dashboard-container" style="opacity:0.6">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:24px">
        <div style="flex:1">
          ${SkeletonLine({ width: '40%', height: '24px' })}
          ${SkeletonLine({ width: '25%', height: '14px' })}
        </div>
        <div style="display:flex;gap:8px">
          ${SkeletonLine({ width: '100px', height: '36px', borderRadius: '10px' })}
          ${SkeletonLine({ width: '90px', height: '36px', borderRadius: '10px' })}
          ${SkeletonLine({ width: '100px', height: '36px', borderRadius: '10px' })}
        </div>
      </div>

      ${SkeletonStats({ count: 4 })}

      <div class="data-grid-2" style="margin-top:24px">
        ${SkeletonCard({ rows: 4, hasImage: true })}
        ${SkeletonCard({ rows: 4 })}
      </div>

      <div class="data-grid-2" style="margin-top:16px;margin-bottom:24px">
        ${SkeletonCard({ rows: 4 })}
        ${SkeletonCard({ rows: 4 })}
      </div>

      <div style="margin-bottom:24px">
        ${SkeletonCard({ rows: 3 })}
      </div>

      ${SkeletonCard({ rows: 5 })}
    </div>
  `
}

/**
 * Sales page skeleton — stat row + table.
 * @returns {string}
 */
export function SkeletonSales() {
  return `
    <div style="padding:24px;opacity:0.6">
      <div class="page-header-premium">
        <div>
          ${SkeletonLine({ width: '180px', height: '26px' })}
          ${SkeletonLine({ width: '260px', height: '14px' })}
        </div>
        <div class="header-actions" style="display:flex;gap:10px">
          ${SkeletonLine({ width: '90px', height: '40px', borderRadius: '10px' })}
          ${SkeletonLine({ width: '110px', height: '40px', borderRadius: '10px' })}
          ${SkeletonLine({ width: '140px', height: '40px', borderRadius: '10px' })}
        </div>
      </div>

      ${SkeletonStats({ count: 5 })}

      ${SkeletonTable({ rows: 6, cols: 7 })}
    </div>
  `
}

/**
 * General purpose page skeleton — header + content.
 * @returns {string}
 */
export function SkeletonPage() {
  return `
    <div style="padding:24px;opacity:0.6">
      <div class="page-header-premium">
        <div>
          ${SkeletonLine({ width: '160px', height: '26px' })}
          ${SkeletonLine({ width: '220px', height: '14px' })}
        </div>
        <div style="display:flex;gap:10px">
          ${SkeletonLine({ width: '80px', height: '36px', borderRadius: '10px' })}
          ${SkeletonLine({ width: '100px', height: '36px', borderRadius: '10px' })}
        </div>
      </div>
      ${SkeletonCard({ rows: 5 })}
    </div>
  `
}
