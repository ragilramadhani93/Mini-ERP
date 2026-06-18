-- Seed Data (Hanya struktur, tanpa data transaksi lama)

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

-- 4. Sample Products (current_stock diisi 0, biar user input stok real sendiri)
insert into products (sku, name, description, category_id, supplier_id, cost_price, sell_price, current_stock, min_stock) values
  ('PRD-001', 'Kopi Arabica 250gr', 'Kopi arabica premium sangrai', 
    (select id from categories where name = 'Makanan & Minuman'),
    (select id from suppliers where supplier_name = 'PT Sumber Makmur'), 35000, 55000, 0, 20),
  ('PRD-002', 'T-Shirt Cotton Premium', 'Kaos katun 30s',
    (select id from categories where name = 'Fashion'),
    (select id from suppliers where supplier_name = 'CV Berkah Jaya'), 45000, 85000, 0, 15),
  ('PRD-003', 'Mouse Wireless', 'Mouse wireless 2.4GHz',
    (select id from categories where name = 'Elektronik'),
    (select id from suppliers where supplier_name = 'Toko Elektronik Central'), 25000, 55000, 0, 10),
  ('PRD-004', 'Handbody 100ml', 'Handbody lotion moisturizer',
    (select id from categories where name = 'Kesehatan'),
    (select id from suppliers where supplier_name = 'UD Karya Mandiri'), 12000, 25000, 0, 30),
  ('PRD-005', 'Sabun Cuci Piring 450ml', 'Sabun cair cuci piring',
    (select id from categories where name = 'Rumah Tangga'),
    (select id from suppliers where supplier_name = 'UD Karya Mandiri'), 8000, 15000, 0, 50),
  ('PRD-006', 'Cable USB-C 1m', 'Kabel USB-C fast charging',
    (select id from categories where name = 'Elektronik'),
    (select id from suppliers where supplier_name = 'Toko Elektronik Central'), 10000, 25000, 0, 10),
  ('PRD-007', 'Buku Catatan A5', 'Buku catatan isi 100 lembar',
    (select id from categories where name = 'Stationery'),
    null, 5000, 12000, 0, 20),
  ('PRD-008', 'Kacamata Hitam', 'Kacamata hitam fashion pria/wanita',
    (select id from categories where name = 'Fashion'),
    (select id from suppliers where supplier_name = 'CV Berkah Jaya'), 15000, 35000, 0, 15)
on conflict (sku) do nothing;