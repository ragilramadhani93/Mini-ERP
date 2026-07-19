/**
 * Smoke tests: AuthService
 *
 * Verifies auth state management, role checks, and logout.
 * Uses the mock Supabase client for testing.
 */

import { describe, it, expect, beforeEach } from 'vitest'

let AuthService

beforeEach(async () => {
  cleanupDOM?.()
  AuthService = (await import('../../services/auth.js')).AuthService
})

describe('AuthService', () => {
  function createMockSupabase() {
    return {
      auth: {
        signInWithPassword: async ({ email, password }) => {
          if (email === 'owner@seller.com' && password === 'password123') {
            return {
              data: {
                user: { id: 'u1', email: 'owner@seller.com' },
                session: { access_token: 'mock' },
              },
              error: null,
            }
          }
          return { data: { user: null, session: null }, error: { message: 'Invalid credentials' } }
        },
        signOut: async () => ({ error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: {
                id: 'u1',
                full_name: 'Test Owner',
                email: 'owner@seller.com',
                roles: { name: 'owner' },
              },
              error: null,
            }),
          }),
        }),
      }),
    }
  }

  it('initializes with no user', () => {
    const auth = new AuthService(createMockSupabase())
    expect(auth.isAuthenticated()).toBe(false)
    expect(auth.user).toBeNull()
    expect(auth.profile).toBeNull()
  })

  it('returns null role when not authenticated', () => {
    const auth = new AuthService(createMockSupabase())
    expect(auth.getRole()).toBeNull()
  })

  it('starts not authenticated', () => {
    const auth = new AuthService(createMockSupabase())
    expect(auth.isAuthenticated()).toBe(false)
  })

  it('hasRole returns false when not authenticated', () => {
    const auth = new AuthService(createMockSupabase())
    expect(auth.hasRole('owner')).toBe(false)
  })

  it('login sets user and profile', async () => {
    const auth = new AuthService(createMockSupabase())
    await auth.login('owner@seller.com', 'password123')

    expect(auth.isAuthenticated()).toBe(true)
    expect(auth.user).not.toBeNull()
    expect(auth.user.email).toBe('owner@seller.com')
  })

  it('logout clears user and profile', async () => {
    const auth = new AuthService(createMockSupabase())
    await auth.login('owner@seller.com', 'password123')
    expect(auth.isAuthenticated()).toBe(true)

    await auth.logout()

    expect(auth.isAuthenticated()).toBe(false)
    expect(auth.user).toBeNull()
    expect(auth.profile).toBeNull()
  })

  it('hasRole works after login', async () => {
    const auth = new AuthService(createMockSupabase())
    await auth.login('owner@seller.com', 'password123')

    expect(auth.hasRole('owner')).toBe(true)
    expect(auth.hasRole('admin')).toBe(false)
    expect(auth.hasRole('owner', 'admin')).toBe(true)
  })

  it('getRole returns correct role after login', async () => {
    const auth = new AuthService(createMockSupabase())
    await auth.login('owner@seller.com', 'password123')

    expect(auth.getRole()).toBe('owner')
  })

  it('calls onLogoutCallback after logout', async () => {
    const auth = new AuthService(createMockSupabase())
    await auth.login('owner@seller.com', 'password123')

    let callbackCalled = false
    auth.onLogoutCallback = () => { callbackCalled = true }

    await auth.logout()

    expect(callbackCalled).toBe(true)
  })

  it('setUser loads profile from database', async () => {
    const auth = new AuthService(createMockSupabase())
    await auth.setUser({ id: 'u1', email: 'owner@seller.com' })

    expect(auth.profile).not.toBeNull()
    expect(auth.profile.full_name).toBe('Test Owner')
    expect(auth.profile.roles.name).toBe('owner')
  })
})
