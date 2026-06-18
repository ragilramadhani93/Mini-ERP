-- === CLEANUP SEED DATA LAMA ===
-- Jalankan di Supabase Dashboard → SQL Editor
-- Hapus data transaksi seed dan reset stok produk

BEGIN;

-- Hapus data transaksi (urutannya penting untuk hindari FK error)
DELETE FROM split_payments;
DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM purchase_items;
DELETE FROM purchases;
DELETE FROM cash_transactions;
DELETE FROM stock_movements;
DELETE FROM stock_opname;
-- Reset stok produk ke 0
UPDATE products SET current_stock = 0;

COMMIT;

-- Cek hasil
SELECT 'Data seed berhasil dibersihkan!' as result;
