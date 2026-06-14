export class CategoriesPage {
  constructor({ supabase }) {
    this.supabase = supabase
    this.categories = []
    this.showModal = false
    this.editingCategory = null
  }

  async loadData() {
    const { data } = await this.supabase.from('categories').select('*').order('name')
    this.categories = data || []
  }

  render() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Kategori Produk</h2>
          <button id="add-category-btn" class="btn-primary">
            <i data-lucide="plus" class="w-5 h-5"></i> Tambah Kategori
          </button>
        </div>

        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Nama Kategori</th>
                  <th>Deskripsi</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${this.categories.length === 0 ? `
                  <tr><td colspan="3" class="text-center text-gray-500 py-8">Belum ada kategori</td></tr>
                ` : this.categories.map(c => `
                  <tr>
                    <td>
                      <span class="badge badge-info">${c.name}</span>
                    </td>
                    <td class="text-gray-500">${c.description || '-'}</td>
                    <td class="text-right">
                      <button class="btn-outline btn-sm edit-category" data-id="${c.id}">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                      </button>
                      <button class="btn-outline btn-sm text-danger-600 delete-category" data-id="${c.id}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        ${this.showModal ? this.renderModal() : ''}
      </div>
    `
  }

  renderModal() {
    const c = this.editingCategory
    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold">${c ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
            <button id="close-modal" class="text-gray-400 hover:text-gray-600">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>
          <form id="category-form" class="space-y-4">
            <div>
              <label for="name">Nama Kategori</label>
              <input type="text" id="name" name="name" required value="${c?.name || ''}" placeholder="Contoh: Makanan">
            </div>
            <div>
              <label for="description">Deskripsi</label>
              <textarea id="description" name="description" rows="3" placeholder="Deskripsi kategori">${c?.description || ''}</textarea>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" id="cancel-modal" class="btn-secondary">Batal</button>
              <button type="submit" class="btn-primary">${c ? 'Simpan' : 'Tambah'}</button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  async bindEvents() {
    await this.loadData()
    this.renderAndBind()
  }

  _bindListeners() {
    document.getElementById('add-category-btn')?.addEventListener('click', () => {
      this.editingCategory = null
      this.showModal = true
      this.renderAndBind()
    })

    document.querySelectorAll('.edit-category').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id
        this.editingCategory = this.categories.find(c => c.id === id) || null
        this.showModal = true
        this.renderAndBind()
      })
    })

    document.querySelectorAll('.delete-category').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id
        if (confirm('Hapus kategori ini?')) {
          await this.supabase.from('categories').delete().eq('id', id)
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
      this.editingCategory = null
      this.renderAndBind()
    })
    document.getElementById('cancel-modal')?.addEventListener('click', () => {
      this.showModal = false
      this.editingCategory = null
      this.renderAndBind()
    })
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.showModal = false
        this.editingCategory = null
        this.renderAndBind()
      }
    })

    const form = document.getElementById('category-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const formData = new FormData(form)
      const data = {
        name: formData.get('name'),
        description: formData.get('description')
      }

      if (this.editingCategory) {
        await this.supabase.from('categories').update(data).eq('id', this.editingCategory.id)
      } else {
        await this.supabase.from('categories').insert(data)
      }

      this.showModal = false
      this.editingCategory = null
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
