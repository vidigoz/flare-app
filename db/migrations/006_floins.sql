-- 006_floins.sql
-- Sistema de economía Floins — Fase 1

-- Tabla de transacciones (ledger)
CREATE TABLE IF NOT EXISTS floins_transactions (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id   TEXT,
  amount      INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  flare_id    TEXT REFERENCES flares(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_floins_user    ON floins_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_floins_device  ON floins_transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_floins_created ON floins_transactions(created_at);

-- Balance rápido en users
ALTER TABLE users ADD COLUMN IF NOT EXISTS floins INTEGER DEFAULT 0;

-- Bono de primer flare (única vez)
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_flare_rewarded BOOLEAN DEFAULT FALSE;

-- Soporte para fogata y hoguera en el comentario de flare_type
COMMENT ON COLUMN flares.flare_type IS 'duración: chispa (1hr) | flama (3hr) | fogata (6hr) | hoguera (12hr)';
