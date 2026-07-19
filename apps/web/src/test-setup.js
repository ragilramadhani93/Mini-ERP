/**
 * Test setup — runs before every test file.
 *
 * Provides:
 *  - jsdom environment with full DOM API
 *  - Global helper: `renderHTML(html)` — sets document.body.innerHTML
 *  - Global helper: `cleanup()` — resets DOM between tests
 *  - DOM matchers via @testing-library/dom (if available)
 */

import { cleanup as testingCleanup } from '@testing-library/dom'

/**
 * Render an HTML string into document.body for testing.
 * @param {string} html
 */
globalThis.renderHTML = (html) => {
  document.body.innerHTML = `<div id="app">${html}</div>`
}

/**
 * Reset DOM + mocks between tests.
 */
globalThis.cleanupDOM = () => {
  document.body.innerHTML = ''
  document.head.innerHTML = ''
  // Clear any localStorage/state that might leak
  localStorage.clear()
  sessionStorage.clear()
}

// Auto-run cleanup after each test (for vitest environment)
if (typeof afterEach !== 'undefined') {
  afterEach(() => {
    cleanupDOM()
    try { testingCleanup() } catch (e) { /* ignore if not mounted */ }
  })
}

/**
 * Helper: create a mock AuthService stub for component tests.
 * @param {object} overrides
 * @returns {object} AuthService-like stub
 */
globalThis.createMockAuth = (overrides = {}) => {
  const defaults = {
    user: { id: 'test-user-1' },
    profile: {
      id: 'test-user-1',
      full_name: 'Test User',
      email: 'test@example.com',
      roles: { name: 'owner' },
    },
    isAuthenticated: () => true,
    getRole: () => 'owner',
    hasRole: (...roles) => roles.includes('owner'),
    menuPermissions: null,
    logout: async () => {},
    onLogoutCallback: null,
  }
  return { ...defaults, ...overrides }
}

/**
 * Helper: create a mock Router stub.
 * @param {object} overrides
 * @returns {object} Router-like stub
 */
globalThis.createMockRouter = (overrides = {}) => {
  const defaults = {
    currentRoute: { path: '/' },
    navigate: (path) => {
      defaults.currentRoute = { path }
      window.location.hash = path
    },
    getCurrentPath: () => defaults.currentRoute?.path || '/',
  }
  return { ...defaults, ...overrides }
}

/**
 * Helper: create a mock Supabase-like client.
 * @returns {object} Supabase stub
 */
globalThis.createMockSupabase = () => {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            order: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
                then: (resolve) => resolve({ data: [], error: null }),
              }),
              then: (resolve) => resolve({ data: [], error: null }),
            }),
            then: (resolve) => resolve({ data: [], error: null }),
          }),
          then: (resolve) => resolve({ data: [], error: null }),
        }),
        then: (resolve) => resolve({ data: [], error: null }),
      }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
  }
}
