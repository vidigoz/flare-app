// netlify/functions/admin-purge.js
// DELETE /api/admin/purge  â€” borra todos los flares (para limpiar datos de prueba)
// Requiere header: x-admin-key: <ADMIN_SECRET>

import { neon } from "@neondatabase/serverless";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }

  const secret = process.env.ADMIN_SECRET;
  const provided = event.headers["x-admin-key"];
  if (!secret || provided !== secret) {
    return err(401, "No autorizado");
  }

  const id = (event.queryStringParameters || {}).id;

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    /* GET → listar flares ocultos (hidden=true, no expirados) */
    if (event.httpMethod === "GET") {
      const rows = await sql`
        SELECT id, title, emoji, cat, biz_name, lat, lng, reports_count, likes, expires_at, created_at
        FROM flares
        WHERE hidden = TRUE AND expires_at > NOW()
        ORDER BY reports_count DESC, created_at DESC
        LIMIT 100
      `;
      return {
        statusCode: 200,
        headers: { ...cors(), "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      };
    }

    /* PATCH ?id= → restaurar un flare oculto */
    if (event.httpMethod === "PATCH") {
      if (!id) return err(400, "id requerido");
      const result = await sql`
        UPDATE flares SET hidden = FALSE, reports_count = 0
        WHERE id = ${id} RETURNING id, title, emoji
      `;
      if (!result.length) return err(404, "Flare no encontrado");
      return {
        statusCode: 200,
        headers: { ...cors(), "Content-Type": "application/json" },
        body: JSON.stringify({ restored: result[0] }),
      };
    }

    if (event.httpMethod !== "DELETE" && event.httpMethod !== "POST") {
      return err(405, "Method not allowed");
    }

    /* DELETE ?id= → eliminar un flare específico */
    if (id) {
      const result = await sql`DELETE FROM flares WHERE id = ${id} RETURNING id, title, emoji`;
      if (!result.length) return err(404, "Flare no encontrado");
      return {
        statusCode: 200,
        headers: { ...cors(), "Content-Type": "application/json" },
        body: JSON.stringify({ deleted: 1, flare: result[0] }),
      };
    }

    /* DELETE sin id → purge total */
    const result = await sql`DELETE FROM flares RETURNING id`;
    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ deleted: result.length }),
    };
  } catch (e) {
    return err(500, "Error: " + e.message);
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
  };
}
function err(code, msg) {
  return { statusCode: code, headers: cors(), body: JSON.stringify({ error: msg }) };
}
