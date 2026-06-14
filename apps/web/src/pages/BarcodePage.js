import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

export class BarcodePage {
  constructor({ supabase, auth, router }) {
    this.supabase = supabase
    this.auth = auth
    this.router = router
    this.products = []
    this.scanner = null
    this.isScanning = false
    this.scanMode = 'stock'
    this.scannedProduct = null
    this.scanQuantity = 1
    this.cameraId = null
    this.isCapacitor = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()
  }

  async loadData() {
    const { data } = await this.supabase.from('products')
      .select('id, sku, name, current_stock, sell_price, cost_price, min_stock')
      .order('name')
    this.products = data || []
  }

  render() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Barcode Scanner</h2>
          <div class="flex gap-2">
            <button class="mode-btn btn-outline ${this.scanMode === 'stock' ? 'btn-primary' : ''}" data-mode="stock">
              <i data-lucide="scan" class="w-4 h-4"></i> Scan Stok
            </button>
            <button class="mode-btn btn-outline ${this.scanMode === 'opname' ? 'btn-primary' : ''}" data-mode="opname">
              <i data-lucide="clipboard-check" class="w-4 h-4"></i> Opname
            </button>
            <button class="mode-btn btn-outline ${this.scanMode === 'sale' ? 'btn-primary' : ''}" data-mode="sale">
              <i data-lucide="shopping-cart" class="w-4 h-4"></i> Penjualan
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card p-6">
            <h3 class="text-lg font-semibold mb-4">Scanner</h3>
            <div id="scanner-container" class="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
              ${!this.isScanning ? `
                <div class="flex items-center justify-center h-full">
                  <div class="text-center">
                    <i data-lucide="camera" class="w-12 h-12 text-gray-300 mx-auto mb-3"></i>
                    <p class="text-sm text-gray-500">Klik tombol di bawah untuk memulai scan</p>
                    <button id="start-scan" class="btn-primary mt-4">
                      <i data-lucide="scan" class="w-5 h-5"></i> Mulai Scan
                    </button>
                  </div>
                </div>
              ` : `
                <div id="reader" class="w-full h-full"></div>
              `}
            </div>
            ${this.isScanning ? `
              <button id="stop-scan" class="btn-danger mt-4 w-full">
                <i data-lucide="stop" class="w-5 h-5"></i> Stop Scan
              </button>
            ` : ''}
            <div class="mt-4 p-3 bg-gray-50 rounded-lg">
              <p class="text-sm text-gray-500">Mode: <span class="font-semibold">${this.getModeLabel()}</span></p>
              <p class="text-sm text-gray-500 mt-1">Hasil scan akan muncul di panel samping</p>
            </div>
          </div>

          <div class="space-y-4">
            <div class="card p-6">
              <h3 class="text-lg font-semibold mb-4">Hasil Scan</h3>
              ${this.scannedProduct ? this.renderScanResult() : `
                <div class="text-center py-8">
                  <i data-lucide="scan-line" class="w-12 h-12 text-gray-300 mx-auto mb-3"></i>
                  <p class="text-sm text-gray-500">Scan barcode produk untuk memulai</p>
                </div>
              `}
            </div>

