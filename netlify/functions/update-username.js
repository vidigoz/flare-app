// netlify/functions/update-username.js
// POST /api/profile/username  { uid, username }
// Cambia el username de un usuario Tier 3. Límite: 1 cambio cada 7 días (2 primeros cambios libres).

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";

const CHANGE_INTERVAL_DAYS = 7;
const FREE_CHANGES = 2; // los primeros 2 cambios son libres (el asignado + uno de gracia)

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== "POST") return err(405, "Method not allowed");

  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const rl = rateLimit(ip, "update_username", 10, 60 * 60 * 1000);
  if (!rl.allowed) return err(429, "Demasiados intentos. Espera un momento.");

  let d;
  try { d = JSON.parse(event.body || "{}"); } catch { return err(400, "JSON inválido"); }

  const uid        = d.uid      ? String(d.uid).slice(0, 64) : null;
  const newUsername = d.username ? String(d.username).slice(0, 30).toLowerCase().trim() : null;

  if (!uid)         return err(400, "uid requerido");
  if (!newUsername) return err(400, "username requerido");
  if (!/^[a-z0-9_]{3,30}$/.test(newUsername)) {
    return err(400, "Solo letras minúsculas, números y _ (3-30 caracteres)");
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // Verificar que el usuario existe y es Tier 3
    const rows = await sql`
      SELECT id, username, tier, username_changes, username_changed_at
      FROM users WHERE id = ${uid} LIMIT 1
    `;
    if (!rows.length) return err(404, "Perfil no encontrado");
    const user = rows[0];
    if (user.tier < 3) return err(403, "Solo usuarios verificados pueden cambiar su nombre");

    // Verificar disponibilidad del username
    const taken = await sql`
      SELECT id FROM users WHERE username = ${newUsername} AND id != ${uid} LIMIT 1
    `;
    if (taken.length) return err(409, "Ese nombre ya está en uso. Elige otro.");

    // Verificar límite de 7 días (después de los primeros FREE_CHANGES cambios)
    const changes = user.username_changes || 0;
    if (changes >= FREE_CHANGES && user.username_changed_at) {
      const daysSince = (Date.now() - new Date(user.username_changed_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < CHANGE_INTERVAL_DAYS) {
        const daysLeft = Math.ceil(CHANGE_INTERVAL_DAYS - daysSince);
        return err(429, `Puedes cambiar tu nombre en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}.`);
      }
    }

    // Actualizar username
    const [updated] = await sql`
      UPDATE users
      SET username = ${newUsername},
          username_changes = COALESCE(username_changes, 0) + 1,
          username_changed_at = NOW()
      WHERE id = ${uid}
      RETURNING id, username, username_changes, username_changed_at
    `;

    // Actualizar username en flares de las últimas 24h
    await sql`
      UPDATE flares SET username = ${newUsername}
      WHERE owner_uid = ${uid}
        AND created_at >= NOW() - INTERVAL '24 hours'
    `;

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, username: updated.username, username_changes: updated.username_changes }),
    };
  } catch (e) {
    console.error("update-username error:", e.message);
    if (e.message && e.message.includes("unique")) return err(409, "Ese nombre ya está en uso.");
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
