/* ── SalesHelper ──
 * Stateless rendering helpers extracted from SalesPage
 * untuk modularitas dan reusability.
 */

export function formatNumber(num) {
  return num ? num.toLocaleString('id-ID') : '0'
}

export function getStatusLabel(status) {
  const labels = {
    completed: 'Lunas',
    pending: 'Belum Lunas',
    cancelled: 'Dibatalkan',
    overpaid: 'Lebih Bayar'
  }
  return labels[status] || status
}

export function getStatusColor(status) {
  const colors = {
    completed: 'var(--emerald)',
    pending: 'var(--amber)',
    cancelled: 'var(--coral)',
    overpaid: 'var(--gold)'
  }
  return colors[status] || 'var(--slate-400)'
}

export function renderBadge(status) {
  const variants = {
    completed: 'badge-lunas',
    pending: 'badge-belum',
    cancelled: 'badge-coral',
    overpaid: 'badge-gold'
  }
  const cls = variants[status] || 'badge-maroon'
  return `<span class="badge-premium ${cls}">${getStatusLabel(status)}</span>`
}

export function renderPaymentBadges(payments) {
  if (!payments || payments.length === 0) return '<span class="text-gray-400 text-xs">-</span>'
  return payments.map(p => {
    const color = p.payment_methods?.color || '#94a3b8'
    return `<span class="badge-premium" style="background:${color}15;color:${color};border-color:${color}30">${p.payment_methods?.name || p.payment_method}: Rp ${formatNumber(p.amount)}</span>`
  }).join(' ')
}

export function renderPaymentBadgeMini(paymentMethod) {
  const colorMap = {
    cash: 'var(--emerald)',
    qris: 'var(--brand-maroon)',
    bank_transfer: 'var(--gold)',
    credit_card: 'var(--coral)',
    debit_card: 'var(--amber)'
  }
  const color = colorMap[paymentMethod] || 'var(--slate-400)'
  return `<span class="badge-premium" style="background:${color}15;color:${color};border-color:${color}30;font-size:10px">${paymentMethod}</span>`
}

export function renderPaymentMethodsOptions(paymentMethods, selectedId) {
  if (!paymentMethods || paymentMethods.length === 0) {
    return '<option value="">Tidak ada metode pembayaran</option>'
  }
  return paymentMethods.map(pm => `
    <option value="${pm.id}" ${pm.id === selectedId ? 'selected' : ''} style="color:${pm.color || '#000'}">
      ${pm.name || pm.code}
    </option>
  `).join('')
}

export function statusFilterButtons(selectedStatus, handlers = {}) {
  const statuses = [
    { key: 'all', label: 'Semua' },
    { key: 'completed', label: 'Lunas' },
    { key: 'pending', label: 'Belum Lunas' },
    { key: 'overpaid', label: 'Lebih Bayar' },
    { key: 'cancelled', label: 'Dibatalkan' }
  ]
  return statuses.map(s => `
    <button class="status-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      selectedStatus === s.key
        ? 'bg-brand-maroon text-white shadow-sm'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }" data-status="${s.key}">
      ${s.label}
    </button>
  `).join('')
}

export function calcTotal(rows, key = 'total_amount') {
  return rows.reduce((sum, r) => sum + (parseInt(r[key]) || 0), 0)
}

export function calcProfit(items) {
  if (!items) return 0
  return items.reduce((sum, item) => {
    const revenue = (item.unit_price || 0) * (item.quantity || 1)
    const cost = (item.products?.cost_price || 0) * (item.quantity || 1)
    return sum + revenue - cost - (item.discount || 0)
  }, 0)
}
