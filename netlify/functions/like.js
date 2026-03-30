// netlify/functions/like.js
// PATCH /api/like?id=xxx  → suma +1 like y +5 min al flare

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }

  if (event.httpMethod !== "PATCH" && event.httpMethod !== "POST") {
    return err(405, "Method not allowed");
  }

  const id = (event.queryStringParameters || {}).id;
  if (!id) return err(400, "id requerido");

  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim()
    || event.headers["client-ip"]
    || "unknown";
  const rl = rateLimit(ip, "like", 30, 60 * 60 * 1000);
  if (!rl.allowed) return {
    statusCode: 429,
    headers: { ...cors(), "Retry-After": String(rl.retryAfter) },
    body: JSON.stringify({ error: `Demasiadas solicitudes. Intenta en ${rl.retryAfter} segundos.`, retryAfter: rl.retryAfter }),
  };

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    const [row] = await sql`
      UPDATE flares
      SET
        likes      = likes + 1,
        expires_at = expires_at + INTERVAL '5 minutes'
      WHERE id = ${id}
        AND expires_at > NOW()
      RETURNING id, likes, expires_at
    `;

    if (!row) return err(404, "Flare no encontrado o ya expiró");

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify(row),
    };
  } catch (e) {
    console.error(e);
    return err(500, "Error interno: " + e.message);
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "PATCH, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function err(code, msg) {
  return {
    statusCode: code,
    headers: cors(),
    body: JSON.stringify({ error: msg }),
  };
}
