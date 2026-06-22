-- Create assets table
-- Add asset_purchase to transaction_category enum
ALTER TYPE transaction_category ADD VALUE IF NOT EXISTS 'asset_purchase';

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('peralatan', 'kendaraan', 'bangunan', 'inventaris', 'elektronik', 'digital', 'lainnya')),
  acquisition_value BIGINT NOT NULL DEFAULT 0,
  acquisition_date DATE NOT NULL,
  location TEXT,
  condition TEXT DEFAULT 'good' CHECK (condition IN ('good', 'minor_damage', 'heavy_damage')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'written_off')),
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Assets readable by all authenticated users"
  ON assets FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Assets writable by owner and admin"
  ON assets FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('owner', 'admin'))
  );

CREATE POLICY "Assets updatable by owner and admin"
  ON assets FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('owner', 'admin'))
  );

CREATE POLICY "Assets deletable by owner and admin"
  ON assets FOR DELETE USING (
    EXISTS (SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('owner', 'admin'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);
