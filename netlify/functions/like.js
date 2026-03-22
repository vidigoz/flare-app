// netlify/functions/like.js
// PATCH /api/like?id=xxx  → suma +1 like y +5 min al flare

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

    const BONUS_MS = 5 * 60 * 1000; // +5 min en ms
    const MAX_EXTRA = 12 * 60 * 60 * 1000; // máximo 12h desde creación

    const [row] = await sql`
      UPDATE flares
      SET
        likes      = likes + 1,
        expires_at = LEAST(
          expires_at + (${BONUS_MS} * INTERVAL '1 millisecond'),
          created_at + (${MAX_EXTRA} * INTERVAL '1 millisecond')
        )
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
