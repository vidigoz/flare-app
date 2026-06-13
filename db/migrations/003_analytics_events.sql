-- 003_analytics_events.sql
-- Tabla de eventos de analítica (Etapa 1)

CREATE TABLE IF NOT EXISTS analytics_events (
  id         SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  device_id  TEXT,
  flare_id   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ae_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ae_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_ae_device_id  ON analytics_events(device_id);
