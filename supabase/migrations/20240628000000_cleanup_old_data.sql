-- Cleanup data lama: penjualan, aset, pembelian
-- Products (SKUs) dan current_stock TIDAK dihapus/diubah

-- 1. Hapus cash_transactions terkait sales, purchases, assets, platform_fee
DELETE FROM cash_transactions
WHERE category IN ('sales', 'purchase', 'platform_fee', 'asset_purchase')
   OR reference_type IN ('sales', 'purchases', 'assets');

-- 2. Hapus stock_movements terkait sales dan purchases
DELETE FROM stock_movements
WHERE reason IN ('sale', 'purchase')
   OR reference_type IN ('sales', 'purchases');

-- 3. Hapus sales (cascade ke sale_items & split_payments)
DELETE FROM split_payments;
DELETE FROM sale_items;
DELETE FROM sales;

-- 4. Hapus purchases (cascade ke purchase_items)
DELETE FROM purchase_items;
DELETE FROM purchases;

-- 5. Hapus assets
DELETE FROM assets;

-- JANGAN hapus/update current_stock di products!

-- 6. Verifikasi
SELECT
  (SELECT count(*) FROM products) AS products_kept,
  (SELECT count(*) FROM sales) AS sales_remaining,
  (SELECT count(*) FROM purchases) AS purchases_remaining,
  (SELECT count(*) FROM assets) AS assets_remaining,
  (SELECT count(*) FROM cash_transactions WHERE category IN ('sales','purchase','platform_fee','asset_purchase')) AS cash_tx_remaining;
