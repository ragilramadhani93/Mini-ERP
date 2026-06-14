-- Seed Data (Updated for Sprint 2)

-- 1. Roles
insert into roles (name, description) values
  ('owner', 'Pemilik bisnis, akses penuh ke semua fitur'),
  ('admin', 'Administrator, mengelola operasional harian'),
  ('staff_gudang', 'Staff gudang, mengelola stok dan produk'),
  ('staff_keuangan', 'Staff keuangan, mengelola transaksi keuangan')
on conflict (name) do nothing;

-- 2. Categories
insert into categories (name, description) values
  ('Makanan & Minuman', 'Produk makanan dan minuman'),
  ('Fashion', 'Pakaian, aksesoris fashion'),
  ('Elektronik', 'Barang elektronik dan aksesoris'),
  ('Kesehatan', 'Produk kesehatan dan kecantikan'),
  ('Rumah Tangga', 'Perlengkapan rumah tangga'),
  ('Otomotif', 'Aksesoris dan perlengkapan kendaraan'),
  ('Stationery', 'Alat tulis dan perlengkapan kantor'),
  ('Lainnya', 'Kategori lainnya')
on conflict (name) do nothing;

-- 3. Suppliers
insert into suppliers (supplier_name, contact_person, phone, email, address) values
  ('PT Sumber Makmur', 'Budi Santoso', '081234567890', 'budi@sumbermakmur.com', 'Jl. Industri Raya No. 45, Jakarta'),
  ('CV Berkah Jaya', 'Siti Rahmawati', '087654321098', 'siti@berkahjaya.com', 'Jl. Merdeka No. 12, Bandung'),
  ('UD Karya Mandiri', 'Ahmad Hidayat', '085612345678', 'ahmad@karyamandiri.com', 'Jl. A. Yani No. 78, Surabaya'),
  ('Toko Elektronik Central', 'Dewi Lestari', '082134567890', 'dewi@centralelektronik.com', 'Jl. Diponegoro No. 34, Semarang')
on conflict (supplier_name) do nothing;

-- 4. Sample Products
insert into products (sku, name, description, category_id, supplier_id, cost_price, sell_price, current_stock, min_stock) values
  ('PRD-001', 'Kopi Arabica 250gr', 'Kopi arabica premium sangrai', 
    (select id from categories where name = 'Makanan & Minuman'),
    (select id from suppliers where supplier_name = 'PT Sumber Makmur'), 35000, 55000, 120, 20),
  
  ('PRD-002', 'T-Shirt Cotton Premium', 'Kaos katun 30s',
    (select id from categories where name = 'Fashion'),
    (select id from suppliers where supplier_name = 'CV Berkah Jaya'), 45000, 85000, 80, 15),
  
  ('PRD-003', 'Mouse Wireless', 'Mouse wireless 2.4GHz',
    (select id from categories where name = 'Elektronik'),
    (select id from suppliers where supplier_name = 'Toko Elektronik Central'), 25000, 55000, 45, 10),
  
  ('PRD-004', 'Handbody 100ml', 'Handbody lotion moisturizer',
    (select id from categories where name = 'Kesehatan'),
    (select id from suppliers where supplier_name = 'UD Karya Mandiri'), 12000, 25000, 200, 30),
  
  ('PRD-005', 'Sabun Cuci Piring 450ml', 'Sabun cair cuci piring',
    (select id from categories where name = 'Rumah Tangga'),
    (select id from suppliers where supplier_name = 'UD Karya Mandiri'), 8000, 15000, 300, 50),
  
  ('PRD-006', 'Cable USB-C 1m', 'Kabel USB-C fast charging',
    (select id from categories where name = 'Elektronik'),
    (select id from suppliers where supplier_name = 'Toko Elektronik Central'), 10000, 25000, 5, 10),
  
  ('PRD-007', 'Buku Catatan A5', 'Buku catatan isi 100 lembar',
    (select id from categories where name = 'Stationery'),
    null, 5000, 12000, 150, 20),
  
  ('PRD-008', 'Kacamata Hitam', 'Kacamata hitam fashion pria/wanita',
    (select id from categories where name = 'Fashion'),
    (select id from suppliers where supplier_name = 'CV Berkah Jaya'), 15000, 35000, 60, 15)
on conflict (sku) do nothing;

