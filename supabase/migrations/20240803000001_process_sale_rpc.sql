-- Migration: Add atomic process_sale procedure
-- Date: 2024-08-03
-- Wraps sales creation, item replacement, variant stock tracking, cash transaction, and deposits in a single transaction.

CREATE OR REPLACE FUNCTION process_sale(
  p_sale jsonb,
  p_items jsonb,
  p_splits jsonb DEFAULT '[]'::jsonb,
  p_is_edit boolean DEFAULT false,
  p_editing_sale_id uuid DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
  v_invoice_number text;
  v_item jsonb;
  v_split jsonb;
  v_status text;
  v_total_received numeric;
  v_customer_name text;
  v_payment_details jsonb;
  v_created_at timestamptz;
  v_created_by uuid;
  v_old_status text;
  v_old_item record;
BEGIN
  v_status := p_sale->>'status';
  v_total_received := coalesce((p_sale->>'total_received')::numeric, 0);
  v_customer_name := p_sale->>'customer_name';
  v_payment_details := coalesce(p_sale->'payment_details', '{}'::jsonb);
  v_created_at := coalesce((p_sale->>'created_at')::timestamptz, now());
  v_created_by := (p_sale->>'created_by')::uuid;

  IF p_is_edit AND p_editing_sale_id IS NOT NULL THEN
    v_sale_id := p_editing_sale_id;
    SELECT status INTO v_old_status FROM sales WHERE id = v_sale_id;

    -- If previous sale was completed, reverse previous stock deduction
    IF v_old_status = 'completed' THEN
      FOR v_old_item IN SELECT product_id, sku_id, quantity FROM sale_items WHERE sale_id = v_sale_id LOOP
        IF v_old_item.sku_id IS NOT NULL THEN
          UPDATE product_skus
          SET current_stock = current_stock + v_old_item.quantity
          WHERE id = v_old_item.sku_id;
        ELSE
          UPDATE products
          SET current_stock = current_stock + v_old_item.quantity,
              total_out = greatest(0, total_out - v_old_item.quantity),
              updated_at = now()
          WHERE id = v_old_item.product_id;
        END IF;
      END LOOP;
    END IF;

    -- Clean old sub-records
    DELETE FROM sale_items WHERE sale_id = v_sale_id;
    DELETE FROM split_payments WHERE sale_id = v_sale_id;
    DELETE FROM cash_transactions WHERE reference_type = 'sales' AND reference_id = v_sale_id;
    DELETE FROM customer_deposits WHERE reference_type = 'sales' AND reference_id = v_sale_id;

    -- Update sales row
    UPDATE sales SET
      customer_name = v_customer_name,
      total_amount = (p_sale->>'total_amount')::numeric,
      payment_method = p_sale->>'payment_method',
      marketplace = p_sale->>'marketplace',
      platform_fee = coalesce((p_sale->>'platform_fee')::numeric, 0),
      total_received = v_total_received,
      status = v_status,
      payment_status = CASE WHEN v_status = 'completed' THEN 'paid' ELSE 'unpaid' END,
      paid_amount = CASE WHEN v_status = 'completed' THEN v_total_received ELSE 0 END,
      payment_details = v_payment_details,
      created_at = v_created_at
    WHERE id = v_sale_id;

    SELECT invoice_number INTO v_invoice_number FROM sales WHERE id = v_sale_id;
  ELSE
    v_invoice_number := coalesce(p_sale->>'invoice_number', 'INV-' || upper(to_hex(extract(epoch from now())::bigint)));

    INSERT INTO sales (
      invoice_number, customer_name, total_amount, payment_method,
      marketplace, platform_fee, total_received, status,
      payment_status, paid_amount, payment_details, created_at, created_by
    ) VALUES (
      v_invoice_number, v_customer_name, (p_sale->>'total_amount')::numeric, p_sale->>'payment_method',
      p_sale->>'marketplace', coalesce((p_sale->>'platform_fee')::numeric, 0), v_total_received, v_status,
      CASE WHEN v_status = 'completed' THEN 'paid' ELSE 'unpaid' END,
      CASE WHEN v_status = 'completed' THEN v_total_received ELSE 0 END,
      v_payment_details, v_created_at, v_created_by
    ) RETURNING id INTO v_sale_id;
  END IF;

  -- Insert sale items and deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO sale_items (
      sale_id, product_id, sku_id, quantity, unit_price, discount, marketplace
    ) VALUES (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      CASE WHEN (v_item->>'sku_id') IS NOT NULL AND (v_item->>'sku_id') <> '' THEN (v_item->>'sku_id')::uuid ELSE NULL END,
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'discount')::numeric, 0),
      v_item->>'marketplace'
    );

    IF v_status = 'completed' THEN
      IF (v_item->>'sku_id') IS NOT NULL AND (v_item->>'sku_id') <> '' THEN
        UPDATE product_skus
        SET current_stock = current_stock - (v_item->>'quantity')::integer
        WHERE id = (v_item->>'sku_id')::uuid;

        INSERT INTO stock_movements (product_id, quantity, type, reason, notes, created_by, created_at)
        VALUES (
          (v_item->>'product_id')::uuid,
          (v_item->>'quantity')::integer,
          'out',
          'sale',
          'Penjualan ' || v_invoice_number || ' (Varian)',
          v_created_by,
          v_created_at
        );
      ELSE
        PERFORM add_stock_movement(
          (v_item->>'product_id')::uuid,
          (v_item->>'quantity')::integer,
          'out'::movement_type,
          'sale'::movement_reason,
          'Penjualan ' || v_invoice_number,
          v_created_by
        );
      END IF;
    END IF;
  END LOOP;

  -- Split payments
  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits) LOOP
    IF coalesce((v_split->>'amount')::numeric, 0) > 0 THEN
      INSERT INTO split_payments (sale_id, method, amount)
      VALUES (v_sale_id, v_split->>'method', (v_split->>'amount')::numeric);
    END IF;
  END LOOP;

  -- Cash transaction and deposits if completed
  IF v_status = 'completed' THEN
    INSERT INTO cash_transactions (type, category, amount, reference_type, reference_id, description, created_by, created_at)
    VALUES (
      'in', 'sales', v_total_received, 'sales', v_sale_id,
      'Penjualan ' || v_invoice_number || coalesce(' - ' || v_customer_name, ''),
      v_created_by, v_created_at
    );

    IF v_customer_name IS NOT NULL AND v_customer_name <> '' THEN
      IF coalesce((v_payment_details->>'deposit_used')::numeric, 0) > 0 THEN
        INSERT INTO customer_deposits (customer_name, amount, reference_type, reference_id, description, created_by, created_at)
        VALUES (
          v_customer_name,
          -((v_payment_details->>'deposit_used')::numeric),
          'sales', v_sale_id,
          'Penggunaan deposit untuk ' || v_invoice_number,
          v_created_by, v_created_at
        );
      END IF;

      IF (v_payment_details->>'is_overpaid')::boolean AND coalesce((v_payment_details->>'overpaid_amount')::numeric, 0) > 0 THEN
        INSERT INTO customer_deposits (customer_name, amount, reference_type, reference_id, description, created_by, created_at)
        VALUES (
          v_customer_name,
          (v_payment_details->>'overpaid_amount')::numeric,
          'sales', v_sale_id,
          'Tambah deposit dari lebih bayar ' || v_invoice_number,
          v_created_by, v_created_at
        );
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id, 'invoice_number', v_invoice_number);
END;
$$;
