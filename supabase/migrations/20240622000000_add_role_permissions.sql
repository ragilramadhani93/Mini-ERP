-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  menu_path TEXT NOT NULL,
  can_view BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, menu_path)
);

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies: only owner can manage, all authenticated can read
CREATE POLICY "Owner can manage role_permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN roles ON roles.id = users.role_id
      WHERE users.id = auth.uid()
      AND roles.name = 'owner'
    )
  );

CREATE POLICY "All authenticated can read role_permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Insert default permissions matching hardcoded roles
DO $$
DECLARE
  v_owner_id UUID;
  v_admin_id UUID;
  v_gudang_id UUID;
  v_keuangan_id UUID;
BEGIN
  SELECT id INTO v_owner_id FROM roles WHERE name = 'owner';
  SELECT id INTO v_admin_id FROM roles WHERE name = 'admin';
  SELECT id INTO v_gudang_id FROM roles WHERE name = 'staff_gudang';
  SELECT id INTO v_keuangan_id FROM roles WHERE name = 'staff_keuangan';

  -- Owner: all menus
  INSERT INTO role_permissions (role_id, menu_path, can_view) VALUES
    (v_owner_id, '/', true),
    (v_owner_id, '/profile', true),
    (v_owner_id, '/products', true),
    (v_owner_id, '/stock', true),
    (v_owner_id, '/stock/opname', true),
    (v_owner_id, '/barcode', true),
    (v_owner_id, '/sales', true),
    (v_owner_id, '/shopee', true),
    (v_owner_id, '/purchase-orders', true),
    (v_owner_id, '/suppliers', true),
    (v_owner_id, '/analytics', true),
    (v_owner_id, '/forecasting', true),
    (v_owner_id, '/ai-assistant', true),
    (v_owner_id, '/import-export', true),
    (v_owner_id, '/finance', true),
    (v_owner_id, '/finance/expenses', true),
    (v_owner_id, '/debts', true),
    (v_owner_id, '/assets', true),
    (v_owner_id, '/settings', true),
    (v_owner_id, '/settings/roles', true)
  ON CONFLICT (role_id, menu_path) DO NOTHING;

  -- Admin: same as owner minus /settings/roles
  INSERT INTO role_permissions (role_id, menu_path, can_view) VALUES
    (v_admin_id, '/', true),
    (v_admin_id, '/profile', true),
    (v_admin_id, '/products', true),
    (v_admin_id, '/stock', true),
    (v_admin_id, '/stock/opname', true),
    (v_admin_id, '/barcode', true),
    (v_admin_id, '/sales', true),
    (v_admin_id, '/shopee', true),
    (v_admin_id, '/purchase-orders', true),
    (v_admin_id, '/suppliers', true),
    (v_admin_id, '/analytics', true),
    (v_admin_id, '/forecasting', true),
    (v_admin_id, '/ai-assistant', true),
    (v_admin_id, '/import-export', true),
    (v_admin_id, '/finance', true),
    (v_admin_id, '/finance/expenses', true),
    (v_admin_id, '/debts', true),
    (v_admin_id, '/assets', true),
    (v_admin_id, '/settings', true),
    (v_admin_id, '/settings/roles', false)
  ON CONFLICT (role_id, menu_path) DO NOTHING;

  -- Staff Gudang: inventory only
  INSERT INTO role_permissions (role_id, menu_path, can_view) VALUES
    (v_gudang_id, '/', true),
    (v_gudang_id, '/profile', true),
    (v_gudang_id, '/products', true),
    (v_gudang_id, '/stock', true),
    (v_gudang_id, '/stock/opname', true),
    (v_gudang_id, '/barcode', true)
  ON CONFLICT (role_id, menu_path) DO NOTHING;

  -- Staff Keuangan: finance only
  INSERT INTO role_permissions (role_id, menu_path, can_view) VALUES
    (v_keuangan_id, '/', true),
    (v_keuangan_id, '/profile', true),
    (v_keuangan_id, '/finance', true),
    (v_keuangan_id, '/finance/expenses', true),
    (v_keuangan_id, '/debts', true)
  ON CONFLICT (role_id, menu_path) DO NOTHING;
END $$;
