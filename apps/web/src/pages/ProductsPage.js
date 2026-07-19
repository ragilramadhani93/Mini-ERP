import { SkeletonPage } from '../components/Skeleton.js'
import { toast } from '../components/ToastNotification.js'
import { ConfirmModal } from '../components/ConfirmModal.js'
import { StatPremium } from '../components/StatPremium.js'

export class ProductsPage {
  constructor({ supabase, auth, router }) {
    this.supabase = supabase
    this.auth = auth
    this.router = router
    this.products = []
    this.categories = []
    this.suppliers = []
    this.productVariants = []
    this.productSkus = []
    this.showModal = false
    this.editingProduct = null
    this.searchQuery = ''
    this.currentPage = 1
    this.totalPages = 1
    this.itemsPerPage = 10
    this.error = null
    this.modalVariants = []
    this.showInactive = false
  }

  async loadData() {
    try {
      const activeFilter = this.showInactive ? { eq: false } : { eq: true }
      const [productsRes, categoriesRes, suppliersRes, variantsRes, skusRes] = await Promise.all([
        this.supabase.from('products').select('*, categories(name), suppliers(supplier_name)').eq('is_active', activeFilter.eq).order('created_at', { ascending: false }),
        this.supabase.from('categories').select('*').order('name'),
        this.supabase.from('suppliers').select('*').order('supplier_name'),
        this.supabase.from('product_variants').select('*').order('sort_order'),
        this.supabase.from('product_skus').select('*').order('created_at')
      ])
      this.products = productsRes.data || []
      this.categories = categoriesRes.data || []
      this.suppliers = suppliersRes.data || []
      this.productVariants = variantsRes.data || []
      this.productSkus = skusRes.data || []
      this.error = null
    } catch (err) {
      console.error('❌ Load products error:', err)
      this.error = err.message
      toast.error('Gagal', 'Gagal memuat data produk: ' + err.message)
    }
  }

  getVariantsForProduct(productId) {
    return this.productVariants.filter(v => v.product_id === productId)
  }

  getSkusForProduct(productId) {
    return this.productSkus.filter(s => s.product_id === productId)
  }

  getStats() {
    const totalProducts = this.products.length
    const totalStock = this.products.reduce((sum, p) => sum + (p.current_stock || 0), 0)
    const totalInventoryValue = this.products.reduce((sum, p) => {
      const skus = this.getSkusForProduct(p.id)
      if (skus.length > 0) {
        return sum + skus.reduce((s, sku) => s + ((sku.cost_price || p.cost_price || 0) * (sku.current_stock || 0)), 0)
      }
      return sum + ((p.cost_price || 0) * (p.current_stock || 0))
    }, 0)
    const lowStockCount = this.products.filter(p => {
      const skus = this.getSkusForProduct(p.id)
      if (skus.length > 0) {
        return skus.some(sku => sku.current_stock <= (sku.min_stock || p.min_stock || 0))
      }
      return p.current_stock <= p.min_stock
    }).length
    const totalSkus = this.productSkus.length
    return { totalProducts, totalStock, totalInventoryValue, lowStockCount, totalSkus }
  }

