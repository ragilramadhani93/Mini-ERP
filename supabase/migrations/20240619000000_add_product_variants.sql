-- Migration 019: Product Variants
-- Adds product_variants (definition) and product_skus (variant stock/SKU)

-- 1. Variant definitions per product
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  name text not null,
  values jsonb not null default '[]',
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- 2. Variant SKUs (one row per variant combination)
create table if not exists product_skus (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  sku text not null unique,
  variant_values jsonb not null default '{}',
  cost_price bigint,
  sell_price bigint,
  current_stock integer default 0,
  min_stock integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_product_variants_product on product_variants(product_id);
create index index_product_variants_product_id on product_variants(product_id);
create index idx_product_skus_product on product_skus(product_id);
create index idx_product_skus_sku on product_skus(sku);

-- Trigger for updated_at
create trigger update_product_skus_updated_at
  before update on product_skus
  for each row execute function update_updated_at();

-- RLS
alter table product_variants enable row level security;
alter table product_skus enable row level security;

create policy "Authenticated read product_variants"
  on product_variants for select using (auth.role() = 'authenticated');

create policy "Owner/admin manage product_variants"
  on product_variants for all using (get_user_role() in ('owner', 'admin'));

create policy "Authenticated read product_skus"
  on product_skus for select using (auth.role() = 'authenticated');

create policy "Owner/admin manage product_skus"
  on product_skus for all using (get_user_role() in ('owner', 'admin'));

-- Function to sync product total stock from product_skus
create or replace function sync_product_stock_from_skus()
returns trigger
language plpgsql
as $$
begin
  update products
  set current_stock = coalesce((
    select sum(ps.current_stock)
    from product_skus ps
    where ps.product_id = coalesce(NEW.product_id, OLD.product_id)
  ), 0)
  where id = coalesce(NEW.product_id, OLD.product_id);
  return null;
end;
$$;

create trigger trigger_sync_product_stock_from_skus
  after insert or update or delete on product_skus
  for each row execute function sync_product_stock_from_skus();

-- 3. Add sku_id to sale_items for variant tracking
alter table sale_items add column if not exists sku_id uuid references product_skus(id) on delete set null;

create index if not exists idx_sale_items_sku on sale_items(sku_id);
