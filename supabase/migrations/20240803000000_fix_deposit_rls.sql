-- Migration: Tighten RLS for customer_deposits and sales_returns
-- Date: 2024-08-03

DROP POLICY IF EXISTS "Customer deposits insertable by authenticated users" ON customer_deposits;

CREATE POLICY "Customer deposits insertable by admin/owner"
  ON customer_deposits FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('owner', 'admin'));

DROP POLICY IF EXISTS "Sales returns insertable by authenticated users" ON sales_returns;

CREATE POLICY "Sales returns insertable by admin/owner"
  ON sales_returns FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('owner', 'admin'));
