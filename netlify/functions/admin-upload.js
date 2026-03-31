// netlify/functions/admin-upload.js
// POST /api/admin/upload  — carga flares en masa desde CSV
// Requiere header: x-admin-key: <ADMIN_SECRET>

import { neon } from "@neondatabase/serverless";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }
  if (event.httpMethod !== "POST") {
    return err(405, "Method not allowed");
  }

  // ── Verificar contrasena PRIMERO ──
  const secret = process.env.ADMIN_SECRET;
  const provided = event.headers["x-admin-key"];
  if (!secret || provided !== secret) {
    return err(401, "No autorizado");
  }

  // ── Parsear body ──
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return err(400, "JSON invalido");
  }

  const { rows } = body;

  // Si rows viene vacio es solo un ping de verificacion de login
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, inserted: 0, errors: 0, detail: [] }),
    };
  }

  if (rows.length > 5000) {
    return err(400, "Maximo 5000 flares por carga");
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    const inserted = [];
    const errors = [];

    const CATS = {
      food:     { lbl: "Comida y Bebida", color: "#ff9500", icon: "🍽️" },
      sale:     { lbl: "Ventas",          color: "#00c2ff", icon: "🏷️" },
      event:    { lbl: "Evento",          color: "#a000f5", icon: "🎉" },
      incident: { lbl: "Suceso",          color: "#ff4060", icon: "⚡"  },
      info:     { lbl: "Informacion",     color: "#00f5a0", icon: "ℹ️"  },
    };

    for (const row of rows) {
      try {
        const lat = parseFloat(row.lat);
        const lng = parseFloat(row.lng);
        if (!row.title || isNaN(lat) || isNaN(lng)) {
          errors.push({ row, reason: "lat, lng o title faltante" });
          continue;
        }

        const id = "p" + Date.now() + Math.random().toString(36).slice(2, 6);
        const durMin = Math.min(Math.max(parseInt(row.dur_min) || 60, 1), 720);
        const expiresAt = new Date(Date.now() + durMin * 60 * 1000).toISOString();

        const cat = CATS[row.cat] ? row.cat : "info";
        const catData = CATS[cat];
        const bizName = row.biz_name || row.bizname || row.biz || null;

        const [inserted_row] = await sql`
          INSERT INTO flares (
            id, lat, lng, title, emoji, cat, cat_lbl, cat_color, cat_icon,
            type, body_text, biz_name, expires_at
          ) VALUES (
            ${id}, ${lat}, ${lng},
            ${String(row.title).trim().slice(0, 100)},
            ${row.emoji || catData.icon},
            ${cat}, ${catData.lbl}, ${catData.color}, ${catData.icon},
            'text',
            ${row.description || null},
            ${bizName || null},
            ${expiresAt}
          )
          RETURNING id, title, lat, lng, expires_at
        `;
        inserted.push(inserted_row);
      } catch (e) {
        errors.push({ row, reason: e.message });
      }
    }

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({
        inserted: inserted.length,
        errors: errors.length,
        detail: errors,
      }),
    };
  } catch (e) {
    console.error(e);
    return err(500, "Error interno: " + e.message);
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
  };
}
function err(code, msg) {
  return {
    statusCode: code,
    headers: cors(),
    body: JSON.stringify({ error: msg }),
  };
}
