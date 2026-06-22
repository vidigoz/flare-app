-- 005_flares_type.sql
-- Agrega tipo de flare (chispa | flama) para control de duración y filtrado

ALTER TABLE flares ADD COLUMN IF NOT EXISTS flare_type TEXT DEFAULT 'flama';
