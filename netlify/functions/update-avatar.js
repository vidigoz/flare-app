// netlify/functions/update-avatar.js
// POST /api/profile/avatar  { uid, avatar_url }

import { neon } from "@neondatabase/serverless";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== "POST") return err(405, "Method not allowed");

  let d;
  try { d = JSON.parse(event.body || "{}"); } catch { return err(400, "JSON inválido"); }

  const uid       = d.uid        ? String(d.uid).slice(0, 64)        : null;
  const avatarUrl = d.avatar_url ? String(d.avatar_url).slice(0, 500) : null;

  if (!uid)       return err(400, "uid requerido");
  if (!avatarUrl) return err(400, "avatar_url requerido");

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    const result = await sql`UPDATE users SET avatar_url = ${avatarUrl} WHERE id = ${uid} RETURNING id`;
    return { statusCode: 200, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, updated: result.length }) };
  } catch (e) {
    console.error("update-avatar error:", e.message);
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
