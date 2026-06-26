-- Remove CHECK constraints that are too restrictive for payment methods
-- Payment methods are now managed via the payment_methods table

-- 1. Remove CHECK on sales.payment_method
alter table sales drop constraint if exists sales_payment_method_check;

-- 2. Remove CHECK on split_payments.method
alter table split_payments drop constraint if exists split_payments_method_check;
