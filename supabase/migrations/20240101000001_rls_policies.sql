-- Migration 002: Row-Level Security Policies

-- Helper function to get user role
create or replace function get_user_role()
returns text
language sql
stable
security definer
as $$
  select r.name
  from users u
  join roles r on r.id = u.role_id
  where u.id = auth.uid()
  limit 1;
$$;

-- Enable RLS on all tables
alter table roles enable row level security;
alter table users enable row level security;
alter table categories enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table stock_movements enable row level security;
alter table stock_opname enable row level security;

-- Roles: all authenticated can read, only owner can manage
create policy "Roles are readable by authenticated"
  on roles for select using (auth.role() = 'authenticated');

create policy "Roles writable by owner"
  on roles for all using (get_user_role() = 'owner');

-- Users: read own + admin/owner read all, admin/owner write
create policy "Users read own"
  on users for select using (auth.uid() = id);

create policy "Users read all by admin"
  on users for select using (get_user_role() in ('owner', 'admin'));

create policy "Users insert by owner"
  on users for insert with check (get_user_role() = 'owner');

create policy "Users update own"
  on users for update using (auth.uid() = id);

create policy "Users update by admin"
  on users for update using (get_user_role() in ('owner', 'admin'));

create policy "Users delete by owner"
  on users for delete using (get_user_role() = 'owner');

-- Categories
create policy "Categories read all"
  on categories for select using (auth.role() = 'authenticated');

create policy "Categories write by admin"
  on categories for all using (get_user_role() in ('owner', 'admin'));

-- Suppliers
create policy "Suppliers read all"
  on suppliers for select using (auth.role() = 'authenticated');

create policy "Suppliers write by admin"
  on suppliers for all using (get_user_role() in ('owner', 'admin'));

-- Products
create policy "Products read all"
  on products for select using (auth.role() = 'authenticated');

create policy "Products write by admin/gudang"
  on products for all using (get_user_role() in ('owner', 'admin', 'staff_gudang'));

-- Stock Movements
create policy "Stock movements read all"
  on stock_movements for select using (auth.role() = 'authenticated');

create policy "Stock movements write by admin/gudang"
  on stock_movements for all using (get_user_role() in ('owner', 'admin', 'staff_gudang'));

-- Stock Opname
create policy "Stock opname read all"
  on stock_opname for select using (auth.role() = 'authenticated');

create policy "Stock opname write by admin/gudang"
  on stock_opname for all using (get_user_role() in ('owner', 'admin', 'staff_gudang'));