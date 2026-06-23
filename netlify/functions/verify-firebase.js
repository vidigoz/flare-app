// netlify/functions/verify-firebase.js
// POST /api/verify/firebase  { users_id, id_token, username? }
// Tier 2 → Tier 3: agrega phone al registro existente por users_id
// Recovery: busca por phone y actualiza device_id

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";
import { addFloinsTransaction } from "./_utils/floins.js";

function getDb() {
  return neon(process.env.NETLIFY_DATABASE_URL);
}

async function verifyFirebaseToken(idToken) {
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
  return { uid: user.localId, phone_number: user.phoneNumber || null };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== "POST") return err(405, "Method not allowed");

  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const rl = rateLimit(ip, "verify_firebase", 10, 10 * 60 * 1000);
  if (!rl.allowed) return tooMany(rl.retryAfter);

  let d;
  try { d = JSON.parse(event.body || "{}"); } catch { return err(400, "JSON inválido"); }

  const usersId    = d.users_id   ? String(d.users_id)                            : null;
  const idToken    = d.id_token   ? String(d.id_token)                            : null;
  const newUsername = d.username  ? String(d.username).slice(0, 30).toLowerCase().trim() : null;
  const isRecovery = Boolean(d.is_recovery);

  if (!idToken) return err(400, "id_token requerido");

  if (newUsername && !/^[a-z0-9_]{3,30}$/.test(newUsername)) {
    return err(400, "username inválido: solo letras minúsculas, números y _ (3-30 caracteres)");
  }

  try {
    const decoded = await verifyFirebaseToken(idToken);
    const phone   = decoded.phone_number;
    if (!phone) return err(400, "El token no contiene número de teléfono");

    const sql = getDb();

    // ── CASO 1: Tier 2 → Tier 3 ──────────────────────────────
    // El usuario ya tiene users.id desde Tier 2, solo agregar phone y subir tier
    if (usersId && !isRecovery) {
      // Verificar que el phone no esté ya en otro perfil
      const phoneTaken = await sql`
        SELECT id FROM users WHERE phone = ${phone} AND id != ${usersId} LIMIT 1
      `;
      if (phoneTaken.length) return err(409, "Este número ya está asociado a otro perfil.");

      // Validar username si quiere cambiarlo
      if (newUsername) {
        const usernameTaken = await sql`
          SELECT id FROM users WHERE username = ${newUsername} AND id != ${usersId} LIMIT 1
        `;
        if (usernameTaken.length) return err(409, "Ese nombre ya está en uso. Elige otro.");
      }

      let user;
      if (newUsername) {
        [user] = await sql`
          UPDATE users SET phone = ${phone}, tier = 3, last_seen_at = NOW(), username = ${newUsername}
          WHERE id = ${usersId}
          RETURNING id, username, device_id, tier, phone, flares_count, created_at, avatar_url, onboarding_complete
        `;
      } else {
        [user] = await sql`
          UPDATE users SET phone = ${phone}, tier = 3, last_seen_at = NOW()
          WHERE id = ${usersId}
          RETURNING id, username, device_id, tier, phone, flares_count, created_at, avatar_url, onboarding_complete
        `;
      }

      if (!user) return err(404, "Perfil no encontrado.");

      // Actualizar username en flares si cambió
      if (newUsername) {
        await sql`
          UPDATE flares SET username = ${newUsername}
          WHERE owner_uid = ${usersId}
            AND created_at >= NOW() - INTERVAL '24 hours'
        `;
      }

      // ── Floins: bono de registro telefónico (+25, única vez) ──
      let floinsBonus = 0;
      try {
        const [alreadyRewarded] = await sql`
          SELECT id FROM floins_transactions
          WHERE user_id = ${usersId}
            AND reason = 'register_phone'
          LIMIT 1
        `;
        if (!alreadyRewarded) {
          await addFloinsTransaction(sql, { userId: usersId, amount: 25, reason: "register_phone" });
          floinsBonus = 25;
        }
      } catch (fe) {
        console.error("floins register_phone error:", fe.message);
      }

      return ok({ verified: true, user, ...(floinsBonus > 0 ? { floins_bonus: floinsBonus } : {}) });
    }

    // ── CASO 2: Recovery — buscar por phone ──────────────────
    // El usuario no tiene users.id local (borró localStorage o es otro dispositivo)
    const byPhone = await sql`
      SELECT id, username, device_id, tier, phone, flares_count, created_at, avatar_url, onboarding_complete
      FROM users WHERE phone = ${phone} LIMIT 1
    `;

    if (byPhone.length) {
      const [user] = await sql`
        UPDATE users
        SET last_seen_at = NOW(),
            onboarding_complete = CASE WHEN flares_count > 0 THEN TRUE ELSE onboarding_complete END
        WHERE phone = ${phone}
        RETURNING id, username, device_id, tier, phone, flares_count, created_at, avatar_url, onboarding_complete
      `;
      return ok({ verified: true, user });
    }

    // Si llegamos aquí sin users_id y sin recovery, no hay perfil que actualizar
    return err(404, "No encontramos tu perfil. Asegúrate de haber publicado al menos un flare antes de verificar.");

  } catch (e) {
    console.error("verify-firebase error:", e.code, e.message);
    if (e.code === "TOKEN_EXPIRED" || e.message === "TOKEN_EXPIRED") return err(401, "Sesión expirada. Vuelve a verificar.");
    if (e.code === "TOKEN_INVALID" || e.message === "TOKEN_INVALID") return err(401, "Código incorrecto. Intenta de nuevo.");
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
