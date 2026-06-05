// netlify/functions/identity.js
// GET /api/identity?phone=...  → buscar perfil por teléfono (sync Tier 3)
// La identidad se crea en flares.js al publicar el primer flare.
// La recuperación se hace por teléfono vía verify-firebase.

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";

function getDb() {
  return neon(process.env.NETLIFY_DATABASE_URL);
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }
  if (event.httpMethod !== "GET") {
    return err(405, "Method not allowed");
  }

  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim()
    || event.headers["client-ip"]
    || "unknown";

  const rl = rateLimit(ip, "get_identity", 30, 60 * 1000);
  if (!rl.allowed) return tooMany(rl.retryAfter);

  const phone = (event.queryStringParameters || {}).phone;
  if (!phone) return err(400, "phone requerido");

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT id, username, device_id, tier, phone, flares_count, avatar_url, created_at
      FROM users WHERE phone = ${phone} LIMIT 1
    `;
    return ok(rows);
  } catch (e) {
    console.error("identity error:", e);
    return err(500, "Error interno: " + e.message);
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function ok(data) {
  return {
    statusCode: 200,
    headers: { ...cors(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

function err(code, msg) {
  return {
    statusCode: code,
    headers: cors(),
    body: JSON.stringify({ error: msg }),
  };
}

function tooMany(retryAfter) {
  return {
    statusCode: 429,
    headers: { ...cors(), "Retry-After": String(retryAfter) },
    body: JSON.stringify({ error: `Demasiadas solicitudes. Intenta en ${retryAfter} segundos.`, retryAfter }),
  };
}
