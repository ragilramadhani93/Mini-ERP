import { Exporter } from '../utils/export.js'
import { SkeletonPage } from '../components/Skeleton.js'
import { toast } from '../components/ToastNotification.js'

export class ImportExportPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.activeTab = 'export'
    this.loading = false
    this.importResult = null
  }

  render() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Import / Export Data</h2>
        </div>

        <div class="flex gap-2">
          <button class="tab-btn btn-outline ${this.activeTab === 'export' ? 'btn-primary' : ''}" data-tab="export">
            <i data-lucide="download" class="w-4 h-4"></i> Export Data
          </button>
          <button class="tab-btn btn-outline ${this.activeTab === 'import' ? 'btn-primary' : ''}" data-tab="import">
            <i data-lucide="upload" class="w-4 h-4"></i> Import Data
          </button>
        </div>

        ${this.activeTab === 'export' ? this.renderExport() : this.renderImport()}
      </div>
    `
  }

  renderExport() {
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${this.renderExportCard('Produk', 'package', 'Export data semua produk', ['products'])}
        ${this.renderExportCard('Penjualan', 'shopping-cart', 'Export riwayat penjualan', ['sales'])}
        ${this.renderExportCard('Pergerakan Stok', 'archive', 'Export riwayat pergerakan stok', ['stock'])}
        ${this.renderExportCard('Keuangan', 'wallet', 'Export transaksi keuangan', ['finance'])}
      </div>
    `
  }

  renderExportCard(title, icon, desc, keys) {
    return `
      <div class="card p-6">
        <div class="flex items-start gap-4">
          <div class="p-3 bg-primary-50 rounded-xl">
            <i data-lucide="${icon}" class="w-6 h-6 text-primary-600"></i>
          </div>
          <div class="flex-1">
            <h3 class="font-semibold">${title}</h3>
            <p class="text-sm text-gray-500 mt-1">${desc}</p>
            <div class="flex gap-2 mt-4">
              <button class="btn-outline btn-sm export-csv" data-key="${keys[0]}">
                <i data-lucide="file-text" class="w-4 h-4"></i> CSV (Excel)
              </button>
              <button class="btn-outline btn-sm export-pdf" data-key="${keys[0]}">
                <i data-lucide="file" class="w-4 h-4"></i> PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    `
  }

  renderImport() {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <i data-lucide="upload" class="w-5 h-5 text-primary-600"></i>
            Import Produk
          </h3>
          <form id="import-products-form" class="space-y-4">
            <div>
              <label for="import-file">File CSV/Excel</label>
              <input type="file" id="import-file" accept=".csv,.xlsx,.xls" required class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-sm hover:border-primary-400 cursor-pointer">
            </div>
            <p class="text-sm text-gray-500">Format: SKU, Nama, Kategori, Supplier, Harga Modal, Harga Jual, Stok, Min Stok</p>
            <a href="#" class="text-sm text-primary-600 hover:underline download-template" data-type="products">Download template CSV</a>
            <button type="submit" class="btn-primary w-full" ${this.loading ? 'disabled' : ''}>
              ${this.loading ? 'Memproses...' : '<i data-lucide="upload" class="w-4 h-4"></i> Import'}
            </button>
          </form>
          ${this.importResult ? this.renderImportResult() : ''}
        </div>

        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-4">Panduan Import</h3>
          <ol class="space-y-3 text-sm text-gray-600">
            <li class="flex gap-2">
              <span class="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">1</span>
              Download template CSV terlebih dahulu
            </li>
            <li class="flex gap-2">
              <span class="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">2</span>
              Isi data sesuai kolom yang tersedia
            </li>
            <li class="flex gap-2">
              <span class="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">3</span>
              Pastikan SKU unik dan tidak duplikat
            </li>
            <li class="flex gap-2">
              <span class="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">4</span>
              Upload file dan klik Import
            </li>
            <li class="flex gap-2">
              <span class="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">5</span>
              Sistem akan memvalidasi dan memasukkan data
            </li>
          </ol>
        </div>
      </div>
    `
  }

  renderImportResult() {
    return `
      <div class="mt-4 p-4 rounded-lg ${this.importResult.success ? 'bg-success-50' : 'bg-danger-50'}">
        <p class="font-semibold ${this.importResult.success ? 'text-success-600' : 'text-danger-600'}">
          ${this.importResult.success ? '✓ Berhasil!' : '✗ Gagal'}
        </p>
        <p class="text-sm mt-1">${this.importResult.message}</p>
      </div>
    `
  }

  async exportData(key, format) {
    this.loading = true
    let data, exportConfig

    try {
      switch (key) {
        case 'products': {
          const { data: products } = await this.supabase.from('products')
            .select('*, categories(name), suppliers(supplier_name)').order('name')
          data = products || []
          exportConfig = Exporter.exportProducts(data)
          break
        }
        case 'sales': {
          const { data: sales } = await this.supabase.from('sales')
            .select('*, sale_items(*, products(name, sku))').order('created_at', { ascending: false })
          data = sales || []
          exportConfig = Exporter.exportSales(data)
          break
        }
        case 'stock': {
          const { data: movements } = await this.supabase.from('stock_movements')
            .select('*, products(name, sku)').order('created_at', { ascending: false }).limit(1000)
          data = movements || []
          exportConfig = Exporter.exportStockMovements(data)
          break
        }
        case 'finance': {
          const { data: transactions } = await this.supabase.from('cash_transactions')
            .select('*').order('created_at', { ascending: false }).limit(1000)
          data = transactions || []
          exportConfig = Exporter.exportFinance(data)
          break
        }
      }

      if (format === 'csv') {
        Exporter.downloadCSV(exportConfig.filename, exportConfig.headers, exportConfig.rows)
      } else {
        Exporter.downloadPDF(exportConfig.title, exportConfig.headers, exportConfig.rows, exportConfig.filename)
      }
    } catch (err) {
      toast.error('Gagal Export', err.message || 'Gagal melakukan export data')
    }
    this.loading = false
  }

  parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) return { headers: [], rows: [] }
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const rows = lines.slice(1).map(line => {
      const values = []
      let current = ''
      let inQuotes = false
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; continue }
        if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue }
        current += char
      }
      values.push(current.trim())
      return values
    })
    return { headers, rows }
  }

  async handleImport(file) {
    this.loading = true
    this.importResult = null
    this.renderAndBind()

    try {
      const text = await file.text()
      const { headers, rows } = this.parseCSV(text)

      if (rows.length === 0) { throw new Error('File kosong atau format tidak valid') }

      let success = 0, failed = 0
      for (const row of rows) {
        try {
          await this.supabase.from('products').insert({
            sku: row[0] || `IMP-${Date.now()}-${success}`,
            name: row[1] || 'Produk Import',
            category_id: null,
            supplier_id: null,
            cost_price: parseInt(row[4]) || 0,
            sell_price: parseInt(row[5]) || 0,
            current_stock: parseInt(row[6]) || 0,
            min_stock: parseInt(row[7]) || 0
          })
          success++
        } catch { failed++ }
      }

      this.importResult = {
        success: failed === 0,
        message: `${success} produk berhasil diimport${failed > 0 ? `, ${failed} gagal` : ''}`
      }
    } catch (err) {
      this.importResult = { success: false, message: err.message }
    }

    this.loading = false
    this.renderAndBind()
  }

  async bindEvents() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) outlet.innerHTML = SkeletonPage()
    this.renderAndBind()
  }

  _bindListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => { this.activeTab = btn.dataset.tab; this.renderAndBind() })
    })

    document.querySelectorAll('.export-csv').forEach(btn => {
      btn.addEventListener('click', () => this.exportData(btn.dataset.key, 'csv'))
    })

    document.querySelectorAll('.export-pdf').forEach(btn => {
      btn.addEventListener('click', () => this.exportData(btn.dataset.key, 'pdf'))
    })

    document.querySelectorAll('.download-template').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        Exporter.downloadCSV('template-produk', ['SKU', 'Nama Produk', 'Kategori', 'Supplier', 'Harga Modal', 'Harga Jual', 'Stok', 'Min Stok'], [
          ['PRD-001', 'Contoh Produk', 'Kategori', 'Supplier', '10000', '25000', '50', '10']
        ])
      })
    })

    const importForm = document.getElementById('import-products-form')
    importForm?.addEventListener('submit', (e) => {
      e.preventDefault()
      const file = document.getElementById('import-file')?.files[0]
      if (file) this.handleImport(file)
    })

    if (window.lucide) window.lucide.createIcons()
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) { outlet.innerHTML = this.render(); this._bindListeners(); if (window.lucide) window.lucide.createIcons() }
  }
}