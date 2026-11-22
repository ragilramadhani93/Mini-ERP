-- Set semua stok produk dan SKU ke 100 unit
-- JALANKAN di Supabase Dashboard > SQL Editor
-- Jalankan SETELAH reset data

UPDATE products SET current_stock = 100;
UPDATE product_skus SET current_stock = 100;

-- Verifikasi
SELECT count(*) AS total_produk, sum(current_stock) AS total_stok FROM products;
