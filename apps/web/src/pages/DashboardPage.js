import { PremiumCard } from '../components/PremiumCard.js'
import { PremiumButton } from '../components/PremiumButton.js'
import { StatPremium, HeroKPI } from '../components/StatPremium.js'
import { BadgePremium } from '../components/BadgePremium.js'
import { SkeletonDashboard } from '../components/Skeleton.js'
import { toast } from '../components/ToastNotification.js'

export class DashboardPage {
  constructor({ supabase, auth }) {
    this.supabase = supabase;
    this.auth = auth;
    this.data = {};
    this.chartPeriod = 7;
  }

  async loadData() {
    try {
      const [salesRes, cashRes, productsRes, purchaseOrdersRes, stockMovementsRes, saleItemsRes] = await Promise.all([
        this.supabase.from('sales')
          .select('total_amount, created_at, invoice_number, customer_name, sale_items(quantity, unit_price, discount, products(name, cost_price))')
          .gte('created_at', this.getDateRange(30).toISOString()),
        this.supabase.from('cash_transactions')
          .select('type, amount, created_at, description, category'),
        this.supabase.from('products')
          .select('id, name, sku, current_stock, min_stock, cost_price, sell_price')
          .order('name'),
        this.supabase.from('purchases')
          .select('po_number, total_amount, status, created_at'),
        this.supabase.from('stock_movements')
          .select('product_id, quantity, type, reason, created_at, notes'),
        this.supabase.from('sale_items')
          .select('product_id, quantity, unit_price, discount, sale_id')
      ]);

      this.data = {
        sales: salesRes.data || [],
        cash: cashRes.data || [],
        products: productsRes.data || [],
        purchaseOrders: purchaseOrdersRes.data || [],
        stockMovements: stockMovementsRes.data || [],
        saleItems: saleItemsRes.data || []
      };
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data', 'Terjadi kesalahan saat memuat data dashboard. Silakan coba lagi.');
      this.data = { sales: [], cash: [], products: [], purchaseOrders: [], stockMovements: [], saleItems: [] };
    }
  }

  render() {
    const products = this.data.products || [];
    const sales = this.data.sales || [];
    const cash = this.data.cash || [];
    const purchaseOrders = this.data.purchaseOrders || [];

    const todayStr = new Date().toDateString();
    const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === todayStr);
    const todayCashIn = cash.filter(t => t.type === 'in' && new Date(t.created_at).toDateString() === todayStr);
    const todayCashOut = cash.filter(t => t.type === 'out' && new Date(t.created_at).toDateString() === todayStr);
    const lowStock = products.filter(p => p.current_stock <= p.min_stock);
    const todaySalesAmount = todaySales.reduce((s, sale) => s + (sale.total_amount || 0), 0);
    const todayIncome = todayCashIn.reduce((s, t) => s + t.amount, 0);
    const todayExpense = todayCashOut.reduce((s, t) => s + t.amount, 0);
    const todayProfit = todayIncome - todayExpense;

    const totalCashIn = cash.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
    const totalCashOut = cash.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
    const cashBalance = totalCashIn - totalCashOut;

