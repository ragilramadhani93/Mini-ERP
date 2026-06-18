-- Migration: Add sales status, payment status, and split payment support

-- Add status to sales (draft = belum dibayar, completed = lunas)
alter table sales add column if not exists status text default 'completed' check (status in ('draft', 'completed', 'cancelled'));

-- Add payment status tracking
alter table sales add column if not exists payment_status text default 'paid' check (payment_status in ('unpaid', 'paid', 'partial'));
alter table sales add column if not exists paid_amount bigint default 0;

-- Add payment_details JSONB for split payments
alter table sales add column if not exists payment_details jsonb default '{}';

-- Extend payment_method constraint to include qris and split options
alter table sales drop constraint if exists sales_payment_method_check;
alter table sales add constraint sales_payment_method_check 
  check (payment_method in ('cash', 'credit', 'bank_transfer', 'qris', 'split_shopee', 'split_other'));

-- Create split_payments table for detailed split payment tracking
create table if not exists split_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references sales(id) on delete cascade not null,
  method text not null check (method in ('cash', 'qris', 'bank_transfer', 'shopee', 'other')),
  amount bigint not null,
  reference text,
  notes text,
  created_at timestamptz default now()
);

create index idx_split_payments_sale on split_payments(sale_id);

-- Enable RLS
alter table split_payments enable row level security;

create policy "Users can view their own split payments"
  on split_payments for select
  using (exists (
    select 1 from sales where sales.id = split_payments.sale_id
  ));

create policy "Users can insert split payments"
  on split_payments for insert
  with check (exists (
    select 1 from sales where sales.id = split_payments.sale_id
  ));

create policy "Users can delete their own split payments"
  on split_payments for delete
  using (exists (
    select 1 from sales where sales.id = split_payments.sale_id
  ));
