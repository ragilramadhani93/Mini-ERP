-- Migration 002b: RLS Policies for Transactions

-- Helper function to check user permissions
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

-- Purchases
create policy "Purchases readable by authenticated"
  on purchases for select using (auth.role() = 'authenticated');

create policy "Purchases write by admin"
  on purchases for all using (get_user_role() in ('owner', 'admin'));

-- Purchase Items
create policy "Purchase items readable by authenticated"
  on purchase_items for select using (auth.role() = 'authenticated');

create policy "Purchase items write by admin"
  on purchase_items for all using (get_user_role() in ('owner', 'admin'));

-- Sales
create policy "Sales readable by authenticated"
  on sales for select using (auth.role() = 'authenticated');

create policy "Sales write by admin"
  on sales for all using (get_user_role() in ('owner', 'admin'));

-- Sale Items
create policy "Sale items readable by authenticated"
  on sale_items for select using (auth.role() = 'authenticated');

create policy "Sale items write by admin"
  on sale_items for all using (get_user_role() in ('owner', 'admin'));

-- Cash Transactions
create policy "Cash transactions readable by authenticated"
  on cash_transactions for select using (auth.role() = 'authenticated');

create policy "Cash transactions write by admin/keuangan"
  on cash_transactions for all using (get_user_role() in ('owner', 'admin', 'staff_keuangan'));

-- Payables
create policy "Payables readable by authenticated"
  on payables for select using (auth.role() = 'authenticated');

create policy "Payables write by owner/admin/keuangan"
  on payables for all using (get_user_role() in ('owner', 'admin', 'staff_keuangan'));

-- Marketplace Accounts
create policy "Marketplace accounts readable by authenticated"
  on marketplace_accounts for select using (auth.role() = 'authenticated');

create policy "Marketplace accounts write by owner"
  on marketplace_accounts for all using (get_user_role() = 'owner');