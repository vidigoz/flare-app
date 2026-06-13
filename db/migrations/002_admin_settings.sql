-- 002_admin_settings.sql
-- Tabla de configuración del admin (toggles, límites, etc.)

CREATE TABLE IF NOT EXISTS admin_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
