-- Migration: Backfill missing deposits for overpaid sales
-- Date: 2024-08-01
--
-- Latar belakang:
--   Tombol "Tutup (Lunas)" dan "Tandai lunas" di SalesPage.js sebelumnya TIDAK
--   membuat entri customer_deposits untuk penjualan yang lebih bayar, sehingga
--   kelebihan bayar hilang begitu saja (tidak tercatat sebagai deposit).
--   Fix di frontend sudah menutup jalur tersebut untuk transaksi baru.
--
--   Migrasi ini melakukan backfill untuk data yang terlanjur terlewat:
--   - sale berstatus 'completed'
--   - payment_details->>'is_overpaid' = 'true'
--   - overpaid_amount > 0
--   - customer_name terisi dan bukan pelanggan umum/anonymous
--   - BELUM ada entri customer_deposits dengan reference_type='sales'
--     untuk sale tersebut (guard idempotensi, aman dijalankan ulang)
--
-- Aman dijalankan berulang kali (idempotent) karena ada guard NOT EXISTS.

DO $$
DECLARE
  v_count INTEGER := 0;
  v_sale RECORD;
BEGIN
  RAISE NOTICE 'Backfill deposit lebih bayar: mulai...';

  FOR v_sale IN
    SELECT
      s.id,
      s.invoice_number,
      s.customer_name,
      (s.payment_details->>'overpaid_amount')::BIGINT AS overpaid_amount,
      s.created_at,
      s.created_by
    FROM sales s
    WHERE s.status = 'completed'
      AND s.payment_details->>'is_overpaid' = 'true'
      AND (s.payment_details->>'overpaid_amount') IS NOT NULL
      AND (s.payment_details->>'overpaid_amount')::BIGINT > 0
      AND s.customer_name IS NOT NULL
      AND s.customer_name != ''
      AND s.customer_name NOT IN ('Perorangan', 'Pelanggan Umum', '-')
      AND LOWER(s.customer_name) NOT LIKE '%umum%'
      AND NOT EXISTS (
        SELECT 1 FROM customer_deposits cd
        WHERE cd.reference_type = 'sales'
          AND cd.reference_id = s.id
      )
  LOOP
    INSERT INTO customer_deposits (
      customer_name,
      amount,
      reference_type,
      reference_id,
      description,
      created_by,
      created_at
    ) VALUES (
      v_sale.customer_name,
      v_sale.overpaid_amount,
      'sales',
      v_sale.id,
      'Tambah deposit dari lebih bayar ' || v_sale.invoice_number || ' (backfill data)',
      v_sale.created_by,
      v_sale.created_at
    );

    v_count := v_count + 1;

    RAISE NOTICE '  ✅ Deposit Rp % untuk % dari %',
      v_sale.overpaid_amount,
      v_sale.customer_name,
      v_sale.invoice_number;
  END LOOP;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'Backfill selesai! % deposit berhasil dibuat.', v_count;
  RAISE NOTICE '============================================';
END $$;

-- ============================================================
-- Verification query (runs after backfill)
-- ============================================================

-- Ringkasan deposit yang baru dibuat oleh migrasi ini
SELECT
  'Ringkasan Backfill Deposit' AS title,
  COUNT(*) AS total_deposit_dibuat,
  SUM(amount) AS total_nominal_deposit,
  COUNT(DISTINCT customer_name) AS jumlah_pelanggan
FROM customer_deposits
WHERE reference_type = 'sales'
  AND description LIKE '%backfill data%';

-- Audit: sale completed yang lebih bayar tapi MASIH belum punya deposit
-- (diharapkan hasilnya kosong setelah backfill)
SELECT
  s.invoice_number,
  s.customer_name,
  (s.payment_details->>'overpaid_amount')::BIGINT AS overpaid_amount,
  s.status
FROM sales s
WHERE s.status = 'completed'
  AND s.payment_details->>'is_overpaid' = 'true'
  AND (s.payment_details->>'overpaid_amount')::BIGINT > 0
  AND s.customer_name IS NOT NULL
  AND s.customer_name NOT IN ('Perorangan', 'Pelanggan Umum', '-')
  AND LOWER(s.customer_name) NOT LIKE '%umum%'
  AND NOT EXISTS (
    SELECT 1 FROM customer_deposits cd
    WHERE cd.reference_type = 'sales'
      AND cd.reference_id = s.id
  );
