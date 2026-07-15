-- Migration: Create customer_deposits table and retroactively migrate overpaid sales to deposits
-- Date: 2024-07-15
-- 
-- This migration does two things:
-- 1. Ensures the customer_deposits table exists with proper schema and RLS
-- 2. Retroactively creates deposit entries for ALL existing overpaid sales
--    (sales with payment_details->>'is_overpaid' = 'true')

-- ============================================================
-- PART 1: Ensure customer_deposits table exists
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  amount BIGINT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE customer_deposits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts, then recreate
DROP POLICY IF EXISTS "Customer deposits readable by authenticated users" ON customer_deposits;
DROP POLICY IF EXISTS "Customer deposits insertable by authenticated users" ON customer_deposits;

-- RLS: All authenticated users can read all deposits
CREATE POLICY "Customer deposits readable by authenticated users"
  ON customer_deposits FOR SELECT
  TO authenticated
  USING (true);

-- RLS: All authenticated users can insert deposits
CREATE POLICY "Customer deposits insertable by authenticated users"
  ON customer_deposits FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_deposits_customer_name ON customer_deposits(customer_name);
CREATE INDEX IF NOT EXISTS idx_customer_deposits_reference ON customer_deposits(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_customer_deposits_created_at ON customer_deposits(created_at DESC);

-- ============================================================
-- PART 2: Retroactively migrate overpaid sales to deposits
-- ============================================================

-- This inserts a deposit entry for each completed sale where:
-- - payment_details->>'is_overpaid' = 'true'
-- - customer_name is not null/empty
-- - customer_name is not a generic/anonymous customer
-- - No existing deposit entry already exists for this sale (reference_type='sales')

DO $$
DECLARE
  v_count INTEGER := 0;
  v_skip INTEGER := 0;
  v_sale RECORD;
BEGIN
  RAISE NOTICE 'Starting retroactive migration of overpaid sales to deposits...';

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
      'Tambah deposit dari lebih bayar ' || v_sale.invoice_number || ' (migrasi data)',
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
  RAISE NOTICE 'Migrasi selesai! % deposit berhasil dibuat.', v_count;
  RAISE NOTICE '============================================';
END $$;

-- ============================================================
-- PART 3: Verification query (runs after migration)
-- ============================================================

-- Show summary of what was migrated
SELECT 
  'Ringkasan Migrasi Deposit' AS title,
  COUNT(*) AS total_deposit_dibuat,
  SUM(amount) AS total_nominal_deposit,
  COUNT(DISTINCT customer_name) AS jumlah_pelanggan
FROM customer_deposits
WHERE reference_type = 'sales'
  AND description LIKE '%migrasi data%';