-- 5. Initial Purchases
insert into purchases (po_number, supplier_id, total_amount, status, notes, created_by) values
  ('PO-2406-0001', (select id from suppliers where supplier_name = 'PT Sumber Makmur'), 3575000, 'received', 'Pembelian awal kopi dan teh', null),
  ('PO-2406-0002', (select id from suppliers where supplier_name = 'CV Berkah Jaya'), 2550000, 'received', 'Stok awal pakaian', null),
  ('PO-2406-0003', (select id from suppliers where supplier_name = 'Toko Elektronik Central'), 575000, 'received', 'Stok awal elektronik', null),
  ('PO-2406-0004', (select id from suppliers where supplier_name = 'UD Karya Mandiri'), 578000, 'received', 'Stok awal rumah tangga dan kesehatan', null)
on conflict (po_number) do nothing;

-- 6. Purchase Items
insert into purchase_items (purchase_id, product_id, quantity, unit_price) values
  ((select id from purchases where po_number = 'PO-2406-0001'), 
   (select id from products where sku = 'PRD-001'), 130, 35000),
  ((select id from purchases where po_number = 'PO-2406-0002'),
   (select id from products where sku = 'PRD-002'), 80, 45000),
  ((select id from purchases where po_number = 'PO-2406-0003'),
   (select id from products where sku = 'PRD-003'), 50, 25000),
  ((select id from purchases where po_number = 'PO-2406-0004'),
   (select id from products where sku = 'PRD-004'), 200, 12000),
  ((select id from purchases where po_number = 'PO-2406-0004'),
   (select id from products where sku = 'PRD-005'), 350, 8000),
  ((select id from purchases where po_number = 'PO-2406-0003'),
   (select id from products where sku = 'PRD-006'), 7, 10000);

-- 7. Initial Sales
insert into sales (invoice_number, customer_name, customer_phone, total_amount, payment_method, created_by) values
  ('INV-2406-0001', 'Rumah Tangga Bahagia', '081234567890', 225000, 'cash', null),
  ('INV-2406-0002', 'Toko Elektronik Jaya', '085234567890', 550000, 'bank_transfer', null),
  ('INV-2406-0003', 'Warung Makan Sederhana', '087234567890', 475000, 'cash', null),
  ('INV-2406-0004', 'Perorangan', '081234567891', 147500, 'cash', null)
on conflict (invoice_number) do nothing;

-- 8. Sale Items
insert into sale_items (sale_id, product_id, quantity, unit_price, discount) values
  ((select id from sales where invoice_number = 'INV-2406-0001'),
   (select id from products where sku = 'PRD-004'), 10, 25000, 0),
  ((select id from sales where invoice_number = 'INV-2406-0002'),
   (select id from products where sku = 'PRD-003'), 10, 55000, 0),
  ((select id from sales where invoice_number = 'INV-2406-0001'),
   (select id from products where sku = 'PRD-005'), 15, 15000, 0),
  ((select id from sales where invoice_number = 'INV-2406-0003'),
   (select id from products where sku = 'PRD-001'), 15, 55000, 25000),
  ((select id from sales where invoice_number = 'INV-2406-0004'),
   (select id from products where sku = 'PRD-002'), 5, 85000, 0);

-- 9. Cash Transactions (Initial)
insert into cash_transactions (type, category, amount, reference_type, reference_id, description, created_by) values
  ('in', 'sales', 285000, 'sales', (select id from sales where invoice_number = 'INV-2406-0001'), 'Penjualan ke Rumah Tangga Bahagia', null),
  ('in', 'sales', 550000, 'sales', (select id from sales where invoice_number = 'INV-2406-0002'), 'Penjualan ke Toko Elektronik Jaya', null),
  ('in', 'sales', 475000, 'sales', (select id from sales where invoice_number = 'INV-2406-0003'), 'Penjualan ke Warung Makan Sederhana', null),
  ('in', 'sales', 147500, 'sales', (select id from sales where invoice_number = 'INV-2406-0004'), 'Penjualan perorangan', null),
  ('out', 'purchase', 3575000, 'purchase', (select id from purchases where po_number = 'PO-2406-0001'), 'Pembelian dari PT Sumber Makmur', null),
  ('out', 'purchase', 2550000, 'purchase', (select id from purchases where po_number = 'PO-2406-0002'), 'Pembelian dari CV Berkah Jaya', null),
  ('out', 'purchase', 575000, 'purchase', (select id from purchases where po_number = 'PO-2406-0003'), 'Pembelian dari Toko Elektronik Central', null),
  ('out', 'purchase', 578000, 'purchase', (select id from purchases where po_number = 'PO-2406-0004'), 'Pembelian dari UD Karya Mandiri', null);
