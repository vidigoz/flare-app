// netlify/functions/user-likes.js
// GET /api/likes?uid=... → obtener IDs de flares que dio like el usuario

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== "GET") return err(405, "Method not allowed");

  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const rl = rateLimit(ip, "get_likes", 30, 60 * 1000);
  if (!rl.allowed) return err(429, "Demasiadas solicitudes");

  const { uid, flare_id } = event.queryStringParameters || {};
  if (!uid) return err(400, "uid requerido");

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    const rows = flare_id
      ? await sql`SELECT flare_id FROM user_likes WHERE user_id = ${uid} AND flare_id = ${flare_id}`
      : await sql`SELECT flare_id FROM user_likes WHERE user_id = ${uid} ORDER BY liked_at DESC LIMIT 500`;
    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ liked: rows.map(function(r) { return r.flare_id; }) }),
    };
  } catch (e) {
    console.error("user-likes error:", e.message);
    return err(500, "Error interno");
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
function err(code, msg) {
  return { statusCode: code, headers: cors(), body: JSON.stringify({ error: msg }) };
}
