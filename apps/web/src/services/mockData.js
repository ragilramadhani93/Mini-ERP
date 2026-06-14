const now = new Date()
const daysAgo = (d) => { const date = new Date(); date.setDate(date.getDate() - d); return date.toISOString() }

export const mockData = {
  roles: [
    { id: 'r1', name: 'owner', description: 'Pemilik' },
    { id: 'r2', name: 'admin', description: 'Admin' },
    { id: 'r3', name: 'staff_gudang', description: 'Staff Gudang' },
    { id: 'r4', name: 'staff_keuangan', description: 'Staff Keuangan' }
  ],
  users: [
    { id: 'u1', email: 'owner@seller.com', full_name: 'Pemilik Toko', phone: '081234567890', role_id: 'r1', is_active: true, roles: { name: 'owner' } },
    { id: 'u2', email: 'admin@seller.com', full_name: 'Administrator', phone: '081234567891', role_id: 'r2', is_active: true, roles: { name: 'admin' } },
    { id: 'u3', email: 'gudang@seller.com', full_name: 'Staff Gudang', phone: '081234567892', role_id: 'r3', is_active: true, roles: { name: 'staff_gudang' } },
    { id: 'u4', email: 'keuangan@seller.com', full_name: 'Staff Keuangan', phone: '081234567893', role_id: 'r4', is_active: true, roles: { name: 'staff_keuangan' } }
  ],
  categories: [
    { id: 'c1', name: 'Makanan & Minuman', description: 'Produk makanan dan minuman' },
    { id: 'c2', name: 'Fashion', description: 'Pakaian, aksesoris fashion' },
    { id: 'c3', name: 'Elektronik', description: 'Barang elektronik dan aksesoris' },
    { id: 'c4', name: 'Kesehatan', description: 'Produk kesehatan dan kecantikan' },
    { id: 'c5', name: 'Rumah Tangga', description: 'Perlengkapan rumah tangga' },
    { id: 'c6', name: 'Stationery', description: 'Alat tulis dan perlengkapan kantor' }
  ],
  suppliers: [
    { id: 's1', supplier_name: 'PT Sumber Makmur', contact_person: 'Budi Santoso', phone: '081234567890', email: 'budi@sumbermakmur.com', address: 'Jl. Industri Raya No. 45, Jakarta' },
    { id: 's2', supplier_name: 'CV Berkah Jaya', contact_person: 'Siti Rahmawati', phone: '087654321098', email: 'siti@berkahjaya.com', address: 'Jl. Merdeka No. 12, Bandung' },
    { id: 's3', supplier_name: 'UD Karya Mandiri', contact_person: 'Ahmad Hidayat', phone: '085612345678', email: 'ahmad@karyamandiri.com', address: 'Jl. A. Yani No. 78, Surabaya' },
    { id: 's4', supplier_name: 'Toko Elektronik Central', contact_person: 'Dewi Lestari', phone: '082134567890', email: 'dewi@centralelektronik.com', address: 'Jl. Diponegoro No. 34, Semarang' }
  ],
  products: [
    { id: 'p1', sku: 'PRD-001', name: 'Kopi Arabica 250gr', description: 'Kopi arabica premium sangrai', category_id: 'c1', supplier_id: 's1', cost_price: 35000, sell_price: 55000, current_stock: 120, min_stock: 20, is_active: true },
    { id: 'p2', sku: 'PRD-002', name: 'T-Shirt Cotton Premium', description: 'Kaos katun 30s', category_id: 'c2', supplier_id: 's2', cost_price: 45000, sell_price: 85000, current_stock: 80, min_stock: 15, is_active: true },
    { id: 'p3', sku: 'PRD-003', name: 'Mouse Wireless', description: 'Mouse wireless 2.4GHz', category_id: 'c3', supplier_id: 's4', cost_price: 25000, sell_price: 55000, current_stock: 45, min_stock: 10, is_active: true },
    { id: 'p4', sku: 'PRD-004', name: 'Handbody 100ml', description: 'Handbody lotion moisturizer', category_id: 'c4', supplier_id: 's3', cost_price: 12000, sell_price: 25000, current_stock: 200, min_stock: 30, is_active: true },
    { id: 'p5', sku: 'PRD-005', name: 'Sabun Cuci Piring 450ml', description: 'Sabun cair cuci piring', category_id: 'c5', supplier_id: 's3', cost_price: 8000, sell_price: 15000, current_stock: 300, min_stock: 50, is_active: true },
    { id: 'p6', sku: 'PRD-006', name: 'Cable USB-C 1m', description: 'Kabel USB-C fast charging', category_id: 'c3', supplier_id: 's4', cost_price: 10000, sell_price: 25000, current_stock: 5, min_stock: 10, is_active: true },
    { id: 'p7', sku: 'PRD-007', name: 'Buku Catatan A5', description: 'Buku catatan isi 100 lembar', category_id: 'c6', supplier_id: null, cost_price: 5000, sell_price: 12000, current_stock: 150, min_stock: 20, is_active: true },
    { id: 'p8', sku: 'PRD-008', name: 'Kacamata Hitam', description: 'Kacamata hitam fashion', category_id: 'c2', supplier_id: 's2', cost_price: 15000, sell_price: 35000, current_stock: 60, min_stock: 15, is_active: true }
  ],
  stock_movements: [
    { id: 'sm1', product_id: 'p1', quantity: 130, type: 'in', reason: 'purchase', notes: 'Pembelian awal', created_at: daysAgo(30) },
    { id: 'sm2', product_id: 'p2', quantity: 80, type: 'in', reason: 'purchase', notes: 'Pembelian awal', created_at: daysAgo(28) },
    { id: 'sm3', product_id: 'p3', quantity: 50, type: 'in', reason: 'purchase', notes: 'Pembelian awal', created_at: daysAgo(25) },
    { id: 'sm4', product_id: 'p1', quantity: 15, type: 'out', reason: 'sale', notes: 'Penjualan', created_at: daysAgo(5) },
    { id: 'sm5', product_id: 'p3', quantity: 10, type: 'out', reason: 'sale', notes: 'Penjualan', created_at: daysAgo(4) },
    { id: 'sm6', product_id: 'p4', quantity: 10, type: 'out', reason: 'sale', notes: 'Penjualan', created_at: daysAgo(3) },
    { id: 'sm7', product_id: 'p5', quantity: 15, type: 'out', reason: 'sale', notes: 'Penjualan', created_at: daysAgo(2) },
    { id: 'sm8', product_id: 'p2', quantity: 5, type: 'out', reason: 'sale', notes: 'Penjualan', created_at: daysAgo(1) }
  ],
  stock_opname: [],
  purchases: [
    { id: 'po1', po_number: 'PO-2406-0001', supplier_id: 's1', total_amount: 3575000, status: 'received', notes: 'Pembelian awal', created_at: daysAgo(30) },
    { id: 'po2', po_number: 'PO-2406-0002', supplier_id: 's2', total_amount: 2550000, status: 'received', notes: 'Stok awal pakaian', created_at: daysAgo(28) },
    { id: 'po3', po_number: 'PO-2406-0003', supplier_id: 's4', total_amount: 575000, status: 'approved', notes: 'Pending approval', created_at: daysAgo(2) }
  ],
  purchase_items: [
    { id: 'pi1', purchase_id: 'po1', product_id: 'p1', quantity: 130, unit_price: 35000 },
    { id: 'pi2', purchase_id: 'po2', product_id: 'p2', quantity: 80, unit_price: 45000 },
    { id: 'pi3', purchase_id: 'po3', product_id: 'p3', quantity: 10, unit_price: 25000 },
    { id: 'pi4', purchase_id: 'po3', product_id: 'p6', quantity: 20, unit_price: 10000 }
  ],
  sales: [
    { id: 'sa1', invoice_number: 'INV-2406-0001', customer_name: 'Rumah Tangga Bahagia', total_amount: 225000, payment_method: 'cash', created_at: daysAgo(5) },
    { id: 'sa2', invoice_number: 'INV-2406-0002', customer_name: 'Toko Elektronik Jaya', total_amount: 550000, payment_method: 'bank_transfer', created_at: daysAgo(4) },
    { id: 'sa3', invoice_number: 'INV-2406-0003', customer_name: 'Warung Makan Sederhana', total_amount: 475000, payment_method: 'cash', created_at: daysAgo(2) },
    { id: 'sa4', invoice_number: 'INV-2406-0004', customer_name: 'Perorangan', total_amount: 147500, payment_method: 'cash', created_at: daysAgo(1) }
  ],
  sale_items: [
    { id: 'si1', sale_id: 'sa1', product_id: 'p4', quantity: 10, unit_price: 25000, discount: 0 },
    { id: 'si2', sale_id: 'sa1', product_id: 'p5', quantity: 15, unit_price: 15000, discount: 0 },
    { id: 'si3', sale_id: 'sa2', product_id: 'p3', quantity: 10, unit_price: 55000, discount: 0 },
    { id: 'si4', sale_id: 'sa3', product_id: 'p1', quantity: 15, unit_price: 55000, discount: 25000 },
    { id: 'si5', sale_id: 'sa4', product_id: 'p2', quantity: 5, unit_price: 85000, discount: 0 }
  ],
  cash_transactions: [
    { id: 'ct1', type: 'in', category: 'sales', amount: 285000, description: 'Penjualan ke Rumah Tangga Bahagia', created_at: daysAgo(5) },
    { id: 'ct2', type: 'in', category: 'sales', amount: 550000, description: 'Penjualan ke Toko Elektronik Jaya', created_at: daysAgo(4) },
    { id: 'ct3', type: 'in', category: 'sales', amount: 475000, description: 'Penjualan ke Warung Makan Sederhana', created_at: daysAgo(2) },
    { id: 'ct4', type: 'in', category: 'sales', amount: 147500, description: 'Penjualan perorangan', created_at: daysAgo(1) },
    { id: 'ct5', type: 'out', category: 'purchase', amount: 3575000, description: 'Pembelian dari PT Sumber Makmur', created_at: daysAgo(30) },
    { id: 'ct6', type: 'out', category: 'purchase', amount: 2550000, description: 'Pembelian dari CV Berkah Jaya', created_at: daysAgo(28) },
    { id: 'ct7', type: 'out', category: 'operational', amount: 500000, description: 'Sewa tempat', created_at: daysAgo(15) },
    { id: 'ct8', type: 'out', category: 'salary', amount: 3000000, description: 'Gaji staff', created_at: daysAgo(10) },
    { id: 'ct9', type: 'out', category: 'advertising', amount: 200000, description: 'Iklan Shopee', created_at: daysAgo(7) },
    { id: 'ct10', type: 'in', category: 'other_income', amount: 100000, description: 'Jasa titip', created_at: daysAgo(3) }
  ],
  payables: [
    { id: 'pay1', due_type: 'supplier', due_id: 's1', reference_type: 'purchase', reference_id: 'po1', amount: 3575000, due_date: daysAgo(-15), status: 'paid', paid_amount: 3575000 },
    { id: 'pay2', due_type: 'supplier', due_id: 's2', reference_type: 'purchase', reference_id: 'po2', amount: 2550000, due_date: daysAgo(-10), status: 'paid', paid_amount: 2550000 },
    { id: 'pay3', due_type: 'supplier', due_id: 's4', reference_type: 'purchase', reference_id: 'po3', amount: 575000, due_date: daysAgo(14), status: 'pending', paid_amount: 0 }
  ]
}

