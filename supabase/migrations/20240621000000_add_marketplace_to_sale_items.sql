-- Add marketplace column to sale_items for per-item marketplace tracking
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS marketplace TEXT;

-- Update existing sale_items with marketplace from their parent sale
UPDATE sale_items si
SET marketplace = s.marketplace
FROM sales s
WHERE si.sale_id = s.id AND s.marketplace IS NOT NULL;

-- Index for marketplace filtering
CREATE INDEX IF NOT EXISTS idx_sale_items_marketplace ON sale_items(marketplace);
