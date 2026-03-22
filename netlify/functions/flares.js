// netlify/functions/flares.js
// GET  /api/flares?minLat=&maxLat=&minLng=&maxLng=   → flares visibles en bbox
// POST /api/flares                                    → crear nuevo flare

import { neon } from "@netlify/neon";

function getDb() {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  return sql;
}

export const handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }

  try {
    const sql = getDb();

    // ── GET ──────────────────────────────────────────
    if (event.httpMethod === "GET") {
      const p = event.queryStringParameters || {};
      const minLat = parseFloat(p.minLat ?? -90);
      const maxLat = parseFloat(p.maxLat ?? 90);
      const minLng = parseFloat(p.minLng ?? -180);
      const maxLng = parseFloat(p.maxLng ?? 180);

      // Borra expirados de paso (limpieza liviana)
      await sql`DELETE FROM flares WHERE expires_at < NOW()`;

      const rows = await sql`
        SELECT * FROM flares
        WHERE expires_at > NOW()
          AND lat BETWEEN ${minLat} AND ${maxLat}
          AND lng BETWEEN ${minLng} AND ${maxLng}
        ORDER BY expires_at DESC
        LIMIT 300
      `;

      return {
        statusCode: 200,
        headers: { ...cors(), "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      };
    }

    // ── POST ─────────────────────────────────────────
    if (event.httpMethod === "POST") {
      const d = JSON.parse(event.body || "{}");

      // Validación básica
      if (!d.lat || !d.lng || !d.title) {
        return err(400, "lat, lng y title son requeridos");
      }
      if (Math.abs(d.lat) > 90 || Math.abs(d.lng) > 180) {
        return err(400, "coordenadas inválidas");
      }
      if (String(d.title).length > 100) {
        return err(400, "título demasiado largo");
      }

      const id = "p" + Date.now() + Math.random().toString(36).slice(2, 6);
      const durMin = Math.min(Math.max(parseInt(d.dur_min) || 60, 1), 720);
      const expiresAt = new Date(Date.now() + durMin * 60 * 1000).toISOString();

      const [row] = await sql`
        INSERT INTO flares (
          id, lat, lng, title, emoji, cat, cat_lbl, cat_color, cat_icon,
          type, body_text, image_url, video_url, expires_at
        ) VALUES (
          ${id},
          ${parseFloat(d.lat)},
          ${parseFloat(d.lng)},
          ${String(d.title).trim()},
          ${d.emoji || "📍"},
          ${d.cat || "info"},
          ${d.cat_lbl || "Información"},
          ${d.cat_color || "#00f5a0"},
          ${d.cat_icon || "ℹ️"},
          ${d.type || "text"},
          ${d.body_text || null},
          ${d.image_url || null},
          ${d.video_url || null},
          ${expiresAt}
        )
        RETURNING *
      `;

      return {
        statusCode: 201,
        headers: { ...cors(), "Content-Type": "application/json" },
        body: JSON.stringify(row),
      };
    }

    return err(405, "Method not allowed");
  } catch (e) {
    console.error(e);
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

function err(code, msg) {
  return {
    statusCode: code,
    headers: cors(),
    body: JSON.stringify({ error: msg }),
  };
}
