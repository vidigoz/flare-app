// netlify/functions/report.js
// POST /api/report?id=FLARE_ID  → reportar un flare

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";

const VALID_REASONS = ["inapropiado", "ubicacion", "duplicado", "spam"];

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }

  if (event.httpMethod !== "POST") {
    return err(405, "Method not allowed");
  }

  const id = (event.queryStringParameters || {}).id;
  if (!id) return err(400, "id requerido");

  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim()
    || event.headers["client-ip"]
    || "unknown";

  const rl = rateLimit(ip, "report", 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...cors(), "Retry-After": String(rl.retryAfter) },
      body: JSON.stringify({ error: `Demasiadas solicitudes. Intenta en ${rl.retryAfter} segundos.`, retryAfter: rl.retryAfter }),
    };
  }

  let d;
  try {
    d = JSON.parse(event.body || "{}");
  } catch (e) {
    return err(400, "JSON invalido");
  }

  if (!VALID_REASONS.includes(d.reason)) {
    return err(400, "reason invalido");
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    const reportId = "r" + Date.now() + Math.random().toString(36).slice(2, 6);

    await sql`
      INSERT INTO flare_reports (id, flare_id, reason)
      VALUES (${reportId}, ${id}, ${d.reason})
    `;

    const [row] = await sql`
      UPDATE flares
      SET
        reports_count = reports_count + 1,
        hidden = CASE WHEN reports_count + 1 >= 3 THEN TRUE ELSE hidden END
      WHERE id = ${id}
        AND expires_at > NOW()
      RETURNING id, reports_count, hidden
    `;

    if (!row) return err(404, "Flare no encontrado o ya expiró");

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, hidden: row.hidden }),
    };
  } catch (e) {
    console.error(e);
    return err(500, "Error interno: " + e.message);
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
