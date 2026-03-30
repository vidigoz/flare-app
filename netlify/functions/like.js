// netlify/functions/like.js
// PATCH /api/like?id=xxx  → like con mecánica de reserva de tiempo

import { neon } from "@neondatabase/serverless";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }

  if (event.httpMethod !== "PATCH" && event.httpMethod !== "POST") {
    return err(405, "Method not allowed");
  }

  const id = (event.queryStringParameters || {}).id;
  if (!id) return err(400, "id requerido");

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // Si estamos en período base (NOW < base_expires_at): sumar +5 min a bonus_seconds
    // Si estamos en período extensión (NOW >= base_expires_at): solo sumar like, sin bonus
    const [row] = await sql`
      UPDATE flares
      SET
        likes         = likes + 1,
        bonus_seconds = CASE
          WHEN NOW() < base_expires_at THEN bonus_seconds + 300
          ELSE bonus_seconds
        END
      WHERE id = ${id}
        AND expires_at > NOW()
      RETURNING id, likes, expires_at, bonus_seconds, base_expires_at
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
