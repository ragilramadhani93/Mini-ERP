/**
 * Smoke tests: Router
 *
 * Verifies that Router correctly handles:
 *  - Navigation to public routes
 *  - Navigation to protected routes (with/without auth)
 *  - Role-based access control
 *  - Fallback to '/' for unknown routes
 */

import { describe, it, expect, beforeEach } from 'vitest'

// We import the Router and mock auth service
// Since Router is a plain class with no DOM dependencies at construction,
// we can import it directly (no jsdom needed for these tests)

let Router

beforeEach(async () => {
  cleanupDOM?.()
  window.location.hash = ''
  Router = (await import('../../utils/router.js')).Router
})

describe('Router', () => {
  // Match the real app: Dashboard (/) accessible by all authenticated roles,
  // while sales is restricted to owner/admin only.
  const routes = {
    '/login': { component: class {}, public: true },
    '/register': { component: class {}, public: true },
    '/': { component: class {}, roles: ['owner', 'admin', 'staff_gudang', 'staff_keuangan'] },
    '/sales': { component: class {}, roles: ['owner', 'admin'] },
    '/products': { component: class {}, roles: ['owner', 'admin', 'staff_gudang'] },
  }

  function makeAuth(overrides = {}) {
    return {
      user: null,
      profile: null,
      isAuthenticated: () => false,
      getRole: () => null,
      hasRole: (...roles) => false,
      ...overrides,
    }
  }

  it('navigates to public routes without authentication', () => {
    const auth = makeAuth()
    const router = new Router(routes, auth)
    let lastRoute = null
    router.onRouteChange = (route) => { lastRoute = route }

    router.navigate('/login')

    expect(lastRoute).not.toBeNull()
    expect(lastRoute.path).toBe('/login')
    expect(lastRoute.public).toBe(true)
  })

  it('redirects to /login when unauthenticated user tries protected route', () => {
    const auth = makeAuth()
    const router = new Router(routes, auth)
    let navigatedPaths = []
    const originalNavigate = router.navigate.bind(router)
    // Spy on navigate
    router.navigate = (path) => {
      navigatedPaths.push(path)
      return originalNavigate(path)
    }

    router.navigate('/sales')

    // Should have tried /sales then redirected to /login
    expect(navigatedPaths).toContain('/login')
  })

  it('allows authenticated user with correct role to access protected route', () => {
    const auth = makeAuth({
      isAuthenticated: () => true,
      getRole: () => 'admin',
      hasRole: (...roles) => roles.includes('admin'),
    })
    const router = new Router(routes, auth)
    let lastRoute = null
    router.onRouteChange = (route) => { lastRoute = route }

    router.navigate('/sales')

    expect(lastRoute).not.toBeNull()
    expect(lastRoute.path).toBe('/sales')
  })

  it('redirects authenticated user without correct role to / redirect', () => {
    // staff_gudang can access '/' but not '/sales'
    const auth = makeAuth({
      isAuthenticated: () => true,
      getRole: () => 'staff_gudang',
      hasRole: (...roles) => roles.includes('staff_gudang'),
    })
    const router = new Router(routes, auth)

    router.navigate('/sales')

    // staff_gudang doesn't have access to /sales, should redirect to '/'
    expect(window.location.hash).toBe('#/')
  })

  it('falls back to / for unknown routes', () => {
    const auth = makeAuth({
      isAuthenticated: () => true,
      getRole: () => 'owner',
      hasRole: (...roles) => roles.includes('owner'),
    })
    const router = new Router(routes, auth)

    router.navigate('/nonexistent-route')

    expect(window.location.hash).toBe('#/')
  })

  it('sets window.location.hash on navigation', () => {
    const auth = makeAuth()
    const router = new Router(routes, auth)

    router.navigate('/register')

    expect(window.location.hash).toBe('#/register')
  })

  it('calls onRouteChange callback when navigating', () => {
    const auth = makeAuth({
      isAuthenticated: () => true,
      getRole: () => 'admin',
      hasRole: (...roles) => roles.includes('admin'),
    })
    const router = new Router(routes, auth)
    let called = false
    router.onRouteChange = (route) => {
      called = true
      expect(route.path).toBe('/')
    }

    router.navigate('/')

    expect(called).toBe(true)
  })

  it('returns current path via getCurrentPath()', () => {
    const auth = makeAuth()
    const router = new Router(routes, auth)

    router.navigate('/login')

    expect(router.getCurrentPath()).toBe('/login')
  })
})
