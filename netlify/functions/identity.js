// netlify/functions/identity.js
// GET  /api/identity?device_id=...  → buscar perfil existente
// POST /api/identity                → crear o recuperar perfil

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";

function getDb() {
  return neon(process.env.NETLIFY_DATABASE_URL);
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }

  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim()
    || event.headers["client-ip"]
    || "unknown";

  try {
    const sql = getDb();

    // ── GET — buscar perfil por device_id ────────────
    if (event.httpMethod === "GET") {
      const rl = rateLimit(ip, "get_identity", 30, 60 * 1000);
      if (!rl.allowed) return tooMany(rl.retryAfter);

      const params = event.queryStringParameters || {};
      const deviceId = params.device_id;
      const phone    = params.phone;

      if (!deviceId && !phone) return err(400, "device_id o phone requerido");

      let rows;
      if (phone) {
        rows = await sql`
          SELECT id, username, device_id, tier, phone, flares_count, avatar_url, created_at
          FROM users WHERE phone = ${phone} LIMIT 1
        `;
      } else {
        rows = await sql`
          SELECT id, username, device_id, tier, phone, flares_count, avatar_url, created_at
          FROM users WHERE device_id = ${deviceId} ORDER BY created_at DESC
        `;
      }

      return ok(rows);
    }

    // ── POST — crear o recuperar perfil ──────────────
    if (event.httpMethod === "POST") {
      const rl = rateLimit(ip, "post_identity", 10, 60 * 1000);
      if (!rl.allowed) return tooMany(rl.retryAfter);

      let d;
      try {
        d = JSON.parse(event.body || "{}");
      } catch {
        return err(400, "JSON inválido");
      }

      const deviceId = d.device_id ? String(d.device_id).slice(0, 64) : null;
      const username = d.username  ? String(d.username).slice(0, 30)  : null;

      if (!deviceId) return err(400, "device_id requerido");
      if (!username) return err(400, "username requerido");

      // Validar formato username: letras, números y guion bajo únicamente
      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        return err(400, "username inválido");
      }

      // Si ya existe el device_id, devolver el perfil existente sin crear uno nuevo
      const existing = await sql`
        SELECT id, username, device_id, tier, flares_count, created_at
        FROM users
        WHERE device_id = ${deviceId}
        LIMIT 1
      `;
      if (existing.length) return ok(existing[0]);

      // Insertar nuevo perfil — si el username ya está tomado, generar uno alternativo
      try {
        const [row] = await sql`
          INSERT INTO users (username, device_id, tier)
          VALUES (${username}, ${deviceId}, 2)
          RETURNING id, username, device_id, tier, flares_count, created_at
        `;
        return { statusCode: 201, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify(row) };
      } catch (e) {
        // username duplicado — el device_id es único por otro usuario, error real
        if (e.message && e.message.includes("unique")) {
          // Intentar con sufijo numérico
          const fallback = username + '_' + Math.random().toString(36).slice(2, 5);
          const [row] = await sql`
            INSERT INTO users (username, device_id, tier)
            VALUES (${fallback}, ${deviceId}, 2)
            RETURNING id, username, device_id, tier, flares_count, created_at
          `;
          return { statusCode: 201, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify(row) };
        }
        throw e;
      }
    }

    return err(405, "Method not allowed");
  } catch (e) {
    console.error("identity error:", e);
    return err(500, "Error interno: " + e.message);
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
