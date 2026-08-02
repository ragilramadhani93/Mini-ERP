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
    this.formMarkupAmount = 0
    this.formShopeeAmount = 0
    this.formMarkedUpTotal = 0
    this.saleDate = new Date().toISOString().slice(0, 10)
    this.customers = [
      'Rumah Tangga Bahagia',
      'Toko Elektronik Jaya',
      'Warung Makan Sederhana',
      'Perorangan',
      'Shopee Customer',
      'TikTok Shop Customer',
      'Tokopedia Customer'
    ]
    this.showOnlyOverpaid = false
    this.useDeposit = false
    this.depositAmount = 0
  }

  async loadData() {
    const [salesRes, productsRes, methodsRes, skusRes, variantsRes, depositsRes] = await Promise.all([
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
        .order('sort_order'),
      this.supabase.from('customer_deposits')
        .select('*')
    ])

    this.sales = salesRes.data || []
    this.products = productsRes.data || []
    this.paymentMethods = methodsRes.data || []
    this.productSkus = skusRes.data || []
    this.productVariants = variantsRes.data || []
    this.customerDeposits = depositsRes.data || []
  }

  getCustomerDeposit(customerName) {
    if (!customerName) return 0
    return this.customerDeposits
      .filter(d => d.customer_name === customerName)
      .reduce((sum, d) => sum + (d.amount || 0), 0)
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
    if (this.showOnlyOverpaid) {
      filtered = filtered.filter(s => {
        const totalReceived = s.payment_details?.total_received || s.payment_details?.total_paid || s.total_received || (s.total_amount - (s.platform_fee || 0))
        const isOverpaid = s.payment_details?.is_overpaid || false
        return isOverpaid
      })
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
      const received = s.total_received || (s.total_amount - (s.platform_fee || 0))
      const cogs = (s.sale_items || []).reduce((s2, i) => s2 + ((i.products?.cost_price || 0) * i.quantity), 0)
      return sum + (received - cogs)
    }, 0)
    const totalRevenue = filtered.reduce((sum, s) => sum + (s.total_received || (s.total_amount - (s.platform_fee || 0))), 0)
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
              <button class="btn-secondary" id="filter-overpaid-btn" style="${this.showOnlyOverpaid ? 'background:#d97706;color:white;border-color:#d97706;' : ''}">
                ➕ ${this.showOnlyOverpaid ? 'Hanya Lebih Bayar' : 'Lebih Bayar'}
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

                // Calculate total received and check for overpaid
        const totalReceived = s.payment_details?.total_received || s.payment_details?.total_paid || s.total_received || (s.total_amount - (s.platform_fee || 0))
        const isOverpaid = s.payment_details?.is_overpaid || false
        const overpaidAmount = s.payment_details?.overpaid_amount || 0

                // Prepare template variables
                const customerHtml = isWalkIn ? `
                  <span class="customer-anonymous">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Pelanggan umum
                  </span>
                ` : `<span class="customer-cell">${s.customer_name}</span>`

                const marketplaceHtml = s.marketplace ? `<span class="badge" style="background:#F4E5EC;color:#7A3B58">${marketplaceNames[s.marketplace]}</span>` : '-'

                const platformFeeHtml = s.platform_fee > 0 ? `<span style="color:#ef4444;font-weight:600">- Rp ${this.formatNumber(s.platform_fee)}</span>` : '-'

                const overpaidHtml = isOverpaid ? `<span style="color:#d97706;font-weight:600;font-size:11px;display:block;margin-top:2px">➕ Lebih bayar Rp ${this.formatNumber(overpaidAmount)}</span>` : ''

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
                    <td class="text-right">${s.status === 'completed' ? `<span class="amount-received">Rp ${this.formatNumber(totalReceived)}</span>${overpaidHtml}` : '<span class="amount-pending">-</span>'}</td>
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
    const customerDeposit = this.getCustomerDeposit(this.formCustomerName)
    
    let depositToUse = 0
    if (this.useDeposit && customerDeposit > 0) {
      const markedUpTotal = total + (this.formMarkupAmount || 0)
      const actualDue = markedUpTotal - (this.formPlatformFee || 0)
      depositToUse = Math.min(customerDeposit, actualDue)
      this.depositAmount = depositToUse
    }

    const totalPaid = mainAmount + splitTotal + depositToUse
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
        ${customerDeposit > 0 ? `<p style="font-size:12px;color:#16a34a;margin-top:4px;">💰 Saldo Deposit: Rp ${this.formatNumber(customerDeposit)}</p>` : ''}
      </div>
      
      ${customerDeposit > 0 ? `
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="use_deposit" ${this.useDeposit ? 'checked' : ''} style="width:auto;">
          Gunakan Deposit
        </label>
        ${this.useDeposit ? `<p style="font-size:12px;color:#7A3B58;margin-top:4px;">Akan menggunakan Rp ${this.formatNumber(depositToUse)} dari deposit</p>` : ''}
      </div>
      ` : ''}

              <div class="form-group">
                <label>Tanggal Transaksi</label>
                <input type="date" id="sale_date" name="sale_date" value="${this.saleDate}">
              </div>

              <div class="form-group hidden" id="markupSection">
                <label>Markup Shopee (42.86%)</label>
                <input type="number" id="markup_amount" name="markup_amount" min="0" value="${this.formMarkupAmount || 0}" placeholder="0" readonly style="background:#fff7ed">
                <small style="color:#92400e;font-size:11px">Harga jual dinaikkan agar net tetap sama</small>
              </div>

              <div class="form-group hidden" id="platformFeeSection">
                <label>Potongan Platform (30%)</label>
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
                <div id="markupDisplayRow" class="total-row hidden" style="color:#92400e">
                  <span>Markup Shopee (42.86%)</span>
                  <strong id="markupDisplayAmount">+ Rp 0</strong>
                </div>
                <div id="feeDisplayRow" class="total-row hidden" style="color:#ef4444">
                  <span>Potongan Platform (30%)</span>
                  <strong id="feeDisplayAmount">- Rp 0</strong>
                </div>
                <div class="total-row" style="display:block;">
                  <span>Pembayaran</span>
                  <strong id="totalPaid" style="color:#16a34a">Rp ${this.formatNumber(totalPaid)}</strong>
                </div>
                ${depositToUse > 0 ? `
                <div class="total-row" style="display:block;background:#dcfce7;padding:10px;border-radius:8px;">
                  <span style="color:#166534;font-weight:600;">💰 Deposit Digunakan</span>
                  <strong style="color:#166534;">- Rp ${this.formatNumber(depositToUse)}</strong>
                </div>
                ` : ''}
                <div id="overpaidSection" class="hidden">
                  <div class="total-row" style="display:block;background:#fef3c7;padding:10px;border-radius:8px;">
                    <span style="color:#d97706;font-weight:600;">➕ Lebih Bayar</span>
                    <strong id="overpaidAmount" style="color:#d97706;">Rp 0</strong>
                  </div>
                </div>
                <div id="remainingSection" class="total-row">
                  <span>Sisa</span>
                  <strong id="totalRemaining" style="color:#ef4444">Rp 0</strong>
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
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)
    const totalReceived = sale?.payment_details?.total_received || sale?.payment_details?.total_paid || sale?.total_received || (sale?.total_amount - (sale?.platform_fee || 0))
    const isOverpaid = sale?.payment_details?.is_overpaid || false
    const overpaidAmount = sale?.payment_details?.overpaid_amount || 0

    const marketplaceNames = {
      shopee: 'Shopee', tiktok: 'TikTok Shop', tokopedia: 'Tokopedia', lazada: 'Lazada'
    }

    const payIcons = {
      cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>',
      shopee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>',
      dana: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 10a2 2 0 100 4 2 2 0 000-4z"/></svg>',
      default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 10a2 2 0 100 4 2 2 0 000-4z"/></svg>'
    }

    const getPayIcon = (method) => {
      if (method === 'cash') return payIcons.cash
      if (method?.includes('shopee')) return payIcons.shopee
      if (method?.includes('dana')) return payIcons.dana
      return payIcons.default
    }

    return `
      <div class="dv-overlay" id="view-modal-overlay">
        <div class="dv-modal">
          <div class="dv-header">
            <div class="dv-header-left">
              <div class="dv-inv-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M14 8H8"/><path d="M16 12H8"/></svg>
                Detil penjualan
              </div>
              <div class="dv-inv-sub">${sale?.invoice_number || '-'}</div>
            </div>
            <button id="close-view-modal" class="dv-btn-close" aria-label="Tutup">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="dv-body">
            <div class="dv-info-grid">
              <div class="dv-info-cell">
                <div class="dv-ic-label">Pelanggan</div>
                <div class="dv-ic-value">${sale?.customer_name || '-'}</div>
              </div>
              <div class="dv-info-cell">
                <div class="dv-ic-label">Tanggal</div>
                <div class="dv-ic-value">${this.formatDate(sale?.created_at)}</div>
              </div>
              <div class="dv-info-cell">
                <div class="dv-ic-label">Status</div>
                <div>${sale?.status === 'completed'
                  ? '<span class="dv-badge dv-lunas"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg> Lunas</span>'
                  : '<span class="dv-badge dv-pending"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Belum lunas</span>'
                }</div>
              </div>
              <div class="dv-info-cell">
                <div class="dv-ic-label">Marketplace</div>
                <div class="dv-ic-value">${sale?.marketplace ? (marketplaceNames[sale.marketplace] || sale.marketplace) : 'Offline'}</div>
              </div>
              <div class="dv-info-cell">
                <div class="dv-ic-label">Kasir</div>
                <div class="dv-kasir-row">
                  <div class="dv-kasir-avatar">${byInitials}</div>
                  <span class="dv-kasir-name">${byName}</span>
                </div>
              </div>
              <div class="dv-info-cell">
                <div class="dv-ic-label">Potongan platform</div>
                <div class="dv-ic-value" style="color:#3b6d11">${sale?.platform_fee > 0 ? '- Rp ' + this.formatNumber(sale.platform_fee) : '-'}</div>
              </div>
            </div>

            <div class="dv-divider"></div>

            <div>
              <div class="dv-section-title">Pembayaran</div>
              <table class="dv-pay-table">
                <tbody>
                  <tr>
                    <td>
                      <div class="dv-pay-icon">${getPayIcon(sale?.payment_method)}</div>
                      ${this.getPaymentLabel(sale?.payment_method)}
                    </td>
                    <td>Rp ${this.formatNumber(sale?.payment_details?.main_amount || sale?.total_amount)}</td>
                  </tr>
                  ${(sale?.split_payments || sale?.payment_details?.splits || []).filter(sp => sp.amount > 0).map(sp => `
                    <tr>
                      <td>
                        <div class="dv-pay-icon">${getPayIcon(sp.method)}</div>
                        ${this.getPaymentLabel(sp.method)}
                      </td>
                      <td>Rp ${this.formatNumber(sp.amount)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="dv-divider"></div>

            <div>
              <div class="dv-section-title">Item produk</div>
              <div class="dv-item-list">
                ${items.map(item => {
                  const mktName = item.marketplace ? (marketplaceNames[item.marketplace] || item.marketplace) : 'Offline'
                  return `
                    <div class="dv-item-row">
                      <div class="dv-item-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="17" height="17"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      </div>
                      <div class="dv-item-info">
                        <div class="dv-item-name">${item.products?.name || '-'}</div>
                        <div class="dv-item-meta">SKU: ${item.products?.sku || '-'} · ${mktName}</div>
                      </div>
                      <div class="dv-item-total">
                        <div class="dv-item-total-val">Rp ${this.formatNumber((item.quantity * item.unit_price) - (item.discount || 0))}</div>
                        <div class="dv-item-unit">${item.quantity} × Rp ${this.formatNumber(item.unit_price)}</div>
                      </div>
                    </div>
                  `
                }).join('')}
              </div>
            </div>

            <div class="dv-summary-box">
              <div class="dv-sum-row">
                <span class="dv-sum-label">Subtotal (${totalQty} item)</span>
                <span class="dv-sum-val">Rp ${this.formatNumber(sale?.total_amount + (sale?.platform_fee || 0))}</span>
              </div>
              ${sale?.platform_fee > 0 ? `
              <div class="dv-sum-row">
                <span class="dv-sum-label">Potongan platform</span>
                <span class="dv-sum-val dv-discount">- Rp ${this.formatNumber(sale.platform_fee)}</span>
              </div>
              ` : ''}
              <div class="dv-sum-divider"></div>
              <div class="dv-sum-row">
                <span class="dv-sum-total-label">Diterima</span>
                <span class="dv-sum-total-val">Rp ${this.formatNumber(totalReceived)}</span>
              </div>
              ${isOverpaid ? `
              <div class="dv-sum-row" style="background:#fff7ed;padding:10px;border-radius:8px;margin-top:10px;">
                <span class="dv-sum-label" style="color:#d97706;font-weight:600;">➕ Lebih bayar</span>
                <span class="dv-sum-val" style="color:#d97706;font-weight:700;">Rp ${this.formatNumber(overpaidAmount)}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="dv-footer">
            ${sale?.status !== 'completed' ? `
              <button id="view-close-sale-btn" class="dv-btn-lunas" data-id="${sale.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                Tandai lunas
              </button>
            ` : ''}
            <button id="print-detail-btn" class="dv-btn-print">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Cetak
            </button>
            <button id="close-view-modal-bottom" class="dv-btn-close-modal">Tutup</button>
          </div>
        </div>
      </div>
    `
  }

  getPaymentLabel(method) {
    const pm = this.paymentMethods.find(p => p.code === method && p.is_active)
    if (pm) return pm.name
    const inactive = this.paymentMethods.find(p => p.code === method)
    return inactive ? `${inactive.name} (nonaktif)` : method
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
    return sales.reduce((sum, s) => {
      const received = s.total_received || (s.total_amount - (s.platform_fee || 0))
      return sum + received
    }, 0)
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
      this.formMarkupAmount = 0
      this.formShopeeAmount = 0
      this.formMarkedUpTotal = 0
      this.saleDate = new Date().toISOString().slice(0, 10)
      this.splitPayments = []
      this.showModal = true
      this.useDeposit = false
      this.depositAmount = 0
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

    document.getElementById('filter-overpaid-btn')?.addEventListener('click', () => {
      this.showOnlyOverpaid = !this.showOnlyOverpaid
      this.currentPage = 1
      this.renderAndBind()
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
        if (this.transactionItems.length === 0) {
          this.transactionItems = [{ productId: '', qty: 1, discount: 0, subtotal: 0, marketplace: '' }]
        }
        this.paymentMethod = sale.payment_method || 'cash'
        this.mainPaymentAmount = sale.payment_details?.main_amount || sale.total_received || sale.total_amount || 0
        this.formCustomerName = sale.customer_name || ''
        this.formMarketplace = sale.marketplace || ''
        this.formPlatformFee = sale.payment_details?.platform_fee || sale.platform_fee || 0
        this.formMarkupAmount = sale.payment_details?.markup_amount || 0
        this.formShopeeAmount = sale.payment_details?.shopee_amount || 0
        this.formMarkedUpTotal = sale.payment_details?.markup_amount ? (sale.total_amount || 0) : 0
        this.saleDate = sale.created_at ? new Date(sale.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
        this.splitPayments = (sale.split_payments || []).filter(sp => sp.amount > 0).map(sp => ({
          method: sp.method,
          amount: sp.amount
        }))
        this.showModal = true
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.close-sale').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sale = this.sales.find(s => s.id === btn.dataset.id)
        if (!sale) return
        if (!confirm(`Tutup ${sale.invoice_number} sebagai LUNAS?`)) return
        const totalReceived = sale.payment_details?.total_received || sale.payment_details?.total_paid || sale.total_received || (sale.total_amount - (sale.platform_fee || 0))
        const isOverpaid = sale.payment_details?.is_overpaid || false
        const overpaidAmount = sale.payment_details?.overpaid_amount || 0
        
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
          description: `Penjualan ${sale.invoice_number}${sale.customer_name ? ` - ${sale.customer_name}` : ''}${isOverpaid ? ` (Lebih bayar Rp ${this.formatNumber(overpaidAmount)})` : ''}`,
          created_by: this.auth.user.id
        })

        // Handle deposits (sama seperti jalur Simpan Transaksi)
        if (sale.customer_name) {
          // If we used deposit, subtract it
          if ((pd?.deposit_used || 0) > 0) {
            await this.supabase.from('customer_deposits').insert({
              customer_name: sale.customer_name,
              amount: -(pd.deposit_used || 0),
              reference_type: 'sales',
              reference_id: sale.id,
              description: `Penggunaan deposit untuk ${sale.invoice_number}`,
              created_by: this.auth.user.id,
              created_at: sale.created_at
            })
          }
          // If there's an overpayment, add it to deposit
          if (isOverpaid && overpaidAmount > 0) {
            await this.supabase.from('customer_deposits').insert({
              customer_name: sale.customer_name,
              amount: overpaidAmount,
              reference_type: 'sales',
              reference_id: sale.id,
              description: `Tambah deposit dari lebih bayar ${sale.invoice_number}`,
              created_by: this.auth.user.id,
              created_at: sale.created_at
            })
          }
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
    if (this.showModal) {
      this._updateTotals()
    }

    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.showModal = false; this.editingSale = null
      this.formCustomerName = ''; this.formMarketplace = ''; this.formPlatformFee = 0
      this.saleDate = new Date().toISOString().slice(0, 10)
      this.useDeposit = false
      this.depositAmount = 0
      this.renderAndBind()
    })
    document.getElementById('cancel-modal')?.addEventListener('click', () => {
      this.showModal = false; this.editingSale = null
      this.formCustomerName = ''; this.formMarketplace = ''; this.formPlatformFee = 0
      this.saleDate = new Date().toISOString().slice(0, 10)
      this.useDeposit = false
      this.depositAmount = 0
      this.renderAndBind()
    })
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) { 
        this.showModal = false; 
        this.editingSale = null; 
        this.formCustomerName = ''; 
        this.formMarketplace = ''; 
        this.formPlatformFee = 0; 
        this.saleDate = new Date().toISOString().slice(0, 10);
        this.useDeposit = false
        this.depositAmount = 0
        this.renderAndBind() 
      }
    })

    document.getElementById('customer_name')?.addEventListener('input', (e) => {
      this.formCustomerName = e.target.value
      this.useDeposit = false // Reset deposit usage when customer changes
      this._updateTotals()
    })
    
    document.getElementById('use_deposit')?.addEventListener('change', (e) => {
      this.useDeposit = e.target.checked
      this._updateTotals()
      this.renderAndBind()
    })

    document.getElementById('sale_date')?.addEventListener('change', (e) => {
      this.saleDate = e.target.value
    })

    document.getElementById('close-view-modal')?.addEventListener('click', () => {
      this.showViewModal = false
      this.renderAndBind()
    })
    document.getElementById('close-view-modal-bottom')?.addEventListener('click', () => {
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
        const totalReceived = sale.payment_details?.total_received || sale.payment_details?.total_paid || sale.total_received || (sale.total_amount - (sale.platform_fee || 0))
        const isOverpaid = sale.payment_details?.is_overpaid || false
        const overpaidAmount = sale.payment_details?.overpaid_amount || 0
      
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
        description: `Penjualan ${sale.invoice_number}${sale.customer_name ? ` - ${sale.customer_name}` : ''}${isOverpaid ? ` (Lebih bayar Rp ${this.formatNumber(overpaidAmount)})` : ''}`,
        created_by: this.auth.user.id
      })

      // Handle deposits (sama seperti jalur Simpan Transaksi)
      if (sale.customer_name) {
        // If we used deposit, subtract it
        if ((pd?.deposit_used || 0) > 0) {
          await this.supabase.from('customer_deposits').insert({
            customer_name: sale.customer_name,
            amount: -(pd.deposit_used || 0),
            reference_type: 'sales',
            reference_id: sale.id,
            description: `Penggunaan deposit untuk ${sale.invoice_number}`,
            created_by: this.auth.user.id,
            created_at: sale.created_at
          })
        }
        // If there's an overpayment, add it to deposit
        if (isOverpaid && overpaidAmount > 0) {
          await this.supabase.from('customer_deposits').insert({
            customer_name: sale.customer_name,
            amount: overpaidAmount,
            reference_type: 'sales',
            reference_id: sale.id,
            description: `Tambah deposit dari lebih bayar ${sale.invoice_number}`,
            created_by: this.auth.user.id,
            created_at: sale.created_at
          })
        }
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
      this._updateTotals()
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
        this._updateTotals()
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

      try {
      if (!this.auth?.user?.id) {
        alert('Sesi habis. Silakan login kembali.')
        this.showModal = false
        this.renderAndBind()
        return
      }
      const formData = new FormData(e.target)
      const validItems = this.transactionItems.filter(item => item.productId && item.qty > 0)
      if (validItems.length === 0) {
        alert('Tambahkan minimal 1 item produk')
        return
      }

      const totalAmount = validItems.reduce((sum, item) => sum + item.subtotal, 0)
      const platformFee = parseInt(formData.get('platform_fee')) || 0
      const markupAmount = parseInt(formData.get('markup_amount')) || 0
      const status = formData.get('status') || 'draft'
      const paymentMethod = formData.get('payment_method') || 'cash'
      const mainAmount = parseInt(formData.get('main_payment_amount')) || totalAmount
      const isSplit = this.splitPayments.length > 0
      const isEdit = !!this.editingSale
      const customerName = formData.get('customer_name') || null
      const customerDeposit = this.getCustomerDeposit(customerName)
      
      let depositToUse = 0
      if (this.useDeposit && customerDeposit > 0) {
        const markedUpTotal = totalAmount + markupAmount
        const actualDue = markedUpTotal - platformFee
        depositToUse = Math.min(customerDeposit, actualDue)
      }

      const splitTotal = this.splitPayments.reduce((sum, sp) => sum + (sp.amount || 0), 0)
      const totalPaid = mainAmount + splitTotal + depositToUse
      const totalReceived = mainAmount + splitTotal // actual cash received
      const markedUpTotal = totalAmount + markupAmount
      const actualDue = markedUpTotal - platformFee
      const overpaidAmount = totalPaid > actualDue ? totalPaid - actualDue : 0
      
      const paymentDetails = {
        main_method: paymentMethod,
        main_amount: mainAmount,
        splits: this.splitPayments.filter(sp => sp.amount > 0),
        total_split: splitTotal,
        total_paid: totalPaid,
        total_received: totalReceived,
        total_amount_original: totalAmount,
        markup_amount: markupAmount,
        platform_fee: platformFee,
        deposit_used: depositToUse,
        is_overpaid: totalPaid > actualDue,
        overpaid_amount: overpaidAmount
      }

      this.loading = true
      this.renderAndBind()

      const saleMarketplace = validItems.some(i => i.marketplace) ? validItems.filter(i => i.marketplace).map(i => i.marketplace).join('+') : null

      const saleDateValue = formData.get('sale_date') || new Date().toISOString().slice(0, 10)
      const saleCreatedAt = new Date(saleDateValue + 'T' + new Date().toTimeString().slice(0, 8)).toISOString()

      let sale, saleError
      const saleTotalAmount = markupAmount > 0 ? markedUpTotal : totalAmount
      if (isEdit) {
        const result = await this.supabase.from('sales').update({
          customer_name: formData.get('customer_name') || null,
          total_amount: saleTotalAmount,
          payment_method: paymentMethod,
          marketplace: saleMarketplace,
          platform_fee: platformFee,
          total_received: totalReceived,
          status: status,
          payment_status: status === 'completed' ? 'paid' : 'unpaid',
          paid_amount: status === 'completed' ? totalReceived : 0,
          payment_details: paymentDetails,
          created_at: saleCreatedAt
        }).eq('id', this.editingSale.id).select().single()
        sale = result.data
        saleError = result.error
        if (saleError) { alert('Gagal update penjualan: ' + saleError.message); this.loading = false; this.renderAndBind(); return }
      } else {
        const result = await this.supabase.from('sales').insert({
          invoice_number: 'INV-' + Date.now().toString(36).toUpperCase(),
          customer_name: formData.get('customer_name') || null,
          total_amount: saleTotalAmount,
          payment_method: paymentMethod,
          marketplace: saleMarketplace,
          platform_fee: platformFee,
          total_received: totalReceived,
          status: status,
          payment_status: status === 'completed' ? 'paid' : 'unpaid',
          paid_amount: status === 'completed' ? totalReceived : 0,
          payment_details: paymentDetails,
          created_at: saleCreatedAt,
          created_by: this.auth.user.id
        }).select().single()
        sale = result.data
        saleError = result.error
        if (saleError) { alert('Gagal simpan penjualan: ' + saleError.message); this.loading = false; this.renderAndBind(); return }
      }

      // Save sale_items
      if (isEdit) {
        // Delete old items FIRST before inserting new ones
        await this.supabase.from('sale_items').delete().eq('sale_id', this.editingSale.id)
      }

      const saleItems = validItems.map(item => ({
        sale_id: sale.id, product_id: item.productId, quantity: item.qty,
        unit_price: item.price, discount: item.discount,
        sku_id: item.skuId || null, marketplace: item.marketplace || null
      }))
      const { error: itemsError } = await this.supabase.from('sale_items').insert(saleItems)
      if (itemsError) { alert('Gagal menyimpan item: ' + itemsError.message); this.loading = false; this.renderAndBind(); return }

      // Save split payments
      if (isSplit) {
        await this.supabase.from('split_payments').delete().eq('sale_id', sale.id)
        if (this.splitPayments.length > 0) {
          const splitInserts = this.splitPayments.filter(sp => sp.amount > 0).map(sp => ({
            sale_id: sale.id, method: sp.method, amount: sp.amount
          }))
          if (splitInserts.length > 0) {
            const { error: splitError } = await this.supabase.from('split_payments').insert(splitInserts)
            if (splitError) { alert('Gagal menyimpan split payment: ' + splitError.message) }
          }
        }
      }
      if (itemsError) { alert('Gagal menyimpan item: ' + itemsError.message); this.loading = false; this.renderAndBind(); return }

      // Only deduct stock when status is completed (not draft)
      if (status === 'completed' && !isEdit) {
        const isBackdated = saleDateValue < new Date().toISOString().slice(0, 10)
        const stockPromises = validItems.map(item => {
          if (item.skuId) {
            const sku = this.productSkus.find(s => s.id === item.skuId)
            const skuStock = sku?.current_stock || 0
            if (!isBackdated && skuStock < item.qty) {
              alert(`Stok varian tidak mencukupi. Stok: ${skuStock}`)
              return null
            }
            return this.supabase.from('product_skus').update({
              current_stock: skuStock - item.qty
            }).eq('id', item.skuId)
          } else {
            return this.supabase.rpc('add_stock_movement', {
              p_product_id: item.productId, p_quantity: item.qty, p_type: 'out',
              p_reason: 'sale', p_notes: `Penjualan ${sale.invoice_number}`, p_created_by: this.auth.user.id
            })
          }
        }).filter(Boolean)
        const stockResults = await Promise.all(stockPromises)
        const stockError = stockResults.find(r => r.error)
        if (stockError) { alert('Gagal update stok: ' + stockError.error.message); this.loading = false; this.renderAndBind(); return }
      }

      if (status === 'completed') {
        await this.supabase.from('cash_transactions').insert({
          type: 'in', category: 'sales', amount: totalReceived,
          reference_type: 'sales', reference_id: sale.id,
          description: `Penjualan ${sale.invoice_number}${customerName ? ` - ${customerName}` : ''}${paymentDetails.is_overpaid ? ` (Lebih bayar Rp ${this.formatNumber(paymentDetails.overpaid_amount)})` : ''}${paymentDetails.deposit_used ? ` (Menggunakan deposit Rp ${this.formatNumber(paymentDetails.deposit_used)})` : ''}`,
          created_by: this.auth.user.id,
          created_at: saleCreatedAt
        })
        
        // Handle deposits
        if (customerName) {
          // If we used deposit, subtract it
          if (paymentDetails.deposit_used > 0) {
            await this.supabase.from('customer_deposits').insert({
              customer_name: customerName,
              amount: -paymentDetails.deposit_used,
              reference_type: 'sales',
              reference_id: sale.id,
              description: `Penggunaan deposit untuk ${sale.invoice_number}`,
              created_by: this.auth.user.id,
              created_at: saleCreatedAt
            })
          }
          
          // If there's an overpayment, add it to deposit
          if (paymentDetails.is_overpaid && paymentDetails.overpaid_amount > 0) {
            await this.supabase.from('customer_deposits').insert({
              customer_name: customerName,
              amount: paymentDetails.overpaid_amount,
              reference_type: 'sales',
              reference_id: sale.id,
              description: `Tambah deposit dari lebih bayar ${sale.invoice_number}`,
              created_by: this.auth.user.id,
              created_at: saleCreatedAt
            })
          }
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
        this.saleDate = new Date().toISOString().slice(0, 10)
        this.splitPayments = []
      } else {
        this.editingSale = sale
        this.paymentMethod = paymentMethod
        this.mainPaymentAmount = mainAmount
        this.formCustomerName = formData.get('customer_name') || ''
        this.formMarketplace = formData.get('marketplace') || ''
        this.formPlatformFee = platformFee
        this.saleDate = saleDateValue
      }
      await this.loadData()
      this.renderAndBind()
      } catch (err) {
        console.error('Save error:', err)
        alert('Terjadi kesalahan: ' + err.message)
      } finally {
        this.loading = false
      }
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

  _isShopeeCheckout(method) {
    if (!method) return false
    const m = method.toLowerCase()
    if (m.includes('shopee')) return true
    const pm = this.paymentMethods.find(p => p.code === method)
    if (pm && pm.name && pm.name.toLowerCase().includes('shopee')) return true
    return false
  }

  _getShopeeAmount() {
    const total = this.transactionItems.reduce((sum, item) => sum + item.subtotal, 0)
    const splitTotal = this.splitPayments.reduce((sum, sp) => sum + (sp.amount || 0), 0)
    const mainAmount = this.mainPaymentAmount || total

    let shopeeAmount = 0
    if (this._isShopeeCheckout(this.paymentMethod)) {
      shopeeAmount = mainAmount
    }
    this.splitPayments.forEach(sp => {
      if (this._isShopeeCheckout(sp.method)) {
        shopeeAmount += sp.amount || 0
      }
    })
    return shopeeAmount
  }

  _updateTotals() {
    const total = this.transactionItems.reduce((sum, item) => sum + item.subtotal, 0)
    const totalQty = this.transactionItems.reduce((sum, item) => sum + item.qty, 0)
    const splitTotal = this.splitPayments.reduce((sum, sp) => sum + (sp.amount || 0), 0)
    const mainAmount = this.mainPaymentAmount || total
    const totalPaid = mainAmount + splitTotal

    const shopeeAmount = this._getShopeeAmount()
    const hasShopee = shopeeAmount > 0

    let markupAmount = 0
    let totalFee = 0
    let markedUpTotal = total

    if (hasShopee) {
      markupAmount = Math.round(shopeeAmount * 0.4286)
      totalFee = Math.round((shopeeAmount + markupAmount) * 0.3)
      markedUpTotal = total + markupAmount
    }

    this.formShopeeAmount = shopeeAmount
    this.formMarkupAmount = markupAmount
    this.formPlatformFee = totalFee
    this.formMarkedUpTotal = markedUpTotal

    const feeInput = document.getElementById('platform_fee')
    if (feeInput) feeInput.value = totalFee
    const feeSection = document.getElementById('platformFeeSection')
    if (feeSection) feeSection.classList.toggle('hidden', totalFee === 0)

    const markupInput = document.getElementById('markup_amount')
    if (markupInput) markupInput.value = markupAmount
    const markupSection = document.getElementById('markupSection')
    if (markupSection) markupSection.classList.toggle('hidden', markupAmount === 0)

    const markupRow = document.getElementById('markupDisplayRow')
    const feeRow = document.getElementById('feeDisplayRow')
    const markupDisplay = document.getElementById('markupDisplayAmount')
    const feeDisplay = document.getElementById('feeDisplayAmount')
    if (markupRow) markupRow.classList.toggle('hidden', markupAmount === 0)
    if (feeRow) feeRow.classList.toggle('hidden', totalFee === 0)
    if (markupDisplay) markupDisplay.textContent = '+ Rp ' + this.formatNumber(markupAmount)
    if (feeDisplay) feeDisplay.textContent = '- Rp ' + this.formatNumber(totalFee)

    const el = (id) => document.getElementById(id)
    if (el('totalQty')) el('totalQty').textContent = totalQty
    if (el('totalSubtotal')) el('totalSubtotal').textContent = 'Rp ' + this.formatNumber(total)
    if (el('totalGrand')) el('totalGrand').textContent = 'Rp ' + this.formatNumber(markedUpTotal)
    if (el('totalPaid')) el('totalPaid').textContent = 'Rp ' + this.formatNumber(totalPaid)

    // Calculate actual due: markedUpTotal minus platform fee
    const actualDue = markedUpTotal - totalFee
    const remaining = actualDue - totalPaid
    const isOverpaid = remaining < 0
    const overpaidSection = el('overpaidSection')
    const remainingSection = el('remainingSection')
    if (overpaidSection) overpaidSection.classList.toggle('hidden', !isOverpaid)
    if (remainingSection) remainingSection.classList.toggle('hidden', isOverpaid)
    if (isOverpaid) {
      if (el('overpaidAmount')) el('overpaidAmount').textContent = 'Rp ' + this.formatNumber(Math.abs(remaining))
    } else {
      if (el('totalRemaining')) {
        el('totalRemaining').textContent = 'Rp ' + this.formatNumber(remaining)
        el('totalRemaining').style.color = remaining > 0 ? '#ef4444' : '#16a34a'
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