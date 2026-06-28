import { Exporter } from '../utils/export.js'

export class SalesPage {
  constructor({ supabase, auth, router }) {
    this.supabase = supabase
    this.auth = auth
    this.router = router
    this.sales = []
    this.products = []
    this.showModal = false
    this.showViewModal = false
    this.selectedSale = null
    this.transactionItems = []
    this.loading = false
    this.searchCustomer = ''
    this.searchQuery = ''
    this.startDate = ''
    this.endDate = ''
    this.currentPage = 1
    this.perPage = 10
    this.splitPayments = []
    this.paymentMethod = 'cash'
    this.paymentMethods = []
    this.productSkus = []
    this.productVariants = []
    this.editingSale = null
    this.mainPaymentAmount = 0
    this.formCustomerName = ''
    this.formMarketplace = ''
    this.formPlatformFee = 0
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
    const [salesRes, productsRes, methodsRes, skusRes, variantsRes] = await Promise.all([
      this.supabase.from('sales')
        .select('*, sale_items(*, products(name, sku, cost_price)), created_by_user:users(full_name), split_payments(*)')
        .order('created_at', { ascending: false })
        .limit(100),
      this.supabase.from('products')
        .select('id, sku, name, sell_price, cost_price, current_stock')
        .order('name'),
      this.supabase.from('payment_methods')
        .select('*')
        .order('sort_order'),
      this.supabase.from('product_skus')
        .select('*')
        .order('created_at'),
      this.supabase.from('product_variants')
        .select('*')
        .order('sort_order')
    ])

    this.sales = salesRes.data || []
    this.products = productsRes.data || []
    this.paymentMethods = methodsRes.data || []
    this.productSkus = skusRes.data || []
    this.productVariants = variantsRes.data || []
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
    if (this.startDate) {
      const start = new Date(this.startDate)
      start.setHours(0, 0, 0, 0)
      filtered = filtered.filter(s => new Date(s.created_at) >= start)
    }
    if (this.endDate) {
      const end = new Date(this.endDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter(s => new Date(s.created_at) <= end)
    }
    return filtered
  }

  render() {
    const filtered = this.getFilteredSales()
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.perPage))
    if (this.currentPage > totalPages) this.currentPage = totalPages
    const start = (this.currentPage - 1) * this.perPage
    const pageData = filtered.slice(start, start + this.perPage)

    const todayTotal = this.sales
      .filter(s => new Date(s.created_at) >= new Date(new Date().setHours(0, 0, 0, 0)))
      .reduce((sum, s) => sum + (s.total_amount || 0), 0)
    const yesterdayTotal = this.sales
      .filter(s => {
        const d = new Date(s.created_at)
        const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(0, 0, 0, 0)
        return d >= y && d < new Date(new Date().setHours(0, 0, 0, 0))
      })
      .reduce((sum, s) => sum + (s.total_amount || 0), 0)
    const trendPct = yesterdayTotal ? ((todayTotal - yesterdayTotal) / yesterdayTotal * 100).toFixed(0) : null

    const totalItems = filtered.reduce((sum, s) => sum + (s.sale_items || []).reduce((s2, i) => s2 + i.quantity, 0), 0)
    const catSet = new Set()
    filtered.forEach(s => (s.sale_items || []).forEach(i => { if (i.products?.name) catSet.add(i.products.name) }))

    const totalProfit = filtered.reduce((sum, s) => {
      return sum + (s.sale_items || []).reduce((s2, i) => s2 + ((i.unit_price - (i.products?.cost_price || 0)) * i.quantity - i.discount), 0)
    }, 0)
    const totalRevenue = filtered.reduce((sum, s) => sum + (s.total_amount || 0), 0)
    const marginPct = totalRevenue ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0'

