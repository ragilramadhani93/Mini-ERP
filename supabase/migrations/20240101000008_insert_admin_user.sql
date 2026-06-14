-- Insert admin user
insert into users (id, email, full_name, phone, role_id, is_active) values
  ('2b6f0091-c4e2-4bc5-8969-88f3b9b7b3b9', 'admin@minierp.com', 'Administrator', '081234567890', (select id from roles where name='admin'), true)
on conflict (id) do nothing;
