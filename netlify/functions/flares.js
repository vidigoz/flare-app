// netlify/functions/flares.js
// GET  /api/flares?minLat=&maxLat=&minLng=&maxLng=   → flares visibles en bbox
// POST /api/flares                                    → crear nuevo flare

import { neon } from "@neondatabase/serverless";

function getDb() {
  return neon(process.env.NETLIFY_DATABASE_URL);
}

export const handler = async (event) => {
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
      const zoom   = parseInt(p.zoom) || 13;

      /* Límite dinámico según zoom — más zoom = área chica = más detalle */
      const limit = zoom >= 16 ? 5000   /* calle/manzana — bbox chico, traer todo */
                  : zoom >= 14 ? 1000   /* colonia/barrio */
                  : zoom >= 12 ? 300    /* ciudad */
                  : zoom >= 10 ? 100    /* región/estado */
                  : 50;                 /* país/mundo — solo top por likes */

      /* Ordenar por likes desc en zoom lejano para mostrar los más relevantes */
      const orderByLikes = zoom < 12;

      // Activar reserva de tiempo: si expiró pero tiene bonus, extender
      await sql`
        UPDATE flares
        SET expires_at   = NOW() + (bonus_seconds * INTERVAL '1 second'),
            bonus_seconds = 0
        WHERE expires_at < NOW()
          AND bonus_seconds > 0
      `;

      // Limpieza liviana de expirados (solo los que no tienen bonus pendiente)
      await sql`DELETE FROM flares WHERE expires_at < NOW() AND bonus_seconds = 0`;

      const rows = orderByLikes
        ? await sql`
            SELECT * FROM flares
            WHERE expires_at > NOW()
              AND lat BETWEEN ${minLat} AND ${maxLat}
              AND lng BETWEEN ${minLng} AND ${maxLng}
            ORDER BY likes DESC, expires_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT * FROM flares
            WHERE expires_at > NOW()
              AND lat BETWEEN ${minLat} AND ${maxLat}
              AND lng BETWEEN ${minLng} AND ${maxLng}
            ORDER BY expires_at DESC
            LIMIT ${limit}
          `;

      return {
        statusCode: 200,
        headers: { ...cors(), "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      };
    }

    // ── POST ─────────────────────────────────────────
    if (event.httpMethod === "POST") {
      let d;
      try {
        d = JSON.parse(event.body || "{}");
      } catch (e) {
        return err(400, "JSON invalido");
      }

      // Validacion — usar == null para no rechazar coordenada 0
      if (d.lat == null || d.lng == null || !d.title) {
        return err(400, "lat, lng y title son requeridos");
      }

      const lat = parseFloat(d.lat);
      const lng = parseFloat(d.lng);

      if (isNaN(lat) || isNaN(lng)) {
        return err(400, "lat y lng deben ser numeros");
      }
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return err(400, "coordenadas invalidas");
      }
      if (String(d.title).trim().length === 0) {
        return err(400, "el titulo no puede estar vacio");
      }
      if (String(d.title).length > 100) {
        return err(400, "titulo demasiado largo");
      }

      const id = "p" + Date.now() + Math.random().toString(36).slice(2, 6);
      const durMin = Math.min(Math.max(parseInt(d.dur_min) || 60, 1), 720);
      const expiresAt = new Date(Date.now() + durMin * 60 * 1000).toISOString();

      const [row] = await sql`
        INSERT INTO flares (
          id, lat, lng, title, emoji, cat, cat_lbl, cat_color, cat_icon,
          type, body_text, image_url, video_url, expires_at, base_expires_at
        ) VALUES (
          ${id},
          ${lat},
          ${lng},
          ${String(d.title).trim()},
          ${d.emoji || "📍"},
          ${d.cat || "info"},
          ${d.cat_lbl || "Informacion"},
          ${d.cat_color || "#00f5a0"},
          ${d.cat_icon || "ℹ️"},
          ${d.type || "text"},
          ${d.body_text || null},
          ${d.image_url || null},
          ${d.video_url || null},
          ${expiresAt},
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
