
# Panduan Instalasi Integrasi Shopee

## Langkah 1: Daftar di Shopee Open Platform

1. Buka [Shopee Open Platform](https://open.shopee.co.id/)
2. Daftarkan akun dan buat aplikasi baru
3. Dapatkan:
   - `Partner ID` (App ID)
   - `Partner Key` (App Secret)
4. Atur Redirect URI di Shopee Open Platform ke: `https://your-app-url.com/shopee/callback`

## Langkah 2: Konfigurasi Supabase

### 2.1: Jalankan Migration Database

```bash
npm run db:migrate
```

### 2.2: Deploy Edge Functions

```bash
cd supabase
supabase functions deploy shopee-auth
```

### 2.3: Atur Environment Variables di Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Buka menu **Settings > Environment Variables**
4. Tambahkan variabel berikut:
   - `SHOPEE_APP_ID`: Partner ID dari Shopee Open Platform
   - `SHOPEE_APP_SECRET`: Partner Key dari Shopee Open Platform
   - `SHOPEE_REDIRECT_URI`: Redirect URI yang telah diatur

## Langkah 3: Konfigurasi Aplikasi Frontend

Perbarui file `.env` di direktori `apps/web` dengan:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Langkah 4: Jalankan Aplikasi

```bash
npm run dev
```

## Fitur Integrasi Shopee

- ✅ Menghubungkan toko Shopee
- 🔄 Sinkronisasi produk
- 📦 Menarik pesanan dari Shopee
- 💰 Otomatis mencatat potongan platform fee
