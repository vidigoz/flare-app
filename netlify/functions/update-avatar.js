// netlify/functions/update-avatar.js
// POST /api/profile/avatar  { device_id, avatar_url }

import { neon } from "@neondatabase/serverless";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== "POST") return err(405, "Method not allowed");

  let d;
  try { d = JSON.parse(event.body || "{}"); } catch { return err(400, "JSON inválido"); }

  const deviceId  = d.device_id  ? String(d.device_id).slice(0, 64) : null;
  const avatarUrl = d.avatar_url ? String(d.avatar_url).slice(0, 500) : null;

  if (!deviceId || !avatarUrl) return err(400, "device_id y avatar_url requeridos");

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    await sql`UPDATE users SET avatar_url = ${avatarUrl} WHERE device_id = ${deviceId}`;
    return { statusCode: 200, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
  } catch (e) {
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
  return { statusCode: code, headers: cors(), body: JSON.stringify({ error: msg }) };
}
