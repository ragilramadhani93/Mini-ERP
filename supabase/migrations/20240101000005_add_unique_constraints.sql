-- Add unique constraints to categories and suppliers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'categories' AND constraint_name = 'unique_category_name'
    ) THEN
        ALTER TABLE categories ADD CONSTRAINT unique_category_name UNIQUE (name);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'suppliers' AND constraint_name = 'unique_supplier_name'
    ) THEN
        ALTER TABLE suppliers ADD CONSTRAINT unique_supplier_name UNIQUE (supplier_name);
    END IF;
END $$;