            <div class="card p-6">
              <h3 class="text-lg font-semibold mb-4">Produk Terdaftar</h3>
              <input type="text" id="search-prod" class="mb-3" placeholder="Cari produk..." oninput="this.dispatchEvent(new Event('search'))">
              <div class="space-y-2 max-h-64 overflow-y-auto">
                ${this.products.length === 0 ? '<p class="text-sm text-gray-500">Belum ada produk</p>' :
                  this.products.map(p => `
                    <div class="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer searchable" data-name="${p.name.toLowerCase()} ${p.sku.toLowerCase()}">
                      <div>
                        <p class="text-sm font-medium">${p.name}</p>
                        <p class="text-xs text-gray-500 font-mono">${p.sku} • Stok: ${p.current_stock}</p>
                      </div>
                      <button class="btn-outline btn-sm scan-manual" data-id="${p.id}">
                        <i data-lucide="scan" class="w-3 h-3"></i>
                      </button>
                    </div>
                  `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  renderScanResult() {
    const p = this.scannedProduct
    const modeActions = {
      stock: `
        <div class="flex gap-2 mt-3">
          <input type="number" id="scan-qty" class="w-20" value="${this.scanQuantity}" min="1">
          <button id="action-stock-in" class="btn-success btn-sm flex-1">
            <i data-lucide="arrow-down-left" class="w-4 h-4"></i> Stok Masuk
          </button>
          <button id="action-stock-out" class="btn-danger btn-sm flex-1">
            <i data-lucide="arrow-up-right" class="w-4 h-4"></i> Stok Keluar
          </button>
        </div>
      `,
      opname: `
        <div class="flex gap-2 mt-3">
          <input type="number" id="scan-qty" class="w-20" value="${p.current_stock}" min="0">
          <button id="action-opname" class="btn-primary btn-sm flex-1">
            <i data-lucide="save" class="w-4 h-4"></i> Update Stok Fisik
          </button>
        </div>
      `,
      sale: `
        <div class="flex gap-2 mt-3">
          <input type="number" id="scan-qty" class="w-20" value="1" min="1">
          <button id="action-sale" class="btn-primary btn-sm flex-1">
            <i data-lucide="shopping-cart" class="w-4 h-4"></i> Tambah ke Penjualan
          </button>
        </div>
      `
    }

    return `
      <div class="p-4 bg-primary-50 rounded-lg">
        <p class="text-xs text-gray-500 font-mono">${p.sku}</p>
        <p class="font-semibold text-lg">${p.name}</p>
        <div class="grid grid-cols-3 gap-4 mt-3 text-sm">
          <div>
            <p class="text-gray-500">Stok</p>
            <p class="font-semibold ${p.current_stock <= p.min_stock ? 'text-danger-600' : 'text-success-600'}">${p.current_stock}</p>
          </div>
          <div>
            <p class="text-gray-500">Harga Jual</p>
            <p class="font-semibold">Rp ${this.formatNumber(p.sell_price)}</p>
          </div>
          <div>
            <p class="text-gray-500">Harga Modal</p>
            <p class="font-semibold">Rp ${this.formatNumber(p.cost_price)}</p>
          </div>
        </div>
        ${modeActions[this.scanMode] || ''}
      </div>
    `
  }

  getModeLabel() {
    const labels = { stock: 'Manajemen Stok', opname: 'Stock Opname', sale: 'Penjualan' }
    return labels[this.scanMode] || 'Stok'
  }

  formatNumber(num) { return num ? num.toLocaleString('id-ID') : '0' }

  findProductByCode(code) {
    return this.products.find(p => p.sku === code || p.sku.replace('-', '') === code || p.id === code)
  }

  async handleScan(code) {
    const product = this.findProductByCode(code)
    if (product) {
      this.scannedProduct = product
      this.scanQuantity = 1
      this.renderAndBind()
    } else {
      alert(`Produk dengan kode "${code}" tidak ditemukan`)
    }
  }

  async initScanner() {
    if (this.isCapacitor) {
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera
        })
        
        // For Capacitor, we need a library to scan barcodes from image.
        // For now, let's show a message
        alert('Untuk scanning di mobile, silakan gunakan fitur scan manual!')
      } catch (err) {
        alert('Gagal mengakses kamera: ' + err.message)
      }
    } else {
      try {
        const cameras = await Html5Qrcode.getCameras()
        if (cameras.length === 0) { alert('Kamera tidak tersedia'); return }
        this.cameraId = cameras[0].id

        this.scanner = new Html5Qrcode('reader')
        this.isScanning = true
        this.renderAndBind()

        await this.scanner.start(
          this.cameraId,
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (code) => {
            this.handleScan(code)
          },
          () => {}
        )
      } catch (err) {
        alert('Gagal mengakses kamera: ' + err.message)
        this.isScanning = false
        this.renderAndBind()
      }
    }
  }

  async stopScanner() {
    if (this.scanner) {
      await this.scanner.stop()
      this.scanner.clear()
    }
    this.isScanning = false
    this.renderAndBind()
  }

  async bindEvents() {
    await this.loadData()
    this.renderAndBind()
  }

  _bindListeners() {
    document.getElementById('start-scan')?.addEventListener('click', () => this.initScanner())
    document.getElementById('stop-scan')?.addEventListener('click', () => this.stopScanner())

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.scanMode = btn.dataset.mode
        this.scannedProduct = null
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.scan-manual').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id
        this.scannedProduct = this.products.find(p => p.id === id) || null
        this.scanQuantity = 1
        this.renderAndBind()
      })
    })

    document.getElementById('action-stock-in')?.addEventListener('click', async () => {
      const qty = parseInt(document.getElementById('scan-qty')?.value) || 1
      await this.supabase.rpc('add_stock_movement', {
        p_product_id: this.scannedProduct.id, p_quantity: qty, p_type: 'in', p_reason: 'adjustment',
        p_notes: 'Scan barcode', p_created_by: this.auth.user.id
      })
      alert(`Stok ${this.scannedProduct.name} bertambah ${qty}`)
      await this.loadData(); this.renderAndBind()
    })

    document.getElementById('action-stock-out')?.addEventListener('click', async () => {
      const qty = parseInt(document.getElementById('scan-qty')?.value) || 1
      if (qty > this.scannedProduct.current_stock) { alert('Stok tidak mencukupi'); return }
      await this.supabase.rpc('add_stock_movement', {
        p_product_id: this.scannedProduct.id, p_quantity: qty, p_type: 'out', p_reason: 'adjustment',
        p_notes: 'Scan barcode', p_created_by: this.auth.user.id
      })
      alert(`Stok ${this.scannedProduct.name} berkurang ${qty}`)
      await this.loadData(); this.renderAndBind()
    })

    document.getElementById('action-opname')?.addEventListener('click', async () => {
      const physical = parseInt(document.getElementById('scan-qty')?.value) || 0
      const diff = physical - this.scannedProduct.current_stock
      await this.supabase.from('stock_opname').insert({
        product_id: this.scannedProduct.id,
        system_stock: this.scannedProduct.current_stock,
        physical_stock: physical,
        difference: diff,
        created_by: this.auth.user.id
      })
      await this.supabase.from('products').update({ current_stock: physical }).eq('id', this.scannedProduct.id)
      alert(`Stok ${this.scannedProduct.name} diupdate: ${physical}`)
      await this.loadData(); this.renderAndBind()
    })

    document.getElementById('action-sale')?.addEventListener('click', () => {
      const qty = parseInt(document.getElementById('scan-qty')?.value) || 1
      this.router.navigate(`/sales`)
      setTimeout(() => alert(`Tambahkan "${this.scannedProduct.name}" (qty: ${qty}) ke halaman penjualan`), 300)
    })

    document.getElementById('search-prod')?.addEventListener('search', () => {
      const q = document.getElementById('search-prod').value.toLowerCase()
      document.querySelectorAll('.searchable').forEach(el => {
        el.style.display = el.dataset.name.includes(q) ? '' : 'none'
      })
    })

    if (window.lucide) window.lucide.createIcons()
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) { outlet.innerHTML = this.render(); this._bindListeners(); if (window.lucide) window.lucide.createIcons() }
  }
}