import { SkeletonPage } from '../components/Skeleton.js'
import { toast } from '../components/ToastNotification.js'
import { ConfirmModal } from '../components/ConfirmModal.js'

export class StockOpnamePage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.products = []
    this.opnames = []
    this.activeView = 'form'
    this.physicalStocks = {}
    this.saving = false
  }

  async loadData() {
    try {
      const [productsRes, opnamesRes] = await Promise.all([
        this.supabase.from('products')
          .select('id, sku, name, current_stock, cost_price')
          .order('name'),
        this.supabase.from('stock_opname')
          .select('*, products(sku, name), created_by_user:users(full_name)')
          .order('created_at', { ascending: false })
          .limit(50)
      ])
      this.products = productsRes.data || []
      this.opnames = opnamesRes.data || []
      this.products.forEach(p => {
        this.physicalStocks[p.id] = p.current_stock
      })
    } catch (err) {
      console.error('Load opname error:', err)
      toast.error('Gagal', 'Gagal memuat data: ' + err.message)
      this.products = []
      this.opnames = []
    }
  }

  render() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Stock Opname</h2>
          <div class="flex gap-2">
            <button class="view-toggle btn-outline ${this.activeView === 'form' ? 'btn-primary' : ''}" data-view="form">
              <i data-lucide="clipboard-list" class="w-5 h-5"></i> Input Stok Fisik
            </button>
            <button class="view-toggle btn-outline ${this.activeView === 'history' ? 'btn-primary' : ''}" data-view="history">
              <i data-lucide="history" class="w-5 h-5"></i> Riwayat Opname
            </button>
          </div>
        </div>

        ${this.activeView === 'form' ? this.renderForm() : this.renderHistory()}
      </div>
    `
  }

  renderForm() {
    return `
      <div class="card p-6">
        <div class="mb-4">
          <div class="flex items-center gap-2">
            <input type="text" id="search-product" class="max-w-xs" placeholder="Cari produk..." oninput="this.dispatchEvent(new Event('search'))">
            <span class="text-sm text-gray-500">${this.products.length} produk</span>
          </div>
        </div>
        <form id="opname-form">
          <div class="table-container max-h-[60vh] overflow-y-auto">
            <table class="table">
              <thead class="sticky top-0 bg-white">
                <tr>
                  <th class="w-12">No</th>
                  <th>SKU</th>
                  <th>Nama Produk</th>
                  <th class="text-right">Stok Sistem</th>
                  <th class="text-right">Stok Fisik</th>
                  <th class="text-right">Selisih</th>
                  <th>Nilai Selisih</th>
                </tr>
              </thead>
              <tbody>
                ${this.products.map((p, i) => {
                  const physical = this.physicalStocks[p.id] || 0
                  const diff = physical - p.current_stock
                  return `
                    <tr class="${diff !== 0 ? 'bg-warning-50' : ''}">
                      <td class="text-gray-500">${i + 1}</td>
                      <td class="font-mono text-xs">${p.sku}</td>
                      <td class="font-medium">${p.name}</td>
                      <td class="text-right font-semibold">${p.current_stock}</td>
                      <td class="text-right">
                        <input type="number" class="w-20 text-right physical-input" 
                          data-product-id="${p.id}" 
                          value="${physical}" 
                          min="0"
                          style="padding: 2px 8px;">
                      </td>
                      <td class="text-right font-semibold ${diff > 0 ? 'text-success-600' : diff < 0 ? 'text-danger-600' : ''}">
                        ${diff > 0 ? '+' : ''}${diff}
                      </td>
                      <td class="text-sm">Rp ${this.formatNumber(Math.abs(diff * p.cost_price))}</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
          <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
            <div class="text-sm text-gray-500">
              ${this.products.filter(p => {
                const physical = this.physicalStocks[p.id] || 0
                return physical !== p.current_stock
              }).length} produk dengan selisih
            </div>
            <button type="submit" class="btn-primary" ${this.saving ? 'disabled' : ''}>
              ${this.saving ? 'Menyimpan...' : '<i data-lucide="save" class="w-5 h-5"></i> Simpan Opname'}
            </button>
          </div>
        </form>
      </div>
    `
  }

  renderHistory() {
    return `
      <div class="card">
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Produk</th>
                <th>SKU</th>
                <th class="text-right">Sistem</th>
                <th class="text-right">Fisik</th>
                <th class="text-right">Selisih</th>
                <th>Keterangan</th>
                <th>Oleh</th>
              </tr>
            </thead>
            <tbody>
              ${this.opnames.length === 0 ? `
                <tr><td colspan="8" class="text-center text-gray-500 py-8">Belum ada riwayat opname</td></tr>
              ` : this.opnames.map(o => `
                <tr>
                  <td class="text-sm text-gray-500 whitespace-nowrap">${this.formatDate(o.created_at)}</td>
                  <td class="font-medium">${o.products?.name || '-'}</td>
                  <td class="font-mono text-xs">${o.products?.sku || '-'}</td>
                  <td class="text-right">${o.system_stock}</td>
                  <td class="text-right">${o.physical_stock}</td>
                  <td class="text-right font-semibold ${o.difference > 0 ? 'text-success-600' : o.difference < 0 ? 'text-danger-600' : ''}">
                    ${o.difference > 0 ? '+' : ''}${o.difference}
                  </td>
                  <td class="text-sm text-gray-500">${o.notes || '-'}</td>
                  <td class="text-sm text-gray-500">${o.created_by_user?.full_name || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  }

  formatNumber(num) {
    return num ? num.toLocaleString('id-ID') : '0'
  }

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
    document.querySelectorAll('.view-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeView = btn.dataset.view
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.physical-input').forEach(input => {
      input.addEventListener('input', () => {
        this.physicalStocks[input.dataset.productId] = parseInt(input.value) || 0
        const tr = input.closest('tr')
        const systemStock = parseInt(tr.querySelector('td:nth-child(4)').textContent)
        const physical = parseInt(input.value) || 0
        const diff = physical - systemStock
        const diffTd = tr.querySelector('td:nth-child(6)')
        diffTd.textContent = diff > 0 ? `+${diff}` : `${diff}`
        diffTd.className = `text-right font-semibold ${diff > 0 ? 'text-success-600' : diff < 0 ? 'text-danger-600' : ''}`
        tr.className = diff !== 0 ? 'bg-warning-50' : ''
      })
    })

    const form = document.getElementById('opname-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      this.saving = true
      this.renderAndBind()

      const differences = this.products.filter(p => {
        const physical = this.physicalStocks[p.id] || 0
        return physical !== p.current_stock
      })

      if (differences.length === 0) {
        toast.info('Tidak ada selisih', 'Semua data stok sudah sesuai')
        this.saving = false
        this.renderAndBind()
        return
      }

      if (!(await ConfirmModal.show({ title: 'Simpan Opname', message: `Terdapat ${differences.length} produk dengan selisih. Simpan opname?`, confirmText: 'Ya, Simpan', variant: 'primary' }))) {
        this.saving = false
        this.renderAndBind()
        return
      }

      const opnameData = this.products.map(p => ({
        product_id: p.id,
        system_stock: p.current_stock,
        physical_stock: this.physicalStocks[p.id] || 0,
        difference: (this.physicalStocks[p.id] || 0) - p.current_stock,
        created_by: this.auth.user.id
      })).filter(o => o.difference !== 0)

      const { error } = await this.supabase.from('stock_opname').insert(opnameData)

      if (error) {
        toast.error('Gagal simpan', 'Gagal menyimpan opname: ' + error.message)
      } else {
        for (const o of opnameData) {
          await this.supabase.from('products').update({
            current_stock: o.physical_stock
          }).eq('id', o.product_id)
        }
        toast.success('Berhasil', 'Stock opname berhasil disimpan')
      }

      this.saving = false
      await this.loadData()
      this.renderAndBind()
    })

    document.getElementById('search-product')?.addEventListener('search', () => {
      const q = document.getElementById('search-product').value.toLowerCase()
      document.querySelectorAll('#opname-form tbody tr').forEach(tr => {
        const name = tr.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || ''
        const sku = tr.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || ''
        tr.style.display = name.includes(q) || sku.includes(q) ? '' : 'none'
      })
    })

    this._bindModalEvents()
  }

  _bindModalEvents() {
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