const joinRelations = (items, relations) => {
  return items.map(item => {
    const joined = { ...item }
    for (const [key, table, foreignKey, alias] of relations) {
      const fk = foreignKey || key.replace('_id', '')
      joined[key.replace('_id', '')] = items.find(i => i.id === item[key]) || null
    }
    return joined
  })
}

export class MockDatabase {
  constructor() {
    this.data = JSON.parse(JSON.stringify(mockData))
    this.idCounter = 100
  }

  nextId() { return `mock_${++this.idCounter}` }

  from(table) {
    const data = this.data[table] || []
    const query = new MockQuery(data, this)
    return query
  }

  rpc(fn, params) {
    if (fn === 'add_stock_movement') {
      const movement = {
        id: this.nextId(),
        product_id: params.p_product_id,
        quantity: params.p_quantity,
        type: params.p_type,
        reason: params.p_reason,
        notes: params.p_notes,
        created_by: params.p_created_by,
        created_at: new Date().toISOString()
      }
      this.data.stock_movements.unshift(movement)

      const product = this.data.products.find(p => p.id === params.p_product_id)
      if (product) {
        if (params.p_type === 'in') product.current_stock += params.p_quantity
        else product.current_stock = Math.max(0, product.current_stock - params.p_quantity)
      }
      return Promise.resolve({ data: movement.id, error: null })
    }
    return Promise.resolve({ data: null, error: { message: 'RPC not found: ' + fn } })
  }