    const yesterdaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date(Date.now() - 86400000).toDateString());
    const yesterdayAmount = yesterdaySales.reduce((s, sale) => s + (sale.total_amount || 0), 0);
    const omsetChange = yesterdayAmount > 0 ? ((todaySalesAmount - yesterdayAmount) / yesterdayAmount * 100) : 0;
    const totalOrder = todaySales.length;

    const userName = this.auth.profile?.full_name || 'Pengguna';
    const cuanTarget = 500000;
    const cuanProgress = todaySalesAmount > 0 ? Math.min((todaySalesAmount / cuanTarget) * 100, 100) : 0;

    const chartData = this.generateChartData(sales, this.chartPeriod);
    const topProducts = this.getTopProducts(sales, products);
    const recentActivities = this.getRecentActivities(sales, cash);
    const pendingPO = purchaseOrders.filter(po => po.status === 'approved' || po.status === 'pending');
    const expenseBreakdown = this.getExpenseBreakdown(cash);

    const profitMargin = todaySalesAmount > 0 ? Math.round((todayProfit / todaySalesAmount) * 100) : 0;

    return `
      <div class="dashboard-container">
        <!-- WELCOME SECTION -->
        <div class="dashboard-welcome">
          <div>
            <h1>Selamat datang, ${userName} <span style="font-size:20px">👋</span></h1>
            <p>Ringkasan bisnis toko Anda hari ini</p>
          </div>
          <div class="quick-actions-premium">
            ${PremiumButton({ variant: 'premium', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>', href: '#/sales' }, 'Penjualan')}
            ${PremiumButton({ variant: 'ghost', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>', href: '#/products' }, 'Produk')}
            ${PremiumButton({ variant: 'ghost', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>', href: '#/suppliers' }, 'Supplier')}
          </div>
        </div>

        <!-- HERO KPI ROW -->
        <div class="stats-grid" style="margin-bottom:24px">
          ${HeroKPI({
            label: 'Omset Hari Ini',
            value: `Rp ${this.formatNumber(todaySalesAmount)}`,
            subLabel: `Target Rp ${this.formatNumber(cuanTarget)} — ${Math.round(cuanProgress)}%`,
            progress: cuanProgress,
            icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>'
          })}

          ${StatPremium({
            accent: 'emerald',
            label: 'Profit Hari Ini',
            value: `Rp ${this.formatNumber(todayProfit)}`,
            trend: { text: `${profitMargin}% margin`, direction: todayProfit >= 0 ? 'up' : 'down' }
          })}

          ${StatPremium({
            accent: 'amber',
            label: 'Order Hari Ini',
            value: `${totalOrder}`,
            trend: { text: `${omsetChange >= 0 ? '+' : ''}${Math.round(omsetChange)}% dari kemarin`, direction: omsetChange >= 0 ? 'up' : 'down' }
          })}

          ${StatPremium({
            accent: 'gold',
            label: 'Saldo Kas',
            value: `Rp ${this.formatNumber(cashBalance)}`,
            trend: { text: 'Saldo bersih saat ini', direction: 'neutral' }
          })}
        </div>

        <!-- CHART + ALERTS -->
        <div class="data-grid-2">
          ${PremiumCard({ variant: 'accent', padding: '20px' }, `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
              <h3 style="font-size:15px;font-weight:600;color:var(--slate-900)">Tren Penjualan</h3>
              <div style="position:relative">
                ${PremiumButton({ variant: 'ghost', className: 'chart-filter-trigger', icon: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`, onClick: "event.stopPropagation();var d=document.getElementById('chart-filter-dropdown');if(d)d.style.display=d.style.display==='block'?'none':'block'" }, `${this.chartPeriod} Hari`)}
                <div id="chart-filter-dropdown" style="display:none;position:absolute;right:0;top:calc(100% + 4px);background:#fff;border:0.5px solid var(--slate-200);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.08);z-index:10;min-width:100px;overflow:hidden">
                  ${[7, 14, 30].map(d => `
                    <button data-days="${d}" class="chart-filter-option" style="display:block;width:100%;border:none;background:${this.chartPeriod === d ? 'var(--brand-maroon-subtle)' : 'transparent'};padding:8px 14px;font-size:12px;text-align:left;cursor:pointer;color:${this.chartPeriod === d ? 'var(--brand-maroon)' : 'var(--slate-600)'};font-weight:${this.chartPeriod === d ? '600' : '500'}">
                      ${d} Hari
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>
            <div style="height:220px">
              ${this.renderChart(chartData)}
            </div>
          `)}

          ${PremiumCard({ variant: 'accent', padding: '20px' }, `
            <h3 style="font-size:15px;font-weight:600;color:var(--slate-900);margin-bottom:16px">Alert Center</h3>
            ${lowStock.length > 0 ? `
              <div style="padding:14px;background:var(--amber-light);border:0.5px solid rgba(212,138,60,0.15);border-radius:12px;margin-bottom:10px;display:flex;align-items:center;gap:10px">
                <span style="font-size:18px">⚠️</span>
                <div>
                  <div style="font-weight:600;color:var(--amber);font-size:14px">${lowStock.length} Produk Hampir Habis</div>
                  <div style="font-size:12px;color:var(--slate-500);margin-top:2px">Segera lakukan restok</div>
                </div>
              </div>
            ` : ''}
            ${pendingPO.length > 0 ? `
              <div style="padding:14px;background:var(--brand-maroon-subtle);border:0.5px solid rgba(122,59,88,0.1);border-radius:12px;margin-bottom:10px;display:flex;align-items:center;gap:10px">
                <span style="font-size:18px">📦</span>
                <div>
                  <div style="font-weight:600;color:var(--brand-maroon);font-size:14px">${pendingPO.length} PO Menunggu</div>
                  <div style="font-size:12px;color:var(--slate-500);margin-top:2px">${pendingPO.filter(p => p.status === 'approved').length} siap diterima, ${pendingPO.filter(p => p.status === 'pending').length} menunggu approval</div>
                </div>
              </div>
            ` : ''}
            ${lowStock.length === 0 && pendingPO.length === 0 ? `
              <div style="padding:20px;text-align:center;color:var(--slate-400);font-size:14px">
                <div style="font-size:32px;margin-bottom:8px">✅</div>
                <div style="font-weight:500">Semua dalam kondisi baik</div>
                <div style="font-size:12px;margin-top:4px">Tidak ada yang perlu perhatian Anda</div>
              </div>
            ` : ''}
          `)}
        </div>

        <!-- TOP PRODUCTS + EXPENSES -->
        <div class="data-grid-2" style="margin-bottom:24px">
          ${PremiumCard({ variant: 'accent', padding: '20px' }, `
            <h3 style="font-size:15px;font-weight:600;color:var(--slate-900);margin-bottom:16px">Top Produk</h3>
            ${topProducts.length === 0 ? `
              <div class="empty-premium">
                <div class="empty-premium-icon">📦</div>
                <div class="empty-premium-title">Belum ada data</div>
                <div class="empty-premium-sub">Mulai mencatat penjualan untuk melihat top produk</div>
              </div>
            ` : topProducts.slice(0, 4).map((p, i) => `
              <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:0.5px solid var(--slate-100)">
                <div style="width:40px;height:40px;background:${i === 0 ? 'var(--gold-light)' : 'var(--silk)'};border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;color:${i === 0 ? 'var(--gold)' : 'var(--slate-400)'}">
                  ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📦'}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:14px;color:var(--slate-800)">${p.name}</div>
                  <div style="font-size:12px;color:var(--slate-400);margin-top:2px">${p.sold} terjual</div>
                </div>
                <span class="price-tag" style="font-size:14px">Rp ${this.formatNumber(p.revenue)}</span>
              </div>
            `).join('')}
          `)}

          ${PremiumCard({ variant: 'accent', padding: '20px' }, `
            <h3 style="font-size:15px;font-weight:600;color:var(--slate-900);margin-bottom:16px">Pengeluaran Terbesar</h3>
            ${expenseBreakdown.length === 0 ? `
              <div class="empty-premium">
                <div class="empty-premium-icon">📊</div>
                <div class="empty-premium-title">Belum ada pengeluaran</div>
                <div class="empty-premium-sub">Belum ada pengeluaran yang tercatat</div>
              </div>
            ` : expenseBreakdown.slice(0, 4).map((item, i) => {
              const colors = ['var(--coral)', 'var(--amber)', 'var(--gold)', 'var(--emerald)'];
              return `
                <div style="margin-bottom:14px">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <div style="display:flex;align-items:center;gap:6px">
                      <span style="width:6px;height:6px;border-radius:50%;background:${colors[i]};flex-shrink:0"></span>
                      <span style="font-size:13px;font-weight:500;color:var(--slate-700)">${item.label}</span>
                    </div>
                    <span style="font-size:13px;font-weight:600;color:var(--slate-800)">Rp ${this.formatNumber(item.total)}</span>
                  </div>
                  <div style="height:5px;background:var(--silk);border-radius:4px;overflow:hidden">
                    <div style="height:100%;width:${item.percentage}%;background:${colors[i]};border-radius:4px;transition:width 0.4s ease"></div>
                  </div>
                  <span style="font-size:10px;color:var(--slate-400);margin-top:2px;display:block">${item.percentage}% dari total pengeluaran</span>
                </div>
              `;
            }).join('')}
          `)}
        </div>

        <!-- AI FORECAST -->
        ${PremiumCard({ variant: 'gradient-warm', padding: '20px' }, `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
            <div style="width:28px;height:28px;background:var(--brand-maroon-subtle);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--brand-maroon);font-size:14px">✦</div>
            <h3 style="font-size:15px;font-weight:600;color:var(--slate-900)">AI Forecast</h3>
          </div>
          <div class="data-grid-3">
            <div style="background:rgba(255,255,255,0.7);border:0.5px solid rgba(0,0,0,0.04);border-radius:12px;padding:16px">
              <div style="font-size:12px;font-weight:500;color:var(--slate-400);margin-bottom:4px">Prediksi Omset</div>
              <div style="display:flex;align-items:baseline;gap:6px">
                <span style="font-size:20px;font-weight:700;color:var(--slate-900)">↑ 12%</span>
                <span style="font-size:12px;color:var(--emerald)">dari bulan lalu</span>
              </div>
            </div>
            <div style="background:rgba(255,255,255,0.7);border:0.5px solid rgba(0,0,0,0.04);border-radius:12px;padding:16px">
              <div style="font-size:12px;font-weight:500;color:var(--slate-400);margin-bottom:4px">Produk Restok</div>
              <div style="font-size:14px;font-weight:600;color:var(--slate-800)">${topProducts[0]?.name || 'Produk Populer'}</div>
              <div style="font-size:11px;color:var(--slate-400);margin-top:2px">Prioritas restok</div>
            </div>
            <div style="background:rgba(255,255,255,0.7);border:0.5px solid rgba(0,0,0,0.04);border-radius:12px;padding:16px">
              <div style="font-size:12px;font-weight:500;color:var(--slate-400);margin-bottom:4px">Produk Potensial</div>
              <div style="font-size:14px;font-weight:600;color:var(--slate-800)">${topProducts[1]?.name || 'Produk Terlaris'}</div>
              <div style="font-size:11px;color:var(--slate-400);margin-top:2px">Penjualan tertinggi</div>
            </div>
          </div>
        `)}

        <!-- ACTIVITY -->
        ${PremiumCard({ variant: 'accent', padding: '20px' }, `
          <h3 style="font-size:15px;font-weight:600;color:var(--slate-900);margin-bottom:16px">Aktivitas Terbaru</h3>
          ${recentActivities.length === 0 ? `
            <div class="empty-premium">
              <div class="empty-premium-icon">📋</div>
              <div class="empty-premium-title">Belum ada aktivitas</div>
              <div class="empty-premium-sub">Aktivitas akan muncul di sini</div>
            </div>
          ` : recentActivities.slice(0, 5).map(a => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:0.5px solid var(--slate-100)">
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:32px;height:32px;background:${a.amount.startsWith('+') ? 'var(--emerald-light)' : a.amount.startsWith('-') ? 'var(--coral-light)' : 'var(--silk)'};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px">
                  ${a.amount.startsWith('+') ? '📈' : a.amount.startsWith('-') ? '📉' : '📋'}
                </div>
                <span style="font-size:13px;color:var(--slate-600)">${a.text}</span>
              </div>
              <span style="font-size:13px;font-weight:600;color:${a.amount.startsWith('+') ? 'var(--emerald)' : a.amount.startsWith('-') ? 'var(--coral)' : 'var(--slate-800)'}">${a.amount}</span>
            </div>
          `).join('')}
        `)}
      </div>
    `;
  }

  generateChartData(sales, days = 7) {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      const daySales = sales.filter(s => new Date(s.created_at).toDateString() === date.toDateString());
      const total = daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      data.push({ date: dateStr, sales: total, dateRaw: date.toISOString() });
    }
    return data;
  }

  getExpenseBreakdown(cash) {
    const expenses = cash.filter(c => c.type === 'out');
    const byCategory = {};
    expenses.forEach(c => {
      const cat = c.category || 'lainnya';
      if (!byCategory[cat]) byCategory[cat] = 0;
      byCategory[cat] += c.amount;
    });
    const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
    if (total === 0) return [];
    const labels = {
      purchase: 'Pembelian Stok', operational: 'Operasional', salary: 'Gaji',
      advertising: 'Iklan', platform_fee: 'Biaya Platform', other_income: 'Lainnya',
      lainnya: 'Lainnya'
    };
    return Object.entries(byCategory)
      .map(([cat, amount]) => ({
        category: cat,
        label: labels[cat] || cat,
        total: amount,
        percentage: Math.round((amount / total) * 100)
      }))
      .sort((a, b) => b.total - a.total);
  }

  getTopProducts(sales, products) {
    const productSales = {};
    sales.forEach(sale => {
      const items = sale.sale_items || [];
      items.forEach(item => {
        const pid = item.product_id;
        if (!productSales[pid]) productSales[pid] = { revenue: 0, sold: 0 };
        productSales[pid].revenue += (item.unit_price * item.quantity) - (item.discount || 0);
        productSales[pid].sold += item.quantity;
      });
    });
    return products.map(p => ({
      ...p,
      revenue: productSales[p.id]?.revenue || 0,
      sold: productSales[p.id]?.sold || 0
    })).sort((a, b) => b.revenue - a.revenue);
  }

  getRecentActivities(sales, cash) {
    const activities = [];
    sales.forEach(s => {
      activities.push({
        text: `Penjualan ${s.customer_name || 'perorangan'}`,
        time: this.formatTimeAgo(s.created_at),
        amount: `Rp ${this.formatNumber(s.total_amount)}`,
        date: new Date(s.created_at)
      });
    });
    cash.forEach(c => {
      activities.push({
        text: c.description || (c.type === 'in' ? 'Pemasukan' : 'Pengeluaran'),
        time: this.formatTimeAgo(c.created_at),
        amount: `${c.type === 'in' ? '+' : '-'} Rp ${this.formatNumber(c.amount)}`,
        date: new Date(c.created_at)
      });
    });
    activities.sort((a, b) => b.date - a.date);
    return activities;
  }

  renderChart(data) {
    const rawMax = Math.max(...data.map(d => d.sales), 1);
    const niceMax = this.niceMax(rawMax);
    const ticks = 5;
    const tickValues = Array.from({ length: ticks + 1 }, (_, i) => (niceMax / ticks) * i);

    const w = 700, h = 220;
    const pad = { top: 20, bottom: 30, left: 50, right: 20 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const points = data.map((d, i) => ({
      x: pad.left + (i / Math.max(data.length - 1, 1)) * cw,
      y: pad.top + ch - (d.sales / niceMax) * ch,
      ...d
    }));

    const smoothPath = this.smoothCurve(points);
    const areaPath = smoothPath + ` L ${points[points.length - 1]?.x || pad.left} ${pad.top + ch} L ${points[0]?.x || pad.left} ${pad.top + ch} Z`;

    return `
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:100%" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#7A3B58" stop-opacity="0.15"/>
            <stop offset="1" stop-color="#7A3B58" stop-opacity="0.01"/>
          </linearGradient>
        </defs>
        <style>
          .chart-dot-group { cursor: pointer; }
          .chart-dot-group .chart-tip { opacity: 0; transition: opacity 0.15s ease; pointer-events: none; }
          .chart-dot-group:hover .chart-tip { opacity: 1; }
          .chart-dot-group:hover .dot-circle { r: 5; }
          .chart-dot-group:hover .dot-ring { r: 8; opacity: 1; }
        </style>
        ${tickValues.map(v => {
          const y = pad.top + ch - (v / niceMax) * ch;
          return `
            <line x1="${pad.left}" y1="${y}" x2="${w - pad.right}" y2="${y}" stroke="#f0eeeb" stroke-width="1"/>
            <text x="${pad.left - 6}" y="${y + 3.5}" text-anchor="end" style="font-size:10px;fill:var(--slate-300)">${this.formatAxis(v)}</text>
          `;
        }).join('')}
        <path d="${areaPath}" fill="url(#areaGrad)"/>
        <path d="${smoothPath}" fill="none" stroke="#7A3B58" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${points.map((p, i) => {
          const dateStr = new Date(data[i].dateRaw || Date.now() - (data.length - 1 - i) * 86400000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
          const tipW = 130, tipH = 42;
          let tipX = p.x - tipW / 2;
          if (tipX < pad.left) tipX = pad.left;
          if (tipX + tipW > w - pad.right) tipX = w - pad.right - tipW;
          return `
            <g class="chart-dot-group">
              <circle class="dot-ring" cx="${p.x}" cy="${p.y}" r="8" fill="white" stroke="#7A3B58" stroke-width="2" opacity="0"/>
              <circle class="dot-circle" cx="${p.x}" cy="${p.y}" r="3.5" fill="white" stroke="#7A3B58" stroke-width="2.5"/>
              <g class="chart-tip">
                <rect x="${tipX}" y="${p.y - tipH - 8}" width="${tipW}" height="${tipH}" rx="8" fill="white" stroke="var(--slate-200)" stroke-width="0.5" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.08))"/>
                <text x="${tipX + tipW / 2}" y="${p.y - tipH - 8 + 16}" text-anchor="middle" style="font-size:9px;fill:var(--slate-400)">${dateStr}</text>
                <text x="${tipX + tipW / 2}" y="${p.y - tipH - 8 + 33}" text-anchor="middle" style="font-size:11px;font-weight:700;fill:var(--slate-800)">Rp ${this.formatNumber(p.sales)}</text>
              </g>
            </g>
          `;
        }).join('')}
        ${points.map(p => `
          <text x="${p.x}" y="${pad.top + ch + 17}" text-anchor="middle" style="font-size:9px;fill:var(--slate-400)">${p.date}</text>
        `).join('')}
      </svg>
    `;
  }

  niceMax(val) {
    if (val <= 0) return 1000;
    const mag = Math.pow(10, Math.floor(Math.log10(val)));
    const res = val / mag;
    if (res <= 1.5) return mag * 1.5;
    if (res <= 2) return mag * 2;
    if (res <= 3) return mag * 3;
    if (res <= 5) return mag * 5;
    if (res <= 7.5) return mag * 7.5;
    return mag * 10;
  }

  formatAxis(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1).replace('.', ',') + 'jt';
    if (v >= 1000) return (v / 1000).toFixed(0) + 'rb';
    return v.toString();
  }

  smoothCurve(points) {
    if (points.length < 2) return '';
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const tension = 0.3;
      d += ` C ${p1.x + (p2.x - p0.x) * tension} ${p1.y + (p2.y - p0.y) * tension}, ${p2.x - (p3.x - p1.x) * tension} ${p2.y - (p3.y - p1.y) * tension}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  getDateRange(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  formatNumber(num) {
    return num ? num.toLocaleString('id-ID') : '0';
  }

  formatTimeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  async bindEvents() {
    const outlet = document.getElementById('router-outlet');
    if (outlet) {
      outlet.innerHTML = SkeletonDashboard();
    }
    await this.loadData();
    this.renderAndBind();
    if (window.lucide) window.lucide.createIcons();
  }

  renderAndBind() {
    const outlet = document.getElementById('router-outlet');
    if (outlet) outlet.innerHTML = this.render();
    if (window.lucide) window.lucide.createIcons();

    const dropdown = document.getElementById('chart-filter-dropdown');
    document.addEventListener('click', () => {
      if (dropdown) dropdown.style.display = 'none';
    });
    document.querySelectorAll('.chart-filter-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        this.chartPeriod = parseInt(opt.dataset.days);
        this.renderAndBind();
      });
    });
  }
}
