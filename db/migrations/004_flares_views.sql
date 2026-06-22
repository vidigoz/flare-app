-- 004_flares_views.sql
-- Agrega contador de visualizaciones a la tabla flares

ALTER TABLE flares ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
