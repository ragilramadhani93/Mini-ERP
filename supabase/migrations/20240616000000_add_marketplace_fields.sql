
-- Migration: Add marketplace and platform fee support
alter table sales add column if not exists marketplace text check (marketplace in ('shopee', 'tiktok', 'tokopedia', 'lazada', 'offline'));
alter table sales add column if not exists platform_fee bigint default 0;
alter table sales add column if not exists total_received bigint default 0;

-- Add new transaction categories for marketplace fees
alter type transaction_category add value if not exists 'platform_fee';
