
-- Migration: Add Shopee Integration
-- 1. Shopee Accounts Table
create table if not exists shopee_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  shop_id bigint not null,
  shop_name text not null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, shop_id)
);

-- 2. Shopee Products Mapping Table
create table if not exists shopee_products (
  id uuid primary key default gen_random_uuid(),
  shopee_account_id uuid references shopee_accounts(id) not null,
  shopee_item_id bigint not null,
  shopee_model_id bigint,
  product_id uuid references products(id),
  sku text,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (shopee_account_id, shopee_item_id, shopee_model_id)
);

-- 3. Shopee Orders Table
create table if not exists shopee_orders (
  id uuid primary key default gen_random_uuid(),
  shopee_account_id uuid references shopee_accounts(id) not null,
  shopee_order_sn text not null,
  order_id uuid references sales(id),
  order_status text not null,
  total_amount bigint not null,
  buyer_username text,
  shipping_carrier text,
  tracking_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (shopee_account_id, shopee_order_sn)
);

-- RLS Policies
alter table shopee_accounts enable row level security;
alter table shopee_products enable row level security;
alter table shopee_orders enable row level security;

create policy "Users can view their own Shopee accounts"
  on shopee_accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own Shopee accounts"
  on shopee_accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own Shopee accounts"
  on shopee_accounts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own Shopee accounts"
  on shopee_accounts for delete
  using (auth.uid() = user_id);

create policy "Users can view their own Shopee products"
  on shopee_products for select
  using (exists (
    select 1 from shopee_accounts
    where shopee_accounts.id = shopee_products.shopee_account_id
    and shopee_accounts.user_id = auth.uid()
  ));

create policy "Users can modify their own Shopee products"
  on shopee_products for all
  using (exists (
    select 1 from shopee_accounts
    where shopee_accounts.id = shopee_products.shopee_account_id
    and shopee_accounts.user_id = auth.uid()
  ));

create policy "Users can view their own Shopee orders"
  on shopee_orders for select
  using (exists (
    select 1 from shopee_accounts
    where shopee_accounts.id = shopee_orders.shopee_account_id
    and shopee_accounts.user_id = auth.uid()
  ));

create policy "Users can modify their own Shopee orders"
  on shopee_orders for all
  using (exists (
    select 1 from shopee_accounts
    where shopee_accounts.id = shopee_orders.shopee_account_id
    and shopee_accounts.user_id = auth.uid()
  ));

-- Indexes
create index idx_shopee_accounts_user on shopee_accounts(user_id);
create index idx_shopee_products_account on shopee_products(shopee_account_id);
create index idx_shopee_orders_account on shopee_orders(shopee_account_id);
