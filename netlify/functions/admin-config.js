// netlify/functions/admin-config.js
// GET  /api/admin/config  — lee los ajustes administrativos
// POST /api/admin/config  — actualiza la bandera de Non Register Flare Limit
// Requiere header: x-admin-key: <ADMIN_SECRET>

import { neon } from "@neondatabase/serverless";
import {
  ensureAdminSettingsTable,
  getAdminSetting,
  upsertAdminSetting,
} from "./_utils/settings.js";

const FLAG_KEY       = "non_register_flare_limit";
const DAILY_FLAG_KEY = "daily_flare_limit";
const VALID_KEYS     = [FLAG_KEY, DAILY_FLAG_KEY];

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }

  if (!["GET", "POST"].includes(event.httpMethod)) {
    return err(405, "Method not allowed");
  }

  const secret = process.env.ADMIN_SECRET;
  const provided = event.headers["x-admin-key"];
  if (!secret || provided !== secret) {
    return err(401, "No autorizado");
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    await ensureAdminSettingsTable(sql);

    if (event.httpMethod === "GET") {
      const [v1, v2] = await Promise.all([
        getAdminSetting(sql, FLAG_KEY, "on"),
        getAdminSetting(sql, DAILY_FLAG_KEY, "on"),
      ]);
      return {
        statusCode: 200,
        headers: { ...cors(), "Content-Type": "application/json" },
        body: JSON.stringify({
          non_register_flare_limit: v1 !== "off",
          daily_flare_limit:        v2 !== "off",
        }),
      };
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return err(400, "JSON invalido");
    }

    const key = body.key;
    if (!VALID_KEYS.includes(key)) return err(400, "key invalido");
    const enabled = body.enabled === true;
    await upsertAdminSetting(sql, key, enabled ? "on" : "off");

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled }),
    };
  } catch (e) {
    console.error(e);
    return err(500, "Error interno: " + e.message);
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
  };
}

function err(code, msg) {
  return {
    statusCode: code,
    headers: cors(),
    body: JSON.stringify({ error: msg }),
  };
}
