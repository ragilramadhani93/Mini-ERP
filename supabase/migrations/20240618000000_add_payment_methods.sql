-- Migration: Add payment_methods table for dynamic payment method management

create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  icon text,
  color text,
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

insert into payment_methods (code, name, icon, color, sort_order, is_active) values
  ('cash', 'Tunai', 'wallet', '#15803d', 1, true),
  ('qris', 'QRIS', 'smartphone', '#2563eb', 2, true),
  ('bank_transfer', 'Transfer Bank', 'building', '#7c3aed', 3, true),
  ('credit', 'Kredit', 'credit-card', '#dc2626', 4, false),
  ('split_shopee', 'Check Out Shopee', 'shopping-bag', '#0891b2', 5, false),
  ('split_other', 'Pembayaran Lain', 'layers', '#ca8a04', 6, false)
on conflict (code) do nothing;

alter table payment_methods enable row level security;

create policy "Everyone can view payment methods"
  on payment_methods for select
  using (true);

create policy "Owner and admin can manage payment methods"
  on payment_methods for all
  using (get_user_role() in ('owner', 'admin'));
