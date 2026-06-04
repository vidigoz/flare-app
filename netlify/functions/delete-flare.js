// netlify/functions/delete-flare.js
// DELETE /api/flares/delete?id=FLARE_ID&uid=OWNER_UID

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";
import { deleteR2ObjectByUrl } from "./_utils/r2.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }

  if (event.httpMethod !== "DELETE") {
    return err(405, "Method not allowed");
  }

  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim()
    || event.headers["client-ip"]
    || "unknown";

  const rl = rateLimit(ip, "delete_flare", 20, 60 * 60 * 1000);
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...cors(), "Retry-After": String(rl.retryAfter) },
      body: JSON.stringify({ error: `Demasiadas solicitudes. Intenta en ${rl.retryAfter} segundos.` }),
    };
  }

  const p = event.queryStringParameters || {};
  const id = String(p.id || "").trim();
  const uid = String(p.uid || "").trim();

  if (!id || !uid) return err(400, "id y uid son requeridos");

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // Verificar que existe y pertenece al uid
    const existing = await sql`
      SELECT id, owner_uid, image_url FROM flares WHERE id = ${id}
    `;

    if (!existing.length) return err(404, "Flare no encontrado");
    if (existing[0].owner_uid !== uid) return err(403, "No autorizado");

    const deleted = await sql`
      DELETE FROM flares WHERE id = ${id} AND owner_uid = ${uid} RETURNING id
    `;

    if (!deleted.length) return err(404, "Flare no encontrado");

    if (existing[0].image_url) {
      await deleteR2ObjectByUrl(existing[0].image_url);
    }

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ deleted: deleted[0].id }),
    };
  } catch (e) {
    console.error(e);
    return err(500, "Error interno: " + e.message);
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "DELETE, OPTIONS",
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