  auth = {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: ({ email, password }) => {
      const user = this.data.users.find(u => u.email === email)
      if (user && password === 'password123') {
        return Promise.resolve({
          data: {
            user: { id: user.id, email: user.email, user_metadata: { full_name: user.full_name } },
            session: { access_token: 'mock_token' }
          },
          error: null
        })
      }
      return Promise.resolve({ data: { user: null, session: null }, error: { message: 'Email atau password salah' } })
    },
    signOut: () => Promise.resolve({ error: null })
  }
}

class MockQuery {
  constructor(data, db) {
    this._data = [...data]
    this._db = db
    this._selectStr = '*'
    this._filters = []
    this._orders = []
    this._limit = null
    this._count = null
    this._single = false
  }

  _applyFilters() {
    let result = [...this._data]
    for (const filter of this._filters) {
      if (filter.op === 'eq') result = result.filter(item => item[filter.col] == filter.val)
      else if (filter.op === 'neq') result = result.filter(item => item[filter.col] != filter.val)
      else if (filter.op === 'gte') result = result.filter(item => item[filter.col] >= filter.val)
      else if (filter.op === 'lte') result = result.filter(item => item[filter.col] <= filter.val)
      else if (filter.op === 'gt') result = result.filter(item => item[filter.col] > filter.val)
      else if (filter.op === 'lt') result = result.filter(item => item[filter.col] < filter.val)
      else if (filter.op === 'in') result = result.filter(item => filter.val.includes(item[filter.col]))
    }
    return result
  }

