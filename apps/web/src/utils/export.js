import jsPDF from 'jspdf'
import 'jspdf-autotable'

export class Exporter {
  static formatNumber(num) {
    return num ? num.toLocaleString('id-ID') : '0'
  }

  static toRupiah(num) {
    return `Rp ${this.formatNumber(num)}`
  }

  static downloadCSV(filename, headers, rows) {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  static downloadPDF(title, headers, rows, filename) {
    const doc = new jsPDF('landscape', 'mm', 'a4')
    doc.setFontSize(16)
    doc.text(title, 14, 20)
    doc.setFontSize(9)
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 28)

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    })

    doc.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  static exportProducts(products) {
    const headers = ['SKU', 'Nama Produk', 'Kategori', 'Supplier', 'Harga Modal', 'Harga Jual', 'Stok', 'Min Stok']
    const rows = products.map(p => [
      p.sku, p.name, p.categories?.name || '', p.suppliers?.supplier_name || '',
      this.toRupiah(p.cost_price), this.toRupiah(p.sell_price), p.current_stock, p.min_stock
    ])
    return { headers, rows, title: 'Daftar Produk', filename: 'produk' }
  }

  static exportSales(sales) {
    const headers = ['Invoice', 'Tanggal', 'Pelanggan', 'Total', 'Pembayaran']
    const rows = sales.map(s => [
      s.invoice_number,
      new Date(s.created_at).toLocaleDateString('id-ID'),
      s.customer_name || '-',
      this.toRupiah(s.total_amount),
      s.payment_method === 'cash' ? 'Tunai' : s.payment_method === 'credit' ? 'Kredit' : 'Transfer'
    ])
    return { headers, rows, title: 'Data Penjualan', filename: 'penjualan' }
  }

  static exportStockMovements(movements) {
    const headers = ['Tanggal', 'Produk', 'SKU', 'Tipe', 'Alasan', 'Qty', 'Keterangan']
    const rows = movements.map(m => [
      new Date(m.created_at).toLocaleDateString('id-ID'),
      m.products?.name || '-', m.products?.sku || '-',
      m.type === 'in' ? 'Masuk' : 'Keluar',
      m.reason, String(m.quantity), m.notes || ''
    ])
    return { headers, rows, title: 'Pergerakan Stok', filename: 'pergerakan-stok' }
  }

  static exportFinance(transactions) {
    const headers = ['Tanggal', 'Tipe', 'Kategori', 'Deskripsi', 'Jumlah']
    const rows = transactions.map(t => [
      new Date(t.created_at).toLocaleDateString('id-ID'),
      t.type === 'in' ? 'Pemasukan' : 'Pengeluaran',
      t.category, t.description, this.toRupiah(t.amount)
    ])
    return { headers, rows, title: 'Transaksi Keuangan', filename: 'keuangan' }
  }
}