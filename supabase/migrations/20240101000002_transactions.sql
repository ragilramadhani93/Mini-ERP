-- Migration 003: Transactions (Purchases, Sales, Cash)

-- 1. Purchases table
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_id uuid references suppliers(id),
  total_amount bigint default 0,
  status text default 'pending' check (status in ('pending', 'approved', 'received', 'cancelled')),
  notes text,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Purchase items table
create table if not exists purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references purchases(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer not null,
  unit_price bigint not null,
  total_price bigint generated always as (quantity * unit_price) stored
);

-- 3. Sales table
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_name text,
  customer_phone text,
  total_amount bigint default 0,
  payment_method text check (payment_method in ('cash', 'credit', 'bank_transfer')),
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- 4. Sale items table
create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references sales(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer not null,
  unit_price bigint not null,
  discount bigint default 0,
  total_price bigint generated always as ((quantity * unit_price) - discount) stored
);

-- 5. Cash transactions
create type transaction_type as enum ('in', 'out');
create type transaction_category as enum (
  'sales', 'purchase', 'operational', 'salary', 'advertising',
  'other_income', 'other_expense', 'refund', 'adjustment'
);

create table if not exists cash_transactions (
  id uuid primary key default gen_random_uuid(),
  type transaction_type not null,
  category transaction_category not null,
  amount bigint not null,
  reference_type text,
  reference_id uuid,
  description text not null,
  date timestamptz default now(),
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- 6. Payable and receivable
create type due_type as enum ('supplier', 'customer');

create table if not exists payables (
  id uuid primary key default gen_random_uuid(),
  due_type due_type not null,
  due_id uuid not null,
  reference_type text,
  reference_id uuid,
  amount bigint not null,
  description text,
  due_date timestamptz not null,
  status text default 'pending' check (status in ('pending', 'partial', 'paid')),
  paid_amount bigint default 0,
  created_at timestamptz default now()
);

-- 7. Marketplace accounts (for Phase 3 integration)
create table if not exists marketplace_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('shopee', 'tiktok', 'tokopedia', 'lazada')),
  account_name text not null,
  api_key text,
  access_token text,
  refresh_token text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Indexes
create index idx_purchases_po_number on purchases(po_number);
create index idx_purchases_created on purchases(created_at desc);
create index idx_purchase_items_purchase on purchase_items(purchase_id);
create index idx_purchase_items_product on purchase_items(product_id);
create index idx_sales_invoice on sales(invoice_number);
create index idx_sales_created on sales(created_at desc);
create index idx_sale_items_sale on sale_items(sale_id);
create index idx_sale_items_product on sale_items(product_id);
create index idx_cash_transactions_date on cash_transactions(date);
create index idx_payables_due on payables(due_type, due_id);

-- Foreign key for payables to enable proper referencing
-- Note: due_id would reference either suppliers or customers table

-- Function to generate PO numbers
create or replace function generate_po_number()
returns text
language plpgsql
as $$
begin
  return 'PO-' || to_char(now(), 'YY') || '-' || lpad(floor(random() * 10000)::text, 4, '0');
end;
$$;

-- Function to generate invoice numbers
create or replace function generate_invoice_number()
returns text
language plpgsql
as $$
begin
  return 'INV-' || to_char(now(), 'YY') || '-' || lpad(floor(random() * 10000)::text, 4, '0');
end;
$$;