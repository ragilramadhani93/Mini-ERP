/**
 * Smoke tests: Skeleton components
 *
 * Verifies skeleton loading placeholders render correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest'

let mod

beforeEach(async () => {
  cleanupDOM?.()
  mod = await import('../../components/Skeleton.js')
})

describe('SkeletonLine', () => {
  it('renders a div with skeleton class', () => {
    const html = mod.SkeletonLine()
    renderHTML(html)

    const el = document.querySelector('.skeleton')
    expect(el).not.toBeNull()
  })

  it('accepts custom width and height', () => {
    const html = mod.SkeletonLine({ width: '50%', height: '20px' })
    renderHTML(html)

    const el = document.querySelector('.skeleton')
    expect(el.style.width).toBe('50%')
    expect(el.style.height).toBe('20px')
  })
})

describe('SkeletonCard', () => {
  it('renders a card with skeleton lines', () => {
    const html = mod.SkeletonCard({ rows: 3 })
    renderHTML(html)

    expect(document.querySelector('.premium-card')).not.toBeNull()
    // Should have 3 skeleton lines
    expect(document.querySelectorAll('.skeleton').length).toBe(3)
  })

  it('renders with avatar when hasAvatar is true', () => {
    const html = mod.SkeletonCard({ rows: 2, hasAvatar: true })
    renderHTML(html)

    expect(document.querySelector('.skeleton-avatar')).not.toBeNull()
  })

  it('renders with image when hasImage is true', () => {
    const html = mod.SkeletonCard({ rows: 2, hasImage: true })
    renderHTML(html)

    // The image is a skeleton div with 140px height
    const skeletonEls = document.querySelectorAll('.skeleton')
    const hasImageSkeleton = Array.from(skeletonEls).some(el => el.style.height === '140px')
    expect(hasImageSkeleton).toBe(true)
  })
})

describe('SkeletonTable', () => {
  it('renders table with header and rows', () => {
    const html = mod.SkeletonTable({ rows: 3, cols: 4 })
    renderHTML(html)

    expect(document.querySelector('.premium-card')).not.toBeNull()
    // 1 header row + 3 body rows = 4 skeleton elements per row
    // Total skeletons should be present
    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
  })
})

describe('SkeletonStats', () => {
  it('renders stat cards', () => {
    const html = mod.SkeletonStats({ count: 4 })
    renderHTML(html)

    expect(document.querySelector('.stats-grid')).not.toBeNull()
  })
})

describe('SkeletonDashboard', () => {
  it('renders full dashboard skeleton', () => {
    const html = mod.SkeletonDashboard()
    renderHTML(html)

    expect(document.querySelector('.dashboard-container')).not.toBeNull()
    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(5)
  })
})

describe('SkeletonSales', () => {
  it('renders sales page skeleton', () => {
    const html = mod.SkeletonSales()
    renderHTML(html)

    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(5)
  })
})

describe('SkeletonPage', () => {
  it('renders general page skeleton', () => {
    const html = mod.SkeletonPage()
    renderHTML(html)

    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
  })
})
