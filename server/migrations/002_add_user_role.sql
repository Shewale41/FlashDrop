-- Apply once after migration 001 to enable role-based drop management.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
CHECK (role IN ('member', 'admin'));
