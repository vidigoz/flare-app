// netlify/functions/admin-stats.js
// GET /api/admin/stats — métricas completas para el dashboard admin
// Requiere header: x-admin-key: <ADMIN_SECRET>

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

    // Verificar si existe la tabla analytics_events
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'analytics_events'
      ) AS exists
    `;
    const hasAnalytics = tableCheck[0]?.exists === true;

    const [
      flaresStats,
      likesStats,
      negociosActivos,
      flaresPorCat,
      horaPico,
      usersDb,
      newUsersDb,
      activeUsersDb,
      tier2Stats,
    ] = await Promise.all([
      // Flares hoy, activos, semana, total — excluye seeds de flare_admin
      sql`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')::int AS flares_hoy,
          COUNT(*) FILTER (WHERE expires_at > NOW())::int AS flares_activos,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS flares_semana,
          COUNT(*)::int AS flares_total
        FROM flares WHERE hidden = FALSE AND (username IS NULL OR username != 'flare_admin')
      `,
      // Likes total, flares con like, y likes de hoy (liked_at DEFAULT NOW())
      sql`
        SELECT
          COUNT(*)::int AS likes_total,
          COUNT(DISTINCT flare_id)::int AS flares_con_like,
          COUNT(*) FILTER (WHERE liked_at >= NOW() - INTERVAL '1 day')::int AS likes_hoy
        FROM user_likes
      `,
      // Negocios únicos activos últimos 7 días — excluye seeds de flare_admin
      sql`
        SELECT COUNT(DISTINCT biz_name)::int AS negocios_activos_7d
        FROM flares
        WHERE biz_name IS NOT NULL
          AND created_at >= NOW() - INTERVAL '7 days'
          AND hidden = FALSE
          AND (username IS NULL OR username != 'flare_admin')
      `,
      // Flares por categoría — excluye seeds de flare_admin
      sql`
        SELECT cat, COUNT(*)::int AS count
        FROM flares
        WHERE hidden = FALSE
          AND created_at >= NOW() - (${days} || ' days')::interval
          AND (username IS NULL OR username != 'flare_admin')
        GROUP BY cat ORDER BY count DESC
      `,
      // Hora pico (últimos 7 días) — excluye seeds de flare_admin
      sql`
        SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Tijuana')::int AS hora,
               COUNT(*)::int AS count
        FROM flares
        WHERE hidden = FALSE
          AND created_at >= NOW() - INTERVAL '7 days'
          AND (username IS NULL OR username != 'flare_admin')
        GROUP BY hora ORDER BY hora
      `,
      // Usuarios tier 3
      sql`SELECT tier, COUNT(*)::int AS total FROM users GROUP BY tier ORDER BY tier`,
      // Nuevos usuarios por tier en el período
      sql`
        SELECT tier, COUNT(*)::int AS nuevos FROM users
        WHERE created_at >= NOW() - (${days} || ' days')::interval
        GROUP BY tier ORDER BY tier
      `,
      // Activos por tier en el período
      sql`
        SELECT tier, COUNT(*)::int AS activos FROM users
        WHERE COALESCE(last_seen_at, created_at) >= NOW() - (${days} || ' days')::interval
        GROUP BY tier ORDER BY tier
      `,
      // Tier 2 (usuarios que publicaron flares, no registrados en users)
      sql`
        SELECT
          COUNT(DISTINCT owner_uid)::int AS total,
          COUNT(DISTINCT CASE WHEN created_at >= NOW() - (${days} || ' days')::interval THEN owner_uid END)::int AS activos_periodo
        FROM flares
        WHERE owner_uid IS NOT NULL AND username IS NOT NULL
      `,
    ]);

    // Métricas de analytics (solo si existe la tabla)
    let visitas_unicas_hoy = 0;
    let shares_hoy = 0;
    let pwa_instaladas_total = 0;

    if (hasAnalytics) {
      const [visitas, shares, pwa] = await Promise.all([
        sql`
          SELECT COUNT(DISTINCT device_id)::int AS count
          FROM analytics_events
          WHERE event_type = 'map_open'
            AND created_at >= NOW() - INTERVAL '1 day'
        `,
        sql`
          SELECT COUNT(*)::int AS count
          FROM analytics_events
          WHERE event_type = 'flare_share'
            AND created_at >= NOW() - INTERVAL '1 day'
        `,
        sql`
          SELECT COUNT(*)::int AS count
          FROM analytics_events
          WHERE event_type IN ('pwa_installed', 'pwa_launched_standalone')
        `,
      ]);
      visitas_unicas_hoy   = visitas[0]?.count || 0;
      shares_hoy           = shares[0]?.count || 0;
      pwa_instaladas_total = pwa[0]?.count || 0;
    }

    const flares_hoy     = flaresStats[0]?.flares_hoy || 0;
    const flares_activos = flaresStats[0]?.flares_activos || 0;
    const flares_semana  = flaresStats[0]?.flares_semana || 0;
    const flares_total   = flaresStats[0]?.flares_total || 0;
    const likes_hoy      = likesStats[0]?.likes_hoy || 0;
    const likes_total    = likesStats[0]?.likes_total || 0;
    const flares_con_like = likesStats[0]?.flares_con_like || 0;
    const flares_sin_like = Math.max(0, flares_activos - flares_con_like);
    const negocios_activos_7d = negociosActivos[0]?.negocios_activos_7d || 0;

    // Ratio viral: shares / visitas * 100
    const ratio_viral_pct = visitas_unicas_hoy > 0
      ? Math.round((shares_hoy / visitas_unicas_hoy) * 100)
      : 0;

    // Usuarios
    const usuarios_tier1 = (usersDb.find(u => u.tier === 1)?.total || 0);
    const usuarios_tier2 = tier2Stats[0]?.total || 0;
    const usuarios_tier3 = (usersDb.find(u => u.tier === 3)?.total || 0);

    const users = [
      { tier: 2, total: usuarios_tier2 },
      ...usersDb,
    ];
    const newUsers = [
      { tier: 2, nuevos: tier2Stats[0]?.activos_periodo || 0 },
      ...newUsersDb,
    ];
    const activeUsers = [
      { tier: 2, activos: tier2Stats[0]?.activos_periodo || 0 },
      ...activeUsersDb,
    ];

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({
        days,
        // Flares
        flares_hoy,
        flares_activos,
        flares_semana,
        flares_total,
        // Likes
        likes_hoy,
        likes_total,
        flares_con_like,
        flares_sin_like,
        // Negocios
        negocios_activos_7d,
        // Distribuciones
        flares_por_categoria: flaresPorCat,
        hora_pico: horaPico,
        // Usuarios
        usuarios_tier1,
        usuarios_tier2,
        usuarios_tier3,
        // Analytics
        visitas_unicas_hoy,
        shares_hoy,
        ratio_viral_pct,
        pwa_instaladas_total,
        has_analytics: hasAnalytics,
        // Compat con versión anterior
        flares: flaresStats[0],
        users,
        newUsers,
        activeUsers,
      }),
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