  render() {
    const filtered = this.products.filter(p =>
      !this.searchQuery || p.name?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(this.searchQuery.toLowerCase())
    )
    const start = (this.currentPage - 1) * this.itemsPerPage
    const pageItems = filtered.slice(start, start + this.itemsPerPage)
    const stats = this.getStats()

    return `
      <div class="products-page">
        <div class="container">
          <!-- HEADER -->
          <div class="page-header">
            <div>
              <h1>Produk</h1>
              <p>Kelola seluruh produk dan inventori toko</p>
            </div>
            <button class="btn-primary" id="add-product-btn">+ Tambah Produk</button>
          </div>

          <!-- KPI -->
        <div class="stats-grid">
          ${StatPremium({ accent: 'gold', icon: '📦', label: 'Total Produk', value: stats.totalProducts.toString() })}
          ${StatPremium({ accent: 'emerald', icon: '📊', label: 'Total Stok', value: this.formatNumber(stats.totalStock) })}
          ${StatPremium({ accent: 'maroon', icon: '💰', label: 'Nilai Inventori', value: 'Rp ' + this.formatNumber(stats.totalInventoryValue) })}
          ${StatPremium({ accent: 'coral', icon: '⚠️', label: 'Stok Menipis', value: stats.lowStockCount + ' Produk' })}
        </div>

          <!-- TAB: Aktif / Nonaktif -->
          <div class="flex items-center gap-2" style="border-bottom:1px solid #e2e8f0;padding-bottom:8px">
            <button id="tab-active" class="tab-btn" data-show="false" style="padding:5px 14px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;border:none;${!this.showInactive ? 'background:#7A3B58;color:#fff' : 'color:#64748b;background:transparent'}">Aktif</button>
            <button id="tab-inactive" class="tab-btn" data-show="true" style="padding:5px 14px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;border:none;${this.showInactive ? 'background:#7A3B58;color:#fff' : 'color:#64748b;background:transparent'}">Nonaktif</button>
          </div>

          <!-- FILTER -->
          <div class="filter-card">
            <div class="filter-left">
              <input
                type="text"
                id="search-product"
                placeholder="Cari produk atau SKU..."
                value="${this.searchQuery}"
              >
              <select id="category-filter">
                <option value="">Semua Kategori</option>
                ${this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
              <select id="supplier-filter">
                <option value="">Semua Supplier</option>
                ${this.suppliers.map(s => `<option value="${s.id}">${s.supplier_name}</option>`).join('')}
              </select>
              <select id="stock-filter">
                <option value="">Semua Stok</option>
                <option value="low">Stok Menipis</option>
              </select>
            </div>
            <button class="btn-outline" id="export-btn">Export Data</button>
          </div>

          <!-- ALERT -->
          ${stats.lowStockCount > 0 ? `
            <div class="alert-box">
              <span>⚠ ${stats.lowStockCount} produk hampir habis dan membutuhkan restock</span>
              <a href="#" id="view-low-stock">Lihat Detail →</a>
            </div>
          ` : ''}

          <!-- TABLE -->
          <div class="table-card">
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Kategori</th>
                  <th>Supplier</th>
                  <th>Harga Modal</th>
                  <th>Harga Jual</th>
                  <th>Margin</th>
                  <th>Stok</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${pageItems.length === 0 ? `
                  <tr><td colspan="8" style="text-align: center; padding: 40px; color: #94a3b8;">Belum ada produk</td></tr>
                ` : pageItems.map(p => {
                  const profit = (p.sell_price || 0) - (p.cost_price || 0)
                  const margin = p.sell_price > 0 ? ((profit / p.sell_price) * 100).toFixed(0) : 0
                  const skus = this.getSkusForProduct(p.id)
                  const variants = this.getVariantsForProduct(p.id)
                  const hasVariants = variants.length > 0
                  const displayStock = hasVariants ? skus.reduce((sum, s) => sum + (s.current_stock || 0), 0) : p.current_stock
                  const displayCost = hasVariants && skus.length > 0 ? skus[0].cost_price || p.cost_price : p.cost_price
                  const displaySell = hasVariants && skus.length > 0 ? skus[0].sell_price || p.sell_price : p.sell_price
                  const displayProfit = (displaySell || 0) - (displayCost || 0)
                  const displayMargin = displaySell > 0 ? ((displayProfit / displaySell) * 100).toFixed(0) : 0
                  const minStock = hasVariants && skus.length > 0 ? Math.min(...skus.map(s => s.min_stock || p.min_stock || 0)) : p.min_stock
                  const stockPercentage = minStock > 0 ? Math.min((displayStock / (minStock * 2)) * 100, 100) : 100
                  const isLowStock = displayStock <= minStock
                  return `
                    <tr>
                      <td>
                        <div class="product-info">
                          <div style="width: 52px; height: 52px; border-radius: 12px; background: #f8fafc; display: flex; align-items: center; justify-content: center;">
                            <i data-lucide="package" style="width: 24px; height: 24px; color: #94a3b8;"></i>
                          </div>
                          <div>
                            <strong>${p.name}</strong>
                            <small>SKU : ${p.sku}</small>
                            ${hasVariants ? `<div style="margin-top:2px">${variants.map(v => `<span style="display:inline-block;font-size:10px;padding:1px 6px;background:#F4E5EC;color:#7A3B58;border-radius:4px;margin-right:4px">${v.name}: ${(v.values || []).length} opsi</span>`).join('')}<span style="font-size:10px;color:#64748b">${skus.length} SKU</span></div>` : ''}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="badge">${p.categories?.name || '-'}</span>
                      </td>
                      <td>${p.suppliers?.supplier_name || '-'}</td>
                      <td>Rp ${this.formatNumber(displayCost)}</td>
                      <td class="price">Rp ${this.formatNumber(displaySell)}</td>
                      <td>
                        <span class="profit">+${displayMargin}%</span>
                      </td>
                      <td>
                        <div class="stock-wrapper">
                          <div class="stock-bar">
                            <div class="stock-fill ${isLowStock ? 'warning' : 'success'}" style="width:${stockPercentage}%"></div>
                          </div>
                          <span>${displayStock}</span>
                        </div>
                      </td>
                      <td>
                        <div style="display:flex;gap:6px;align-items:center">
                          <button class="action-btn icon-btn edit-product" data-id="${p.id}" title="Edit">✏️</button>
                          ${this.showInactive 
                            ? `<button class="action-btn text-btn activate-product" data-id="${p.id}" title="Aktifkan">↩ Aktifkan</button>` 
                            : `<button class="action-btn text-btn danger delete-product" data-id="${p.id}" title="Nonaktifkan">✕ Nonaktifkan</button>`}
                        </div>
                      </td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
            ${this.renderPagination(filtered.length)}
          </div>
        </div>

        ${this.showModal ? this.renderModal() : ''}
      </div>
    `
  }

  renderPagination(total) {
    this.totalPages = Math.ceil(total / this.itemsPerPage) || 1
    if (this.totalPages <= 1) return ''

    return `
      <div style="padding: 18px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
        <p style="color: #64748b; font-size: 14px;">Total ${total} produk</p>
        <div style="display: flex; gap: 8px;">
          <button class="btn-outline" data-page="${this.currentPage - 1}" ${this.currentPage <= 1 ? 'disabled' : ''} style="padding: 8px 12px;">←</button>
          <span style="padding: 8px 16px; color: #374151;">${this.currentPage} / ${this.totalPages}</span>
          <button class="btn-outline" data-page="${this.currentPage + 1}" ${this.currentPage >= this.totalPages ? 'disabled' : ''} style="padding: 8px 12px;">→</button>
        </div>
      </div>
    `
  }

  renderModal() {
    const p = this.editingProduct
    const profit = p ? (p.sell_price || 0) - (p.cost_price || 0) : 0
    const margin = p && p.sell_price > 0 ? ((profit / p.sell_price) * 100).toFixed(1) : 0
    const hasVariants = this.modalVariants.length > 0

    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content p-6" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
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

            <!-- VARIANTS SECTION -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 8px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div>
                  <label style="font-weight: 600; font-size: 14px; color: #1e293b;">Variasi Produk</label>
                  <p style="font-size: 12px; color: #94a3b8; margin: 0;">Contoh: Ukuran (S, M, L), Warna (Merah, Biru)</p>
                </div>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="checkbox" id="has-variants" ${hasVariants ? 'checked' : ''} style="width: 16px; height: 16px;">
                  <span style="font-size: 13px; color: #475569;">Aktif</span>
                </label>
              </div>

              <div id="variants-section" style="display: ${hasVariants ? 'block' : 'none'};">
                <div id="variant-rows">
                  ${this.modalVariants.map((v, i) => `
                    <div class="variant-row" data-index="${i}" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-end;">
                      <div style="flex: 0 0 140px;">
                        <label style="font-size: 11px; color: #64748b;">Nama Variasi</label>
                        <input type="text" class="variant-name" data-index="${i}" value="${v.name}" placeholder="Ukuran" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px;">
                      </div>
                      <div style="flex: 1;">
                        <label style="font-size: 11px; color: #64748b;">Nilai (koma)</label>
                        <input type="text" class="variant-values" data-index="${i}" value="${(v.values || []).join(', ')}" placeholder="S, M, L, XL" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px;">
                      </div>
                      <button type="button" class="remove-variant" data-index="${i}" style="width: 32px; height: 32px; border: 1px solid #fecaca; background: #fef2f2; color: #ef4444; border-radius: 8px; cursor: pointer; flex-shrink: 0; font-size: 14px;">✕</button>
                    </div>
                  `).join('')}
                </div>
                <button type="button" id="add-variant" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border: 1px dashed #D7B1C1; background: #F4E5EC; color: #7A3B58; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 500;">
                  + Tambah Variasi
                </button>

                ${p ? this._renderSkuTable(p) : ''}
              </div>
            </div>

            ${!hasVariants ? `
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
            ` : ''}
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

  _renderSkuTable(p) {
    const skus = this.getSkusForProduct(p.id)
    if (skus.length === 0) return ''
    return `
      <div style="margin-top: 12px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 6px 8px; text-align: left; font-weight: 500; color: #64748b;">SKU</th>
              <th style="padding: 6px 8px; text-align: left; font-weight: 500; color: #64748b;">Varian</th>
              <th style="padding: 6px 8px; text-align: right; font-weight: 500; color: #64748b;">Stok</th>
            </tr>
          </thead>
          <tbody>
            ${skus.map(sku => `
              <tr style="border-top: 1px solid #f1f5f9;">
                <td style="padding: 6px 8px; font-family: monospace; font-size: 11px;">${sku.sku}</td>
                <td style="padding: 6px 8px;">${Object.entries(sku.variant_values || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}</td>
                <td style="padding: 6px 8px; text-align: right;">${sku.current_stock}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  formatNumber(num) {
    return num ? num.toLocaleString('id-ID') : '0'
  }

  async bindEvents() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) outlet.innerHTML = SkeletonPage()
    try {
      await this.loadData()
    } catch (err) {
      console.error('❌ Load products error:', err)
      toast.error('Gagal', 'Gagal memuat data produk: ' + err.message)
    }
    this.renderAndBind()
  }

  _bindListeners() {
    document.getElementById('add-product-btn')?.addEventListener('click', () => {
      this.editingProduct = null
      this.modalVariants = []
      this.showModal = true
      this.renderAndBind()
    })

    document.getElementById('search-product')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value
      this.currentPage = 1
      this.renderAndBind()
    })

    document.getElementById('export-btn')?.addEventListener('click', () => {
      toast.info('Coming Soon', 'Fitur export akan segera tersedia')
    })

    document.getElementById('view-low-stock')?.addEventListener('click', (e) => {
      e.preventDefault()
      const stockFilter = document.getElementById('stock-filter')
      if (stockFilter) {
        stockFilter.value = 'low'
        stockFilter.dispatchEvent(new Event('change'))
      }
    })

    document.querySelectorAll('.edit-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id
        this.editingProduct = this.products.find(p => p.id === id) || null
        const variants = this.getVariantsForProduct(id)
        this.modalVariants = variants.map(v => ({ name: v.name, values: v.values || [] }))
        this.showModal = true
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.delete-product').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id
        if (await ConfirmModal.show({ title: 'Nonaktifkan Produk', message: 'Nonaktifkan produk ini? Produk tidak akan muncul di daftar aktif.', confirmText: 'Ya, Nonaktifkan', variant: 'danger' })) {
          try {
            await this.supabase.from('products').update({ is_active: false }).eq('id', id)
            await this.loadData()
            this.renderAndBind()
          } catch (err) {
            console.error('❌ Nonaktifkan product error:', err)
      toast.error('Gagal', 'Gagal menonaktifkan produk: ' + err.message)
            this.error = err.message
            this.renderAndBind()
          }
        }
      })
    })

    document.querySelectorAll('.activate-product').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id
        try {
          await this.supabase.from('products').update({ is_active: true }).eq('id', id)
          await this.loadData()
          this.renderAndBind()
        } catch (err) {
          console.error('❌ Aktifkan product error:', err)
      toast.error('Gagal', 'Gagal mengaktifkan produk: ' + err.message)
          this.error = err.message
          this.renderAndBind()
        }
      })
    })

    document.querySelectorAll('.tab-btn[data-show]').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.showInactive = btn.dataset.show === 'true'
        this.currentPage = 1
        await this.loadData()
        this.renderAndBind()
      })
    })

    document.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page)
        if (page >= 1 && page <= this.totalPages) {
          this.currentPage = page
          this.renderAndBind()
        }
      })
    })

    this._bindModalEvents()
  }

  _bindModalEvents() {
    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.showModal = false
      this.editingProduct = null
      this.modalVariants = []
      this.renderAndBind()
    })

    document.getElementById('cancel-modal')?.addEventListener('click', () => {
      this.showModal = false
      this.editingProduct = null
      this.modalVariants = []
      this.renderAndBind()
    })

    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.showModal = false
        this.editingProduct = null
        this.modalVariants = []
        this.renderAndBind()
      }
    })

    document.getElementById('has-variants')?.addEventListener('change', (e) => {
      const section = document.getElementById('variants-section')
      if (section) section.style.display = e.target.checked ? 'block' : 'none'
    })

    document.getElementById('add-variant')?.addEventListener('click', () => {
      this.modalVariants.push({ name: '', values: [] })
      this.renderAndBind()
    })

    document.querySelectorAll('.remove-variant').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index)
        this.modalVariants.splice(idx, 1)
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.variant-name').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index)
        this.modalVariants[idx].name = e.target.value
      })
    })

    document.querySelectorAll('.variant-values').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index)
        this.modalVariants[idx].values = e.target.value.split(',').map(v => v.trim()).filter(v => v)
      })
    })

    const form = document.getElementById('product-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      try {
        const formData = new FormData(form)
        const hasVariants = document.getElementById('has-variants')?.checked || this.modalVariants.length > 0
        const data = {
          sku: formData.get('sku'),
          name: formData.get('name'),
          category_id: formData.get('category_id') || null,
          supplier_id: formData.get('supplier_id') || null,
          cost_price: parseInt(formData.get('cost_price')) || 0,
          sell_price: parseInt(formData.get('sell_price')) || 0,
          description: formData.get('description')
        }

        if (!hasVariants) {
          data.current_stock = parseInt(formData.get('current_stock')) || 0
          data.min_stock = parseInt(formData.get('min_stock')) || 0
        } else {
          data.current_stock = 0
          data.min_stock = 0
        }

        let productId
        if (this.editingProduct) {
          await this.supabase.from('products').update(data).eq('id', this.editingProduct.id)
          productId = this.editingProduct.id
        } else {
          const result = await this.supabase.from('products').insert(data).select().single()
          productId = result.data?.id
        }

        if (hasVariants && productId) {
          await this.supabase.from('product_variants').delete().eq('product_id', productId)
          const validVariants = this.modalVariants.filter(v => v.name && v.values.length > 0)
          if (validVariants.length > 0) {
            const variantInserts = validVariants.map((v, i) => ({
              product_id: productId,
              name: v.name,
              values: v.values,
              sort_order: i
            }))
            await this.supabase.from('product_variants').insert(variantInserts)
          }

          const existingSkus = this.getSkusForProduct(productId)
          const newSkus = this._generateSkus(productId, formData.get('sku'))
          await this.supabase.from('product_skus').delete().eq('product_id', productId)
          if (newSkus.length > 0) {
            const skuInserts = newSkus.map(sku => {
              const existing = existingSkus.find(es => es.sku === sku.sku)
              return {
                ...sku,
                current_stock: existing?.current_stock || 0,
                min_stock: existing?.min_stock || 0
              }
            })
            await this.supabase.from('product_skus').insert(skuInserts)
          }
        }

        this.showModal = false
        this.editingProduct = null
        this.modalVariants = []
        await this.loadData()
        this.renderAndBind()
      } catch (err) {
        console.error('❌ Save product error:', err)
      toast.error('Gagal Simpan', 'Gagal menyimpan produk: ' + err.message)
        this.error = err.message
        this.renderAndBind()
      }
    })
  }

  _generateSkus(productId, baseSku) {
    const validVariants = this.modalVariants.filter(v => v.name && v.values.length > 0)
    if (validVariants.length === 0) return []

    const combinations = this._getCombinations(validVariants)
    return combinations.map((combo, i) => {
      const variantPart = Object.values(combo).map(v => v.replace(/\s+/g, '').toUpperCase()).join('-')
      return {
        product_id: productId,
        sku: `${baseSku}-${variantPart}`,
        variant_values: combo,
        cost_price: parseInt(document.getElementById('cost_price')?.value) || 0,
        sell_price: parseInt(document.getElementById('sell_price')?.value) || 0,
        is_active: true
      }
    })
  }

  _getCombinations(variants) {
    if (variants.length === 0) return [{}]
    const result = []
    const rest = this._getCombinations(variants.slice(1))
    for (const value of variants[0].values) {
      for (const combo of rest) {
        result.push({ [variants[0].name]: value, ...combo })
      }
    }
    return result
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) {
      outlet.innerHTML = this.render()
    }
    this._bindListeners()
    if (window.lucide) window.lucide.createIcons()
  }
}
