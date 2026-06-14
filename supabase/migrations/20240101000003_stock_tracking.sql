-- Migration 003b: Stock Tracking Tables

-- Update products table to track more stock details
alter table products 
  add column total_in bigint default 0,
  add column total_out bigint default 0,
  add column total_sold bigint default 0,
  add column total_damage bigint default 0,
  add column total_return_in bigint default 0,
  add column total_return_out bigint default 0;

-- Update stock_movements to add more columns
alter table stock_movements 
  add column movement_reference text;

-- Create view for product summary
create or replace view product_summary as
select 
  p.id,
  p.sku,
  p.name,
  p.current_stock,
  p.min_stock,
  p.cost_price,
  p.sell_price,
  p.total_in,
  p.total_out,
  p.total_sold,
  p.total_damage,
  p.total_return_in,
  p.total_return_out,
  c.name as category_name,
  s.supplier_name as supplier_name
from products p
left join categories c on p.category_id = c.id
left join suppliers s on p.supplier_id = s.id;

-- Function to add stock movement (handles both product update and audit trail)
create or replace function add_stock_movement(
  p_product_id uuid,
  p_quantity integer,
  p_type movement_type,
  p_reason movement_reason,
  p_notes text default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_movement_id uuid;
begin
  -- Update product stock
  if p_type = 'in' then
    update products 
    set current_stock = current_stock + p_quantity,
        total_in = total_in + p_quantity,
        updated_at = now()
    where id = p_product_id;
  else
    if (select current_stock from products where id = p_product_id) < p_quantity then
      raise exception 'Stok tidak mencukupi. Stok saat ini: %', (select current_stock from products where id = p_product_id);
    end if;
    update products 
    set current_stock = current_stock - p_quantity,
        total_out = total_out + p_quantity,
        updated_at = now()
    where id = p_product_id;
  end if;

  -- Insert audit trail
  insert into stock_movements (product_id, quantity, type, reason, notes, created_by)
  values (p_product_id, p_quantity, p_type, p_reason, p_notes, p_created_by)
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;