    return `
      <div class="sales-page">
        <div class="page-header">
          <div>
            <div class="page-title">Penjualan</div>
            <div class="page-subtitle">Kelola dan pantau seluruh transaksi penjualan Anda</div>
          </div>
          <div class="header-actions">
            <button id="export-btn" class="btn-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
            <button id="scan-btn" class="btn-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
              Scan Barcode
            </button>
            <button id="add-sale-btn" class="btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Input Penjualan
            </button>
          </div>
        </div>

        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-head">
              <span class="stat-label">Total Penjualan</span>
              <div class="stat-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              </div>
            </div>
            <div class="stat-value">Rp ${this.formatNumber(this.calcTotal(filtered))}</div>
            <div class="stat-trend ${trendPct !== null && trendPct >= 0 ? 'up' : ''}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="${trendPct !== null && trendPct >= 0 ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}"/></svg>
              ${trendPct !== null ? `${trendPct >= 0 ? '+' : ''}${trendPct}% dari kemarin` : 'Belum ada data'}
            </div>
          </div>
          <div class="stat-card green">
            <div class="stat-head">
              <span class="stat-label">Transaksi</span>
              <div class="stat-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              </div>
            </div>
            <div class="stat-value">${filtered.length}</div>
            <div class="stat-trend up">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
              ${filtered.length > 0 ? `${start + 1}–${Math.min(start + this.perPage, filtered.length)} dari ${filtered.length}` : 'Belum ada transaksi'}
            </div>
          </div>
          <div class="stat-card" style="border-top-color:#f59e0b">
            <div class="stat-head">
              <span class="stat-label">Belum Lunas</span>
              <div class="stat-icon" style="background:#fef3c7;color:#92400e">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
            </div>
            <div class="stat-value">${filtered.filter(s => s.status !== 'completed').length}</div>
            <div class="stat-trend neutral">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              ${this.formatNumber(this.calcTotal(filtered.filter(s => s.status !== 'completed')))} belum dibayar
            </div>
          </div>
          <div class="stat-card amber">
            <div class="stat-head">
              <span class="stat-label">Produk Terjual</span>
              <div class="stat-icon amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
              </div>
            </div>
            <div class="stat-value">${totalItems}</div>
            <div class="stat-trend neutral">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              ${catSet.size} ${catSet.size > 1 ? 'kategori' : 'kategori'} produk
            </div>
          </div>
          <div class="stat-card purple">
            <div class="stat-head">
              <span class="stat-label">Pendapatan Bersih</span>
              <div class="stat-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
            </div>
            <div class="stat-value">Rp ${this.formatNumber(totalProfit)}</div>
            <div class="stat-trend up">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
              Margin ${marginPct}%
            </div>
          </div>
        </div>

        <div class="table-section">
          <div class="table-toolbar">
            <span class="table-title">Daftar Transaksi</span>
            <span class="table-count">${filtered.length} transaksi</span>
            <div class="table-toolbar-right">
              <button class="filter-btn" id="filter-table-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                Filter
              </button>
              <div class="date-filter" style="display:flex;align-items:center;gap:6px">
                <input type="date" id="filter-start-date" value="${this.startDate}" style="border:1px solid #e2e8f0;border-radius:6px;font-size:12px;padding:6px 8px">
                <span style="color:#94a3b8;font-size:12px">–</span>
                <input type="date" id="filter-end-date" value="${this.endDate}" style="border:1px solid #e2e8f0;border-radius:6px;font-size:12px;padding:6px 8px">
              </div>
              <div class="search-box" style="position:relative">
                <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:13px;height:13px;color:#94a3b8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" id="search-sale" placeholder="Cari invoice atau pelanggan..." value="${this.searchQuery}" style="padding-left:30px;width:200px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;padding-top:7px;padding-bottom:7px">
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Pelanggan</th>
                <th>Marketplace</th>
                <th>Item</th>
                <th style="text-align:right">Total</th>
                <th style="text-align:right">Potongan</th>
                <th style="text-align:right">Diterima</th>
                <th>Pembayaran</th>
                <th>Oleh</th>
                <th style="text-align:center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${pageData.length === 0 ? `
                <tr>
                  <td colspan="12">
                    <div class="empty-state">
                      <div class="empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
                      </div>
                      <div class="empty-title">Belum ada transaksi</div>
                      <div class="empty-sub">Mulai dengan menekan tombol Input Penjualan</div>
                    </div>
                  </td>
                </tr>
              ` : pageData.map(s => {
                const items = s.sale_items || []
                const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)
                const isWalkIn = !s.customer_name || s.customer_name === '-' || s.customer_name === 'Perorangan' || s.customer_name.toLowerCase().includes('umum')
                const createdDate = new Date(s.created_at)
                const byName = s.created_by_user?.full_name || '-'
                const byInitials = byName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

                // Map marketplace codes to nice names
                const marketplaceNames = {
                  shopee: 'Shopee',
                  tiktok: 'TikTok Shop',
                  tokopedia: 'Tokopedia',
                  lazada: 'Lazada'
                }

                // Calculate total received
                let totalReceived = s.total_received
                if (totalReceived === null || totalReceived === undefined) {
                  totalReceived = s.total_amount - (s.platform_fee || 0)
                }

                // Prepare template variables
                const customerHtml = isWalkIn ? `
                  <span class="customer-anonymous">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Pelanggan umum
                  </span>
                ` : `<span class="customer-cell">${s.customer_name}</span>`

                const marketplaceHtml = s.marketplace ? `<span class="badge" style="background:#F4E5EC;color:#7A3B58">${marketplaceNames[s.marketplace]}</span>` : '-'

                const platformFeeHtml = s.platform_fee > 0 ? `<span style="color:#ef4444;font-weight:600">- Rp ${this.formatNumber(s.platform_fee)}</span>` : '-'

                const byNameHtml = byName.length > 10 ? byName.split(' ')[0] + ' ' + (byName.split(' ')[1]?.[0] || '') + '.' : byName

                return `
                  <tr>
                    <td><span class="invoice-code">${s.invoice_number}</span></td>
                    <td>${s.status === 'completed' ? '<span class="badge badge-tunai">Lunas</span>' : '<span class="badge badge-belum">Belum Lunas</span>'}</td>
                    <td class="date-cell">
                      ${createdDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                      <div class="date-time">${createdDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                    </td>
                    <td>${customerHtml}</td>
                    <td>${marketplaceHtml}</td>
                    <td><span class="items-badge">${totalQty} item</span></td>
                    <td class="text-right"><span class="amount-cell">Rp ${this.formatNumber(s.total_amount)}</span></td>
                    <td class="text-right">${platformFeeHtml}</td>
                    <td class="text-right">${s.status === 'completed' ? `<span class="amount-received">Rp ${this.formatNumber(totalReceived)}</span>` : '<span class="amount-pending">-</span>'}</td>
                    <td><div class="payment-cell">${this.renderPaymentBadges(s)}</div></td>
                    <td class="by-cell"><span class="by-avatar">${byInitials}</span>${byNameHtml}</td>
                    <td><div class="action-cell">
                      <button class="action-btn view-sale" data-id="${s.id}" title="Lihat Detail">👁️</button>
                      <button class="action-btn print-sale" data-id="${s.id}" title="Cetak Invoice">🖨️</button>
                      ${s.status !== 'completed' ? `<button class="action-btn edit-sale" data-id="${s.id}" title="Edit Draft" style="border-color:#7A3B58;color:#7A3B58">✏️</button>` : ''}
                      ${s.status !== 'completed' ? `<button class="action-btn close-sale" data-id="${s.id}" title="Tutup (Lunas)" style="border-color:#22c55e;color:#16a34a">✓</button>` : ''}
                      ${s.status !== 'completed' ? `<button class="action-btn delete-sale" data-id="${s.id}" title="Hapus Draft" style="border-color:#ef4444;color:#ef4444">🗑️</button>` : ''}
                    </div></td>
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

        ${this.showModal ? this.renderModal() : ''}
        ${this.showViewModal ? this.renderViewModal() : ''}
      </div>
    `
  }

  renderBadge(method, customLabel) {
    const pm = this.paymentMethods.find(p => p.code === method)
    const label = customLabel || pm?.name || method
    const color = pm?.color || '#64748b'
    const bgColor = color + '18'
    return `
      <span class="badge" style="background:${bgColor};color:${color};border:1px solid ${color}22;font-size:11px;white-space:nowrap">
        ${label}
      </span>
    `
  }

  renderModal() {
    const total = this.transactionItems.reduce((sum, item) => sum + item.subtotal, 0)
    const totalQty = this.transactionItems.reduce((sum, item) => sum + item.qty, 0)
    const totalDisc = this.transactionItems.reduce((sum, item) => sum + (item.discount || 0), 0)
    const splitTotal = this.splitPayments.reduce((sum, sp) => sum + (sp.amount || 0), 0)
    const mainAmount = this.mainPaymentAmount || total
    const totalPaid = mainAmount + splitTotal
    const remaining = total - totalPaid

    return `
      <div class="modal-overlay" id="modal-overlay" style="display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.5);z-index:100;overflow-y:auto;padding:20px">
        <div class="sales-modal">
          <div class="modal-header">
            <h2>🛒 ${this.editingSale ? 'Edit Draft' : 'Input Penjualan'}</h2>
            <button id="close-modal" class="close-btn">✕</button>
          </div>

          <form id="sale-form">
          <div class="sales-layout">

            <!-- KIRI -->
            <div class="sales-content">

              <div class="search-box">
                <input type="text" id="product-search" placeholder="Cari produk atau scan barcode..." autocomplete="off">
              </div>

              <div class="section-title">Keranjang Belanja</div>

              <div class="cart-list" id="items-container">
                ${this.transactionItems.length === 0 ? `
                  <div style="padding:40px;text-align:center;color:#94a3b8;font-size:13px;background:#f8fafc;border-radius:16px;border:2px dashed #e2e8f0">
                    Belum ada produk. Klik "Tambah Produk" untuk memulai.
                  </div>
                ` : this.transactionItems.map((item, i) => {
                  const product = this.products.find(p => p.id === item.productId)
                  const productVariants = this.productVariants.filter(v => v.product_id === item.productId)
                  const productSkuList = this.productSkus.filter(s => s.product_id === item.productId)
                  const hasVariants = productVariants.length > 0 && productSkuList.length > 0
                  const selectedSku = item.skuId ? this.productSkus.find(s => s.id === item.skuId) : null
                  return `
                    <div class="cart-item" data-index="${i}">
                      <div class="product-image">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" width="24" height="24">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                        </svg>
                      </div>
                      <div class="product-info">
                        <select class="product-select cart-product-select" data-index="${i}" required style="border:none;background:none;font-weight:600;font-size:14px;color:#0f172a;cursor:pointer;padding:0;width:100%">
                          <option value="">Pilih produk</option>
                          ${this.products.map(p => {
                            const pSkus = this.productSkus.filter(s => s.product_id === p.id)
                            const pVariants = this.productVariants.filter(v => v.product_id === p.id)
                            const hasPvars = pVariants.length > 0 && pSkus.length > 0
                            return `
                              <option value="${p.id}" ${item.productId === p.id ? 'selected' : ''}
                                data-price="${p.sell_price}" data-stock="${p.current_stock}"
                                data-has-variants="${hasPvars ? '1' : '0'}">
                                ${p.name} (${p.sku}) ${hasPvars ? `- ${pSkus.length} varian` : `- Stok: ${p.current_stock}`}
                              </option>
                            `
                          }).join('')}
                        </select>
                        ${hasVariants ? `
                          <select class="variant-select" data-index="${i}" style="border:1px solid #e2e8f0;border-radius:6px;padding:4px 6px;font-size:12px;color:#475569;margin-top:4px;width:100%">
                            <option value="">Pilih varian</option>
                            ${productSkuList.map(sku => `
                              <option value="${sku.id}" ${item.skuId === sku.id ? 'selected' : ''}
                                data-price="${sku.sell_price || product.sell_price}" data-stock="${sku.current_stock}">
                                ${Object.values(sku.variant_values || {}).join(' / ')} - Stok: ${sku.current_stock}
                              </option>
                            `).join('')}
                          </select>
                        ` : `<small>SKU : ${product?.sku || '-'}</small>`}
                        <select class="item-marketplace" data-index="${i}" style="border:1px solid #e2e8f0;border-radius:6px;padding:4px 6px;font-size:11px;color:#475569;margin-top:4px;width:100%">
                          <option value="" ${!item.marketplace ? 'selected' : ''}>Offline</option>
                          <option value="shopee" ${item.marketplace === 'shopee' ? 'selected' : ''}>Shopee</option>
                          <option value="tokopedia" ${item.marketplace === 'tokopedia' ? 'selected' : ''}>Tokopedia</option>
                          <option value="tiktok" ${item.marketplace === 'tiktok' ? 'selected' : ''}>TikTok Shop</option>
                          <option value="lazada" ${item.marketplace === 'lazada' ? 'selected' : ''}>Lazada</option>
                        </select>
                      </div>
                      <div class="qty-control">
                        <button type="button" class="qty-minus" data-index="${i}">−</button>
                        <input type="number" class="item-qty" data-index="${i}" value="${item.qty}" min="1">
                        <button type="button" class="qty-plus" data-index="${i}">+</button>
                      </div>
                      <div class="price">
                        Rp ${this.formatNumber(item.subtotal)}
                        <small>Rp ${this.formatNumber(item.price || 0)}/pc</small>
                      </div>
                      <button type="button" class="remove-btn remove-item" data-index="${i}">✕</button>
                    </div>
                  `
                }).join('')}
              </div>

              <button type="button" id="add-item" class="add-item-btn">
                + Tambah Produk
              </button>

            </div>

            <!-- KANAN -->
            <div class="summary-panel">

              <div class="summary-title">Ringkasan Transaksi</div>

              <div class="form-group">
                <label>Pelanggan</label>
                <input type="text" id="customer_name" name="customer_name" list="customer-list" placeholder="Ketik nama pelanggan..." value="${this.formCustomerName || ''}">
                <datalist id="customer-list">
                  <option value="Pelanggan Umum">
                  ${this.customers.map(c => `<option value="${c}">`).join('')}
                </datalist>
              </div>

              <div class="form-group" id="platformFeeSection">
                <label>Potongan Platform</label>
                <input type="number" id="platform_fee" name="platform_fee" min="0" value="${this.formPlatformFee || 0}" placeholder="0" readonly style="background:#f1f5f9">
              </div>

              <div class="form-group">
                <label>Metode Pembayaran</label>
                <div class="split-row">
                  <select id="payment_method" name="payment_method" required>
                    ${this.paymentMethods.filter(pm => pm.is_active).map(pm => `
                      <option value="${pm.code}" ${pm.code === this.paymentMethod ? 'selected' : ''}>${pm.name}</option>
                    `).join('')}
                  </select>
                  <input type="number" id="main_payment_amount" name="main_payment_amount" value="${this.mainPaymentAmount || total}" min="0" placeholder="Nominal">
                </div>
              </div>

              <div id="splitPaymentSection">
                ${this.splitPayments.map((sp, i) => `
                  <div class="split-row" data-index="${i}">
                    <select class="split-method" data-index="${i}">
                      ${this.paymentMethods.filter(pm => pm.is_active).map(pm => `
                        <option value="${pm.code}" ${sp.method === pm.code ? 'selected' : ''}>${pm.name}</option>
                      `).join('')}
                    </select>
                    <input type="number" class="split-amount" data-index="${i}" value="${sp.amount || 0}" min="0" placeholder="Nominal">
                    <button type="button" class="remove-split" data-index="${i}" style="width:42px;height:42px;border:none;background:#fee2e2;color:#ef4444;border-radius:12px;cursor:pointer;flex-shrink:0">✕</button>
                  </div>
                `).join('')}
                <button type="button" id="add-split" class="add-split">
                  + Tambah Metode Pembayaran
                </button>
              </div>

              <div class="total-section">
                <div class="total-row">
                  <span>Total Item</span>
                  <strong id="totalQty">${totalQty}</strong>
                </div>
                <div class="total-row">
                  <span>Subtotal</span>
                  <strong id="totalSubtotal">Rp ${this.formatNumber(total)}</strong>
                </div>
                <div class="total-row" id="totalPaidRow" style="${this.splitPayments.length > 0 ? '' : 'display:none'}">
                  <span>Pembayaran</span>
                  <strong id="totalPaid" style="color:#16a34a">Rp ${this.formatNumber(totalPaid)}</strong>
                </div>
                <div class="total-row" id="totalRemainingRow" style="${this.splitPayments.length > 0 ? '' : 'display:none'}">
                  <span>Sisa</span>
                  <strong id="totalRemaining" style="color:${remaining > 0 ? '#ef4444' : '#16a34a'}">Rp ${this.formatNumber(remaining)}</strong>
                </div>
                <div class="total-row grand-total">
                  <span>Total</span>
                  <strong id="totalGrand">Rp ${this.formatNumber(total)}</strong>
                </div>
              </div>

              <div class="action-buttons">
                <button type="button" id="cancel-modal" class="btn-cancel">Batal</button>
                <button type="submit" id="save-draft-btn" name="save_action" value="draft" class="btn-draft" ${this.loading ? 'disabled' : ''}>
                  ${this.loading ? 'Memproses...' : 'Simpan Draft'}
                </button>
                <button type="submit" id="save-complete-btn" name="save_action" value="completed" class="btn-save" ${this.loading ? 'disabled' : ''}>
                  ${this.loading ? 'Memproses...' : 'Simpan Transaksi'}
                </button>
                <input type="hidden" id="sale-status" name="status" value="draft">
              </div>

            </div>

          </div>
          </form>
        </div>
      </div>
    `
  }

  renderViewModal() {
    const sale = this.selectedSale
    const items = sale?.sale_items || []
    const byName = sale?.created_by_user?.full_name || '-'
    const byInitials = byName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

    const marketplaceNames = {
      shopee: 'Shopee',
      tiktok: 'TikTok Shop',
      tokopedia: 'Tokopedia',
      lazada: 'Lazada'
    }

    return `
      <div class="modal-overlay" id="view-modal-overlay">
        <div class="modal-content p-6 max-w-3xl" style="border-radius:14px">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-lg font-semibold" style="font-size:18px;font-weight:700;color:#0f172a">Detil Penjualan</h3>
              <p class="text-sm" style="color:#64748b;margin-top:2px">Invoice: ${sale?.invoice_number}</p>
            </div>
            <button id="close-view-modal" class="text-gray-400 hover:text-gray-600" style="border:none;background:none;cursor:pointer">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Pelanggan</p>
              <p style="font-weight:500;color:#1e293b">${sale?.customer_name || '-'}</p>
            </div>
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Tanggal</p>
              <p style="font-weight:500;color:#1e293b">${this.formatDate(sale?.created_at)}</p>
            </div>
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Status</p>
              <p style="font-weight:500;color:#1e293b">${sale?.status === 'completed' ? '✅ Lunas' : '⏳ Belum Lunas'}</p>
            </div>
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Marketplace</p>
              <p style="font-weight:500;color:#1e293b">${sale?.marketplace ? marketplaceNames[sale.marketplace] : 'Offline / Lainnya'}</p>
            </div>
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Pembayaran</p>
              ${this._renderPaymentBreakdown(sale)}
            </div>
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Potongan Platform</p>
              <p style="font-weight:500;color:#1e293b">${sale?.platform_fee > 0 ? `Rp ${this.formatNumber(sale.platform_fee)}` : '-'}</p>
            </div>
            <div>
              <p style="font-size:12px;color:#64748b;margin-bottom:4px">Kasir</p>
              <p style="font-weight:500;color:#1e293b">${byName}</p>
            </div>
          </div>
          <div style="border-top:1px solid #f1f5f9;padding-top:16px;margin-bottom:16px">
            <h4 style="font-size:13px;font-weight:600;color:#334155;margin-bottom:12px">Item Produk</h4>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${items.map(item => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:#f8fafc;border-radius:8px">
                  <div>
                    <p style="font-weight:500;color:#1e293b">${item.products?.name || '-'}</p>
                    <p style="font-size:12px;color:#64748b">${item.quantity} x Rp ${this.formatNumber(item.unit_price)}</p>
                  </div>
                  <div style="text-align:right">
                    ${item.discount > 0 ? `<p style="font-size:11px;color:#ef4444">Diskon: Rp ${this.formatNumber(item.discount)}</p>` : ''}
                    <p style="font-weight:600;color:#0f172a">Rp ${this.formatNumber((item.quantity * item.unit_price) - item.discount)}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding-top:16px;border-top:1px solid #f1f5f9">
            <div style="display:flex;gap:8px">
              ${sale?.status !== 'completed' ? `
                <button id="view-close-sale-btn" class="btn-secondary" data-id="${sale.id}" style="display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border:1px solid #22c55e;border-radius:6px;background:#f0fdf4;font-size:13px;font-weight:500;color:#16a34a;cursor:pointer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Tutup (Lunas)
                </button>
              ` : ''}
              <button id="print-detail-btn" class="btn-secondary" style="display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;font-size:13px;font-weight:500;color:#334155;cursor:pointer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Cetak
              </button>
            </div>
            <div style="text-align:right">
              <p style="font-size:14px;color:#64748b">Total: Rp ${this.formatNumber(sale?.total_amount)}</p>
              ${sale?.platform_fee > 0 ? `<p style="font-size:14px;color:#ef4444;margin:4px 0">Potongan platform: - Rp ${this.formatNumber(sale.platform_fee)}</p>` : ''}
              <p style="font-size:16px;font-weight:700;color:#16a34a">Diterima: Rp ${this.formatNumber(sale?.total_received ?? (sale?.total_amount - (sale?.platform_fee || 0)))}</p>
            </div>
          </div>
        </div>
      </div>
    `
  }

  getPaymentLabel(method) {
    const pm = this.paymentMethods.find(p => p.code === method)
    return pm?.name || method
  }

  _renderPaymentDetail(sale) {
    if (!sale) return '-'
    const main = this.getPaymentLabel(sale.payment_method)
    const splits = sale.split_payments?.length > 0
      ? sale.split_payments
      : (sale.payment_details?.splits?.length > 0 ? sale.payment_details.splits : [])
    if (splits.length === 0) return main
    const parts = [main]
    splits.forEach(sp => {
      if (sp.amount > 0) parts.push(`${this.getPaymentLabel(sp.method)} (${this.formatNumber(sp.amount)})`)
    })
    return parts.join(' + ')
  }

  _renderPaymentBreakdown(sale) {
    if (!sale) return '<p style="font-weight:500;color:#1e293b">-</p>'
    const mainMethod = sale.payment_method
    const mainAmount = sale.payment_details?.main_amount || sale.total_amount
    const splits = sale.split_payments?.length > 0
      ? sale.split_payments
      : (sale.payment_details?.splits?.length > 0 ? sale.payment_details.splits : [])
    const hasSplits = splits.length > 0 && splits.some(sp => sp.amount > 0)

    if (!hasSplits) {
      return `<p style="font-weight:500;color:#1e293b">${this.getPaymentLabel(mainMethod)} — Rp ${this.formatNumber(mainAmount)}</p>`
    }

    let html = `<div style="display:flex;flex-direction:column;gap:4px">`
    html += `<div style="display:flex;justify-content:space-between;font-weight:500;color:#1e293b">
      <span>${this.getPaymentLabel(mainMethod)}</span>
      <span>Rp ${this.formatNumber(mainAmount)}</span>
    </div>`
    splits.filter(sp => sp.amount > 0).forEach(sp => {
      html += `<div style="display:flex;justify-content:space-between;font-weight:500;color:#1e293b">
        <span>${this.getPaymentLabel(sp.method)}</span>
        <span>Rp ${this.formatNumber(sp.amount)}</span>
      </div>`
    })
    html += `</div>`
    return html
  }

  renderPaymentBadges(sale) {
    const splits = sale.split_payments?.length > 0
      ? sale.split_payments
      : (sale.payment_details?.splits?.length > 0 ? sale.payment_details.splits : [])
    const mainMethod = sale.payment_method
    const mainAmount = sale.payment_details?.main_amount || sale.total_amount

    if (splits.length === 0) {
      return this.renderBadge(mainMethod, `${this.getPaymentLabel(mainMethod)} Rp ${this.formatNumber(sale.total_amount)}`)
    }

    const mainHtml = this.renderBadge(mainMethod, `${this.getPaymentLabel(mainMethod)} Rp ${this.formatNumber(mainAmount)}`)
    const splitsHtml = splits.filter(sp => sp.amount > 0).map(sp =>
      this.renderBadge(sp.method, `${this.getPaymentLabel(sp.method)} Rp ${this.formatNumber(sp.amount)}`)
    ).join('')
    return mainHtml + splitsHtml
  }

  calcTotal(sales) {
    return sales.reduce((sum, s) => sum + (s.total_amount || 0), 0)
  }

  formatNumber(num) {
    return num ? num.toLocaleString('id-ID') : '0'
  }

  formatDate(date) {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  exportSales() {
    const filtered = this.getFilteredSales()
    const salesData = Exporter.exportSales(filtered)
    Exporter.downloadCSV(salesData.filename, salesData.headers, salesData.rows)
    Exporter.downloadPDF(salesData.title, salesData.headers, salesData.rows, salesData.filename)
  }

  printSale(sale) {
    const items = sale.sale_items || []
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #e2e8f0">${item.products?.name || '-'}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center">${item.quantity}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">Rp ${this.formatNumber(item.unit_price)}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">${item.discount > 0 ? `Rp ${this.formatNumber(item.discount)}` : '-'}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">Rp ${this.formatNumber((item.quantity * item.unit_price) - item.discount)}</td>
      </tr>
    `).join('')
    const paymentLabel = this._renderPaymentDetail(sale)
    const marketplaceNames = {
      shopee: 'Shopee',
      tiktok: 'TikTok Shop',
      tokopedia: 'Tokopedia',
      lazada: 'Lazada'
    }
    const totalReceived = sale.total_received ?? (sale.total_amount - (sale.platform_fee || 0))
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak Invoice - ${sale.invoice_number}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 40px; color: #0f172a; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #7A3B58; }
          .header h1 { font-size: 24px; margin: 0; color: #7A3B58; }
          .header p { margin: 4px 0 0; color: #64748b; font-size: 12px; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
          .info .label { color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          th { background: #7A3B58; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
          td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
          .total-section { text-align: right; padding-top: 15px; border-top: 2px solid #0f172a; }
          .total-section .total { font-size: 20px; font-weight: bold; color: #16a34a; }
          .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header"><h1>Jenna Shop</h1><p>Invoice Penjualan</p></div>
        <div class="info">
          <div>
            <p><span class="label">Invoice:</span> ${sale.invoice_number}</p>
            <p><span class="label">Tanggal:</span> ${this.formatDate(sale.created_at)}</p>
            ${sale.marketplace ? `<p><span class="label">Marketplace:</span> ${marketplaceNames[sale.marketplace]}</p>` : ''}
          </div>
          <div style="text-align:right">
            <p><span class="label">Pelanggan:</span> ${sale.customer_name || '-'}</p>
            <p><span class="label">Kasir:</span> ${sale.created_by_user?.full_name || '-'}</p>
            <p><span class="label">Status:</span> ${sale.status === 'completed' ? 'Lunas' : 'Belum Lunas'}</p>
            <p><span class="label">Pembayaran:</span> ${paymentLabel}</p>
          </div>
        </div>
        <table>
          <thead><tr><th>Produk</th><th style="text-align:center">Qty</th><th style="text-align:right">Harga</th><th style="text-align:right">Diskon</th><th style="text-align:right">Subtotal</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="total-section">
          <p style="margin:0 0 5px;color:#64748b;font-size:13px">Total Penjualan: Rp ${this.formatNumber(sale.total_amount)}</p>
          ${sale.platform_fee > 0 ? `<p style="margin:0 0 5px;color:#ef4444;font-size:13px">Potongan Platform: - Rp ${this.formatNumber(sale.platform_fee)}</p>` : ''}
          <p class="total">Diterima: Rp ${this.formatNumber(totalReceived)}</p>
        </div>
        <div class="footer">Terima kasih atas kunjungan Anda<br>Dicetak: ${new Date().toLocaleString('id-ID')}</div>
        <script>window.print()</script>
      </body>
      </html>
    `)
    win.document.close()
  }

  async bindEvents() {
    await this.loadData()
    this.renderAndBind()
  }

  _bindListeners() {
    document.getElementById('add-sale-btn')?.addEventListener('click', () => {
      this.editingSale = null
      this.mainPaymentAmount = 0
      this.formCustomerName = ''
      this.formMarketplace = ''
      this.formPlatformFee = 0
      this.splitPayments = []
      this.showModal = true
      this.transactionItems = [{ productId: '', qty: 1, discount: 0, subtotal: 0 }]
      this.renderAndBind()
    })

    document.getElementById('export-btn')?.addEventListener('click', () => {
      this.exportSales()
    })

    document.getElementById('scan-btn')?.addEventListener('click', () => {
      this.router.navigate('/barcode')
    })

    document.getElementById('search-sale')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value
      this.currentPage = 1
      this.renderAndBind()
    })

    document.getElementById('filter-start-date')?.addEventListener('change', (e) => {
      this.startDate = e.target.value
      this.currentPage = 1
      this.renderAndBind()
    })

    document.getElementById('filter-end-date')?.addEventListener('change', (e) => {
      this.endDate = e.target.value
      this.currentPage = 1
      this.renderAndBind()
    })

    document.getElementById('filter-table-btn')?.addEventListener('click', () => {
      const search = document.getElementById('search-sale')
      if (search) { search.focus(); search.select() }
    })

    document.querySelectorAll('.view-sale').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedSale = this.sales.find(s => s.id === btn.dataset.id)
        this.showViewModal = true
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.print-sale').forEach(btn => {
      btn.addEventListener('click', () => {
        const sale = this.sales.find(s => s.id === btn.dataset.id)
        if (sale) this.printSale(sale)
      })
    })

    document.querySelectorAll('.edit-sale').forEach(btn => {
      btn.addEventListener('click', () => {
        const sale = this.sales.find(s => s.id === btn.dataset.id)
        if (!sale || sale.status === 'completed') return
        this.editingSale = sale
        this.transactionItems = (sale.sale_items || []).map(item => ({
          productId: item.product_id,
          skuId: item.sku_id || null,
          qty: item.quantity,
          price: item.unit_price,
          discount: item.discount || 0,
          marketplace: item.marketplace || null,
          subtotal: (item.quantity * item.unit_price) - (item.discount || 0)
        }))
        this.paymentMethod = sale.payment_method || 'cash'
        this.mainPaymentAmount = sale.payment_details?.main_amount || sale.total_received || sale.total_amount || 0
        this.formCustomerName = sale.customer_name || ''
        this.formMarketplace = sale.marketplace || ''
        this.formPlatformFee = sale.platform_fee || 0
        this.splitPayments = []
        this.showModal = true
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.close-sale').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sale = this.sales.find(s => s.id === btn.dataset.id)
        if (!sale) return
        if (!confirm(`Tutup ${sale.invoice_number} sebagai LUNAS?`)) return
        const totalReceived = sale.total_received || (sale.total_amount - (sale.platform_fee || 0))
        await this.supabase.from('sales').update({
          status: 'completed',
          payment_status: 'paid',
          paid_amount: totalReceived
        }).eq('id', sale.id)

        const pd = sale.payment_details
        if (pd?.splits && pd.splits.length > 0) {
          await this.supabase.from('split_payments').delete().eq('sale_id', sale.id)
          const splitInserts = pd.splits.filter(sp => sp.amount > 0).map(sp => ({
            sale_id: sale.id, method: sp.method, amount: sp.amount
          }))
          if (splitInserts.length > 0) {
            await this.supabase.from('split_payments').insert(splitInserts)
          }
        }

        await this.supabase.from('cash_transactions').insert({
          type: 'in', category: 'sales', amount: totalReceived,
          reference_type: 'sales', reference_id: sale.id,
          description: `Penjualan ${sale.invoice_number}${sale.customer_name ? ` - ${sale.customer_name}` : ''}`,
          created_by: this.auth.user.id
        })
        if (sale.platform_fee > 0) {
          await this.supabase.from('cash_transactions').insert({
            type: 'out', category: 'platform_fee', amount: sale.platform_fee,
            reference_type: 'sales', reference_id: sale.id,
            description: `Potongan platform - ${sale.invoice_number}`,
            created_by: this.auth.user.id
          })
        }
        await this.loadData()
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.delete-sale').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sale = this.sales.find(s => s.id === btn.dataset.id)
        if (!sale) return
        if (!confirm(`Hapus ${sale.invoice_number}? Data tidak dapat dikembalikan.`)) return
        await this.supabase.from('split_payments').delete().eq('sale_id', sale.id)
        await this.supabase.from('sale_items').delete().eq('sale_id', sale.id)
        await this.supabase.from('sales').delete().eq('id', sale.id)
        await this.loadData()
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
    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.showModal = false; this.editingSale = null
      this.formCustomerName = ''; this.formMarketplace = ''; this.formPlatformFee = 0
      this.renderAndBind()
    })
    document.getElementById('cancel-modal')?.addEventListener('click', () => {
      this.showModal = false; this.editingSale = null
      this.formCustomerName = ''; this.formMarketplace = ''; this.formPlatformFee = 0
      this.renderAndBind()
    })
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) { this.showModal = false; this.editingSale = null; this.formCustomerName = ''; this.formMarketplace = ''; this.formPlatformFee = 0; this.renderAndBind() }
    })

    document.getElementById('close-view-modal')?.addEventListener('click', () => {
      this.showViewModal = false
      this.renderAndBind()
    })
    document.getElementById('view-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) { this.showViewModal = false; this.renderAndBind() }
    })

    document.getElementById('print-detail-btn')?.addEventListener('click', () => {
      if (this.selectedSale) this.printSale(this.selectedSale)
    })

    document.getElementById('view-close-sale-btn')?.addEventListener('click', async () => {
      const sale = this.selectedSale
      if (!sale) return
      if (!confirm(`Tutup ${sale.invoice_number} sebagai LUNAS?`)) return
      const totalReceived = sale.total_received || (sale.total_amount - (sale.platform_fee || 0))
      await this.supabase.from('sales').update({
        status: 'completed', payment_status: 'paid', paid_amount: totalReceived
      }).eq('id', sale.id)

      const pd = sale.payment_details
      if (pd?.splits && pd.splits.length > 0) {
        await this.supabase.from('split_payments').delete().eq('sale_id', sale.id)
        const splitInserts = pd.splits.filter(sp => sp.amount > 0).map(sp => ({
          sale_id: sale.id, method: sp.method, amount: sp.amount
        }))
        if (splitInserts.length > 0) {
          await this.supabase.from('split_payments').insert(splitInserts)
        }
      }

      await this.supabase.from('cash_transactions').insert({
        type: 'in', category: 'sales', amount: totalReceived,
        reference_type: 'sales', reference_id: sale.id,
        description: `Penjualan ${sale.invoice_number}${sale.customer_name ? ` - ${sale.customer_name}` : ''}`,
        created_by: this.auth.user.id
      })
      if (sale.platform_fee > 0) {
        await this.supabase.from('cash_transactions').insert({
          type: 'out', category: 'platform_fee', amount: sale.platform_fee,
          reference_type: 'sales', reference_id: sale.id,
          description: `Potongan platform - ${sale.invoice_number}`,
          created_by: this.auth.user.id
        })
      }
      this.showViewModal = false
      await this.loadData()
      this.renderAndBind()
    })

    document.getElementById('add-item')?.addEventListener('click', () => {
      this.transactionItems.push({ productId: '', qty: 1, discount: 0, subtotal: 0, marketplace: '' })
      this.renderAndBind()
    })

    document.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index)
        this.transactionItems.splice(idx, 1)
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.cart-product-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.index)
        this.transactionItems[idx].skuId = null
        this.updateItemSubtotal(idx)
      })
    })
    document.querySelectorAll('.item-qty').forEach(inp => {
      inp.addEventListener('change', () => this.updateItemSubtotal(parseInt(inp.dataset.index)))
    })
    document.querySelectorAll('.item-discount').forEach(inp => {
      inp.addEventListener('input', () => this.updateItemSubtotal(parseInt(inp.dataset.index)))
    })
    document.querySelectorAll('.variant-select').forEach(sel => {
      sel.addEventListener('change', () => this.updateItemSubtotal(parseInt(sel.dataset.index)))
    })
    document.querySelectorAll('.item-marketplace').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.index)
        this.transactionItems[idx].marketplace = sel.value
        this._updateTotals()
        this.renderAndBind()
      })
    })

    document.getElementById('payment_method')?.addEventListener('change', (e) => {
      this.paymentMethod = e.target.value
    })

    document.getElementById('main_payment_amount')?.addEventListener('input', (e) => {
      this.mainPaymentAmount = parseInt(e.target.value) || 0
      this._updateTotals()
    })

    document.getElementById('add-split')?.addEventListener('click', () => {
      this.splitPayments.push({ method: 'cash', amount: 0 })
      this.renderAndBind()
    })

    document.querySelectorAll('.remove-split').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index)
        this.splitPayments.splice(idx, 1)
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.split-method').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.index)
        this.splitPayments[idx].method = sel.value
      })
    })

    document.querySelectorAll('.split-amount').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.dataset.index)
        this.splitPayments[idx].amount = parseInt(inp.value) || 0
        this._updateTotals()
      })
    })

    document.querySelectorAll('.qty-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index)
        if (this.transactionItems[idx].qty > 1) {
          this.transactionItems[idx].qty--
          const qtyInp = document.querySelector(`.item-qty[data-index="${idx}"]`)
          if (qtyInp) qtyInp.value = this.transactionItems[idx].qty
          this.updateItemSubtotal(idx)
        }
      })
    })

    document.querySelectorAll('.qty-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index)
        this.transactionItems[idx].qty++
        const qtyInp = document.querySelector(`.item-qty[data-index="${idx}"]`)
        if (qtyInp) qtyInp.value = this.transactionItems[idx].qty
        this.updateItemSubtotal(idx)
      })
    })

    // Handle both draft and completed save buttons
    document.getElementById('save-draft-btn')?.addEventListener('click', (e) => {
      document.getElementById('sale-status').value = 'draft'
    })
    document.getElementById('save-complete-btn')?.addEventListener('click', (e) => {
      document.getElementById('sale-status').value = 'completed'
    })

    const form = document.getElementById('sale-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()

      const formData = new FormData(e.target)
      const validItems = this.transactionItems.filter(item => item.productId && item.qty > 0)
      if (validItems.length === 0) {
        alert('Tambahkan minimal 1 item produk')
        return
      }

      const totalAmount = validItems.reduce((sum, item) => sum + item.subtotal, 0)
      const platformFee = parseInt(formData.get('platform_fee')) || 0
      const totalReceived = totalAmount - platformFee
      const status = formData.get('status') || 'draft'
      const paymentMethod = formData.get('payment_method') || 'cash'
      const mainAmount = parseInt(formData.get('main_payment_amount')) || totalReceived
      const isSplit = this.splitPayments.length > 0
      const isEdit = !!this.editingSale

      const splitTotal = this.splitPayments.reduce((sum, sp) => sum + (sp.amount || 0), 0)
      const paymentDetails = {
        main_method: paymentMethod,
        main_amount: mainAmount,
        splits: this.splitPayments.filter(sp => sp.amount > 0),
        total_split: splitTotal,
        total_paid: mainAmount + splitTotal,
        total_received: totalReceived
      }

      this.loading = true
      this.renderAndBind()

      const saleMarketplace = validItems.some(i => i.marketplace) ? validItems.filter(i => i.marketplace).map(i => i.marketplace).join('+') : null

      let saleItemRecords
      if (isEdit) {
        const result = await this.supabase.from('sales').update({
          customer_name: formData.get('customer_name') || null,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          marketplace: saleMarketplace,
          platform_fee: platformFee,
          total_received: totalReceived,
          status: status,
          payment_status: status === 'completed' ? 'paid' : 'unpaid',
          paid_amount: status === 'completed' ? totalReceived : 0,
          payment_details: paymentDetails
        }).eq('id', this.editingSale.id).select().single()
        sale = result.data
        saleError = result.error
        if (saleError) { alert('Gagal update penjualan: ' + saleError.message); this.loading = false; this.renderAndBind(); return }
      } else {
        const result = await this.supabase.from('sales').insert({
          invoice_number: 'INV-' + Date.now().toString(36).toUpperCase(),
          customer_name: formData.get('customer_name') || null,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          marketplace: saleMarketplace,
          platform_fee: platformFee,
          total_received: totalReceived,
          status: status,
          payment_status: status === 'completed' ? 'paid' : 'unpaid',
          paid_amount: status === 'completed' ? totalReceived : 0,
          payment_details: paymentDetails,
          created_by: this.auth.user.id
        }).select().single()
        sale = result.data
        saleError = result.error
        if (saleError) { alert('Gagal simpan penjualan: ' + saleError.message); this.loading = false; this.renderAndBind(); return }
      }

      // Save sale_items
      const saleItems = validItems.map(item => ({
        sale_id: sale.id, product_id: item.productId, quantity: item.qty,
        unit_price: item.price, discount: item.discount,
        sku_id: item.skuId || null, marketplace: item.marketplace || null
      }))
      const { error: itemsError } = await this.supabase.from('sale_items').insert(saleItems)
      if (itemsError) { alert('Gagal menyimpan item: ' + itemsError.message); this.loading = false; this.renderAndBind(); return }

      // Only delete old items after new items inserted successfully
      if (isEdit) {
        await this.supabase.from('sale_items').delete().eq('sale_id', this.editingSale.id)
        await this.supabase.from('split_payments').delete().eq('sale_id', this.editingSale.id)
      }

      // Save split payments
      if (isSplit && this.splitPayments.length > 0) {
        const splitInserts = this.splitPayments.filter(sp => sp.amount > 0).map(sp => ({
          sale_id: sale.id, method: sp.method, amount: sp.amount
        }))
        if (splitInserts.length > 0) {
          const { error: splitError } = await this.supabase.from('split_payments').insert(splitInserts)
          if (splitError) { alert('Gagal menyimpan split payment: ' + splitError.message) }
        }
      }
      if (itemsError) { alert('Gagal menyimpan item: ' + itemsError.message); this.loading = false; this.renderAndBind(); return }

      if (!isEdit) {
        for (const item of validItems) {
          if (item.skuId) {
            const sku = this.productSkus.find(s => s.id === item.skuId)
            const skuStock = sku?.current_stock || 0
            if (skuStock < item.qty) {
              alert(`Stok varian tidak mencukupi. Stok: ${skuStock}`)
              this.loading = false; this.renderAndBind(); return
            }
            await this.supabase.from('product_skus').update({
              current_stock: skuStock - item.qty
            }).eq('id', item.skuId)
          } else {
            await this.supabase.rpc('add_stock_movement', {
              p_product_id: item.productId, p_quantity: item.qty, p_type: 'out',
              p_reason: 'sale', p_notes: `Penjualan ${sale.invoice_number}`, p_created_by: this.auth.user.id
            })
          }
        }
      }

      if (status === 'completed' && paymentMethod !== 'credit') {
        await this.supabase.from('cash_transactions').insert({
          type: 'in', category: 'sales', amount: totalReceived,
          reference_type: 'sales', reference_id: sale.id,
          description: `Penjualan ${sale.invoice_number}${formData.get('customer_name') ? ` - ${formData.get('customer_name')}` : ''}${formData.get('marketplace') ? ` (${formData.get('marketplace')})` : ''}`,
          created_by: this.auth.user.id
        })

        if (platformFee > 0) {
          await this.supabase.from('cash_transactions').insert({
            type: 'out', category: 'platform_fee', amount: platformFee,
            reference_type: 'sales', reference_id: sale.id,
            description: `Potongan platform ${formData.get('marketplace') || 'marketplace'} - ${sale.invoice_number}`,
            created_by: this.auth.user.id
          })
        }
      }

      this.loading = false
      if (status === 'completed') {
        this.showModal = false
        this.editingSale = null
        this.transactionItems = [{ productId: '', qty: 1, discount: 0, subtotal: 0 }]
        this.mainPaymentAmount = 0
        this.formCustomerName = ''
        this.formMarketplace = ''
        this.formPlatformFee = 0
        this.splitPayments = []
      } else {
        this.editingSale = sale
        this.paymentMethod = paymentMethod
        this.mainPaymentAmount = mainAmount
        this.formCustomerName = formData.get('customer_name') || ''
        this.formMarketplace = formData.get('marketplace') || ''
        this.formPlatformFee = platformFee
      }
      await this.loadData()
      this.renderAndBind()
    })
  }

  updateItemSubtotal(index) {
    const sel = document.querySelector(`.cart-product-select[data-index="${index}"]`)
    const qtyInp = document.querySelector(`.item-qty[data-index="${index}"]`)
    const discInp = document.querySelector(`.item-discount[data-index="${index}"]`)
    const variantSel = document.querySelector(`.variant-select[data-index="${index}"]`)
    if (!sel || !qtyInp) return

    const selectedOption = sel.options[sel.selectedIndex]
    const hasVariants = selectedOption?.dataset?.hasVariants === '1'

    let skuId = null
    let price = parseInt(selectedOption?.dataset?.price) || 0
    let stock = parseInt(selectedOption?.dataset?.stock) || 0

    if (hasVariants && variantSel) {
      const varOption = variantSel.options[variantSel.selectedIndex]
      if (varOption?.value) {
        skuId = varOption.value
        price = parseInt(varOption.dataset.price) || price
        stock = parseInt(varOption.dataset.stock) || stock
      } else {
        alert('Pilih varian produk terlebih dahulu')
        return
      }
    }

    const qty = parseInt(qtyInp.value) || 0
    const discount = parseInt(discInp?.value) || 0

    if (qty > stock) { alert(`Stok tidak mencukupi. Stok: ${stock}`); qtyInp.value = stock; return }

    this.transactionItems[index] = { productId: sel.value, skuId, qty, discount, price, subtotal: (qty * price) - discount }
    this.renderAndBind()
  }

  _updateTotals() {
    const total = this.transactionItems.reduce((sum, item) => sum + item.subtotal, 0)
    const totalQty = this.transactionItems.reduce((sum, item) => sum + item.qty, 0)
    const splitTotal = this.splitPayments.reduce((sum, sp) => sum + (sp.amount || 0), 0)
    const mainAmount = this.mainPaymentAmount || total
    const totalPaid = mainAmount + splitTotal
    const remaining = total - totalPaid

    let totalFee = 0
    this.transactionItems.forEach(item => {
      if (item.marketplace && item.subtotal) {
        if (item.marketplace === 'shopee') {
          totalFee += Math.round(item.subtotal * 0.3)
        }
      }
    })
    this.formPlatformFee = totalFee
    const feeInput = document.getElementById('platform_fee')
    if (feeInput) feeInput.value = totalFee
    const feeSection = document.getElementById('platformFeeSection')
    if (feeSection) feeSection.classList.toggle('hidden', totalFee === 0)

    const el = (id) => document.getElementById(id)
    if (el('totalQty')) el('totalQty').textContent = totalQty
    if (el('totalSubtotal')) el('totalSubtotal').textContent = 'Rp ' + this.formatNumber(total)
    if (el('totalGrand')) el('totalGrand').textContent = 'Rp ' + this.formatNumber(total)

    const payRow = el('totalPaidRow')
    const remRow = el('totalRemainingRow')
    if (payRow && remRow) {
      if (this.splitPayments.length > 0) {
        payRow.style.display = ''
        remRow.style.display = ''
        el('totalPaid').textContent = 'Rp ' + this.formatNumber(totalPaid)
        el('totalRemaining').textContent = 'Rp ' + this.formatNumber(remaining)
        el('totalRemaining').style.color = remaining > 0 ? '#ef4444' : '#16a34a'
      } else {
        payRow.style.display = 'none'
        remRow.style.display = 'none'
      }
    }
  }

  _readFormState() {
    if (!this.showModal) return
    const cn = document.getElementById('customer_name')
    const pf = document.getElementById('platform_fee')
    const pm = document.getElementById('payment_method')
    const pa = document.getElementById('main_payment_amount')
    if (cn) this.formCustomerName = cn.value
    if (pf) this.formPlatformFee = parseInt(pf.value) || 0
    if (pm) this.paymentMethod = pm.value
    if (pa) this.mainPaymentAmount = parseInt(pa.value) || 0
  }

  renderAndBind() {
    if (this.showModal) this._readFormState()
    const outlet = document.getElementById('router-outlet')
    if (outlet) {
      outlet.innerHTML = this.render()
    }
    this._bindListeners()
    if (window.lucide) window.lucide.createIcons()
  }
}