-- ================================================
--  FLARE APP — Schema completo (Neon/PostgreSQL)
--  Última actualización: 2026-06-04
-- ================================================

-- ── FLARES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS flares (
  id             TEXT PRIMARY KEY,
  lat            DOUBLE PRECISION NOT NULL,
  lng            DOUBLE PRECISION NOT NULL,
  title          TEXT NOT NULL,
  emoji          TEXT NOT NULL DEFAULT '📍',
  cat            TEXT NOT NULL DEFAULT 'info',
  cat_lbl        TEXT NOT NULL DEFAULT 'Información',
  cat_color      TEXT NOT NULL DEFAULT '#00f5a0',
  cat_icon       TEXT NOT NULL DEFAULT 'ℹ️',
  type           TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','video')),
  body_text      TEXT,
  biz_name       TEXT,
  image_url      TEXT,
  video_url      TEXT,
  likes          INTEGER NOT NULL DEFAULT 0,
  reports_count  INTEGER NOT NULL DEFAULT 0,
  hidden         BOOLEAN NOT NULL DEFAULT FALSE,
  owner_uid      TEXT,
  username       TEXT,
  tier           INTEGER DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS flares_geo      ON flares (lat, lng);
CREATE INDEX IF NOT EXISTS flares_expires  ON flares (expires_at);
CREATE INDEX IF NOT EXISTS flares_owner    ON flares (owner_uid);
CREATE INDEX IF NOT EXISTS flares_username ON flares (username);
CREATE INDEX IF NOT EXISTS flares_owner_created_idx ON flares (owner_uid, created_at DESC);

-- ── USERS (Tier 3 — verificados con teléfono) ───
-- Fuente de verdad: phone + username
-- device_id es secundario y se actualiza al iniciar sesión
CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username             TEXT UNIQUE NOT NULL,
  device_id            TEXT,               -- no UNIQUE, se actualiza por dispositivo
  tier                 INTEGER DEFAULT 3,
  phone                TEXT UNIQUE,        -- fuente de verdad Tier 3
  email                TEXT UNIQUE,
  flares_count         INTEGER DEFAULT 0,
  avatar_url           TEXT,
  username_changes     INTEGER DEFAULT 0,
  username_changed_at  TIMESTAMPTZ,
  last_seen_at         TIMESTAMPTZ DEFAULT NOW(),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_phone    ON users (phone);
CREATE INDEX IF NOT EXISTS users_device   ON users (device_id);
CREATE INDEX IF NOT EXISTS users_tier     ON users (tier);

-- ── DAILY FLARE COUNT (límite diario Tier 1-2) ──
CREATE TABLE IF NOT EXISTS user_daily_flares (
  uid      TEXT NOT NULL,
  day      TEXT NOT NULL,
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (uid, day)
);

-- ── ADMIN SETTINGS ───────────────────────────────
CREATE TABLE IF NOT EXISTS admin_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO admin_settings (key, value)
VALUES
  ('non_register_flare_limit', 'on'),
  ('daily_flare_limit',        'on'),
  ('dev_duration_mode',        'off')
ON CONFLICT (key) DO NOTHING;

-- ── SUPPORT TICKETS ──────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motivo     TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  email      TEXT,
  flare_id   TEXT,
  status     TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── FUNCIÓN DE LIMPIEZA ──────────────────────────
CREATE OR REPLACE FUNCTION delete_expired_flares()
RETURNS void AS $$
  DELETE FROM flares
  WHERE created_at < NOW() - INTERVAL '24 hours';
$$ LANGUAGE sql;
