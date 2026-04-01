// netlify/functions/_utils/settings.js
export async function ensureAdminSettingsTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function getAdminSetting(sql, key, fallback) {
  const rows = await sql`
    SELECT value
    FROM admin_settings
    WHERE key = ${key}
  `;
  return rows[0]?.value ?? fallback;
}

export async function upsertAdminSetting(sql, key, value) {
  await sql`
    INSERT INTO admin_settings (key, value)
    VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = NOW()
  `;
  return value;
}
