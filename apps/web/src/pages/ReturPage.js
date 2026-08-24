export class ReturPage {
  constructor({ supabase, auth, router }) {
    this.supabase = supabase
    this.auth = auth
    this.router = router
    this.sales = []
    this.returns = []
    this.products = []
    this.loading = false
    this.selectedSale = null
    this.returnItems = []
    this.shippingCost = 0
    this.returnReason = ''
    this.showConfirmModal = false
    this.searchQuery = ''
    this.currentPage = 1
    this.perPage = 10
    this.successMessage = ''
  }

  async loadData() {
    const [salesRes, returnsRes, productsRes] = await Promise.all([
      this.supabase.from('sales')
        .select('*, sale_items(*, products(name, sku, cost_price)), created_by_user:users(full_name), split_payments(*)')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(200),
      this.supabase.from('sales_returns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
      this.supabase.from('products')
        .select('id, sku, name, sell_price, cost_price, current_stock')
        .order('name')
    ])

    this.sales = salesRes.data || []
    this.returns = returnsRes.data || []
    this.products = productsRes.data || []
  }

  getReturnSummary(saleId) {
    const saleReturns = this.returns.filter(r => r.sale_id === saleId && r.status === 'completed')
    if (saleReturns.length === 0) return null
    const totalRefunded = saleReturns.reduce((sum, r) => sum + (r.total_refund || 0), 0)
    const itemCount = saleReturns.reduce((sum, r) => {
      const items = r.return_items || []
      return sum + items.reduce((s, i) => s + (i.quantity || 0), 0)
    }, 0)
    return { count: saleReturns.length, totalRefunded, itemCount }
  }

  getFilteredSales() {
    let filtered = this.sales
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase()
      filtered = filtered.filter(s =>
        s.invoice_number?.toLowerCase().includes(q) ||
        s.customer_name?.toLowerCase().includes(q)
      )
    }
    return filtered
  }

  formatNumber(num) {
    return num ? num.toLocaleString('id-ID') : '0'
  }

  formatDate(date) {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  render() {
    const filtered = this.getFilteredSales()
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.perPage))
    if (this.currentPage > totalPages) this.currentPage = totalPages
    const start = (this.currentPage - 1) * this.perPage
    const pageData = filtered.slice(start, start + this.perPage)

    const totalReturns = this.returns.filter(r => r.status === 'completed')
    const totalRefund = totalReturns.reduce((sum, r) => sum + (r.total_refund || 0), 0)
    const totalShipping = totalReturns.reduce((sum, r) => sum + (r.shipping_cost || 0), 0)

    return `
      <div class="sales-page">
        <div class="page-header">
          <div>
            <div class="page-title">Retur Penjualan</div>
            <div class="page-subtitle">Proses retur barang dari transaksi yang sudah lunas</div>
          </div>
        </div>

        ${this.successMessage ? `
          <div style="background:#dcfce7;border:1px solid #86efac;border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:8px;color:#166534;font-size:13px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            ${this.successMessage}
          </div>
        ` : ''}

        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-head">
              <span class="stat-label">Total Retur</span>
              <div class="stat-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
              </div>
            </div>
            <div class="stat-value">${totalReturns.length}</div>
            <div class="stat-trend neutral">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              ${totalReturns.length > 0 ? `${this.returns.length - totalReturns.length} dibatalkan` : 'Belum ada retur'}
            </div>
          </div>
          <div class="stat-card" style="border-top-color:#ef4444">
            <div class="stat-head">
              <span class="stat-label">Total Pengembalian</span>
              <div class="stat-icon" style="background:#fee2e2;color:#dc2626">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              </div>
            </div>
            <div class="stat-value">Rp ${this.formatNumber(totalRefund)}</div>
            <div class="stat-trend neutral">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              termasuk ongkir Rp ${this.formatNumber(totalShipping)}
            </div>
          </div>
        </div>

        <div class="table-section">
          <div class="table-toolbar">
            <span class="table-title">Daftar Transaksi (Pilih untuk Retur)</span>
            <span class="table-count">${filtered.length} transaksi lunas</span>
            <div class="table-toolbar-right">
              <div class="search-box" style="position:relative">
                <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:13px;height:13px;color:#94a3b8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" id="search-sale" placeholder="Cari invoice atau pelanggan..." value="${this.searchQuery}" style="padding-left:30px;width:240px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;padding-top:7px;padding-bottom:7px">
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Tanggal</th>
                <th>Pelanggan</th>
                <th>Item</th>
                <th style="text-align:right">Total</th>
                <th style="text-align:right">Diterima</th>
                <th>Retur</th>
                <th style="text-align:center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${pageData.length === 0 ? `
                <tr>
                  <td colspan="8">
                    <div class="empty-state">
                      <div class="empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                      </div>
                      <div class="empty-title">Belum ada transaksi lunas</div>
                      <div class="empty-sub">Hanya transaksi dengan status lunas yang bisa diretur</div>
                    </div>
                  </td>
                </tr>
              ` : pageData.map(s => {
                const items = s.sale_items || []
                const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)
                const totalReceived = s.total_received || (s.total_amount - (s.platform_fee || 0))
                const createdDate = new Date(s.created_at)
                const returSummary = this.getReturnSummary(s.id)

                return `
                  <tr>
                    <td><span class="invoice-code">${s.invoice_number}</span></td>
                    <td class="date-cell">
                      ${createdDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                      <div class="date-time">${createdDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                    </td>
                    <td><span class="customer-cell">${s.customer_name || '-'}</span></td>
                    <td><span class="items-badge">${totalQty} item</span></td>
                    <td class="text-right"><span class="amount-cell">Rp ${this.formatNumber(s.total_amount)}</span></td>
                    <td class="text-right"><span class="amount-received">Rp ${this.formatNumber(totalReceived)}</span></td>
                    <td>
                      ${returSummary ? `
                        <span style="background:#fee2e2;color:#dc2626;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px">
                          🔄 ${returSummary.count}x (Rp ${this.formatNumber(returSummary.totalRefunded)})
                        </span>
                      ` : '<span style="color:#94a3b8;font-size:12px">-</span>'}
                    </td>
                    <td>
                      <div class="action-cell">
                        <button class="action-btn return-sale" data-id="${s.id}" title="Retur Transaksi" style="border-color:#7A3B58;color:#7A3B58;font-size:14px">🔄</button>
                      </div>
                    </td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>

          <div class="table-footer">
            <span class="table-info">Menampilkan ${pageData.length > 0 ? `${start + 1}–${Math.min(start + this.perPage, filtered.length)}` : '0'} dari ${filtered.length} transaksi</span>
            <div class="pagination">
              <button class="page-btn prev-page" ${this.currentPage <= 1 ? 'disabled style="opacity:0.4;cursor:default"' : ''}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              ${Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = totalPages <= 5 ? i + 1 : (this.currentPage <= 3 ? i + 1 : this.currentPage - 2 + i)
                if (page > totalPages) return ''
                return `<button class="page-btn page-num ${page === this.currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`
              }).join('')}
              <button class="page-btn next-page" ${this.currentPage >= totalPages ? 'disabled style="opacity:0.4;cursor:default"' : ''}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </div>

        ${this.showConfirmModal ? this.renderReturnModal() : ''}
      </div>
    `
  }

  renderReturnModal() {
    const sale = this.selectedSale
    if (!sale) return ''
    const items = sale.sale_items || []
    const itemsHtml = items.map(item => {
      const returnItem = this.returnItems.find(r => r.productId === item.product_id)
      const returnedQty = returnItem ? returnItem.quantity : 0
      const maxQty = item.quantity - (this.getAlreadyReturned(sale.id, item.product_id))
      const subtotal = returnedQty * (item.unit_price || 0)
      return `
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:10px 12px">
            <div style="font-weight:600;color:#0f172a;font-size:13px">${item.products?.name || '-'}</div>
            <div style="color:#94a3b8;font-size:11px">${item.products?.sku || '-'}</div>
          </td>
          <td style="padding:10px 12px;text-align:center;color:#64748b;font-size:13px">${item.quantity}</td>
          <td style="padding:10px 12px;text-align:right;color:#64748b;font-size:13px">Rp ${this.formatNumber(item.unit_price)}</td>
          <td style="padding:10px 12px;text-align:center">
            <div style="display:flex;align-items:center;justify-content:center;gap:4px">
              <button type="button" class="ret-qty-minus" data-pid="${item.product_id}" style="width:28px;height:28px;border:1px solid #e2e8f0;background:#fff;border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;${returnedQty <= 0 ? 'opacity:0.4;cursor:default' : ''}">−</button>
              <input type="number" class="ret-qty-input" data-pid="${item.product_id}" value="${returnedQty}" min="0" max="${maxQty}" style="width:50px;text-align:center;border:1px solid #e2e8f0;border-radius:6px;padding:4px;font-size:13px;font-weight:600;color:${returnedQty > 0 ? '#dc2626' : '#0f172a'}">
              <button type="button" class="ret-qty-plus" data-pid="${item.product_id}" style="width:28px;height:28px;border:1px solid #e2e8f0;background:#fff;border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;${returnedQty >= maxQty ? 'opacity:0.4;cursor:default' : ''}">+</button>
            </div>
            <div style="color:#94a3b8;font-size:10px;margin-top:2px">Max: ${maxQty}</div>
          </td>
          <td style="padding:10px 12px;text-align:right;font-weight:600;font-size:13px;color:${returnedQty > 0 ? '#dc2626' : '#0f172a'}">Rp ${this.formatNumber(subtotal)}</td>
        </tr>
      `
    }).join('')

    const totalProductReturn = this.returnItems.reduce((sum, ri) => {
      const item = items.find(i => i.product_id === ri.productId)
      return sum + (ri.quantity * (item?.unit_price || 0))
    }, 0)
    const totalRefund = totalProductReturn + (this.shippingCost || 0)

    return `
      <div class="modal-overlay" id="return-modal-overlay" style="display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.5);z-index:100;overflow-y:auto;padding:20px">
        <div style="background:white;border-radius:16px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25)">
          <div style="padding:20px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">
            <div>
              <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a">🔄 Retur Penjualan</h3>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b">${sale.invoice_number} — ${sale.customer_name || 'Pelanggan umum'}</p>
            </div>
            <button id="close-return-modal" style="width:32px;height:32px;border:none;background:#f8fafc;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:16px">✕</button>
          </div>

          <form id="return-form">
          <div style="padding:20px 24px">
            <div style="margin-bottom:16px">
              <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px">Pilih Item yang Dikembalikan</label>
              <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
                <table style="width:100%;border-collapse:collapse">
                  <thead>
                    <tr style="background:#f8fafc">
                      <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#64748b">Produk</th>
                      <th style="padding:8px 12px;text-align:center;font-size:11px;font-weight:600;color:#64748b">Qty Jual</th>
                      <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#64748b">Harga</th>
                      <th style="padding:8px 12px;text-align:center;font-size:11px;font-weight:600;color:#64748b">Qty Retur</th>
                      <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#64748b">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>${itemsHtml}</tbody>
                </table>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
              <div>
                <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px">Ongkos Kirim Retur (Rp)</label>
                <input type="number" id="return-shipping" name="shipping_cost" value="${this.shippingCost || 0}" min="0" placeholder="0" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a">
              </div>
              <div>
                <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px">Alasan Retur (opsional)</label>
                <input type="text" id="return-reason" name="reason" value="${this.returnReason || ''}" placeholder="Contoh: Produk rusak, Salah kirim..." style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a">
              </div>
            </div>

            <div style="background:#f8fafc;border-radius:12px;padding:16px">
              <div style="display:flex;justify-content:space-between;font-size:13px;color:#64748b;margin-bottom:8px">
                <span>Total Nilai Produk Dikembalikan</span>
                <strong style="color:#0f172a">Rp ${this.formatNumber(totalProductReturn)}</strong>
              </div>
              ${this.shippingCost > 0 ? `
              <div style="display:flex;justify-content:space-between;font-size:13px;color:#64748b;margin-bottom:8px">
                <span>Ongkos Kirim Retur</span>
                <strong style="color:#0f172a">Rp ${this.formatNumber(this.shippingCost)}</strong>
              </div>
              ` : ''}
              <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;padding-top:10px">
                <span>Total Pengembalian</span>
                <span style="color:#dc2626">Rp ${this.formatNumber(totalRefund)}</span>
              </div>
            </div>
          </div>

          <div style="padding:16px 24px;border-top:1px solid #f1f5f9;display:flex;gap:12px;justify-content:flex-end">
            <button type="button" id="cancel-return" style="padding:10px 20px;border:1px solid #e2e8f0;background:white;border-radius:8px;font-size:13px;font-weight:500;color:#64748b;cursor:pointer">Batal</button>
            <button type="submit" id="confirm-return" style="padding:10px 24px;border:none;background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;${totalProductReturn <= 0 ? 'opacity:0.5;cursor:not-allowed' : ''}" ${totalProductReturn <= 0 ? 'disabled' : ''}>
              ✅ Proses Retur Rp ${this.formatNumber(totalRefund)}
            </button>
          </div>
          </form>
        </div>
      </div>
    `
  }

  getAlreadyReturned(saleId, productId) {
    const saleReturns = this.returns.filter(r => r.sale_id === saleId && r.status === 'completed')
    return saleReturns.reduce((total, ret) => {
      const items = ret.return_items || []
      const ri = items.find(i => i.product_id === productId)
      return total + (ri ? ri.quantity : 0)
    }, 0)
  }

  async bindEvents() {
    await this.loadData()
    this.renderAndBind()
  }

  _bindListeners() {
    document.getElementById('search-sale')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value
      this.currentPage = 1
      this.renderAndBind()
    })

    document.querySelectorAll('.return-sale').forEach(btn => {
      btn.addEventListener('click', () => {
        const sale = this.sales.find(s => s.id === btn.dataset.id)
        if (!sale) return
        this.selectedSale = sale
        this.returnItems = []
        this.shippingCost = 0
        this.returnReason = ''
        this.showConfirmModal = true
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.page-num').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentPage = parseInt(btn.dataset.page)
        this.renderAndBind()
      })
    })
    document.querySelector('.prev-page')?.addEventListener('click', () => {
      if (this.currentPage > 1) { this.currentPage--; this.renderAndBind() }
    })
    document.querySelector('.next-page')?.addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil(this.getFilteredSales().length / this.perPage))
      if (this.currentPage < totalPages) { this.currentPage++; this.renderAndBind() }
    })

    this._bindModalEvents()
  }

  _bindModalEvents() {
    document.getElementById('close-return-modal')?.addEventListener('click', () => {
      this.showConfirmModal = false
      this.selectedSale = null
      this.renderAndBind()
    })
    document.getElementById('cancel-return')?.addEventListener('click', () => {
      this.showConfirmModal = false
      this.selectedSale = null
      this.renderAndBind()
    })
    document.getElementById('return-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.showConfirmModal = false
        this.selectedSale = null
        this.renderAndBind()
      }
    })

    document.getElementById('return-shipping')?.addEventListener('input', (e) => {
      this.shippingCost = parseInt(e.target.value) || 0
      this._refreshTotals()
    })

    document.getElementById('return-reason')?.addEventListener('input', (e) => {
      this.returnReason = e.target.value
    })

    document.querySelectorAll('.ret-qty-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = btn.dataset.pid
        const item = this.selectedSale?.sale_items?.find(i => i.product_id === pid)
        if (!item) return
        const maxQty = item.quantity - this.getAlreadyReturned(this.selectedSale.id, pid)
        const existing = this.returnItems.find(r => r.productId === pid)
        const currentQty = existing ? existing.quantity : 0
        if (currentQty < maxQty) {
          if (existing) {
            existing.quantity++
          } else {
            this.returnItems.push({ productId: pid, quantity: 1 })
          }
          this.renderAndBind()
        }
      })
    })

    document.querySelectorAll('.ret-qty-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = btn.dataset.pid
        const existing = this.returnItems.find(r => r.productId === pid)
        if (existing && existing.quantity > 0) {
          existing.quantity--
          if (existing.quantity === 0) {
            this.returnItems = this.returnItems.filter(r => r.productId !== pid)
          }
          this.renderAndBind()
        }
      })
    })

    document.querySelectorAll('.ret-qty-input').forEach(inp => {
      inp.addEventListener('change', () => {
        const pid = inp.dataset.pid
        const item = this.selectedSale?.sale_items?.find(i => i.product_id === pid)
        if (!item) return
        const maxQty = item.quantity - this.getAlreadyReturned(this.selectedSale.id, pid)
        let qty = parseInt(inp.value) || 0
        if (qty < 0) qty = 0
        if (qty > maxQty) qty = maxQty
        if (qty > 0) {
          const existing = this.returnItems.find(r => r.productId === pid)
          if (existing) {
            existing.quantity = qty
          } else {
            this.returnItems.push({ productId: pid, quantity: qty })
          }
        } else {
          this.returnItems = this.returnItems.filter(r => r.productId !== pid)
        }
        this.renderAndBind()
      })
    })

    const form = document.getElementById('return-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      if (!this.auth?.user?.id) {
        alert('Sesi habis. Silakan login kembali.')
        return
      }

      const validItems = this.returnItems.filter(r => r.quantity > 0)
      if (validItems.length === 0) {
        alert('Pilih minimal 1 item untuk diretur')
        return
      }

      const sale = this.selectedSale
      const items = sale.sale_items || []
      const shipping = this.shippingCost || 0
      const returnItemsData = validItems.map(ri => {
        const item = items.find(i => i.product_id === ri.productId)
        const product = this.products.find(p => p.id === ri.productId)
        return {
          product_id: ri.productId,
          product_name: product?.name || item?.products?.name || '-',
          unit_price: item?.unit_price || 0,
          quantity: ri.quantity,
          subtotal: ri.quantity * (item?.unit_price || 0)
        }
      })
      const totalProductAmount = returnItemsData.reduce((sum, ri) => sum + ri.subtotal, 0)
      const totalRefund = totalProductAmount + shipping

      if (!confirm(`Yakin ingin memproses retur?\n\nNilai produk: Rp ${this.formatNumber(totalProductAmount)}\nOngkir: Rp ${this.formatNumber(shipping)}\nTotal: Rp ${this.formatNumber(totalRefund)}\n\nStok akan dikembalikan dan revenue akan dikurangi.`)) {
        return
      }

      this.loading = true
      this.renderAndBind()

      try {
        // 1. Save return record
        const { error: returnError } = await this.supabase.from('sales_returns').insert({
          sale_id: sale.id,
          invoice_number: sale.invoice_number,
          customer_name: sale.customer_name,
          return_items: returnItemsData,
          total_product_amount: totalProductAmount,
          shipping_cost: shipping,
          total_refund: totalRefund,
          reason: this.returnReason || null,
          status: 'completed',
          created_by: this.auth.user.id
        })
        if (returnError) {
          alert('Gagal menyimpan data retur: ' + returnError.message)
          this.loading = false
          this.renderAndBind()
          return
        }

        // 2. Restore stock for each returned item
        for (const ri of returnItemsData) {
          await this.supabase.rpc('add_stock_movement', {
            p_product_id: ri.product_id,
            p_quantity: ri.quantity,
            p_type: 'in',
            p_reason: 'return',
            p_notes: `Retur dari ${sale.invoice_number}`,
            p_created_by: this.auth.user.id
          })
        }

        // 3. Deduct revenue — cash transaction out
        await this.supabase.from('cash_transactions').insert({
          type: 'out',
          category: 'return',
          amount: totalRefund,
          reference_type: 'sales_returns',
          reference_id: sale.id,
          description: `Retur ${sale.invoice_number}${sale.customer_name ? ` - ${sale.customer_name}` : ''}${this.returnReason ? ` (${this.returnReason})` : ''}`,
          created_by: this.auth.user.id
        })

        // 4. If shipping cost > 0, record it as separate expense too
        // (The total refund already includes shipping in the cash_transactions above)

        // Success!
        this.loading = false
        this.showConfirmModal = false
        this.selectedSale = null
        this.returnItems = []
        this.shippingCost = 0
        this.returnReason = ''
        this.successMessage = `Retur ${sale.invoice_number} berhasil! Stok dikembalikan dan revenue dikurangi Rp ${this.formatNumber(totalRefund)}.`

        await this.loadData()
        this.renderAndBind()

        // Auto-dismiss success message after 5s
        setTimeout(() => {
          this.successMessage = ''
          this.renderAndBind()
        }, 5000)

      } catch (err) {
        console.error('Return error:', err)
        alert('Terjadi kesalahan: ' + err.message)
        this.loading = false
        this.renderAndBind()
      }
    })
  }

  _refreshTotals() {
    const shippingEl = document.getElementById('return-shipping')
    if (shippingEl) shippingEl.value = this.shippingCost

    // Re-render to update the summary box
    if (this.showConfirmModal && this.selectedSale) {
      const modal = document.querySelector('.modal-overlay')
      if (modal) {
        modal.outerHTML = this.renderReturnModal()
        this._bindModalEvents()
      }
    }
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
