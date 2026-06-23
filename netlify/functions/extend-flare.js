// netlify/functions/extend-flare.js
// POST /api/extend-flare  { flare_id, uid?, device_id? }
// Costo: 3 Floins — extiende expires_at +1 hora (máx 12h desde created_at)

import { neon } from "@neondatabase/serverless";
import { getFloinsBalance, addFloinsTransaction } from "./_utils/floins.js";

const EXTEND_COST = 5;
const MAX_HOURS_FROM_CREATION = 12;

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== "POST") return err(405, "Method not allowed");

  let d;
  try { d = JSON.parse(event.body || "{}"); } catch { return err(400, "JSON inválido"); }

  const flareId  = d.flare_id ? String(d.flare_id) : null;
  const userId   = d.uid       ? String(d.uid)       : null;
  const deviceId = d.device_id ? String(d.device_id) : null;

  if (!flareId) return err(400, "flare_id requerido");
  if (!userId && !deviceId) return err(400, "uid o device_id requerido");

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // Verificar que el flare existe y no ha expirado
    const [flare] = await sql`
      SELECT id, owner_uid, expires_at, created_at
      FROM flares
      WHERE id = ${flareId} AND expires_at > NOW()
      LIMIT 1
    `;
    if (!flare) return err(404, "Flare no encontrado o ya expiró");

    // Cualquier usuario puede extender cualquier flare (pagando Floins)

    // Verificar límite de 12h desde creación
    const createdAt  = new Date(flare.created_at).getTime();
    const currentExp = new Date(flare.expires_at).getTime();
    const maxExpires = createdAt + MAX_HOURS_FROM_CREATION * 60 * 60 * 1000;
    if (currentExp + 60 * 60 * 1000 > maxExpires) {
      return err(400, "Este flare ya alcanzó el máximo de 12 horas desde su creación");
    }

    // Verificar balance
    const balance = await getFloinsBalance(sql, { userId, deviceId });
    if (balance < EXTEND_COST) {
      return err(402, JSON.stringify({ error: "INSUFFICIENT_FLOINS", required: EXTEND_COST, balance }));
    }

    // Extender +1 hora
    const [updated] = await sql`
      UPDATE flares
      SET expires_at = expires_at + INTERVAL '1 hour'
      WHERE id = ${flareId}
      RETURNING expires_at
    `;

    // Descontar Floins
    await addFloinsTransaction(sql, {
      userId,
      deviceId,
      amount: -EXTEND_COST,
      reason: "extend_active",
      flareId,
    });

    const newBalance = balance - EXTEND_COST;

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ expires_at: updated.expires_at, floins_balance: newBalance }),
    };
  } catch (e) {
    console.error("extend-flare error:", e);
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
