export class AIAssistantPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.loading = true
    this.insights = []
    this.lastUpdated = null
    this.useGroqAI = import.meta.env.VITE_USE_GROQ_AI === 'true'
    this.groqApiKey = import.meta.env.VITE_GROQ_API_KEY
    this.groqModel = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile'
  }

  async loadData() {
    this.loading = true
    const days = 60
    const since = new Date()
    since.setDate(since.getDate() - days)

    const [productsRes, salesRes, saleItemsRes, stocksRes, financeRes] = await Promise.all([
      this.supabase.from('products').select('*'),
      this.supabase.from('sales').select('total_amount, created_at').gte('created_at', since.toISOString()),
      this.supabase.from('sale_items').select('quantity, unit_price, discount, product_id, sales!inner(created_at), products(name, sku, cost_price, sell_price, current_stock, min_stock)').gte('sales.created_at', since.toISOString()),
      this.supabase.from('stock_movements').select('type, reason, created_at').gte('created_at', since.toISOString()),
      this.supabase.from('cash_transactions').select('type, amount, category').gte('created_at', since.toISOString())
    ])

    const products = productsRes.data || []
    const sales = salesRes.data || []
    const saleItems = saleItemsRes.data || []
    const stocks = stocksRes.data || []
    const finances = financeRes.data || []

    this.lastUpdated = new Date()

    if (this.useGroqAI && this.groqApiKey) {
      // Gunakan Groq AI untuk analisis
      this.insights = await this.getAIInsights(products, sales, saleItems, stocks, finances, days)
    } else {
      // Fallback ke rule-based (default)
      this.insights = this.getRuleBasedInsights(products, sales, saleItems, stocks, finances, days)
    }

    this.loading = false
  }

  async getAIInsights(products, sales, saleItems, stocks, finances, days) {
    try {
      // Siapkan data untuk AI
      const businessData = this.prepareBusinessData(products, sales, saleItems, stocks, finances, days)
      
      const prompt = this.buildAIPrompt(businessData)
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqApiKey}`
        },
        body: JSON.stringify({
          model: this.groqModel,
          messages: [
            {
              role: 'system',
              content: 'Anda adalah Business Analyst Expert untuk toko online. Berikan analisis dalam format JSON dengan struktur: { "insights": [ { "type": "success|warning|danger|info", "title": "judul singkat", "message": "analisis detail", "action": { "label": "text link", "link": "#/path" } } ] }. Gunakan bahasa Indonesia. Maks 7 insight. JANGAN MENAMBAHKAN TEKS LAIN SELAIN JSON.'
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2048,
          temperature: 0.7,
          top_p: 0.9
        })
      })

      if (!response.ok) throw new Error('Gagal menghubungi AI')
      
      const result = await response.json()
      const aiMessage = result.choices[0]?.message?.content || '{}'
      
      // Parse JSON dari AI
      const jsonMatch = aiMessage.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return parsed.insights || this.getRuleBasedInsights(products, sales, saleItems, stocks, finances, days)
      }
      
    } catch (error) {
      console.error('AI Error:', error)
    }
    
    // Fallback ke rule-based jika AI gagal
    return this.getRuleBasedInsights(products, sales, saleItems, stocks, finances, days)
  }

  prepareBusinessData(products, sales, saleItems, stocks, finances, days) {
    // Hitung ringkasan data
    const productSales = {}
    saleItems.forEach(item => {
      const pid = item.product_id
      if (!productSales[pid]) productSales[pid] = { ...item.products, qty: 0, revenue: 0 }
      productSales[pid].qty += item.quantity
      productSales[pid].revenue += (item.unit_price * item.quantity) - item.discount
    })

    const income = finances.filter(f => f.type === 'in').reduce((s, f) => s + f.amount, 0)
    const expense = finances.filter(f => f.type === 'out').reduce((s, f) => s + f.amount, 0)
    const totalSales = sales.reduce((s, sale) => s + (sale.total_amount || 0), 0)

    return {
      days,
      totalProducts: products.length,
      totalSales,
      totalTransactions: sales.length,
      income,
      expense,
      profit: income - expense,
      products: products.slice(0, 20).map(p => ({
        name: p.name,
        sku: p.sku,
        current_stock: p.current_stock,
        min_stock: p.min_stock,
        cost_price: p.cost_price,
        sell_price: p.sell_price,
        sold_qty: productSales[p.id]?.qty || 0,
        revenue: productSales[p.id]?.revenue || 0
      })),
      stockMovements: { in: stocks.filter(s => s.type === 'in').length, out: stocks.filter(s => s.type === 'out').length }
    }
  }

  buildAIPrompt(data) {
    return `Analisis data toko online berikut (${data.days} hari terakhir):

📊 RINGKASAN BISNIS:
- Total Produk: ${data.totalProducts}
- Total Penjualan: Rp ${this.fmt(data.totalSales)}
- Total Transaksi: ${data.totalTransactions}
- Pemasukan: Rp ${this.fmt(data.income)}
- Pengeluaran: Rp ${this.fmt(data.expense)}
- Profit: Rp ${this.fmt(data.profit)}
- Stok Masuk: ${data.stockMovements.in}x
- Stok Keluar: ${data.stockMovements.out}x

📦 DATA PRODUK (TOP 20):
${data.products.map(p => `- ${p.name} | Stok: ${p.current_stock}/${p.min_stock} | Terjual: ${p.sold_qty} | Harga Jual: Rp ${this.fmt(p.sell_price)}`).join('\n')}

Berikan 5-7 insight bisnis paling penting!`
  }

  getRuleBasedInsights(products, sales, saleItems, stocks, finances, days) {
    const insights = []
    
    // === Insight 1: Produk paling laris ===
    const productSales = {}
    saleItems.forEach(item => {
      const pid = item.product_id
      if (!productSales[pid]) productSales[pid] = { ...item.products, qty: 0, revenue: 0 }
      productSales[pid].qty += item.quantity
      productSales[pid].revenue += (item.unit_price * item.quantity) - item.discount
    })

    const sortedBySales = Object.values(productSales).sort((a, b) => b.qty - a.qty)
    if (sortedBySales.length > 0) {
      const top = sortedBySales[0]
      const avgDaily = Math.round((top.qty / days) * 10) / 10
      const daysLeft = avgDaily > 0 ? Math.floor(top.current_stock / avgDaily) : '∞'
      insights.push({
        type: 'success',
        icon: 'trophy',
        title: '🏆 Produk Terlaris',
        message: `"${top.name}" adalah produk terlaris dengan ${top.qty} terjual dalam ${days} hari (rata-rata ${avgDaily}/hari). Stok saat ini ${top.current_stock}. ${daysLeft !== '∞' && daysLeft <= 14 ? `⚠️ Estimasi habis dalam ${daysLeft} hari, segera restock!` : daysLeft !== '∞' ? `Estimasi habis dalam ${daysLeft} hari.` : 'Stok mencukupi untuk saat ini.'}`,
        action: { label: 'Lihat Produk', link: '#/products' }
      })
    }

    // === Insight 2: Produk slow moving ===
    const sortedAsc = Object.values(productSales).sort((a, b) => a.qty - b.qty)
    const slowProducts = sortedAsc.filter(p => p.qty <= 2 && p.current_stock > 0)
    if (slowProducts.length > 0) {
      const topSlow = slowProducts[0]
      const totalValue = topSlow.current_stock * topSlow.cost_price
      insights.push({
        type: 'warning',
        icon: 'sleep',
        title: '🐌 Produk Slow Moving',
        message: `"${topSlow.name}" hanya terjual ${topSlow.qty} dalam ${days} hari dengan stok ${topSlow.current_stock} (nilai Rp ${this.fmt(totalValue)}). Pertimbangkan diskon atau bundling untuk mengurangi stok mati.`,
        action: { label: 'Atur Diskon', link: '#/products' }
      })
    }

    // === Insight 3: Rekomendasi restock ===
    const needsRestock = products.filter(p => p.current_stock <= p.min_stock)
    if (needsRestock.length > 0) {
      const urgencyMap = { high: [], medium: [], low: [] }
      needsRestock.forEach(p => {
        const sold = productSales[p.id]?.qty || 0
        const avg = sold > 0 ? sold / days : 0
        const daysLeft = avg > 0 ? Math.floor(p.current_stock / avg) : 0
        if (daysLeft <= 3 || p.current_stock <= 0) urgencyMap.high.push(p)
        else if (daysLeft <= 7) urgencyMap.medium.push(p)
        else urgencyMap.low.push(p)
      })

      if (urgencyMap.high.length > 0) {
        const total = urgencyMap.high.reduce((s, p) => s + (p.sell_price * (p.min_stock - p.current_stock)), 0)
        insights.push({
          type: 'danger',
          icon: 'alert-triangle',
          title: '🚨 Restock Mendesak!',
          message: `${urgencyMap.high.length} produk dengan stok kritis (habis dalam ≤3 hari): ${urgencyMap.high.map(p => `"${p.name}"`).join(', ')}. Estimasi kebutuhan dana: Rp ${this.fmt(total)}.`,
          action: { label: 'Buat PO', link: '#/purchase-orders' }
        })
      }
    }

    // === Insight 4: Analisa cash flow ===
    const income = finances.filter(f => f.type === 'in').reduce((s, f) => s + f.amount, 0)
    const expense = finances.filter(f => f.type === 'out').reduce((s, f) => s + f.amount, 0)
    const profit = income - expense
    if (income > 0 || expense > 0) {
      let msg = ''
      if (profit > 0) msg = `Periode ini profit Rp ${this.fmt(profit)} dari total pemasukan Rp ${this.fmt(income)} dan pengeluaran Rp ${this.fmt(expense)}. Margin ${income > 0 ? ((profit / income) * 100).toFixed(1) : 0}%. Bisnis dalam kondisi sehat.`
      else if (profit === 0) msg = `Periode ini impas (break even). Pemasukan Rp ${this.fmt(income)} sama dengan pengeluaran.`
      else msg = `Perhatian! Periode ini rugi Rp ${this.fmt(Math.abs(profit))}. Pemasukan Rp ${this.fmt(income)}, pengeluaran Rp ${this.fmt(expense)}. Evaluasi pengeluaran dan tingkatkan penjualan.`
      insights.push({
        type: profit >= 0 ? 'success' : 'danger',
        icon: 'trending-up',
        title: profit >= 0 ? '📈 Analisa Cash Flow' : '📉 Analisa Cash Flow',
        message: msg,
        action: { label: 'Buka Keuangan', link: '#/finance' }
      })
    }

    // === Insight 5: Ringkasan penjualan ===
    const totalSales = sales.reduce((s, sale) => s + (sale.total_amount || 0), 0)
    const avgPerDay = sales.length > 0 ? Math.round(totalSales / days) : 0
    insights.push({
      type: 'info',
      icon: 'bar-chart-3',
      title: '📊 Ringkasan Bisnis',
      message: `Dalam ${days} hari terakhir: ${sales.length} transaksi penjualan dengan total Rp ${this.fmt(totalSales)} (rata-rata Rp ${this.fmt(avgPerDay)}/hari). ${stocks.filter(s => s.type === 'in').length} kali stok masuk, ${stocks.filter(s => s.type === 'out').length} kali stok keluar.`,
      action: { label: 'Dashboard', link: '#/' }
    })

    return insights
  }

  fmt(num) { return num ? num.toLocaleString('id-ID') : '0' }

  render() {
    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <i data-lucide="bot" class="w-6 h-6 text-primary-600"></i>
              AI Business Assistant
              ${this.useGroqAI ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">AI Active (Groq)</span>' : '<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Demo Mode</span>'}
            </h2>
            <p class="text-sm text-gray-500">Analisa cerdas untuk bisnis Anda ${this.lastUpdated ? `• Diperbarui ${this.lastUpdated.toLocaleTimeString('id-ID')}` : ''}</p>
          </div>
          <div class="flex gap-2">
            <button id="toggle-ai-mode" class="btn-outline text-sm">
              <i data-lucide="settings" class="w-4 h-4"></i> ${this.useGroqAI ? 'Nonaktifkan AI' : 'Aktifkan AI'}
            </button>
            <button id="refresh-ai" class="btn-primary text-sm">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i> Refresh Analisa
            </button>
          </div>
        </div>

        ${this.loading ? `
          <div class="card p-12 text-center">
            <i data-lucide="bot" class="w-16 h-16 text-primary-300 mx-auto mb-4 animate-pulse"></i>
            <p class="text-gray-500">${this.useGroqAI ? 'Groq AI sedang menganalisa data bisnis...' : 'Menyiapkan analisa...'}</p>
            <div class="mt-4 flex justify-center gap-1">
              ${[1,2,3].map(i => `<div class="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style="animation-delay: ${i * 0.15}s"></div>`).join('')}
            </div>
          </div>
        ` : `
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            ${this.insights.map(insight => this.renderInsightCard(insight)).join('')}
          </div>
        `}
        
        ${!this.useGroqAI ? `
          <div class="card p-4 bg-blue-50 border border-blue-200">
            <div class="flex items-start gap-3">
              <i data-lucide="lightbulb" class="w-5 h-5 text-blue-600 mt-0.5"></i>
              <div>
                <h4 class="font-semibold text-blue-900">Ingin AI Sungguhan?</h4>
                <p class="text-sm text-blue-800 mt-1">Set API Key Groq di file .env dan ubah VITE_USE_GROQ_AI=true untuk menggunakan AI analisis sesungguhan.</p>
                <ol class="text-sm text-blue-800 mt-2 list-decimal list-inside space-y-1">
                  <li>Dapatkan API key di <a href="https://console.groq.com/" target="_blank" class="underline font-medium">console.groq.com</a></li>
                  <li>Update file <code class="bg-white px-1.5 py-0.5 rounded">src/.env</code></li>
                  <li>Restart dev server</li>
                </ol>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `
  }

  renderInsightCard(insight) {
    const colors = {
      success: 'border-l-success-500 bg-success-50/30',
      warning: 'border-l-warning-500 bg-warning-50/30',
      danger: 'border-l-danger-500 bg-danger-50/30',
      info: 'border-l-primary-500 bg-primary-50/30'
    }

    return `
      <div class="card p-5 border-l-4 ${colors[insight.type] || colors.info}">
        <div class="flex items-start gap-3">
          <div class="mt-0.5 text-xl">${insight.title.split(' ')[0]}</div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-sm mb-2">${insight.title}</h3>
            <p class="text-sm text-gray-600 leading-relaxed">${insight.message}</p>
            ${insight.action ? `
              <a href="${insight.action.link}" class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 mt-3">
                ${insight.action.label}
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `
  }

  async bindEvents() {
    await this.loadData()
    this.renderAndBind()
  }

  _bindListeners() {
    document.getElementById('refresh-ai')?.addEventListener('click', async () => {
      this.loading = true
      this.renderAndBind()
      await this.loadData()
      this.renderAndBind()
      if (window.lucide) window.lucide.createIcons()
    })

    document.getElementById('toggle-ai-mode')?.addEventListener('click', () => {
      alert(`Untuk mengaktifkan/menonaktifkan Groq AI:\n\n1. Update src/.env:\n   VITE_USE_GROQ_AI=true/false\n2. Restart dev server`)
    })
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet')
    if (outlet) { outlet.innerHTML = this.render() }
    this._bindListeners()
    if (window.lucide) window.lucide.createIcons()
  }
}