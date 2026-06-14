export class ProductsPage {
  constructor({ supabase, auth, router }) {
    this.supabase = supabase
    this.auth = auth
    this.router = router
    this.products = []
    this.categories = []
    this.suppliers = []
    this.showModal = false
    this.editingProduct = null
    this.searchQuery = ''
    this.currentPage = 1
    this.totalPages = 1
    this.itemsPerPage = 10
  }

  async loadData() {
    const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
      this.supabase.from('products').select('*, categories(name), suppliers(supplier_name)').order('created_at', { ascending: false }),
      this.supabase.from('categories').select('*').order('name'),
      this.supabase.from('suppliers').select('*').order('supplier_name')
    ])
    this.products = productsRes.data || []
    this.categories = categoriesRes.data || []
    this.suppliers = suppliersRes.data || []
  }

  render() {
    const filtered = this.products.filter(p =>
      !this.searchQuery || p.name?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(this.searchQuery.toLowerCase())
    )
    const start = (this.currentPage - 1) * this.itemsPerPage
    const pageItems = filtered.slice(start, start + this.itemsPerPage)

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3 flex-1">
            <div class="relative flex-1 max-w-md">
              <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"></i>
              <input type="text" id="search-product" class="pl-10" placeholder="Cari produk atau SKU..." value="${this.searchQuery}">
            </div>
            <select id="filter-category" class="w-auto">
              <option value="">Semua Kategori</option>
              ${this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <button id="add-product-btn" class="btn-primary">
            <i data-lucide="plus" class="w-5 h-5"></i> Tambah Produk
          </button>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Nama Produk</th>
                  <th>Kategori</th>
                  <th>Supplier</th>
                  <th>Harga Modal</th>
                  <th>Harga Jual</th>
                  <th>Stok</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${pageItems.length === 0 ? `
                  <tr><td colspan="8" class="text-center text-gray-500 py-8">Belum ada produk</td></tr>
                ` : pageItems.map(p => `
                  <tr>
                    <td class="font-mono text-xs">${p.sku}</td>
                    <td class="font-medium">${p.name}</td>
                    <td><span class="badge badge-info">${p.categories?.name || '-'}</span></td>
                    <td>${p.suppliers?.supplier_name || '-'}</td>
                    <td class="font-medium">Rp ${this.formatNumber(p.cost_price)}</td>
                    <td class="font-medium text-success-600">Rp ${this.formatNumber(p.sell_price)}</td>
                    <td>
                      <span class="badge ${p.current_stock <= p.min_stock ? 'badge-danger' : 'badge-success'}">
                        ${p.current_stock}
                      </span>
                    </td>
                    <td class="text-right">
                      <button class="btn-outline btn-sm edit-product" data-id="${p.id}">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                      </button>
                      <button class="btn-outline btn-sm text-danger-600 delete-product" data-id="${p.id}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${this.renderPagination(filtered.length)}
        </div>

        ${this.showModal ? this.renderModal() : ''}
      </div>
    `
  }

  renderPagination(total) {
    this.totalPages = Math.ceil(total / this.itemsPerPage) || 1
    if (this.totalPages <= 1) return ''

    return `
      <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <p class="text-sm text-gray-500">Total ${total} produk</p>
        <div class="flex items-center gap-2">
          <button class="btn-outline btn-sm page-btn" data-page="${this.currentPage - 1}" ${this.currentPage <= 1 ? 'disabled' : ''}>
            <i data-lucide="chevron-left" class="w-4 h-4"></i>
          </button>
          <span class="text-sm text-gray-700">${this.currentPage} / ${this.totalPages}</span>
          <button class="btn-outline btn-sm page-btn" data-page="${this.currentPage + 1}" ${this.currentPage >= this.totalPages ? 'disabled' : ''}>
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `
  }

  renderModal() {
    const p = this.editingProduct
    const profit = p ? (p.sell_price || 0) - (p.cost_price || 0) : 0
    const margin = p && p.sell_price > 0 ? ((profit / p.sell_price) * 100).toFixed(1) : 0

    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold">${p ? 'Edit Produk' : 'Tambah Produk'}</h3>
            <button id="close-modal" class="text-gray-400 hover:text-gray-600">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          <form id="product-form" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="sku">SKU</label>
                <input type="text" id="sku" name="sku" required value="${p?.sku || ''}" placeholder="PRD-001">
              </div>
              <div>
                <label for="name">Nama Produk</label>
                <input type="text" id="name" name="name" required value="${p?.name || ''}" placeholder="Nama produk">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="category_id">Kategori</label>
                <select id="category_id" name="category_id" required>
                  <option value="">Pilih kategori</option>
                  ${this.categories.map(c => `
                    <option value="${c.id}" ${p?.category_id === c.id ? 'selected' : ''}>${c.name}</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label for="supplier_id">Supplier</label>
                <select id="supplier_id" name="supplier_id">
                  <option value="">Pilih supplier</option>
                  ${this.suppliers.map(s => `
                    <option value="${s.id}" ${p?.supplier_id === s.id ? 'selected' : ''}>${s.supplier_name}</option>
                  `).join('')}
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="cost_price">Harga Modal (Rp)</label>
                <input type="number" id="cost_price" name="cost_price" required min="0" value="${p?.cost_price || ''}" placeholder="0">
              </div>
              <div>
                <label for="sell_price">Harga Jual (Rp)</label>
                <input type="number" id="sell_price" name="sell_price" required min="0" value="${p?.sell_price || ''}" placeholder="0">
              </div>
            </div>
            ${p ? `
            <div class="p-3 bg-primary-50 rounded-lg">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div><span class="text-gray-500">Profit: </span><span class="font-semibold text-success-600">Rp ${this.formatNumber(profit)}</span></div>
                <div><span class="text-gray-500">Margin: </span><span class="font-semibold">${margin}%</span></div>
              </div>
            </div>
            ` : ''}
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="current_stock">Stok Saat Ini</label>
                <input type="number" id="current_stock" name="current_stock" required min="0" value="${p?.current_stock || 0}">
              </div>
              <div>
                <label for="min_stock">Minimum Stok</label>
                <input type="number" id="min_stock" name="min_stock" required min="0" value="${p?.min_stock || 0}">
              </div>
            </div>
            <div>
              <label for="description">Deskripsi</label>
              <textarea id="description" name="description" rows="2" placeholder="Deskripsi produk (opsional)">${p?.description || ''}</textarea>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" id="cancel-modal" class="btn-secondary">Batal</button>
              <button type="submit" class="btn-primary">${p ? 'Simpan' : 'Tambah Produk'}</button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  formatNumber(num) {
    return num ? num.toLocaleString('id-ID') : '0'
  }

  async bindEvents() {
    await this.loadData()
    this.render()
    this.attachEvents()
    if (window.lucide) window.lucide.createIcons()
  }

  attachEvents() {
    document.getElementById('add-product-btn')?.addEventListener('click', () => {
      this.editingProduct = null
      this.showModal = true
      this.render()
      this.attachEvents()
      if (window.lucide) window.lucide.createIcons()
    })

    document.getElementById('search-product')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value
      this.currentPage = 1
      this.render()
      this.attachEvents()
      if (window.lucide) window.lucide.createIcons()
    })

    document.querySelectorAll('.edit-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id
        this.editingProduct = this.products.find(p => p.id === id) || null
        this.showModal = true
        this.render()
        this.attachEvents()
        if (window.lucide) window.lucide.createIcons()
      })
    })

    document.querySelectorAll('.delete-product').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id
        if (confirm('Hapus produk ini?')) {
          await this.supabase.from('products').delete().eq('id', id)
          await this.loadData()
          this.render()
          this.attachEvents()
          if (window.lucide) window.lucide.createIcons()
        }
      })
    })

    document.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page)
        if (page >= 1 && page <= this.totalPages) {
          this.currentPage = page
          this.render()
          this.attachEvents()
          if (window.lucide) window.lucide.createIcons()
        }
      })
    })

    this.bindModalEvents()
  }

  bindModalEvents() {
    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.showModal = false
      this.editingProduct = null
      this.render()
      this.attachEvents()
      if (window.lucide) window.lucide.createIcons()
    })
    document.getElementById('cancel-modal')?.addEventListener('click', () => {
      this.showModal = false
      this.editingProduct = null
      this.render()
      this.attachEvents()
      if (window.lucide) window.lucide.createIcons()
    })
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.showModal = false
        this.editingProduct = null
        this.render()
        this.attachEvents()
        if (window.lucide) window.lucide.createIcons()
      }
    })

    const form = document.getElementById('product-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const formData = new FormData(form)
      const data = {
        sku: formData.get('sku'),
        name: formData.get('name'),
        category_id: formData.get('category_id') || null,
        supplier_id: formData.get('supplier_id') || null,
        cost_price: parseInt(formData.get('cost_price')) || 0,
        sell_price: parseInt(formData.get('sell_price')) || 0,
        current_stock: parseInt(formData.get('current_stock')) || 0,
        min_stock: parseInt(formData.get('min_stock')) || 0,
        description: formData.get('description')
      }

      if (this.editingProduct) {
        await this.supabase.from('products').update(data).eq('id', this.editingProduct.id)
      } else {
        await this.supabase.from('products').insert(data)
      }

      this.showModal = false
      this.editingProduct = null
      await this.loadData()
      this.render()
      this.attachEvents()
      if (window.lucide) window.lucide.createIcons()
    })
  }

  render() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) {
      outlet.innerHTML = this.renderHTML()
    }
  }

  renderHTML() {
    const filtered = this.products.filter(p =>
      !this.searchQuery || p.name?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(this.searchQuery.toLowerCase())
    )
    const start = (this.currentPage - 1) * this.itemsPerPage
    const pageItems = filtered.slice(start, start + this.itemsPerPage)

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3 flex-1">
            <div class="relative flex-1 max-w-md">
              <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"></i>
              <input type="text" id="search-product" class="pl-10" placeholder="Cari produk atau SKU..." value="${this.searchQuery}">
            </div>
            <select id="filter-category" class="w-auto">
              <option value="">Semua Kategori</option>
              ${this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <button id="add-product-btn" class="btn-primary">
            <i data-lucide="plus" class="w-5 h-5"></i> Tambah Produk
          </button>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Nama Produk</th>
                  <th>Kategori</th>
                  <th>Supplier</th>
                  <th>Harga Modal</th>
                  <th>Harga Jual</th>
                  <th>Stok</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${pageItems.length === 0 ? `
                  <tr><td colspan="8" class="text-center text-gray-500 py-8">Belum ada produk</td></tr>
                ` : pageItems.map(p => `
                  <tr>
                    <td class="font-mono text-xs">${p.sku}</td>
                    <td class="font-medium">${p.name}</td>
                    <td><span class="badge badge-info">${p.categories?.name || '-'}</span></td>
                    <td>${p.suppliers?.supplier_name || '-'}</td>
                    <td class="font-medium">Rp ${this.formatNumber(p.cost_price)}</td>
                    <td class="font-medium text-success-600">Rp ${this.formatNumber(p.sell_price)}</td>
                    <td>
                      <span class="badge ${p.current_stock <= p.min_stock ? 'badge-danger' : 'badge-success'}">
                        ${p.current_stock}
                      </span>
                    </td>
                    <td class="text-right">
                      <button class="btn-outline btn-sm edit-product" data-id="${p.id}">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                      </button>
                      <button class="btn-outline btn-sm text-danger-600 delete-product" data-id="${p.id}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${this.renderPaginationHTML(filtered.length)}
        </div>

        ${this.showModal ? this.renderModalHTML() : ''}
      </div>
    `
  }

  renderPaginationHTML(total) {
    this.totalPages = Math.ceil(total / this.itemsPerPage) || 1
    if (this.totalPages <= 1) return ''

    return `
      <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <p class="text-sm text-gray-500">Total ${total} produk</p>
        <div class="flex items-center gap-2">
          <button class="btn-outline btn-sm page-btn" data-page="${this.currentPage - 1}" ${this.currentPage <= 1 ? 'disabled' : ''}>
            <i data-lucide="chevron-left" class="w-4 h-4"></i>
          </button>
          <span class="text-sm text-gray-700">${this.currentPage} / ${this.totalPages}</span>
          <button class="btn-outline btn-sm page-btn" data-page="${this.currentPage + 1}" ${this.currentPage >= this.totalPages ? 'disabled' : ''}>
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `
  }

  renderModalHTML() {
    const p = this.editingProduct
    const profit = p ? (p.sell_price || 0) - (p.cost_price || 0) : 0
    const margin = p && p.sell_price > 0 ? ((profit / p.sell_price) * 100).toFixed(1) : 0

    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold">${p ? 'Edit Produk' : 'Tambah Produk'}</h3>
            <button id="close-modal" class="text-gray-400 hover:text-gray-600">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          <form id="product-form" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="sku">SKU</label>
                <input type="text" id="sku" name="sku" required value="${p?.sku || ''}" placeholder="PRD-001">
              </div>
              <div>
                <label for="name">Nama Produk</label>
                <input type="text" id="name" name="name" required value="${p?.name || ''}" placeholder="Nama produk">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="category_id">Kategori</label>
                <select id="category_id" name="category_id" required>
                  <option value="">Pilih kategori</option>
                  ${this.categories.map(c => `
                    <option value="${c.id}" ${p?.category_id === c.id ? 'selected' : ''}>${c.name}</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label for="supplier_id">Supplier</label>
                <select id="supplier_id" name="supplier_id">
                  <option value="">Pilih supplier</option>
                  ${this.suppliers.map(s => `
                    <option value="${s.id}" ${p?.supplier_id === s.id ? 'selected' : ''}>${s.supplier_name}</option>
                  `).join('')}
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="cost_price">Harga Modal (Rp)</label>
                <input type="number" id="cost_price" name="cost_price" required min="0" value="${p?.cost_price || ''}" placeholder="0">
              </div>
              <div>
                <label for="sell_price">Harga Jual (Rp)</label>
                <input type="number" id="sell_price" name="sell_price" required min="0" value="${p?.sell_price || ''}" placeholder="0">
              </div>
            </div>
            ${p ? `
            <div class="p-3 bg-primary-50 rounded-lg">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div><span class="text-gray-500">Profit: </span><span class="font-semibold text-success-600">Rp ${this.formatNumber(profit)}</span></div>
                <div><span class="text-gray-500">Margin: </span><span class="font-semibold">${margin}%</span></div>
              </div>
            </div>
            ` : ''}
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="current_stock">Stok Saat Ini</label>
                <input type="number" id="current_stock" name="current_stock" required min="0" value="${p?.current_stock || 0}">
              </div>
              <div>
                <label for="min_stock">Minimum Stok</label>
                <input type="number" id="min_stock" name="min_stock" required min="0" value="${p?.min_stock || 0}">
              </div>
            </div>
            <div>
              <label for="description">Deskripsi</label>
              <textarea id="description" name="description" rows="2" placeholder="Deskripsi produk (opsional)">${p?.description || ''}</textarea>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" id="cancel-modal" class="btn-secondary">Batal</button>
              <button type="submit" class="btn-primary">${p ? 'Simpan' : 'Tambah Produk'}</button>
            </div>
          </form>
        </div>
      </div>
    `
  }
}