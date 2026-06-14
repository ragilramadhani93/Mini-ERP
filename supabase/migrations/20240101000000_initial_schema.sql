-- Migration 001: Initial Schema
-- Creates all core tables for Sprint 1

-- 1. Roles
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

-- 2. Users (extends auth.users)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  role_id uuid references roles(id),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Suppliers
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  category_id uuid references categories(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  cost_price bigint default 0,
  sell_price bigint default 0,
  current_stock integer default 0,
  min_stock integer default 0,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Stock Movements (audit trail)
create type movement_type as enum ('in', 'out');
create type movement_reason as enum ('purchase', 'sale', 'return_in', 'return_out', 'damage', 'adjustment', 'opname');

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  quantity integer not null,
  type movement_type not null,
  reason movement_reason not null,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- 7. Stock Opname
create table if not exists stock_opname (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  system_stock integer not null,
  physical_stock integer not null,
  difference integer not null,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- Indexes
create index idx_products_category on products(category_id);
create index idx_products_supplier on products(supplier_id);
create index idx_products_sku on products(sku);
create index idx_products_stock on products(current_stock);
create index idx_stock_movements_product on stock_movements(product_id);
create index idx_stock_movements_created on stock_movements(created_at desc);
create index idx_stock_opname_product on stock_opname(product_id);

-- Functions
create or replace function get_min_stock()
returns integer
language sql
stable
as $$
  select min_stock from products limit 1;
$$;

-- Updated at trigger
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_products_updated_at
  before update on products
  for each row execute function update_updated_at();

create trigger update_categories_updated_at
  before update on categories
  for each row execute function update_updated_at();

create trigger update_suppliers_updated_at
  before update on suppliers
  for each row execute function update_updated_at();

create trigger update_users_updated_at
  before update on users
  for each row execute function update_updated_at();