// netlify/functions/flares.js
// GET  /api/flares?minLat=&maxLat=&minLng=&maxLng=   → flares visibles en bbox
// POST /api/flares                                    → crear nuevo flare

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";
import { ensureAdminSettingsTable, getAdminSetting } from "./_utils/settings.js";
import { containsProfanity } from "./_utils/profanityList.js";
import { deleteR2ObjectByUrl, isR2PublicUrl } from "./_utils/r2.js";

function getDb() {
  return neon(process.env.NETLIFY_DATABASE_URL);
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }

  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim()
    || event.headers["client-ip"]
    || "unknown";

  try {
    const sql = getDb();

    // ── GET ──────────────────────────────────────────
    if (event.httpMethod === "GET") {
      const rl = rateLimit(ip, "get_flares", 60, 60 * 1000);
      if (!rl.allowed) return tooMany(rl.retryAfter);
      const p = event.queryStringParameters || {};

      await cleanupArchivedFlares(sql);

      /* Fetch por ID directo — para deep links */
      if (p.id) {
        const rows = await sql`
          SELECT * FROM flares
          WHERE id = ${p.id} AND expires_at > NOW() AND hidden = FALSE
          LIMIT 1
        `;
        return {
          statusCode: 200,
          headers: { ...cors(), "Content-Type": "application/json" },
          body: JSON.stringify(rows[0] || null),
        };
      }

      /* Fetch por owner_uid — para "Mis Flares", incluye activos e incluye hidden propios */
      if (p.owner_uid) {
        const rows = await sql`
          SELECT * FROM flares
          WHERE owner_uid = ${p.owner_uid}
            AND created_at >= NOW() - INTERVAL '24 hours'
          ORDER BY created_at DESC
          LIMIT 50
        `;
        return {
          statusCode: 200,
          headers: { ...cors(), "Content-Type": "application/json" },
          body: JSON.stringify(rows),
        };
      }

      const minLat = parseFloat(p.minLat ?? -90);
      const maxLat = parseFloat(p.maxLat ?? 90);
      const minLng = parseFloat(p.minLng ?? -180);
      const maxLng = parseFloat(p.maxLng ?? 180);
      const zoom   = parseInt(p.zoom) || 13;

      /* Límite dinámico según zoom — más zoom = área chica = más detalle */
      const limit = zoom >= 16 ? 5000   /* calle/manzana — bbox chico, traer todo */
                  : zoom >= 14 ? 1000   /* colonia/barrio */
                  : zoom >= 12 ? 300    /* ciudad */
                  : zoom >= 10 ? 100    /* región/estado */
                  : 50;                 /* país/mundo — solo top por likes */

      /* Ordenar por likes desc en zoom lejano para mostrar los más relevantes */
      const orderByLikes = zoom < 12;

      const rows = orderByLikes
        ? await sql`
            SELECT * FROM flares
            WHERE expires_at > NOW()
              AND hidden = FALSE
              AND lat BETWEEN ${minLat} AND ${maxLat}
              AND lng BETWEEN ${minLng} AND ${maxLng}
            ORDER BY likes DESC, expires_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT * FROM flares
            WHERE expires_at > NOW()
              AND hidden = FALSE
              AND lat BETWEEN ${minLat} AND ${maxLat}
              AND lng BETWEEN ${minLng} AND ${maxLng}
            ORDER BY expires_at DESC
            LIMIT ${limit}
          `;

      return {
        statusCode: 200,
        headers: { ...cors(), "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      };
    }

    // ── POST ─────────────────────────────────────────
    if (event.httpMethod === "POST") {
      const enforceLimit = await shouldEnforceNonRegisterFlareLimit(sql);
      if (enforceLimit) {
        const rl = rateLimit(ip, "create_flare", 5, 60 * 60 * 1000);
        if (!rl.allowed) return tooMany(rl.retryAfter);
      }
      let d;
      try {
        d = JSON.parse(event.body || "{}");
      } catch (e) {
        return err(400, "JSON invalido");
      }

      // Límite diario por uid de dispositivo
      const uid = d.uid || null;
      // Usar la fecha local del cliente (YYYY-MM-DD) para que el reset sea a medianoche local
      const localDate = /^\d{4}-\d{2}-\d{2}$/.test(d.local_date || "")
        ? d.local_date
        : new Date().toISOString().slice(0, 10); // fallback a fecha UTC
      const daily = await checkDailyLimit(sql, uid, localDate);
      if (!daily.allowed) {
        return {
          statusCode: 429,
          headers: { ...cors(), "Content-Type": "application/json" },
          body: JSON.stringify({ error: "daily_limit", count: daily.count, max: DAILY_LIMIT_MAX }),
        };
      }

      const repostId = d.repost_id ? String(d.repost_id).slice(0, 64) : null;
      if (repostId) {
        const ownerUid = String(d.owner_uid || "").slice(0, 64) || null;
        if (!ownerUid) return err(400, "owner_uid requerido");

        const rows = await sql`
          SELECT id, owner_uid, expires_at
          FROM flares
          WHERE id = ${repostId}
            AND owner_uid = ${ownerUid}
            AND created_at >= NOW() - INTERVAL '24 hours'
          LIMIT 1
        `;

        if (!rows.length) return err(404, "Flare no disponible para republicar");
        if (new Date(rows[0].expires_at).getTime() > Date.now()) {
          return err(409, "Este flare sigue vigente");
        }

        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        const [row] = await sql`
          UPDATE flares
          SET expires_at = ${expiresAt},
              created_at = NOW(),
              likes = 0,
              hidden = FALSE,
              reports_count = 0
          WHERE id = ${repostId}
            AND owner_uid = ${ownerUid}
          RETURNING *
        `;

        await incrementDailyCount(sql, uid, localDate);

        return {
          statusCode: 200,
          headers: { ...cors(), "Content-Type": "application/json" },
          body: JSON.stringify(row),
        };
      }

      // Validacion — usar == null para no rechazar coordenada 0
      if (d.lat == null || d.lng == null || !d.title) {
        return err(400, "lat, lng y title son requeridos");
      }

      const lat = parseFloat(d.lat);
      const lng = parseFloat(d.lng);

      if (isNaN(lat) || isNaN(lng)) {
        return err(400, "lat y lng deben ser numeros");
      }
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return err(400, "coordenadas invalidas");
      }
      if (String(d.title).trim().length === 0) {
        return err(400, "el titulo no puede estar vacio");
      }
      if (String(d.title).length > 100) {
        return err(400, "titulo demasiado largo");
      }

      const imageUrl = d.image_url ? String(d.image_url).trim() : null;
      const requestedType = d.type ? String(d.type).trim() : "text";
      if (!["text", "image", "video"].includes(requestedType)) {
        return err(400, "type invalido");
      }
      if (requestedType === "image" && !imageUrl) {
        return err(400, "image_url requerida");
      }
      if (imageUrl) {
        if (imageUrl.length > 1000 || !isR2PublicUrl(imageUrl)) {
          return err(400, "Imagen no valida. Vuelve a subirla desde Flare.");
        }
      }
      const flareType = imageUrl ? "image" : requestedType;

      const textoARevisar = `${String(d.title)} ${String(d.body_text || "")}`;

      // Capa 1: lista local — siempre bloquea
      if (containsProfanity(textoARevisar)) {
        return err(400, "El contenido no cumple con las normas de la comunidad.");
      }

      // Capa 2: OpenAI — con timeout, si falla se permite publicar
      try {
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ timedOut: true }), 2000)
        );
        const moderationPromise = fetch("https://api.openai.com/v1/moderations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({ input: textoARevisar }),
        }).then((r) => r.json());

        const modResult = await Promise.race([moderationPromise, timeoutPromise]);
        if (!modResult.timedOut && modResult.results?.[0]?.flagged) {
          return err(400, "El contenido no cumple con las normas de la comunidad.");
        }
      } catch (modErr) {
        console.error("Moderación OpenAI falló, continuando:", modErr.message);
      }

      const requestedDurMin = parseInt(d.dur_min) || 60;
      const isDevFlare = d.cat === "dev";
      let durMin = 60;
      if (isDevFlare || requestedDurMin !== 60) {
        if (!isDevFlare) return err(403, "La duracion personalizada requiere categoria DEV");
        const devModeEnabled = (await getAdminSetting(sql, DEV_DUR_KEY, "off")) !== "off";
        if (!devModeEnabled) return err(403, "Modo DEV desactivado");
        const adminSecret = process.env.ADMIN_SECRET;
        const providedSecret = d.admin_secret ? String(d.admin_secret) : "";
        if (!adminSecret || providedSecret !== adminSecret) return err(401, "Contrasena admin invalida");
        if (requestedDurMin < 1 || requestedDurMin > 720) {
          return err(400, "dur_min debe estar entre 1 y 720");
        }
        durMin = requestedDurMin;
      }

      const id = "p" + Date.now() + Math.random().toString(36).slice(2, 6);
      const expiresAt = new Date(Date.now() + durMin * 60 * 1000).toISOString();
      const ownerUid = String(d.owner_uid || "").slice(0, 64) || null;
      const username = d.username ? String(d.username).slice(0, 30) : null;
      const tier = username ? 2 : 1;

      const [row] = await sql`
        INSERT INTO flares (
          id, lat, lng, title, emoji, cat, cat_lbl, cat_color, cat_icon,
          type, body_text, biz_name, image_url, video_url, expires_at, owner_uid,
          username, tier
        ) VALUES (
          ${id},
          ${lat},
          ${lng},
          ${String(d.title).trim()},
          ${d.emoji || "📍"},
          ${isDevFlare ? "dev" : (d.cat || "info")},
          ${isDevFlare ? "DEV" : (d.cat_lbl || "Informacion")},
          ${isDevFlare ? "#ff4060" : (d.cat_color || "#00f5a0")},
          ${isDevFlare ? "🧪" : (d.cat_icon || "ℹ️")},
          ${flareType},
          ${d.body_text || null},
          ${d.biz_name || null},
          ${imageUrl},
          ${d.video_url || null},
          ${expiresAt},
          ${ownerUid},
          ${username},
          ${tier}
        )
        RETURNING *
      `;

      await incrementDailyCount(sql, uid, localDate);

      return {
        statusCode: 201,
        headers: { ...cors(), "Content-Type": "application/json" },
        body: JSON.stringify(row),
      };
    }

    return err(405, "Method not allowed");
  } catch (e) {
    console.error(e);
    return err(500, "Error interno: " + e.message);
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

function tooMany(retryAfter) {
  return {
    statusCode: 429,
    headers: { ...cors(), "Retry-After": String(retryAfter) },
    body: JSON.stringify({ error: `Demasiadas solicitudes. Intenta en ${retryAfter} segundos.`, retryAfter }),
  };
}

async function cleanupArchivedFlares(sql) {
  const archivedImages = await sql`
    SELECT image_url FROM flares
    WHERE created_at < NOW() - INTERVAL '24 hours'
      AND image_url IS NOT NULL
  `;

  await Promise.allSettled(
    archivedImages.map((row) => deleteR2ObjectByUrl(row.image_url))
  );

  await sql`
    DELETE FROM flares
    WHERE created_at < NOW() - INTERVAL '24 hours'
  `;
}

const NON_REGISTER_LIMIT_KEY = "non_register_flare_limit";
const DAILY_LIMIT_KEY        = "daily_flare_limit";
const DEV_DUR_KEY            = "dev_duration_mode";
const DAILY_LIMIT_MAX        = 3;

async function shouldEnforceNonRegisterFlareLimit(sql) {
  try {
    await ensureAdminSettingsTable(sql);
    const value = await getAdminSetting(sql, NON_REGISTER_LIMIT_KEY, "on");
    return value !== "off";
  } catch (e) {
    console.error("No se pudo leer la configuracion de limite:", e);
    return true;
  }
}

async function checkDailyLimit(sql, uid, localDate) {
  /* Retorna { allowed: bool, count: number } */
  try {
    await ensureAdminSettingsTable(sql);
    const enabled = await getAdminSetting(sql, DAILY_LIMIT_KEY, "on");
    if (enabled === "off") return { allowed: true, count: 0 };
    if (!uid) return { allowed: true, count: 0 }; /* sin uid no se limita */

    await sql`
      CREATE TABLE IF NOT EXISTS user_daily_flares (
        uid  TEXT NOT NULL,
        day  DATE NOT NULL DEFAULT CURRENT_DATE,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (uid, day)
      )
    `;

    const rows = await sql`
      SELECT count FROM user_daily_flares
      WHERE uid = ${uid} AND day = ${localDate}::date
    `;
    const count = rows[0]?.count ?? 0;
    return { allowed: count < DAILY_LIMIT_MAX, count };
  } catch (e) {
    console.error("checkDailyLimit falló, permitiendo:", e.message);
    return { allowed: true, count: 0 };
  }
}

async function incrementDailyCount(sql, uid, localDate) {
  if (!uid) return;
  try {
    await sql`
      INSERT INTO user_daily_flares (uid, day, count)
      VALUES (${uid}, ${localDate}::date, 1)
      ON CONFLICT (uid, day) DO UPDATE SET count = user_daily_flares.count + 1
    `;
  } catch (e) {
    console.error("incrementDailyCount falló:", e.message);
  }
}
