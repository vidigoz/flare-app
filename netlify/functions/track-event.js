// netlify/functions/track-event.js
// POST /api/track-event — registra un evento de analítica
// No requiere autenticación. Rate limit suave: 1 evento mismo tipo+device por minuto.

import { neon } from "@neondatabase/serverless";

const VALID_EVENTS = new Set([
  "map_open",
  "flare_view",
  "flare_share",
  "flare_publish",
  "pwa_installed",
  "pwa_install_prompt_shown",
  "pwa_launched_standalone",
]);

// Rate limit en memoria (se resetea con cada deploy, suficiente para uso suave)
const rlMap = new Map();
function rateLimit(key) {
  const now = Date.now();
  const last = rlMap.get(key) || 0;
  if (now - last < 60 * 1000) return false;
  rlMap.set(key, now);
  return true;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== "POST") return err(405, "Method not allowed");

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return err(400, "JSON inválido");
  }

  const { event_type, device_id, flare_id } = body;

  if (!event_type || !VALID_EVENTS.has(event_type)) {
    return err(400, "event_type inválido");
  }

  const deviceKey = String(device_id || "anon").slice(0, 64);
  const rlKey = `${event_type}:${deviceKey}`;
  if (!rateLimit(rlKey)) {
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true, skipped: true }) };
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    await sql`
      INSERT INTO analytics_events (event_type, device_id, flare_id)
      VALUES (
        ${event_type},
        ${deviceKey || null},
        ${flare_id ? String(flare_id).slice(0, 64) : null}
      )
    `;
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error("track-event error:", e.message);
    // Falla silenciosa — no rompemos el flujo del usuario
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: false }) };
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
function err(code, msg) {
  return { statusCode: code, headers: cors(), body: JSON.stringify({ error: msg }) };
}
