-- RESET SEMUA DATA: Penjualan, Stok, Keuangan, Aset
-- JALANKAN di Supabase Dashboard > SQL Editor

-- 1. Hapus penjualan & item
DELETE FROM split_payments;
DELETE FROM sale_items;
DELETE FROM sales;

-- 2. Hapus pembelian & item
DELETE FROM purchase_items;
DELETE FROM purchases;

-- 3. Hapus transaksi keuangan
DELETE FROM cash_transactions;

-- 4. Hapus pergerakan stok
DELETE FROM stock_movements;

-- 5. Hapus aset
DELETE FROM assets;

-- 6. Hapus hutang/piutang
DELETE FROM payables;

-- 7. Reset stok produk ke 0
UPDATE products SET current_stock = 0;

-- 8. Reset stok varian/SKU ke 0 (jika ada)
UPDATE product_skus SET current_stock = 0;

-- Verifikasi
SELECT
  (SELECT count(*) FROM products) AS products,
  (SELECT count(*) FROM sales) AS sales,
  (SELECT count(*) FROM cash_transactions) AS cash_tx,
  (SELECT count(*) FROM stock_movements) AS stock_moves,
  (SELECT sum(current_stock) FROM products) AS total_stok,
  (SELECT count(*) FROM product_skus) AS skus;
