export class SalesPage {
  constructor({ supabase, auth, router }) {
    this.supabase = supabase
    this.auth = auth
    this.router = router
    this.sales = []
    this.products = []
    this.showModal = false
    this.transactionItems = []
    this.loading = false
    this.searchCustomer = ''
    this.customers = [
      'Rumah Tangga Bahagia',
      'Toko Elektronik Jaya',
      'Warung Makan Sederhana',
      'Perorangan',
      'Shopee Customer',
      'TikTok Shop Customer',
      'Tokopedia Customer'
    ]
  }

  async loadData() {
    const [salesRes, productsRes] = await Promise.all([
      this.supabase.from('sales')
        .select('*, sale_items(*, products(name, sku, cost_price)), created_by_user:users(full_name)')
        .order('created_at', { ascending: false })
        .limit(50),
      this.supabase.from('products')
        .select('id, sku, name, sell_price, cost_price, current_stock')
        .order('name')
    ])
    this.sales = salesRes.data || []
    this.products = productsRes.data || []
  }

  render() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Penjualan</h2>
            <p class="text-sm text-gray-500">${this.sales.length} transaksi</p>
          </div>
          <button id="add-sale-btn" class="btn-primary">
            <i data-lucide="plus" class="w-5 h-5"></i> Input Penjualan
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          ${this.renderStatCard('Total Penjualan', this.calcTotal(), 'trending-up', 'primary')}
          ${this.renderStatCard('Transaksi', this.sales.length, 'shopping-cart', 'success')}
          ${this.renderStatCard('Produk Terjual', this.calcItemsSold(), 'package', 'info')}
          ${this.renderStatCard('Pendapatan Bersih', this.calcProfit(), 'wallet', 'warning')}
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Tanggal</th>
                  <th>Pelanggan</th>
                  <th>Item</th>
                  <th class="text-right">Total</th>
                  <th>Pembayaran</th>
                  <th>Oleh</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${this.sales.length === 0 ? `
                  <tr><td colspan="8" class="text-center text-gray-500 py-8">Belum ada penjualan</td></tr>
                ` : this.sales.map(s => {
                  const items = s.sale_items || []
                  const profit = items.reduce((sum, i) => sum + (i.unit_price - i.products?.cost_price) * i.quantity - i.discount, 0)
                  return `
                    <tr>
                      <td class="font-mono text-xs font-medium">${s.invoice_number}</td>
                      <td class="text-sm text-gray-500 whitespace-nowrap">${this.formatDate(s.created_at)}</td>
                      <td>${s.customer_name || '-'}</td>
                      <td>${items.length}</td>
                      <td class="text-right font-semibold">Rp ${this.formatNumber(s.total_amount)}</td>
                      <td><span class="badge badge-info">${this.getPaymentLabel(s.payment_method)}</span></td>
                      <td class="text-sm text-gray-500">${s.created_by_user?.full_name || '-'}</td>
                      <td class="text-right">
                        <button class="btn-outline btn-sm view-sale" data-id="${s.id}">
                          <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                      </td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        ${this.showModal ? this.renderModal() : ''}
      </div>
    `
  }

  renderStatCard(label, value, icon, color) {
    const colors = {
      primary: 'bg-primary-50 text-primary-600',
      success: 'bg-success-50 text-success-600',
      warning: 'bg-warning-50 text-warning-600',
      info: 'bg-primary-50 text-primary-600'
    }
    
    // Labels yang tidak butuh Rp
    const noRpLabels = ['Transaksi', 'Produk Terjual']
    const showRp = !noRpLabels.includes(label)
    
    return `
      <div class="card p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-gray-500">${label}</p>
            <p class="text-lg font-bold text-gray-900 mt-1">${typeof value === 'number' ? (showRp ? `Rp ${this.formatNumber(value)}` : this.formatNumber(value)) : value}</p>
          </div>
          <div class="p-2 rounded-xl ${colors[color]}">
            <i data-lucide="${icon}" class="w-5 h-5"></i>
          </div>
        </div>
      </div>
    `
  }

  renderModal() {
    const total = this.transactionItems.reduce((sum, item) => sum + item.subtotal, 0)
    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content p-6 max-w-2xl">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold">Input Penjualan</h3>
            <button id="close-modal" class="text-gray-400 hover:text-gray-600">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          <form id="sale-form" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="customer_name">Nama Pelanggan</label>
                <input type="text" id="customer_name" list="customer-list" name="customer_name" placeholder="Nama pelanggan">
                <datalist id="customer-list">
                  ${this.customers.map(c => `<option value="${c}">`).join('')}
                </datalist>
              </div>
              <div>
                <label for="payment_method">Metode Pembayaran</label>
                <select id="payment_method" name="payment_method" required>
                  <option value="cash">Tunai</option>
                  <option value="credit">Kredit</option>
                  <option value="bank_transfer">Transfer Bank</option>
                </select>
              </div>
            </div>
            <div>
              <label>Item Produk</label>
              <div class="space-y-2" id="items-container">
                ${this.transactionItems.map((item, i) => `
                  <div class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg" data-index="${i}">
                    <select class="flex-1 product-select" data-index="${i}" required>
                      <option value="">Pilih produk</option>
                      ${this.products.map(p => `
                        <option value="${p.id}" ${item.productId === p.id ? 'selected' : ''}
                          data-price="${p.sell_price}" data-stock="${p.current_stock}">
                          ${p.sku} - ${p.name} (Stok: ${p.current_stock})
                        </option>
                      `).join('')}
                    </select>
                    <input type="number" class="w-20 text-right item-qty" data-index="${i}" value="${item.qty}" min="1" placeholder="Qty" required>
                    <input type="number" class="w-24 text-right item-discount" data-index="${i}" value="${item.discount}" min="0" placeholder="Diskon" style="width: 80px;">
                    <span class="text-sm font-semibold w-24 text-right">Rp ${this.formatNumber(item.subtotal)}</span>
                    <button type="button" class="btn-danger btn-sm remove-item" data-index="${i}">
                      <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                  </div>
                `).join('')}
              </div>
              <button type="button" id="add-item" class="btn-outline mt-2 w-full">
                <i data-lucide="plus" class="w-5 h-5"></i> Tambah Item
              </button>
            </div>
            <div class="flex justify-between items-center pt-4 border-t border-gray-100">
              <div>
                <p class="text-sm text-gray-500">Total Item: ${this.transactionItems.length}</p>
                <p class="text-lg font-bold text-primary-600">Rp ${this.formatNumber(total)}</p>
              </div>
              <div class="flex gap-3">
                <button type="button" id="cancel-modal" class="btn-secondary">Batal</button>
                <button type="submit" class="btn-primary" ${this.loading ? 'disabled' : ''}>
                  ${this.loading ? 'Memproses...' : '<i data-lucide="check" class="w-5 h-5"></i> Simpan Penjualan'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `
  }

  getPaymentLabel(method) {
    const labels = { cash: 'Tunai', credit: 'Kredit', bank_transfer: 'Transfer' }
    return labels[method] || method
  }

  calcTotal() {
    return this.sales.reduce((sum, s) => sum + (s.total_amount || 0), 0)
  }

  calcItemsSold() {
    return this.sales.reduce((sum, s) => sum + (s.sale_items || []).reduce((s2, i) => s2 + i.quantity, 0), 0)
  }

  calcProfit() {
    return this.sales.reduce((sum, s) => {
      const items = s.sale_items || []
      return sum + items.reduce((s2, i) => s2 + ((i.unit_price - (i.products?.cost_price || 0)) * i.quantity - i.discount), 0)
    }, 0)
  }

  formatNumber(num) {
    return num ? num.toLocaleString('id-ID') : '0'
  }

  formatDate(date) {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  async bindEvents() {
    await this.loadData()
    this.renderAndBind()
  }

  _bindListeners() {
    document.getElementById('add-sale-btn')?.addEventListener('click', () => {
      this.showModal = true
      this.transactionItems = [{ productId: '', qty: 1, discount: 0, subtotal: 0 }]
      this.renderAndBind()
    })

    document.querySelectorAll('.view-sale').forEach(btn => {
      btn.addEventListener('click', () => {
        const sale = this.sales.find(s => s.id === btn.dataset.id)
        if (sale) {
          const items = sale.sale_items?.map(i =>
            `- ${i.products?.name}: ${i.quantity} x Rp ${this.formatNumber(i.unit_price)}${i.discount > 0 ? ` (diskon Rp ${this.formatNumber(i.discount)})` : ''}`
          ).join('\n') || ''
          alert(
            `Invoice: ${sale.invoice_number}\n` +
            `Pelanggan: ${sale.customer_name || '-'}\n` +
            `Tanggal: ${this.formatDate(sale.created_at)}\n` +
            `Pembayaran: ${this.getPaymentLabel(sale.payment_method)}\n\n` +
            `Item:\n${items}\n\n` +
            `Total: Rp ${this.formatNumber(sale.total_amount)}`
          )
        }
      })
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
      if (e.target === e.currentTarget) {
        this.showModal = false
        this.renderAndBind()
      }
    })

    document.getElementById('add-item')?.addEventListener('click', () => {
      this.transactionItems.push({ productId: '', qty: 1, discount: 0, subtotal: 0 })
      this.renderAndBind()
    })

    document.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index)
        this.transactionItems.splice(idx, 1)
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.product-select').forEach(sel => {
      sel.addEventListener('change', () => this.updateItemSubtotal(parseInt(sel.dataset.index)))
    })

    document.querySelectorAll('.item-qty').forEach(inp => {
      inp.addEventListener('input', () => this.updateItemSubtotal(parseInt(inp.dataset.index)))
    })

    document.querySelectorAll('.item-discount').forEach(inp => {
      inp.addEventListener('input', () => this.updateItemSubtotal(parseInt(inp.dataset.index)))
    })

    const form = document.getElementById('sale-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      this.loading = true
      this.renderAndBind()
      const formData = new FormData(form)

      const validItems = this.transactionItems.filter(item => item.productId && item.qty > 0)
      if (validItems.length === 0) {
        alert('Tambahkan minimal 1 item produk')
        this.loading = false
        this.renderAndBind()
        return
      }

      const totalAmount = validItems.reduce((sum, item) => sum + item.subtotal, 0)
      const { data: sale, error: saleError } = await this.supabase.from('sales').insert({
        invoice_number: 'INV-' + Date.now().toString(36).toUpperCase(),
        customer_name: formData.get('customer_name') || null,
        total_amount: totalAmount,
        payment_method: formData.get('payment_method') || 'cash',
        created_by: this.auth.user.id
      }).select().single()

      if (saleError) {
        alert('Gagal: ' + saleError.message)
        this.loading = false
        this.renderAndBind()
        return
      }

      const saleItems = validItems.map(item => ({
        sale_id: sale.id,
        product_id: item.productId,
        quantity: item.qty,
        unit_price: item.price,
        discount: item.discount
      }))

      const { error: itemsError } = await this.supabase.from('sale_items').insert(saleItems)
      if (itemsError) {
        alert('Gagal menyimpan item: ' + itemsError.message)
        this.loading = false
        this.renderAndBind()
        return
      }

      for (const item of validItems) {
        await this.supabase.rpc('add_stock_movement', {
          p_product_id: item.productId,
          p_quantity: item.qty,
          p_type: 'out',
          p_reason: 'sale',
          p_notes: `Penjualan ${sale.invoice_number}`,
          p_created_by: this.auth.user.id
        })
      }

      if (formData.get('payment_method') !== 'credit') {
        await this.supabase.from('cash_transactions').insert({
          type: 'in',
          category: 'sales',
          amount: totalAmount,
          reference_type: 'sales',
          reference_id: sale.id,
          description: `Penjualan ${sale.invoice_number}${formData.get('customer_name') ? ` - ${formData.get('customer_name')}` : ''}`,
          created_by: this.auth.user.id
        })
      }

      this.showModal = false
      this.loading = false
      await this.loadData()
      this.renderAndBind()
    })
  }

  updateItemSubtotal(index) {
    const sel = document.querySelector(`.product-select[data-index="${index}"]`)
    const qtyInp = document.querySelector(`.item-qty[data-index="${index}"]`)
    const discInp = document.querySelector(`.item-discount[data-index="${index}"]`)
    if (!sel || !qtyInp) return

    const selectedOption = sel.options[sel.selectedIndex]
    const price = parseInt(selectedOption?.dataset?.price) || 0
    const stock = parseInt(selectedOption?.dataset?.stock) || 0
    const qty = parseInt(qtyInp.value) || 0
    const discount = parseInt(discInp?.value) || 0

    if (qty > stock) {
      alert(`Stok tidak mencukupi. Stok: ${stock}`)
      qtyInp.value = stock
      return
    }

    this.transactionItems[index] = {
      productId: sel.value,
      qty,
      discount,
      price,
      subtotal: (qty * price) - discount
    }
    this.renderAndBind()
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