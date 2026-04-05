// netlify/functions/admin-purge.js
// DELETE /api/admin/purge  â€” borra todos los flares (para limpiar datos de prueba)
// Requiere header: x-admin-key: <ADMIN_SECRET>

import { neon } from "@neondatabase/serverless";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }
  if (event.httpMethod !== "DELETE" && event.httpMethod !== "POST") {
    return err(405, "Method not allowed");
  }

  const secret = process.env.ADMIN_SECRET;
  const provided = event.headers["x-admin-key"];
  if (!secret || provided !== secret) {
    return err(401, "No autorizado");
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    const id = (event.queryStringParameters || {}).id;
    if (id) {
      /* Eliminar un flare específico por ID */
      const result = await sql`DELETE FROM flares WHERE id = ${id} RETURNING id, title, emoji`;
      if (!result.length) return err(404, "Flare no encontrado");
      return {
        statusCode: 200,
        headers: { ...cors(), "Content-Type": "application/json" },
        body: JSON.stringify({ deleted: 1, flare: result[0] }),
      };
    }
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
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
  };
}
function err(code, msg) {
  return { statusCode: code, headers: cors(), body: JSON.stringify({ error: msg }) };
}
