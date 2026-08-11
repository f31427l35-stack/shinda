-- USSD Promo Draw — schema
-- Run this once against your Vercel Postgres / Neon database.

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'presenter' CHECK (role IN ('admin', 'presenter')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  keyword TEXT NOT NULL,               -- the code listeners enter, e.g. "WIN"
  is_active BOOLEAN NOT NULL DEFAULT true,
  prize_description TEXT,
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_active_keyword
  ON campaigns (lower(keyword))
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS entries (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  session_id TEXT,
  raw_input TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entries_campaign ON entries (campaign_id);
CREATE INDEX IF NOT EXISTS idx_entries_phone ON entries (phone_number);
CREATE INDEX IF NOT EXISTS idx_entries_created ON entries (created_at);

CREATE TABLE IF NOT EXISTS winners (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  entry_id INTEGER NOT NULL REFERENCES entries(id),
  phone_number TEXT NOT NULL,
  picked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  picked_by INTEGER REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_winners_campaign ON winners (campaign_id);

-- Tracks which USSD session IDs we've already seen, so the webhook can tell
-- a brand-new dial-in apart from a follow-up screen (needed because some
-- shortcode formats, e.g. *321*2#, send a non-empty INPUT on the very first
-- callback too).
CREATE TABLE IF NOT EXISTS ussd_sessions (
  session_id  TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Liquid soap shop — orders placed via USSD and paid via UpesiPay STK push.
CREATE TABLE IF NOT EXISTS orders (
  id                   SERIAL PRIMARY KEY,
  phone_number         TEXT NOT NULL,
  session_id           TEXT,
  package_size         TEXT NOT NULL,        -- '1L', '2L', '3L', '4L', '5L'
  quantity             INTEGER NOT NULL,
  unit_price           INTEGER NOT NULL,
  total_amount         INTEGER NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending',
                        -- pending | awaiting_payment | paid | failed | cancelled | timeout
  checkout_request_id  TEXT,
  merchant_request_id  TEXT,
  paid_at              TIMESTAMPTZ,
  delivery_status      TEXT NOT NULL DEFAULT 'pending', -- pending | delivered
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_checkout_request_id ON orders (checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders (phone_number);
