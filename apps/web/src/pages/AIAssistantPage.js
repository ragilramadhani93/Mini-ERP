export class AIAssistantPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase
    this.auth = auth
    this.loading = true
    this.insights = []
    this.lastUpdated = null
    this.error = null
    this.useGroqAI = import.meta.env.VITE_USE_GROQ_AI === 'true' && !!import.meta.env.VITE_GROQ_API_KEY
    this.groqApiKey = import.meta.env.VITE_GROQ_API_KEY || ''
    this.groqModel = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile'
  }

  async loadData() {
    this.loading = true
    this.error = null
    const days = 60
    const since = new Date()
    since.setDate(since.getDate() - days)

    try {
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

      console.log('📊 Data loaded:', { products: products.length, sales: sales.length })

      if (this.useGroqAI && this.groqApiKey) {
        console.log('🤖 Using Groq AI...')
        this.insights = await this.getAIInsights(products, sales, saleItems, stocks, finances, days)
      } else {
        console.log('📋 Using rule-based insights...')
        this.insights = this.getRuleBasedInsights(products, sales, saleItems, stocks, finances, days)
      }
    } catch (err) {
      console.error('❌ Load data error:', err)
      this.error = err.message
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
        title: 'Produk Terlaris',
        message: `"${top.name}" adalah produk terlaris dengan ${top.qty} terjual dalam ${days} hari (rata-rata ${avgDaily}/hari). Stok saat ini ${top.current_stock}. ${daysLeft !== '∞' && daysLeft <= 14 ? `Estimasi habis dalam ${daysLeft} hari, segera restock!` : daysLeft !== '∞' ? `Estimasi habis dalam ${daysLeft} hari.` : 'Stok mencukupi untuk saat ini.'}`,
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
        icon: 'clock',
        title: 'Produk Slow Moving',
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
          title: 'Restock Mendesak',
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
        title: profit >= 0 ? 'Analisa Cash Flow (Surplus)' : 'Analisa Cash Flow (Defisit)',
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
      title: 'Ringkasan Bisnis',
      message: `Dalam ${days} hari terakhir: ${sales.length} transaksi penjualan dengan total Rp ${this.fmt(totalSales)} (rata-rata Rp ${this.fmt(avgPerDay)}/hari). ${stocks.filter(s => s.type === 'in').length} kali stok masuk, ${stocks.filter(s => s.type === 'out').length} kali stok keluar.`,
      action: { label: 'Dashboard', link: '#/' }
    })

    return insights
  }

  fmt(num) { return num ? num.toLocaleString('id-ID') : '0' }

  render() {
    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <i data-lucide="bot" class="w-6 h-6 text-primary-600"></i>
              AI Business Assistant
              ${this.useGroqAI ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">AI Active (Groq)</span>' : '<span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Rule-Based</span>'}
            </h2>
            <p class="text-sm text-gray-500">Analisa cerdas untuk bisnis Anda ${this.lastUpdated ? `• Diperbarui ${this.lastUpdated.toLocaleTimeString('id-ID')}` : ''}</p>
            <p class="text-xs text-gray-500 mt-1 flex items-center gap-3">
              ${this.useGroqAI ? `<span class="inline-flex items-center gap-1 text-emerald-600 font-medium"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> AI aktif (${this.groqModel})</span>` : '<span class="inline-flex items-center gap-1 text-stone-500"><i data-lucide="info" class="w-3.5 h-3.5"></i> Mode analitik rule-based</span>'}
              ${this.groqApiKey ? '<span class="inline-flex items-center gap-1 text-emerald-600 font-medium"><i data-lucide="key" class="w-3.5 h-3.5"></i> API Key terhubung</span>' : '<span class="inline-flex items-center gap-1 text-stone-400"><i data-lucide="shield" class="w-3.5 h-3.5"></i> Model lokal</span>'}
            </p>
          </div>
          <div class="flex gap-2">
            <button id="refresh-ai" class="btn-primary text-sm">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i> Refresh Analisa
            </button>
          </div>
        </div>

        ${this.error ? `
          <div class="card p-4 bg-red-50 border border-red-200">
            <div class="flex items-start gap-3">
              <i data-lucide="alert-circle" class="w-5 h-5 text-red-600 mt-0.5"></i>
              <div>
                <h4 class="font-semibold text-red-900">Error!</h4>
                <p class="text-sm text-red-800 mt-1">${this.error}</p>
              </div>
            </div>
          </div>
        ` : ''}

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

      </div>
    `
  }

  renderInsightCard(insight) {
    const iconConfig = {
      success: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-l-emerald-600', icon: 'trophy' },
      warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-l-amber-600', icon: 'alert-circle' },
      danger: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-l-rose-600', icon: 'alert-triangle' },
      info: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-l-sky-600', icon: 'bar-chart-3' }
    }
    const conf = iconConfig[insight.type] || iconConfig.info
    const cleanTitle = insight.title.replace(/^[^\w\s]+\s*/, '')

    return `
      <div class="card p-5 border-l-4 ${conf.border} border-stone-200/80 bg-white">
        <div class="flex items-start gap-3.5">
          <div class="w-9 h-9 rounded-xl ${conf.bg} ${conf.text} flex items-center justify-center flex-shrink-0 mt-0.5">
            <i data-lucide="${insight.icon || conf.icon}" class="w-4.5 h-4.5"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-sm text-stone-900 mb-1">${cleanTitle}</h3>
            <p class="text-xs text-stone-600 leading-relaxed">${insight.message}</p>
            ${insight.action ? `
              <a href="${insight.action.link}" class="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 mt-3">
                ${insight.action.label}
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
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