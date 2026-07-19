/**
 * Smoke tests: StatPremium component
 *
 * Verifies rendering with different accent colors, icons, and trend indicators.
 */

import { describe, it, expect, beforeEach } from 'vitest'

let StatPremium, HeroKPI

beforeEach(async () => {
  cleanupDOM?.()
  const mod = await import('../../components/StatPremium.js')
  StatPremium = mod.StatPremium
  HeroKPI = mod.HeroKPI
})

describe('StatPremium', () => {
  it('renders with default values', () => {
    const html = StatPremium()
    renderHTML(html)

    expect(document.querySelector('.stat-premium')).not.toBeNull()
    expect(document.querySelector('.stat-premium-value')).not.toBeNull()
  })

  it('renders label and value', () => {
    const html = StatPremium({ label: 'Profit Hari Ini', value: 'Rp 500.000' })
    renderHTML(html)

    expect(document.querySelector('.stat-premium-label').textContent).toBe('Profit Hari Ini')
    expect(document.querySelector('.stat-premium-value').textContent).toContain('Rp 500.000')
  })

  it('renders with accent classes', () => {
    const html = StatPremium({ accent: 'emerald', label: 'Test', value: '100' })
    renderHTML(html)

    const card = document.querySelector('.stat-premium')
    expect(card.classList.contains('accent-emerald')).toBe(true)
  })

  it('renders icon when provided', () => {
    const html = StatPremium({ accent: 'gold', icon: '💰', label: 'Revenue', value: '1jt' })
    renderHTML(html)

    expect(document.querySelector('.stat-premium-icon')).not.toBeNull()
    expect(document.querySelector('.stat-premium-icon').textContent).toContain('💰')
  })

  it('renders trend when provided with direction up', () => {
    const html = StatPremium({
      label: 'Test',
      value: '100',
      trend: { text: '+12% dari kemarin', direction: 'up' },
    })
    renderHTML(html)

    const trendEl = document.querySelector('.stat-premium-trend')
    expect(trendEl).not.toBeNull()
    expect(trendEl.classList.contains('up')).toBe(true)
    expect(trendEl.textContent.replace(/\s+/g, ' ').trim()).toContain('+12%')
  })

  it('renders trend with direction down', () => {
    const html = StatPremium({
      label: 'Test',
      value: '50',
      trend: { text: '-5% dari kemarin', direction: 'down' },
    })
    renderHTML(html)

    const trendEl = document.querySelector('.stat-premium-trend')
    expect(trendEl.classList.contains('down')).toBe(true)
  })

  it('renders trend with direction neutral', () => {
    const html = StatPremium({
      label: 'Test',
      value: '0',
      trend: { text: 'Tidak ada perubahan', direction: 'neutral' },
    })
    renderHTML(html)

    const trendEl = document.querySelector('.stat-premium-trend')
    expect(trendEl.classList.contains('neutral')).toBe(true)
  })

  it('renders with custom className and id', () => {
    const html = StatPremium({ label: 'Test', value: '100', className: 'extra-class', id: 'stat-1' })
    renderHTML(html)

    const card = document.querySelector('.stat-premium')
    expect(card.classList.contains('extra-class')).toBe(true)
    expect(card.id).toBe('stat-1')
  })

  it('renders without trend when not provided', () => {
    const html = StatPremium({ label: 'Test', value: '100' })
    renderHTML(html)

    expect(document.querySelector('.stat-premium-trend')).toBeNull()
  })
})

describe('HeroKPI', () => {
  it('renders with label, value, and subLabel', () => {
    const html = HeroKPI({
      label: 'Omset Hari Ini',
      value: 'Rp 2.500.000',
      subLabel: 'Target 75%',
    })
    renderHTML(html)

    expect(document.querySelector('.card-gradient-maroon')).not.toBeNull()
    expect(document.body.textContent).toContain('Omset Hari Ini')
    expect(document.body.textContent).toContain('Rp 2.500.000')
    expect(document.body.textContent).toContain('Target 75%')
  })

  it('renders progress bar when progress > 0', () => {
    const html = HeroKPI({
      label: 'Progress',
      value: '75%',
      progress: 75,
    })
    renderHTML(html)

    // There should be a progress bar div inside
    const card = document.querySelector('.card-gradient-maroon')
    expect(card.innerHTML).toContain('width:75%')
  })

  it('does not render progress bar when progress is 0', () => {
    const html = HeroKPI({
      label: 'No Progress',
      value: '0',
      progress: 0,
    })
    renderHTML(html)

    expect(document.querySelector('.card-gradient-maroon').innerHTML).not.toContain('progress')
  })

  it('renders icon when provided', () => {
    const html = HeroKPI({
      label: 'Revenue',
      value: '1jt',
      icon: '💰',
    })
    renderHTML(html)

    expect(document.querySelector('.card-gradient-maroon').innerHTML).toContain('💰')
  })
})
