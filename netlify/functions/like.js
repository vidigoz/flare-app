// netlify/functions/like.js
// PATCH /api/like?id=xxx  → suma +1 like y +5 min al flare

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";
import { ensureAdminSettingsTable, getAdminSetting } from "./_utils/settings.js";
import { addFloinsTransaction } from "./_utils/floins.js";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }

  if (event.httpMethod !== "PATCH" && event.httpMethod !== "POST") {
    return err(405, "Method not allowed");
  }

  const p = event.queryStringParameters || {};
  const id  = p.id;
  const uid = p.uid || null; // users.id del usuario que da like (opcional, Tier 2+)
  if (!id) return err(400, "id requerido");

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    await ensureAdminSettingsTable(sql);
    const likeRlEnabled = (await getAdminSetting(sql, "like_rate_limit", "on")) !== "off";

    if (likeRlEnabled) {
      const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim()
        || event.headers["client-ip"]
        || "unknown";
      const rl = rateLimit(ip, "like", 30, 60 * 60 * 1000);
      if (!rl.allowed) return {
        statusCode: 429,
        headers: { ...cors(), "Retry-After": String(rl.retryAfter) },
        body: JSON.stringify({ error: `Demasiadas solicitudes. Intenta en ${rl.retryAfter} segundos.`, retryAfter: rl.retryAfter }),
      };
    }

    const [row] = await sql`
      UPDATE flares
      SET
        likes      = likes + 1,
        expires_at = expires_at + INTERVAL '5 minutes'
      WHERE id = ${id}
        AND expires_at > NOW()
      RETURNING id, likes, expires_at
    `;

    if (!row) return err(404, "Flare no encontrado o ya expiró");

    let floinsEarnedByLiker = 0;

    // Guardar like en DB para Tier 2+ (para sincronizar entre dispositivos)
    if (uid) {
      try {
        await sql`
          INSERT INTO user_likes (user_id, flare_id)
          VALUES (${uid}, ${id})
          ON CONFLICT DO NOTHING
        `;
      } catch (e) {
        console.error("user_likes insert error:", e.message);
      }

      // ── Floins: bono por dar likes (+1 cada 10 likes, máx 2/día) ──
      try {
        const [todayCount] = await sql`
          SELECT COUNT(*)::int AS cnt
          FROM user_likes
          WHERE user_id = ${uid}
            AND liked_at >= CURRENT_DATE
        `;
        const likesHoy = todayCount?.cnt || 0;
        if (likesHoy > 0 && likesHoy % 10 === 0) {
          const [alreadyEarned] = await sql`
            SELECT COUNT(*)::int AS cnt
            FROM floins_transactions
            WHERE user_id = ${uid}
              AND reason = 'likes_given'
              AND created_at >= CURRENT_DATE
          `;
          if ((alreadyEarned?.cnt || 0) < 2) {
            await addFloinsTransaction(sql, { userId: uid, amount: 1, reason: "likes_given", flareId: id });
            floinsEarnedByLiker = 1;
          }
        }
      } catch (fe) {
        console.error("floins likes_given error:", fe.message);
      }
    }

    // ── Floins: bono al dueño por recibir múltiplo de 5 likes (+3) ──
    if (row.likes > 0 && row.likes % 5 === 0) {
      try {
        const [flare] = await sql`SELECT owner_uid FROM flares WHERE id = ${id} LIMIT 1`;
        const ownerUid = flare?.owner_uid;
        if (ownerUid) {
          const [alreadyRewarded] = await sql`
            SELECT id FROM floins_transactions
            WHERE reason = 'likes_received_5'
              AND flare_id = ${id}
              AND amount = 3
              AND user_id = ${ownerUid}
              AND created_at >= NOW() - INTERVAL '1 minute' * 2
            LIMIT 1
          `;
          // Verificar por likes exactos para no repetir el mismo milestone
          const milestone = row.likes;
          const [milestoneExists] = await sql`
            SELECT id FROM floins_transactions
            WHERE reason = 'likes_received_5'
              AND flare_id = ${id}
              AND user_id = ${ownerUid}
              AND amount * ${milestone / 5} > 0
            LIMIT 1
          `;
          // Simplificado: verificar si ya existe exactamente este número de registros
          const [countRewards] = await sql`
            SELECT COUNT(*)::int AS cnt
            FROM floins_transactions
            WHERE reason = 'likes_received_5'
              AND flare_id = ${id}
              AND user_id = ${ownerUid}
          `;
          const expectedRewards = Math.floor(row.likes / 5);
          if ((countRewards?.cnt || 0) < expectedRewards) {
            await addFloinsTransaction(sql, { userId: ownerUid, amount: 3, reason: "likes_received_5", flareId: id });
          }
        }
      } catch (fe) {
        console.error("floins likes_received_5 error:", fe.message);
      }
    }

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({
        ...row,
        ...(floinsEarnedByLiker > 0 ? { floins_earned: floinsEarnedByLiker, floins_reason: "likes_given" } : {}),
      }),
    };
  } catch (e) {
    console.error(e);
    return err(500, "Error interno: " + e.message);
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "PATCH, POST, OPTIONS",
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
