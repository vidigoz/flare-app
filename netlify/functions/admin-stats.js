// netlify/functions/admin-stats.js
// GET /api/admin/stats?days=7&key=SECRET

import { neon } from "@neondatabase/serverless";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== "GET") return err(405, "Method not allowed");

  const secret   = process.env.ADMIN_SECRET;
  const provided = event.headers["x-admin-key"] || event.queryStringParameters?.key || "";
  if (!secret || provided !== secret) return err(401, "No autorizado");

  const days = Math.min(Math.max(parseInt(event.queryStringParameters?.days || "7"), 1), 365);

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    const [usersDb, flares, newUsersDb, activeUsersDb, tier2Stats] = await Promise.all([
      // Tier 3 desde tabla users
      sql`
        SELECT tier, COUNT(*)::int AS total
        FROM users
        GROUP BY tier ORDER BY tier
      `,
      // Flares publicados en el período
      sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE expires_at > NOW())::int AS activos,
          COUNT(*) FILTER (WHERE image_url IS NOT NULL)::int AS con_imagen
        FROM flares
        WHERE created_at >= NOW() - (${days} || ' days')::interval
      `,
      // Nuevos Tier 3 en el período
      sql`
        SELECT tier, COUNT(*)::int AS nuevos
        FROM users
        WHERE created_at >= NOW() - (${days} || ' days')::interval
        GROUP BY tier ORDER BY tier
      `,
      // Activos Tier 3 en el período (last_seen_at o created_at)
      sql`
        SELECT tier, COUNT(*)::int AS activos
        FROM users
        WHERE COALESCE(last_seen_at, created_at) >= NOW() - (${days} || ' days')::interval
        GROUP BY tier ORDER BY tier
      `,
      // Tier 2: usuarios únicos que publicaron flares (owner_uid en flares, no en users)
      sql`
        SELECT
          COUNT(DISTINCT owner_uid)::int AS total,
          COUNT(DISTINCT CASE WHEN created_at >= NOW() - (${days} || ' days')::interval THEN owner_uid END)::int AS activos_periodo,
          COUNT(DISTINCT CASE WHEN created_at >= NOW() - (${days} || ' days')::interval THEN owner_uid END)::int AS nuevos_periodo
        FROM flares
        WHERE owner_uid NOT IN (SELECT device_id FROM users WHERE device_id IS NOT NULL)
          AND username IS NOT NULL
      `,
    ]);

    // Combinar Tier 2 (de flares) con Tier 3 (de users)
    const users = [
      { tier: 2, total: tier2Stats[0]?.total || 0 },
      ...usersDb,
    ];
    const newUsers = [
      { tier: 2, nuevos: tier2Stats[0]?.nuevos_periodo || 0 },
      ...newUsersDb,
    ];
    const activeUsers = [
      { tier: 2, activos: tier2Stats[0]?.activos_periodo || 0 },
      ...activeUsersDb,
    ];

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ days, users, flares: flares[0], newUsers, activeUsers }),
    };
  } catch (e) {
    console.error("admin-stats error:", e.message);
    return err(500, "Error interno: " + e.message);
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
  };
}
function err(code, msg) {
  return { statusCode: code, headers: cors(), body: JSON.stringify({ error: msg }) };
}
