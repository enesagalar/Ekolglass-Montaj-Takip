-- ============================================================
-- Migration 003 — Glass Requests (ISRI cam talep sistemi)
-- Run in Supabase SQL Editor after 002
-- ============================================================

-- Also run migration 002 if not done yet:
-- ALTER TABLE consumables ALTER COLUMN stock TYPE numeric(10,1);

CREATE TABLE IF NOT EXISTS glass_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by        uuid REFERENCES app_users(id) ON DELETE SET NULL,
  requested_by_name   text NOT NULL DEFAULT '',
  items               jsonb NOT NULL DEFAULT '[]',
  requested_date      date NOT NULL,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note          text,
  notes               text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Index for fast customer queries
CREATE INDEX IF NOT EXISTS glass_requests_requested_by_idx ON glass_requests(requested_by);
CREATE INDEX IF NOT EXISTS glass_requests_status_idx ON glass_requests(status);
CREATE INDEX IF NOT EXISTS glass_requests_requested_date_idx ON glass_requests(requested_date);
