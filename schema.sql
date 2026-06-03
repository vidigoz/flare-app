-- ================================================
--  FLARE APP — Schema para Netlify DB (Neon/PostgreSQL)
--  Corre esto en el SQL Editor de Netlify DB
-- ================================================

CREATE TABLE IF NOT EXISTS flares (
  id           TEXT PRIMARY KEY,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  title        TEXT NOT NULL,
  emoji        TEXT NOT NULL DEFAULT '📍',
  cat          TEXT NOT NULL DEFAULT 'info',
  cat_lbl      TEXT NOT NULL DEFAULT 'Información',
  cat_color    TEXT NOT NULL DEFAULT '#00f5a0',
  cat_icon     TEXT NOT NULL DEFAULT 'ℹ️',
  type         TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','video')),
  body_text    TEXT,
  image_url    TEXT,
  video_url    TEXT,
  likes        INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL
);

-- Índice geográfico para queries por bounding box
CREATE INDEX IF NOT EXISTS flares_geo ON flares (lat, lng);

-- Índice de expiración para limpiar rápido
CREATE INDEX IF NOT EXISTS flares_expires ON flares (expires_at);

CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
--  Función que borra flares expirados automáticamente
--  (opcional — también lo hace la Function de Node)
-- ================================================
CREATE OR REPLACE FUNCTION delete_expired_flares()
RETURNS void AS $$
  DELETE FROM flares
  WHERE created_at < NOW() - INTERVAL '24 hours';
$$ LANGUAGE sql;
