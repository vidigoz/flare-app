// netlify/functions/verify-firebase.js
// POST /api/verify/firebase  { device_id, id_token, username? }
// Verifica el idToken de Firebase Phone Auth via Google REST API (sin firebase-admin)

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";

function getDb() {
  return neon(process.env.NETLIFY_DATABASE_URL);
}

async function verifyFirebaseToken(idToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID no configurado");

  // Google Identity Toolkit — verifica el token sin firebase-admin
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    const code = data.error?.message || "TOKEN_INVALID";
    const e = new Error(code);
    e.code = code;
    throw e;
  }

  const user = data.users?.[0];
  if (!user) throw new Error("TOKEN_INVALID");

  return {
    uid: user.localId,
    phone_number: user.phoneNumber || null,
  };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== "POST") return err(405, "Method not allowed");

  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const rl = rateLimit(ip, "verify_firebase", 10, 10 * 60 * 1000);
  if (!rl.allowed) return tooMany(rl.retryAfter);

  let d;
  try { d = JSON.parse(event.body || "{}"); } catch { return err(400, "JSON inválido"); }

  const deviceId    = d.device_id   ? String(d.device_id).slice(0, 64) : null;
  const idToken     = d.id_token    ? String(d.id_token)               : null;
  const newUsername = d.username    ? String(d.username).slice(0, 30).toLowerCase().trim() : null;
  const isRecovery  = Boolean(d.is_recovery);

  if (!deviceId) return err(400, "device_id requerido");
  if (!idToken)  return err(400, "id_token requerido");

  if (newUsername && !/^[a-z0-9_]{3,30}$/.test(newUsername)) {
    return err(400, "username inválido: solo letras minúsculas, números y _ (3-30 caracteres)");
  }

  try {
    const decoded = await verifyFirebaseToken(idToken);
    const phone   = decoded.phone_number;
    if (!phone) return err(400, "El token no contiene número de teléfono");

    const sql = getDb();

    const phoneTaken = await sql`
      SELECT id, username, device_id, tier, phone, flares_count, created_at
      FROM users WHERE phone = ${phone} AND device_id != ${deviceId} LIMIT 1
    `;

    // Recuperación: el teléfono existe en otro device_id — transferir perfil a este dispositivo
    if (phoneTaken.length && isRecovery) {
      const [user] = await sql`
        UPDATE users SET device_id = ${deviceId}
        WHERE phone = ${phone}
        RETURNING id, username, device_id, tier, phone, flares_count, created_at
      `;
      return ok({ verified: true, user });
    }

    if (phoneTaken.length) return err(409, "Este número ya está asociado a otro perfil.");

    if (newUsername) {
      const usernameTaken = await sql`
        SELECT id FROM users WHERE username = ${newUsername} AND device_id != ${deviceId} LIMIT 1
      `;
      if (usernameTaken.length) return err(409, "Ese nombre ya está en uso. Elige otro.");
    }

    const existing = await sql`
      SELECT id, username, device_id, tier, phone FROM users WHERE device_id = ${deviceId} LIMIT 1
    `;

    let user;
    if (existing.length) {
      if (newUsername) {
        [user] = await sql`
          UPDATE users SET tier = 3, phone = ${phone}, username = ${newUsername}
          WHERE device_id = ${deviceId}
          RETURNING id, username, device_id, tier, phone, flares_count, created_at
        `;
        // Actualizar username en flares vigentes o dentro de ventana de 24h
        await sql`
          UPDATE flares SET username = ${newUsername}
          WHERE owner_uid = ${deviceId}
            AND created_at >= NOW() - INTERVAL '24 hours'
        `;
      } else {
        [user] = await sql`
          UPDATE users SET tier = 3, phone = ${phone}
          WHERE device_id = ${deviceId}
          RETURNING id, username, device_id, tier, phone, flares_count, created_at
        `;
      }
    } else {
      const username = newUsername || ("flare_" + Math.random().toString(36).slice(2, 8));
      [user] = await sql`
        INSERT INTO users (username, device_id, tier, phone)
        VALUES (${username}, ${deviceId}, 3, ${phone})
        RETURNING id, username, device_id, tier, phone, flares_count, created_at
      `;
      // Actualizar flares existentes con el username asignado
      await sql`
        UPDATE flares SET username = ${username}
        WHERE owner_uid = ${deviceId}
          AND created_at >= NOW() - INTERVAL '24 hours'
      `;
    }

    return ok({ verified: true, user });
  } catch (e) {
    console.error("verify-firebase error:", e.code, e.message);
    if (e.code === "TOKEN_EXPIRED" || e.message === "TOKEN_EXPIRED") return err(401, "Sesión expirada. Vuelve a verificar.");
    if (e.code === "TOKEN_INVALID" || e.message === "TOKEN_INVALID") return err(401, "Código incorrecto. Intenta de nuevo.");
    if (e.message && e.message.includes("unique")) return err(409, "Este número ya está registrado.");
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
function ok(data) {
  return { statusCode: 200, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify(data) };
}
function err(code, msg) {
  return { statusCode: code, headers: cors(), body: JSON.stringify({ error: msg }) };
}
function tooMany(retryAfter) {
  return { statusCode: 429, headers: { ...cors(), "Retry-After": String(retryAfter) }, body: JSON.stringify({ error: `Demasiados intentos. Espera ${Math.ceil(retryAfter / 60)} minutos.`, retryAfter }) };
}
