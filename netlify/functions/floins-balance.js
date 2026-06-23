// netlify/functions/floins-balance.js
// GET /api/floins-balance?uid=X  (o ?device_id=X para anónimos)
// Responde: { balance: 12, recent: [...últimas 5 transacciones] }

import { neon } from "@neondatabase/serverless";
import { getFloinsBalance } from "./_utils/floins.js";

const REASON_LABELS = {
  first_flare:     "Primer flare 🔥",
  publish:         "Publicaste un flare",
  register_phone:  "Registraste tu teléfono",
  likes_received_5:"Tu flare recibió 5 likes ⭐",
  likes_given:     "10 likes dados",
  extend_6h:       "Extendiste a 6 horas",
  extend_12h:      "Extendiste a 12 horas",
  extend_active:   "Extendiste +1 hora",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== "GET") return err(405, "Method not allowed");

  const p        = event.queryStringParameters || {};
  const userId   = p.uid       || null;
  const deviceId = p.device_id || null;

  if (!userId && !deviceId) return err(400, "uid o device_id requerido");

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    const balance = await getFloinsBalance(sql, { userId, deviceId });

    const recent = userId
      ? await sql`
          SELECT amount, reason, flare_id, created_at
          FROM floins_transactions
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT 5
        `
      : await sql`
          SELECT amount, reason, flare_id, created_at
          FROM floins_transactions
          WHERE device_id = ${deviceId}
          ORDER BY created_at DESC
          LIMIT 5
        `;

    const recentLabeled = recent.map(function(t) {
      return {
        amount:    t.amount,
        reason:    t.reason,
        label:     REASON_LABELS[t.reason] || t.reason,
        flare_id:  t.flare_id,
        created_at:t.created_at,
      };
    });

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ balance, recent: recentLabeled }),
    };
  } catch (e) {
    console.error("floins-balance error:", e);
    return err(500, "Error interno: " + e.message);
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
  return {
    statusCode: code,
    headers: cors(),
    body: JSON.stringify({ error: msg }),
  };
}
