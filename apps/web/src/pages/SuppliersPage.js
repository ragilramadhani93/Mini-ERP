import { ConfirmModal } from '../components/ConfirmModal.js'
import { SkeletonPage } from '../components/Skeleton.js'
import { toast } from '../components/ToastNotification.js'

export class SuppliersPage {
  constructor({ supabase }) {
    this.supabase = supabase
    this.suppliers = []
    this.showModal = false
    this.editingSupplier = null
  }

  async loadData() {
    try {
      const { data } = await this.supabase.from('suppliers').select('*').order('supplier_name')
      this.suppliers = data || []
    } catch (err) {
      console.error('Load suppliers error:', err)
      toast.error('Gagal', 'Gagal memuat supplier: ' + err.message)
      this.suppliers = []
    }
  }

  render() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Supplier</h2>
          <button id="add-supplier-btn" class="btn-primary">
            <i data-lucide="plus" class="w-5 h-5"></i> Tambah Supplier
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${this.suppliers.length === 0 ? `
            <div class="col-span-full text-center text-gray-500 py-8">Belum ada supplier</div>
          ` : this.suppliers.map(s => `
            <div class="card p-4">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h3 class="font-semibold">${s.supplier_name}</h3>
                  <p class="text-xs text-gray-500">${s.contact_person || '-'}</p>
                </div>
                <div class="flex gap-2">
                  <button class="btn-outline btn-sm edit-supplier" data-id="${s.id}">
                    <i data-lucide="pencil" class="w-4 h-4"></i>
                  </button>
                  <button class="btn-outline btn-sm text-danger-600 delete-supplier" data-id="${s.id}">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
              <div class="space-y-1 text-sm text-gray-600">
                ${s.phone ? `<p class="flex items-center gap-2"><i data-lucide="phone" class="w-3 h-3"></i> ${s.phone}</p>` : ''}
                ${s.email ? `<p class="flex items-center gap-2"><i data-lucide="mail" class="w-3 h-3"></i> ${s.email}</p>` : ''}
                ${s.address ? `<p class="flex items-start gap-2"><i data-lucide="map-pin" class="w-3 h-3 mt-0.5"></i> ${s.address}</p>` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        ${this.showModal ? this.renderModal() : ''}
      </div>
    `
  }

  renderModal() {
    const s = this.editingSupplier
    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold">${s ? 'Edit Supplier' : 'Tambah Supplier'}</h3>
            <button id="close-modal" class="text-gray-400 hover:text-gray-600">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          <form id="supplier-form" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="supplier_name">Nama Supplier</label>
                <input type="text" id="supplier_name" name="supplier_name" required value="${s?.supplier_name || ''}">
              </div>
              <div>
                <label for="contact_person">Kontak Person</label>
                <input type="text" id="contact_person" name="contact_person" value="${s?.contact_person || ''}">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="phone">Telepon</label>
                <input type="text" id="phone" name="phone" value="${s?.phone || ''}">
              </div>
              <div>
                <label for="email">Email</label>
                <input type="email" id="email" name="email" value="${s?.email || ''}">
              </div>
            </div>
            <div>
              <label for="address">Alamat</label>
              <textarea id="address" name="address" rows="2">${s?.address || ''}</textarea>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" id="cancel-modal" class="btn-secondary">Batal</button>
              <button type="submit" class="btn-primary">${s ? 'Simpan' : 'Tambah'}</button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  async bindEvents() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) outlet.innerHTML = SkeletonPage()
    await this.loadData()
    this.renderAndBind()
  }

  _bindListeners() {
    document.getElementById('add-supplier-btn')?.addEventListener('click', () => {
      this.editingSupplier = null
      this.showModal = true
      this.renderAndBind()
    })

    document.querySelectorAll('.edit-supplier').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id
        this.editingSupplier = this.suppliers.find(s => s.id === id) || null
        this.showModal = true
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.delete-supplier').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id
        if (await ConfirmModal.show({ title: 'Hapus Supplier', message: 'Hapus supplier ini?', confirmText: 'Ya, Hapus', variant: 'danger' })) {
          await this.supabase.from('suppliers').delete().eq('id', id)
          await this.loadData()
          this.renderAndBind()
        }
      })
    })

    this._bindModalEvents()
  }

  _bindModalEvents() {
    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.showModal = false
      this.editingSupplier = null
      this.renderAndBind()
    })
    document.getElementById('cancel-modal')?.addEventListener('click', () => {
      this.showModal = false
      this.editingSupplier = null
      this.renderAndBind()
    })
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.showModal = false
        this.editingSupplier = null
        this.renderAndBind()
      }
    })

    const form = document.getElementById('supplier-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const formData = new FormData(form)
      const data = {
        supplier_name: formData.get('supplier_name'),
        contact_person: formData.get('contact_person'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        address: formData.get('address')
      }

      if (this.editingSupplier) {
        await this.supabase.from('suppliers').update(data).eq('id', this.editingSupplier.id)
      } else {
        await this.supabase.from('suppliers').insert(data)
      }

      this.showModal = false
      this.editingSupplier = null
      await this.loadData()
      this.renderAndBind()
    })
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
