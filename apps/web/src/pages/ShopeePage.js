export class ShopeePage {
  constructor({ supabase, auth, router }) {
    this.supabase = supabase
    this.auth = auth
    this.router = router
    this.importedData = []
    this.fileType = 'csv' // 'csv' or 'excel'
  }

  async loadData() {
    // No data needed initially
  }

  parseCSV(csvText) {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return []
    
    const headers = lines[0].split(',').map(h => h.trim())
    const data = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length === headers.length) {
        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index]
        })
        data.push(row)
      }
    }
    
    return data
  }

  async parseXLS(file) {
    try {
      // Import xlsx library dynamically
      const XLSX = await import('xlsx')
      
      // Read the Excel file
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      
      // Get the first sheet
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      if (jsonData.length < 2) return []
      
      // Get headers from first row
      const headers = jsonData[0].map(h => h ? h.toString().trim() : '')
      const dataRows = []
      
      // Process each row
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (!row || row.length === 0) continue
        
        const rowObj = {}
        headers.forEach((header, index) => {
          if (header && index < row.length) {
            rowObj[header] = row[index] !== undefined ? row[index].toString().trim() : ''
          }
        })
        
        // Only add row if it has data
        if (Object.keys(rowObj).length > 0) {
          dataRows.push(rowObj)
        }
      }
      
      return dataRows
    } catch (error) {
      console.error('Error parsing Excel file:', error)
      throw new Error(`Gagal membaca file Excel: ${error.message}`)
    }
  }

  mapShopeeToDatabase(row) {
    // Mapping kolom Shopee ke format database
    const mapping = {
      // Invoice dan customer
      'No. Pesanan': 'invoice_number',
      'Nama Produk': 'product_name',
      
      // Marketplace
      'Marketplace': 'marketplace',
      
      // Financial
      'Total Pembayaran': 'total_amount',
      'Potongan Koin Shopee': 'platform_fee_coin',
      'Diskon Dari Shopee': 'platform_fee_discount',
      'Voucher Ditanggung Shopee': 'platform_fee_voucher',
      'Ongkos Kirim Dibayar oleh Pembeli': 'shipping_fee',
      
      // Payment
      'Metode Pembayaran': 'payment_method',
      'Waktu Pembayaran Dilakukan': 'payment_date',
      
      // Product details
      'SKU Induk': 'parent_sku',
      'Nomor Referensi SKU': 'sku_reference',
      'Nama Variasi': 'variant_name',
      'Harga Awal': 'original_price',
      'Harga Setelah Diskon': 'discounted_price',
      'Jumlah': 'quantity',
      'Subtotal Pesanan': 'subtotal',
      
      // Notes
      'Catatan dari Pembeli': 'customer_notes'
    }
    
    const mappedRow = {}
    
    // Apply mapping
    Object.keys(mapping).forEach(shopeeKey => {
      const dbKey = mapping[shopeeKey]
      if (row[shopeeKey] !== undefined) {
        mappedRow[dbKey] = row[shopeeKey]
      }
    })
    
    // Calculate total platform fee
    const platformFeeCoin = parseInt(mappedRow.platform_fee_coin || 0)
    const platformFeeDiscount = parseInt(mappedRow.platform_fee_discount || 0)
    const platformFeeVoucher = parseInt(mappedRow.platform_fee_voucher || 0)
    mappedRow.platform_fee = platformFeeCoin + platformFeeDiscount + platformFeeVoucher
    
    // Set defaults
    if (!mappedRow.invoice_number) {
      mappedRow.invoice_number = `SHOPEE-${Date.now()}-${Math.floor(Math.random()*1000)}`
    }
    
    if (!mappedRow.customer_name) {
      mappedRow.customer_name = 'Shopee Customer'
    }
    
    if (!mappedRow.marketplace) {
      mappedRow.marketplace = 'shopee'
    }
    
    // Calculate total received
    const totalAmount = parseInt(mappedRow.total_amount || 0)
    const platformFee = parseInt(mappedRow.platform_fee || 0)
    mappedRow.total_received = totalAmount - platformFee
    
    return mappedRow
  }

  async saveImportedSales(salesData) {
    let successCount = 0
    let errorCount = 0
    
    for (const row of salesData) {
      try {
        // Map data based on file type
        let mappedRow
        if (this.fileType === 'excel') {
          mappedRow = this.mapShopeeToDatabase(row)
        } else {
          // CSV format
          mappedRow = {
            invoice_number: row['No Invoice'] || `IMP-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            customer_name: row['Nama Pelanggan'] || 'Marketplace Customer',
            total_amount: parseInt(row['Total'] || 0),
            payment_method: row['Metode Pembayaran'] || 'bank_transfer',
            marketplace: row['Marketplace'] || 'shopee',
            platform_fee: parseInt(row['Potongan Platform'] || 0),
            total_received: parseInt(row['Total'] || 0) - parseInt(row['Potongan Platform'] || 0)
          }
        }
        
        // Create sale record
        const { data: sale, error: saleError } = await this.supabase
          .from('sales')
          .insert({
            invoice_number: mappedRow.invoice_number,
            customer_name: mappedRow.customer_name,
            total_amount: mappedRow.total_amount,
            payment_method: mappedRow.payment_method,
            marketplace: mappedRow.marketplace,
            platform_fee: mappedRow.platform_fee,
            total_received: mappedRow.total_received,
            notes: mappedRow.customer_notes || '',
            created_by: this.auth.user?.id
          })
          .select()
          .single()
        
        if (saleError) {
          console.error('Error saving sale:', saleError)
          errorCount++
          continue
        }
        
        // Add product to sale_items if product info exists
        if (mappedRow.product_name || mappedRow.parent_sku) {
          await this.supabase.from('sale_items').insert({
            sale_id: sale.id,
            product_id: null, // Will be linked later if product exists
            product_name: mappedRow.product_name || 'Shopee Product',
            quantity: parseInt(mappedRow.quantity || 1),
            unit_price: parseInt(mappedRow.discounted_price || mappedRow.original_price || mappedRow.total_amount || 0),
            subtotal: parseInt(mappedRow.subtotal || mappedRow.total_amount || 0),
            notes: mappedRow.variant_name || ''
          })
        }
        
        // If there's payment info, add cash transactions
        if (mappedRow.payment_method !== 'credit') {
          // Add income
          await this.supabase.from('cash_transactions').insert({
            type: 'in',
            category: 'sales',
            amount: mappedRow.total_received,
            description: `Penjualan ${mappedRow.marketplace} - ${sale.invoice_number}`,
            reference_type: 'sales',
            reference_id: sale.id,
            created_by: this.auth.user?.id
          })
          
          // Add platform fee as expense if applicable
          if (mappedRow.platform_fee > 0) {
            await this.supabase.from('cash_transactions').insert({
              type: 'out',
              category: 'platform_fee',
              amount: mappedRow.platform_fee,
              description: `Potongan platform ${mappedRow.marketplace} - ${sale.invoice_number}`,
              reference_type: 'sales',
              reference_id: sale.id,
              created_by: this.auth.user?.id
            })
          }
        }
        
        successCount++
        
      } catch (err) {
        console.error('Error importing row:', err)
        errorCount++
      }
    }
    
    alert(`Import selesai!\nBerhasil: ${successCount} baris\nGagal: ${errorCount} baris`)
    this.importedData = []
    this.fileType = 'csv'
    this.renderAndBind()
  }

  render() {
    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Import Penjualan Marketplace</h1>
            <p class="text-gray-600 mt-1">Import data penjualan dari file CSV sementara menunggu API key Shopee</p>
          </div>
        </div>

        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Import File Penjualan Marketplace</h3>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Tipe File</label>
            <div class="flex gap-4">
              <label class="inline-flex items-center">
                <input type="radio" name="fileType" value="csv" checked class="form-radio text-blue-600">
                <span class="ml-2">CSV (Format Sederhana)</span>
              </label>
              <label class="inline-flex items-center">
                <input type="radio" name="fileType" value="excel" class="form-radio text-blue-600">
                <span class="ml-2">Excel (Format Shopee)</span>
              </label>
            </div>
          </div>

          <div id="csvFormat" class="mb-4">
            <p class="text-sm text-gray-600 mb-2">Format CSV yang diharapkan:</p>
            <div class="bg-gray-100 p-4 rounded-lg mb-4 font-mono text-sm">
              <p>No Invoice,Nama Pelanggan,Marketplace,Total,Potongan Platform,Metode Pembayaran</p>
              <p>INV-001,Andi,shopee,300000,30000,bank_transfer</p>
            </div>
          </div>

          <div id="excelFormat" class="mb-4 hidden">
            <p class="text-sm text-gray-600 mb-2">Format Excel Shopee yang didukung:</p>
            <div class="bg-gray-100 p-4 rounded-lg mb-4 font-mono text-sm text-xs">
              <p>No. Pesanan, Status Pesanan, Nama Produk, Total Pembayaran, Potongan Koin Shopee, Diskon Dari Shopee, Voucher Ditanggung Shopee, Metode Pembayaran, dll.</p>
              <p class="mt-2">File harus memiliki header sesuai format ekspor Shopee.</p>
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Pilih File</label>
            <input type="file" id="fileInput" accept=".csv,.xls,.xlsx" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
          </div>

          <div class="flex gap-4">
            <button id="previewBtn" class="btn-secondary">Preview Data</button>
            <button id="importBtn" class="btn-primary" disabled>Import ke Database</button>
          </div>
        </div>

        ${this.importedData.length > 0 ? `
          <div class="card">
            <h3 class="text-lg font-semibold mb-4">Preview Data Import (${this.importedData.length} baris)</h3>
            
            ${this.fileType === 'excel' ? `
              <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 class="font-medium text-blue-800 mb-1">Mapping Kolom Shopee</h4>
                <p class="text-sm text-blue-700">
                  Kolom dari file Shopee akan dipetakan otomatis ke format database.
                  Contoh mapping: "No. Pesanan" → invoice_number, "Total Pembayaran" → total_amount
                </p>
              </div>
            ` : ''}
            
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    ${Object.keys(this.importedData[0]).map(header => `
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${header}</th>
                    `).join('')}
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  ${this.importedData.slice(0, 10).map(row => `
                    <tr>
                      ${Object.values(row).map(value => `
                        <td class="px-4 py-2 text-sm text-gray-900">${value}</td>
                      `).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ${this.importedData.length > 10 ? `<p class="text-sm text-gray-500 mt-2">... dan ${this.importedData.length - 10} baris lainnya</p>` : ''}
            
            <div class="mt-4 pt-4 border-t border-gray-200">
              <p class="text-sm text-gray-600">
                Data akan disimpan dengan informasi berikut:
                ${this.fileType === 'excel' ? `
                  <ul class="list-disc pl-5 mt-1 text-xs">
                    <li>Invoice: dari kolom "No. Pesanan"</li>
                    <li>Total: dari kolom "Total Pembayaran"</li>
                    <li>Platform fee: dari "Potongan Koin Shopee" + "Diskon Dari Shopee" + "Voucher Ditanggung Shopee"</li>
                    <li>Marketplace: "shopee"</li>
                  </ul>
                ` : `
                  <ul class="list-disc pl-5 mt-1 text-xs">
                    <li>Invoice: dari kolom "No Invoice"</li>
                    <li>Total: dari kolom "Total"</li>
                    <li>Platform fee: dari kolom "Potongan Platform"</li>
                    <li>Marketplace: dari kolom "Marketplace"</li>
                  </ul>
                `}
              </p>
            </div>
          </div>
        ` : ''}
      </div>
    `
  }

  _bindListeners() {
    let selectedFile = null
    let parsedData = []

    // Toggle format display based on file type
    document.querySelectorAll('input[name="fileType"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const fileType = e.target.value
        this.fileType = fileType
        
        if (fileType === 'csv') {
          document.getElementById('csvFormat').classList.remove('hidden')
          document.getElementById('excelFormat').classList.add('hidden')
        } else {
          document.getElementById('csvFormat').classList.add('hidden')
          document.getElementById('excelFormat').classList.remove('hidden')
        }
      })
    })

    // File input handler
    document.getElementById('fileInput').addEventListener('change', (e) => {
      selectedFile = e.target.files[0]
    })

    // Preview button handler
    document.getElementById('previewBtn').addEventListener('click', async () => {
      if (!selectedFile) {
        alert('Pilih file terlebih dahulu!')
        return
      }

      try {
        const fileType = document.querySelector('input[name="fileType"]:checked').value
        
        if (fileType === 'csv') {
          // Read CSV file
          const fileContent = await selectedFile.text()
          parsedData = this.parseCSV(fileContent)
        } else {
          // Read Excel file
          parsedData = await this.parseXLS(selectedFile)
          
          // Show mapping info
          if (parsedData.length > 0) {
            const sampleRow = parsedData[0]
            const mappedRow = this.mapShopeeToDatabase(sampleRow)
            
            console.log('Sample row mapping:', {
              original: Object.keys(sampleRow).slice(0, 5),
              mapped: Object.keys(mappedRow)
            })
          }
        }

        if (parsedData.length === 0) {
          alert('File kosong atau format salah!')
          return
        }

        this.importedData = parsedData
        this.fileType = fileType
        document.getElementById('importBtn').disabled = false
        
        // Show success message
        alert(`Berhasil membaca ${parsedData.length} baris data dari file ${selectedFile.name}`)
        
        this.renderAndBind()
      } catch (error) {
        console.error('Error reading file:', error)
        alert(`Error membaca file: ${error.message}`)
      }
    })

    // Import button handler
    document.getElementById('importBtn').addEventListener('click', async () => {
      if (parsedData.length === 0) {
        alert('Tidak ada data untuk diimport!')
        return
      }
      
      if (confirm(`Anda yakin ingin mengimport ${parsedData.length} baris data dari ${selectedFile.name}?`)) {
        await this.saveImportedSales(parsedData)
      }
    })
  }

  async bindEvents() {
    await this.loadData()
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
