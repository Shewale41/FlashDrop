-- Apply once to the existing database before scheduling future drops.
ALTER TABLE drops
ADD COLUMN IF NOT EXISTS release_at TIMESTAMPTZ;
