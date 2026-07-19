import { SkeletonPage } from '../components/Skeleton.js'
import { toast } from '../components/ToastNotification.js'
import { ConfirmModal } from '../components/ConfirmModal.js'

export class PurchaseOrderPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.orders = []
    this.products = []
    this.suppliers = []
    this.showModal = false
    this.orderItems = []
    this.selectedStatus = 'all'
    this.loading = false
    this.viewDetail = null
  }

  async loadData() {
    try {
      const [ordersRes, productsRes, suppliersRes] = await Promise.all([
        this.supabase.from('purchases')
          .select('*, suppliers(supplier_name), purchase_items(*, products(name, sku)), created_by_user:users(full_name)')
          .order('created_at', { ascending: false })
          .limit(50),
        this.supabase.from('products')
          .select('id, sku, name, cost_price, current_stock')
          .order('name'),
        this.supabase.from('suppliers')
          .select('id, supplier_name')
          .order('supplier_name')
      ])
      this.orders = ordersRes.data || []
      this.products = productsRes.data || []
      this.suppliers = suppliersRes.data || []
    } catch (err) {
      console.error('Load PO error:', err)
      toast.error('Gagal', 'Gagal memuat data purchase order: ' + err.message)
      this.orders = []
      this.products = []
      this.suppliers = []
    }
  }

  get filteredOrders() {
    if (this.selectedStatus === 'all') return this.orders
    return this.orders.filter(o => o.status === this.selectedStatus)
  }

  render() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Purchase Order</h2>
            <p class="text-sm text-gray-500">${this.orders.length} PO • ${this.orders.filter(o => o.status === 'pending').length} pending</p>
          </div>
          <button id="add-po-btn" class="btn-primary">
            <i data-lucide="plus" class="w-5 h-5"></i> Buat PO Baru
          </button>
        </div>

        <div class="flex gap-2">
          ${['all', 'pending', 'approved', 'received', 'cancelled'].map(s => `
            <button class="status-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              this.selectedStatus === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }" data-status="${s}">
              ${this.getStatusLabel(s)}
            </button>
          `).join('')}
        </div>

        ${this.viewDetail ? this.renderDetail() : this.renderList()}

        ${this.showModal ? this.renderModal() : ''}
      </div>
    `
  }

  renderList() {
    const orders = this.filteredOrders
    const role = this.auth.getRole()
    const isOwner = role === 'owner'
    return `
      <div class="card">
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>No. PO</th>
                <th>Supplier</th>
                <th>Item</th>
                <th class="text-right">Total</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th class="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${orders.length === 0 ? `
                <tr><td colspan="7" class="text-center text-gray-500 py-8">Belum ada Purchase Order</td></tr>
              ` : orders.map(po => {
                const items = po.purchase_items || []
                return `
                  <tr class="${po.status === 'received' ? 'bg-success-50/30' : po.status === 'cancelled' ? 'bg-danger-50/30' : ''}">
                    <td class="font-mono text-xs font-medium">${po.po_number}</td>
                    <td class="font-medium">${po.suppliers?.supplier_name || '-'}</td>
                    <td>${items.length} item</td>
                    <td class="text-right font-semibold">Rp ${this.formatNumber(po.total_amount)}</td>
                    <td><span class="badge ${this.getStatusBadgeClass(po.status)}">${this.getStatusLabel(po.status)}</span></td>
                    <td class="text-sm text-gray-500 whitespace-nowrap">${this.formatDate(po.created_at)}</td>
                    <td class="text-right">
                      <button class="btn-outline btn-sm view-po" data-id="${po.id}">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                      </button>
                      ${po.status === 'pending' && isOwner ? `
                        <button class="btn-success btn-sm approve-po" data-id="${po.id}">
                          <i data-lucide="check" class="w-4 h-4"></i>
                        </button>
                        <button class="btn-danger btn-sm cancel-po" data-id="${po.id}">
                          <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                      ` : ''}
                      ${po.status === 'approved' ? `
                        <button class="btn-primary btn-sm receive-po" data-id="${po.id}">
                          <i data-lucide="package" class="w-4 h-4"></i>
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  }

  renderDetail() {
    const po = this.viewDetail
    return `
      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-semibold">${po.po_number}</h3>
            <p class="text-sm text-gray-500">${this.formatDate(po.created_at)}</p>
          </div>
          <div class="flex gap-2">
            <button id="back-to-list" class="btn-outline">
              <i data-lucide="arrow-left" class="w-4 h-4"></i> Kembali
            </button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p class="text-sm text-gray-500">Supplier</p>
            <p class="font-medium">${po.suppliers?.supplier_name || '-'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Status</p>
            <p><span class="badge ${this.getStatusBadgeClass(po.status)}">${this.getStatusLabel(po.status)}</span></p>
          </div>
        </div>
        ${po.notes ? `<div class="mb-6"><p class="text-sm text-gray-500">Catatan</p><p>${po.notes}</p></div>` : ''}
        <table class="table">
          <thead>
            <tr>
              <th>Produk</th>
              <th>SKU</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Harga</th>
              <th class="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${(po.purchase_items || []).map(i => `
              <tr>
                <td>${i.products?.name || '-'}</td>
                <td class="font-mono text-xs">${i.products?.sku || '-'}</td>
                <td class="text-right">${i.quantity}</td>
                <td class="text-right">Rp ${this.formatNumber(i.unit_price)}</td>
                <td class="text-right font-semibold">Rp ${this.formatNumber(i.total_price)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="font-bold">
              <td colspan="4" class="text-right">Total</td>
              <td class="text-right text-primary-600">Rp ${this.formatNumber(po.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `
  }

  renderModal() {
    const total = this.orderItems.reduce((s, i) => s + i.qty * i.price, 0)
    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content p-6 max-w-2xl">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold">Buat Purchase Order Baru</h3>
            <button id="close-modal" class="text-gray-400 hover:text-gray-600">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          <form id="po-form" class="space-y-4">
            <div>
              <label for="supplier_id">Supplier</label>
              <select id="supplier_id" name="supplier_id" required>
                <option value="">Pilih supplier</option>
                ${this.suppliers.map(s => `
                  <option value="${s.id}">${s.supplier_name}</option>
                `).join('')}
              </select>
            </div>
            <div>
              <label>Item Barang</label>
              <div class="space-y-2" id="po-items">
                ${this.orderItems.map((item, i) => `
                  <div class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg" data-index="${i}">
                    <select class="flex-1 po-product-select" data-index="${i}" required>
                      <option value="">Pilih produk</option>
                      ${this.products.map(p => `
                        <option value="${p.id}" ${item.productId === p.id ? 'selected' : ''} data-price="${p.cost_price}">
                          ${p.sku} - ${p.name} (Stok: ${p.current_stock})
                        </option>
                      `).join('')}
                    </select>
                    <input type="number" class="w-20 text-right po-qty" data-index="${i}" value="${item.qty}" min="1" placeholder="Qty" required>
                    <input type="number" class="w-28 text-right po-price" data-index="${i}" value="${item.price}" min="0" placeholder="Harga" required>
                    <span class="text-sm font-semibold w-24 text-right">Rp ${this.formatNumber(item.qty * item.price)}</span>
                    <button type="button" class="btn-danger btn-sm po-remove" data-index="${i}">
                      <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                  </div>
                `).join('')}
              </div>
              <button type="button" id="add-po-item" class="btn-outline mt-2 w-full">
                <i data-lucide="plus" class="w-5 h-5"></i> Tambah Item
              </button>
            </div>
            <div>
              <label for="notes">Catatan</label>
              <textarea id="notes" name="notes" rows="2" placeholder="Catatan untuk supplier"></textarea>
            </div>
            <div class="flex justify-between items-center pt-4 border-t border-gray-100">
              <p class="text-lg font-bold text-primary-600">Rp ${this.formatNumber(total)}</p>
              <div class="flex gap-3">
                <button type="button" id="cancel-modal" class="btn-secondary">Batal</button>
                <button type="submit" class="btn-primary" ${this.loading ? 'disabled' : ''}>
                  ${this.loading ? 'Memproses...' : '<i data-lucide="check" class="w-5 h-5"></i> Buat PO'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `
  }

  getStatusLabel(status) {
    const labels = { pending: 'Pending', approved: 'Disetujui', received: 'Diterima', cancelled: 'Dibatalkan' }
    return labels[status] || status
  }

  getStatusBadgeClass(status) {
    const classes = {
      pending: 'badge-warning',
      approved: 'badge-info',
      received: 'badge-success',
      cancelled: 'badge-danger'
    }
    return classes[status] || 'badge-info'
  }

  formatNumber(num) { return num ? num.toLocaleString('id-ID') : '0' }

  formatDate(date) {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  async bindEvents() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) outlet.innerHTML = SkeletonPage()
    await this.loadData()
    this.renderAndBind()
  }

  _bindListeners() {
    document.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedStatus = btn.dataset.status
        this.renderAndBind()
      })
    })

    document.getElementById('add-po-btn')?.addEventListener('click', () => {
      this.showModal = true
      this.orderItems = [{ productId: '', qty: 1, price: 0 }]
      this.renderAndBind()
    })

    document.querySelectorAll('.view-po').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewDetail = this.orders.find(o => o.id === btn.dataset.id) || null
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.approve-po').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (this.auth.getRole() !== 'owner') {
          toast.error('Akses ditolak', 'Hanya owner yang bisa approve PO')
          return
        }
        await this.supabase.from('purchases').update({ status: 'approved' }).eq('id', btn.dataset.id)
        await this.loadData()
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.cancel-po').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (this.auth.getRole() !== 'owner') {
          toast.error('Akses ditolak', 'Hanya owner yang bisa cancel PO')
          return
        }
        if (await ConfirmModal.show({ title: 'Batalkan PO', message: 'Batalkan PO ini?', confirmText: 'Ya, Batalkan', variant: 'danger' })) {
          await this.supabase.from('purchases').update({ status: 'cancelled' }).eq('id', btn.dataset.id)
          await this.loadData()
          this.renderAndBind()
        }
      })
    })

    document.querySelectorAll('.receive-po').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (await ConfirmModal.show({ title: 'Barang Diterima', message: 'Konfirmasi barang sudah diterima? Stok akan otomatis bertambah.', confirmText: 'Ya, Terima', variant: 'success' })) {
          const po = this.orders.find(o => o.id === btn.dataset.id)
          const items = po?.purchase_items || []
          for (const item of items) {
            await this.supabase.rpc('add_stock_movement', {
              p_product_id: item.product_id,
              p_quantity: item.quantity,
              p_type: 'in',
              p_reason: 'purchase',
              p_notes: `PO: ${po.po_number}`,
              p_created_by: this.auth.user.id
            })
          }
          await this.supabase.from('purchases').update({ status: 'received' }).eq('id', btn.dataset.id)
          await this.loadData()
          this.renderAndBind()
        }
      })
    })

    document.getElementById('back-to-list')?.addEventListener('click', () => {
      this.viewDetail = null
      this.renderAndBind()
    })

    this._bindModalEvents()
  }

  _bindModalEvents() {
    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.showModal = false
      this.renderAndBind()
    })
    document.getElementById('cancel-modal')?.addEventListener('click', () => {
      this.showModal = false
      this.renderAndBind()
    })
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) { this.showModal = false; this.renderAndBind() }
    })

    document.getElementById('add-po-item')?.addEventListener('click', () => {
      this.orderItems.push({ productId: '', qty: 1, price: 0 })
      this.renderAndBind()
    })

    document.querySelectorAll('.po-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.orderItems.splice(parseInt(btn.dataset.index), 1)
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.po-product-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.index)
        const opt = sel.options[sel.selectedIndex]
        this.orderItems[idx].productId = sel.value
        this.orderItems[idx].price = parseInt(opt?.dataset?.price) || 0
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.po-qty').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.dataset.index)
        this.orderItems[idx].qty = parseInt(inp.value) || 1
      })
    })

    document.querySelectorAll('.po-price').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.dataset.index)
        this.orderItems[idx].price = parseInt(inp.value) || 0
      })
    })

    const form = document.getElementById('po-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      this.loading = true
      this.renderAndBind()
      const formData = new FormData(form)

      const validItems = this.orderItems.filter(i => i.productId && i.qty > 0 && i.price > 0)
      if (validItems.length === 0) { toast.error('Item kosong', 'Tambahkan minimal 1 item'); this.loading = false; this.renderAndBind(); return }

      const total = validItems.reduce((s, i) => s + i.qty * i.price, 0)

      const { data: po, error } = await this.supabase.from('purchases').insert({
        po_number: 'PO-' + Date.now().toString(36).toUpperCase(),
        supplier_id: formData.get('supplier_id') || null,
        total_amount: total,
        notes: formData.get('notes') || null,
        created_by: this.auth.user.id
      }).select().single()

      if (error) { toast.error('Gagal', 'Gagal: ' + error.message); this.loading = false; this.renderAndBind(); return }

      const poItems = validItems.map(i => ({
        purchase_id: po.id,
        product_id: i.productId,
        quantity: i.qty,
        unit_price: i.price
      }))

      await this.supabase.from('purchase_items').insert(poItems)
      this.showModal = false
      this.loading = false
      await this.loadData()
      this.renderAndBind()
    })
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) { outlet.innerHTML = this.render() }
    this._bindListeners()
    if (window.lucide) window.lucide.createIcons()
  }
}