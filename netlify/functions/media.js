// netlify/functions/media.js
// POST /api/media -> valida, modera con OpenAI y sube imagenes a Cloudflare R2

import crypto from "crypto";
import { rateLimit } from "./_utils/rateLimit.js";
import { uploadR2Object } from "./_utils/r2.js";
import { getEnv, getNumberEnv } from "./_utils/env.js";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const DEFAULT_MAX_BYTES = 3 * 1024 * 1024;
const MODERATION_MODEL = "omni-moderation-latest";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }

  if (event.httpMethod !== "POST") {
    return err(405, "Method not allowed");
  }

  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim()
    || event.headers["client-ip"]
    || "unknown";

  const rl = rateLimit(ip, "media_upload", 20, 60 * 60 * 1000);
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...cors(), "Retry-After": String(rl.retryAfter) },
      body: JSON.stringify({ error: `Demasiadas solicitudes. Intenta en ${rl.retryAfter} segundos.` }),
    };
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (e) {
    return err(400, "JSON invalido");
  }

  const parsed = parseDataUrl(data.data_url);
  if (!parsed) return err(400, "Imagen invalida");

  const maxBytes = getNumberEnv("MEDIA_MAX_BYTES", DEFAULT_MAX_BYTES);
  if (parsed.buffer.length > maxBytes) {
    return err(413, `Imagen demasiado grande. Maximo ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }

  const actualMime = detectImageMime(parsed.buffer);
  if (!actualMime || actualMime !== parsed.mime || !ALLOWED_MIME.has(actualMime)) {
    return err(400, "Formato de imagen no permitido");
  }

  const text = [
    String(data.title || "").slice(0, 120),
    String(data.body_text || "").slice(0, 2000),
  ].join(" ").trim() || "Imagen de flare";

  let moderation;
  try {
    moderation = await moderateImage({
      text,
      dataUrl: toDataUrl(actualMime, parsed.buffer),
    });
  } catch (e) {
    console.error("Moderacion de imagen fallo:", e.message);
    if (e.status === 400 && e.code === "image_parse_error") {
      return err(400, "No se pudo leer la imagen. Prueba con otra foto JPG, PNG o WebP.");
    }
    if (e.message && e.message.includes("OPENAI_API_KEY")) {
      return err(502, "OPENAI_API_KEY invalida o no disponible en el servidor.");
    }
    if (e.status === 401) {
      return err(502, "OPENAI_API_KEY invalida o no disponible en el servidor.");
    }
    if (e.status === 429) {
      return err(429, "OpenAI esta limitando la verificacion de imagenes. Intenta de nuevo en un momento.");
    }
    return err(502, "No se pudo verificar la imagen. Intenta de nuevo.");
  }

  if (moderation.flagged) {
    return err(400, "La imagen no cumple con las normas de la comunidad.");
  }

  const key = buildR2Key(actualMime, data.uid);
  let imageUrl;
  try {
    imageUrl = await uploadR2Object({
      key,
      body: parsed.buffer,
      contentType: actualMime,
    });
  } catch (e) {
    console.error("Upload R2 fallo:", e.message);
    return err(502, "No se pudo guardar la imagen. Revisa la configuracion de R2.");
  }

  return {
    statusCode: 201,
    headers: { ...cors(), "Content-Type": "application/json" },
    body: JSON.stringify({
      ok: true,
      image_url: imageUrl,
      mime: actualMime,
      size: parsed.buffer.length,
      moderation_model: moderation.model,
    }),
  };
};

function parseDataUrl(value) {
  const match = String(value || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return null;

  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME.has(mime)) return null;

  const base64 = match[2].replace(/\s/g, "");
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length || buffer.toString("base64").replace(/=+$/, "") !== base64.replace(/=+$/, "")) {
    return null;
  }

  return { mime, buffer };
}

function detectImageMime(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function toDataUrl(mime, buffer) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function moderateImage({ text, dataUrl }) {
  const openaiKey = getEnv("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY no configurado");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: MODERATION_MODEL,
        input: [
          { type: "text", text },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      let parsed;
      try {
        parsed = JSON.parse(detail);
      } catch (e) {
        parsed = null;
      }
      const message = parsed?.error?.message || detail || response.statusText;
      const error = new Error(`OpenAI ${response.status}: ${message.slice(0, 240)}`);
      error.status = response.status;
      error.code = parsed?.error?.code || null;
      throw error;
    }

    const result = await response.json();
    const first = result.results?.[0];
    if (!first) throw new Error("Respuesta de moderacion sin resultados");
    return {
      flagged: Boolean(first.flagged),
      model: result.model || MODERATION_MODEL,
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildR2Key(mime, uid) {
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const safeUid = String(uid || "anon").replace(/[^a-z0-9_-]/gi, "").slice(0, 24) || "anon";
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
  const prefix = String(getEnv("R2_KEY_PREFIX", "flares")).replace(/^\/+|\/+$/g, "");
  return `${prefix}/${yyyy}/${mm}/${dd}/${safeUid}-${id}.${ext}`;
}

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
    headers: { ...cors(), "Content-Type": "application/json" },
    body: JSON.stringify({ error: msg }),
  };
}
