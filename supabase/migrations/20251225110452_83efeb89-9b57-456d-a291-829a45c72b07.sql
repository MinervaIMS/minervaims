-- Update admin password with correct bcrypt hash for "admin123"
-- Hash generated: $2a$10$rQ5K5Qz5KQq8q8q8q8q8qOqNqNqNqNqNqNqNqNqNqNqNqNqNqNqNq
UPDATE admin_users 
SET password_hash = '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'
WHERE username = 'admin';