  select(columns) {
    this._selectStr = columns
    return this
  }

  eq(col, val) { this._filters.push({ op: 'eq', col, val }); return this }
  neq(col, val) { this._filters.push({ op: 'neq', col, val }); return this }
  gte(col, val) { this._filters.push({ op: 'gte', col, val }); return this }
  lte(col, val) { this._filters.push({ op: 'lte', col, val }); return this }
  gt(col, val) { this._filters.push({ op: 'gt', col, val }); return this }
  lt(col, val) { this._filters.push({ op: 'lt', col, val }); return this }
  in(col, vals) { this._filters.push({ op: 'in', col, val: vals }); return this }

  order(col, { ascending = true } = {}) {
    this._orders.push({ col, ascending })
    return this
  }

  limit(n) { this._limit = n; return this }
  single() { this._single = true; return this }

  count() {
    return Promise.resolve({ count: this._applyFilters().length, error: null })
  }

  async then(resolve, reject) {
    try {
      let result = this._applyFilters()

      for (const order of this._orders) {
        result.sort((a, b) => {
          const va = a[order.col], vb = b[order.col]
          if (va == null) return 1
          if (vb == null) return -1
          return order.ascending ? va > vb ? 1 : -1 : va < vb ? 1 : -1
        })
      }

      if (this._limit) result = result.slice(0, this._limit)

      if (this._single) {
        result = result[0] || null
      }

      resolve({ data: result, error: null, count: result.length })
    } catch (e) {
      reject({ data: null, error: e })
    }
  }

  insert(items) {
    const arr = Array.isArray(items) ? items : [items]
    const inserted = arr.map(item => {
      const newItem = { id: this._db.nextId(), ...item, created_at: new Date().toISOString() }
      this._db.data[this._getTableName()].push(newItem)
      return newItem
    })
    const result = { data: arr.length === 1 ? inserted[0] : inserted, error: null }
    if (arr.length === 1) result.data = inserted[0]
    return {
      select: () => ({ single: () => Promise.resolve(result) }),
      then: (resolve) => resolve(result)
    }
  }

  update(data) {
    const items = this._applyFilters()
    items.forEach(item => Object.assign(item, data, { updated_at: new Date().toISOString() }))
    return { then: (resolve) => resolve({ data: items, error: null }) }
  }

  delete() {
    const items = this._applyFilters()
    const table = this._getTableName()
    items.forEach(item => {
      const idx = this._db.data[table].findIndex(i => i.id === item.id)
      if (idx >= 0) this._db.data[table].splice(idx, 1)
    })
    return { then: (resolve) => resolve({ data: items, error: null }) }
  }

  _getTableName() {
    for (const [name, data] of Object.entries(this._db.data)) {
      if (data === this._data || data === this._db.data[name]) return name
    }
    return 'unknown'
  }
}