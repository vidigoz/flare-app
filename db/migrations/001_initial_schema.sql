-- 001_initial_schema.sql
-- Tablas base de Flare: flares, users, user_likes

CREATE TABLE IF NOT EXISTS flares (
  id          TEXT PRIMARY KEY,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  title       TEXT NOT NULL,
  emoji       TEXT,
  cat         TEXT,
  cat_lbl     TEXT,
  cat_color   TEXT,
  cat_icon    TEXT,
  type        TEXT DEFAULT 'text',
  body_text   TEXT,
  biz_name    TEXT,
  image_url   TEXT,
  video_url   TEXT,
  username    TEXT,
  owner_uid   TEXT,
  likes       INTEGER DEFAULT 0,
  hidden      BOOLEAN DEFAULT FALSE,
  report_count INTEGER DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  tier        INTEGER DEFAULT 2
);

CREATE INDEX IF NOT EXISTS idx_flares_expires_at ON flares(expires_at);
CREATE INDEX IF NOT EXISTS idx_flares_lat_lng    ON flares(lat, lng);
CREATE INDEX IF NOT EXISTS idx_flares_owner_uid  ON flares(owner_uid);
CREATE INDEX IF NOT EXISTS idx_flares_hidden     ON flares(hidden);

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  username     TEXT UNIQUE,
  device_id    TEXT,
  tier         INTEGER DEFAULT 3,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
CREATE INDEX IF NOT EXISTS idx_users_username  ON users(username);

CREATE TABLE IF NOT EXISTS user_likes (
  user_id   TEXT NOT NULL,
  flare_id  TEXT NOT NULL,
  PRIMARY KEY (user_id, flare_id)
);

CREATE INDEX IF NOT EXISTS idx_user_likes_user_id  ON user_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_flare_id ON user_likes(flare_id);
