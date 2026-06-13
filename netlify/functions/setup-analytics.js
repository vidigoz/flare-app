// netlify/functions/setup-analytics.js
// GET /api/admin/setup-analytics — crea tabla analytics_events (one-shot)
// Requiere header x-admin-key

import { neon } from "@neondatabase/serverless";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors() };

  const secret   = process.env.ADMIN_SECRET;
  const provided = event.headers["x-admin-key"] || event.queryStringParameters?.key || "";
  if (!secret || provided !== secret) return err(401, "No autorizado");

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    await sql`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id         SERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        device_id  TEXT,
        flare_id   TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_ae_event_type ON analytics_events(event_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ae_created_at ON analytics_events(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ae_device_id  ON analytics_events(device_id)`;

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, message: "Tabla analytics_events lista" }),
    };
  } catch (e) {
    console.error("setup-analytics error:", e.message);
    return err(500, "Error: " + e.message);
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
  };
}
function err(code, msg) {
  return { statusCode: code, headers: cors(), body: JSON.stringify({ error: msg }) };
}
