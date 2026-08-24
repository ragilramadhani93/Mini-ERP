-- Migration: Add sales_returns table for product return tracking
-- Date: 2024-08-02
--
-- Records each return transaction: which sale, which items, qty returned,
-- shipping cost, and total refund amount.

CREATE TABLE IF NOT EXISTS sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id),
  invoice_number TEXT NOT NULL,
  customer_name TEXT,
  return_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Each item: { product_id, product_name, unit_price, quantity, subtotal }
  total_product_amount BIGINT NOT NULL DEFAULT 0,
  shipping_cost BIGINT NOT NULL DEFAULT 0,
  total_refund BIGINT NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Sales returns readable by authenticated users"
  ON sales_returns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sales returns insertable by authenticated users"
  ON sales_returns FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_returns_sale_id ON sales_returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_created_at ON sales_returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_returns_customer ON sales_returns(customer_name);
