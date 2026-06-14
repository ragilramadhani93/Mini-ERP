-- Add new admin user
INSERT INTO users (id, email, full_name, phone, role_id, is_active)
VALUES (
  '8d6658a0-39e7-4118-b3a8-04458559f015',
  'admin@minierp.com',
  'Administrator Baru',
  '081234567890',
  (SELECT id FROM roles WHERE name = 'admin'),
  true
)
ON CONFLICT (id) DO NOTHING;
