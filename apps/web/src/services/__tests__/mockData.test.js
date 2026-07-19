/**
 * Smoke tests: MockDatabase
 *
 * Verifies that the mock database returns data correctly.
 * This is critical because the app uses mock data in demo mode.
 */

import { describe, it, expect, beforeEach } from 'vitest'

let MockDatabase

beforeEach(async () => {
  MockDatabase = (await import('../../services/mockData.js')).MockDatabase
})

describe('MockDatabase', () => {
  it('creates instance with all mock tables', () => {
    const db = new MockDatabase()
    expect(db.data).toBeDefined()
    expect(db.data.users).toBeDefined()
    expect(db.data.products).toBeDefined()
    expect(db.data.sales).toBeDefined()
    expect(db.data.categories).toBeDefined()
  })

  it('returns all products via query', async () => {
    const db = new MockDatabase()
    const result = await db.from('products').select('*')
    expect(result.data).toBeDefined()
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.data.length).toBeGreaterThan(0)
  })

  it('filters products by column', async () => {
    const db = new MockDatabase()
    const result = await db.from('products').select('*').eq('category_id', 'c1')
    expect(result.data.length).toBeGreaterThan(0)
    result.data.forEach(p => {
      expect(p.category_id).toBe('c1')
    })
  })

  it('orders results', async () => {
    const db = new MockDatabase()
    const result = await db.from('products').select('*').order('name', { ascending: true })
    const names = result.data.map(p => p.name)
    const sorted = [...names].sort()
    expect(names).toEqual(sorted)
  })

  it('limits results', async () => {
    const db = new MockDatabase()
    const result = await db.from('products').select('*').limit(3)
    expect(result.data.length).toBeLessThanOrEqual(3)
  })

  it('returns single record', async () => {
    const db = new MockDatabase()
    const result = await db.from('products').select('*').eq('id', 'p1').single()
    expect(result.data).not.toBeNull()
    expect(result.data.id).toBe('p1')
  })

  it('handles gte and lte filters', async () => {
    const db = new MockDatabase()
    const result = await db.from('products').select('*').gte('current_stock', 100).lte('current_stock', 500)
    result.data.forEach(p => {
      expect(p.current_stock).toBeGreaterThanOrEqual(100)
      expect(p.current_stock).toBeLessThanOrEqual(500)
    })
  })

  it('supports count operation', async () => {
    const db = new MockDatabase()
    const result = await db.from('products').select('*').eq('category_id', 'c1').count()
    expect(result.count).toBeGreaterThan(0)
  })

  it('runs RPC add_stock_movement', async () => {
    const db = new MockDatabase()
    const result = await db.rpc('add_stock_movement', {
      p_product_id: 'p1',
      p_quantity: 10,
      p_type: 'in',
      p_reason: 'testing',
      p_notes: 'Test stock movement',
      p_created_by: 'u1',
    })
    expect(result.data).toBeTruthy()
    expect(result.error).toBeNull()

    // Verify stock was updated
    const product = await db.from('products').select('*').eq('id', 'p1').single()
    expect(product.data.current_stock).toBe(130) // 120 + 10
  })

  it('auth signInWithPassword succeeds for valid users', async () => {
    const db = new MockDatabase()
    const result = await db.auth.signInWithPassword({ email: 'owner@seller.com', password: 'password123' })
    expect(result.data.user).not.toBeNull()
    expect(result.error).toBeNull()
  })

  it('auth signInWithPassword fails for invalid passwords', async () => {
    const db = new MockDatabase()
    const result = await db.auth.signInWithPassword({ email: 'owner@seller.com', password: 'wrong' })
    expect(result.data.user).toBeNull()
    expect(result.error).not.toBeNull()
  })

  it('inserts a new record', () => {
    const db = new MockDatabase()
    const result = db.from('categories').insert({ name: 'Test Category', description: 'Test' })
    return result.then(res => {
      expect(res.data).toBeDefined()
      expect(res.data.name).toBe('Test Category')
    })
  })

  it('updates records', async () => {
    const db = new MockDatabase()
    // update() applies filters from the current query chain
    const updateResult = await db.from('products').eq('id', 'p1').update({ sell_price: 99999 })
    expect(updateResult.data).toBeDefined()

    const result = await db.from('products').select('*').eq('id', 'p1').single()
    expect(result.data.sell_price).toBe(99999)
  })

  it('deletes records', async () => {
    const db = new MockDatabase()
    const beforeCount = (await db.from('categories').select('*')).data.length

    await db.from('categories').eq('id', 'c1').delete().then(() => {})

    const afterCount = (await db.from('categories').select('*')).data.length
    expect(afterCount).toBe(beforeCount - 1)
  })

  it('insert then select returns the inserted record', () => {
    const db = new MockDatabase()
    const result = db.from('categories').insert({ name: 'New Cat' }).select().single()
    return result.then(res => {
      expect(res.data).toBeDefined()
      expect(res.data.name).toBe('New Cat')
    })
  })

  it('upserts new records', async () => {
    const db = new MockDatabase()
    const result = await db.from('categories').upsert({ name: 'Upserted', description: 'New' })
    expect(result.data).toBeDefined()
    expect(result.data.name).toBe('Upserted')
  })

  it('upserts existing records based on onConflict', async () => {
    const db = new MockDatabase()
    const result = await db.from('categories').upsert({ name: 'Fashion', description: 'Updated!' }, { onConflict: 'name' })
    expect(result.data).toBeDefined()
    expect(result.data.description).toBe('Updated!')
  })
})
