// netlify/functions/like.js
// PATCH /api/like?id=xxx  → suma +1 like y +5 min al flare

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";
import { ensureAdminSettingsTable, getAdminSetting } from "./_utils/settings.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }

  if (event.httpMethod !== "PATCH" && event.httpMethod !== "POST") {
    return err(405, "Method not allowed");
  }

  const p = event.queryStringParameters || {};
  const id  = p.id;
  const uid = p.uid || null; // users.id del usuario que da like (opcional, Tier 2+)
  if (!id) return err(400, "id requerido");

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    await ensureAdminSettingsTable(sql);
    const likeRlEnabled = (await getAdminSetting(sql, "like_rate_limit", "on")) !== "off";

    if (likeRlEnabled) {
      const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim()
        || event.headers["client-ip"]
        || "unknown";
      const rl = rateLimit(ip, "like", 30, 60 * 60 * 1000);
      if (!rl.allowed) return {
        statusCode: 429,
        headers: { ...cors(), "Retry-After": String(rl.retryAfter) },
        body: JSON.stringify({ error: `Demasiadas solicitudes. Intenta en ${rl.retryAfter} segundos.`, retryAfter: rl.retryAfter }),
      };
    }

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

    // Guardar like en DB para Tier 2+ (para sincronizar entre dispositivos)
    if (uid) {
      try {
        await sql`
          INSERT INTO user_likes (user_id, flare_id)
          VALUES (${uid}, ${id})
          ON CONFLICT DO NOTHING
        `;
      } catch (e) {
        console.error("user_likes insert error:", e.message);
      }
    }

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
