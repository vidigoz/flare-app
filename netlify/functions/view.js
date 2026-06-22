// netlify/functions/view.js
// POST /api/view?id=xxx  → suma +1 vista al flare

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }

  if (event.httpMethod !== "POST") {
    return err(405, "Method not allowed");
  }

  const p = event.queryStringParameters || {};
  const id = p.id;
  if (!id) return err(400, "id requerido");

  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim()
    || event.headers["client-ip"]
    || "unknown";

  // Rate limit generoso — evita spam pero permite aperturas normales
  const rl = rateLimit(ip + "_" + id, "view", 10, 60 * 1000);
  if (!rl.allowed) {
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) };
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    const [row] = await sql`
      UPDATE flares
      SET views = views + 1
      WHERE id = ${id}
        AND hidden = FALSE
        AND expires_at > NOW()
      RETURNING id, views
    `;

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify(row || { ok: true }),
    };
  } catch (e) {
    console.error("view error:", e.message);
    return err(500, "Error interno");
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
