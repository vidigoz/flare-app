// netlify/functions/flares.js
// GET  /api/flares?minLat=&maxLat=&minLng=&maxLng=   → flares visibles en bbox
// POST /api/flares                                    → crear nuevo flare

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";
import { ensureAdminSettingsTable, getAdminSetting } from "./_utils/settings.js";
import { containsProfanity } from "./_utils/profanityList.js";

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

      // Limpieza liviana de expirados
      await sql`DELETE FROM flares WHERE expires_at < NOW()`;

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
      const daily = await checkDailyLimit(sql, uid);
      if (!daily.allowed) {
        return {
          statusCode: 429,
          headers: { ...cors(), "Content-Type": "application/json" },
          body: JSON.stringify({ error: "daily_limit", count: daily.count, max: DAILY_LIMIT_MAX }),
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

      const id = "p" + Date.now() + Math.random().toString(36).slice(2, 6);
      const durMin = Math.min(Math.max(parseInt(d.dur_min) || 60, 1), 720);
      const expiresAt = new Date(Date.now() + durMin * 60 * 1000).toISOString();

      const [row] = await sql`
        INSERT INTO flares (
          id, lat, lng, title, emoji, cat, cat_lbl, cat_color, cat_icon,
          type, body_text, biz_name, image_url, video_url, expires_at
        ) VALUES (
          ${id},
          ${lat},
          ${lng},
          ${String(d.title).trim()},
          ${d.emoji || "📍"},
          ${d.cat || "info"},
          ${d.cat_lbl || "Informacion"},
          ${d.cat_color || "#00f5a0"},
          ${d.cat_icon || "ℹ️"},
          ${d.type || "text"},
          ${d.body_text || null},
          ${d.biz_name || null},
          ${d.image_url || null},
          ${d.video_url || null},
          ${expiresAt}
        )
        RETURNING *
      `;

      await incrementDailyCount(sql, uid);

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

const NON_REGISTER_LIMIT_KEY = "non_register_flare_limit";
const DAILY_LIMIT_KEY        = "daily_flare_limit";
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

async function checkDailyLimit(sql, uid) {
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
      WHERE uid = ${uid} AND day = CURRENT_DATE
    `;
    const count = rows[0]?.count ?? 0;
    return { allowed: count < DAILY_LIMIT_MAX, count };
  } catch (e) {
    console.error("checkDailyLimit falló, permitiendo:", e.message);
    return { allowed: true, count: 0 };
  }
}

async function incrementDailyCount(sql, uid) {
  if (!uid) return;
  try {
    await sql`
      INSERT INTO user_daily_flares (uid, day, count)
      VALUES (${uid}, CURRENT_DATE, 1)
      ON CONFLICT (uid, day) DO UPDATE SET count = user_daily_flares.count + 1
    `;
  } catch (e) {
    console.error("incrementDailyCount falló:", e.message);
  }
}
