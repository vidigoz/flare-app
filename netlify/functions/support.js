// netlify/functions/support.js
// POST /api/support — envía un ticket de soporte

import { neon } from "@neondatabase/serverless";
import { rateLimit } from "./_utils/rateLimit.js";
import nodemailer from "nodemailer";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }

  /* GET — listar tickets (solo admin) */
  if (event.httpMethod === "GET") {
    const secret = process.env.ADMIN_SECRET;
    const provided = event.headers["x-admin-key"];
    if (!secret || provided !== secret) return err(401, "No autorizado");
    try {
      const sql = neon(process.env.NETLIFY_DATABASE_URL);
      await sql`CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY, motivo TEXT NOT NULL, descripcion TEXT NOT NULL, email TEXT NOT NULL, flare_id TEXT, ip TEXT, status TEXT NOT NULL DEFAULT 'pendiente', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      const rows = await sql`SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 100`;
      return { statusCode: 200, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify(rows) };
    } catch(e) { return err(500, e.message); }
  }

  /* PATCH — actualizar status de ticket (solo admin) */
  if (event.httpMethod === "PATCH") {
    const secret = process.env.ADMIN_SECRET;
    const provided = event.headers["x-admin-key"];
    if (!secret || provided !== secret) return err(401, "No autorizado");
    let d; try { d = JSON.parse(event.body || "{}"); } catch(e) { return err(400, "JSON inválido"); }
    const { id, status } = d;
    if (!id || !["pendiente","en_revision","resuelto"].includes(status)) return err(400, "id y status requeridos");
    try {
      const sql = neon(process.env.NETLIFY_DATABASE_URL);
      const result = await sql`UPDATE support_tickets SET status = ${status} WHERE id = ${id} RETURNING id`;
      if (!result.length) return err(404, "Ticket no encontrado");
      return { statusCode: 200, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
    } catch(e) { return err(500, e.message); }
  }

  /* DELETE — eliminar ticket (solo admin) */
  if (event.httpMethod === "DELETE") {
    const secret = process.env.ADMIN_SECRET;
    const provided = event.headers["x-admin-key"];
    if (!secret || provided !== secret) return err(401, "No autorizado");
    let d; try { d = JSON.parse(event.body || "{}"); } catch(e) { return err(400, "JSON inválido"); }
    const { id } = d;
    if (!id) return err(400, "id requerido");
    try {
      const sql = neon(process.env.NETLIFY_DATABASE_URL);
      const result = await sql`DELETE FROM support_tickets WHERE id = ${id} RETURNING id`;
      if (!result.length) return err(404, "Ticket no encontrado");
      return { statusCode: 200, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
    } catch(e) { return err(500, e.message); }
  }

  if (event.httpMethod !== "POST") {
    return err(405, "Method not allowed");
  }

  const ip = (event.headers["x-forwarded-for"] || "").split(",")[0].trim()
    || event.headers["client-ip"] || "unknown";

  const rl = rateLimit(ip, "support", 3, 60 * 60 * 1000);
  if (!rl.allowed) {
    return {
      statusCode: 429,
      headers: { ...cors(), "Retry-After": String(rl.retryAfter) },
      body: JSON.stringify({ error: `Demasiadas solicitudes. Intenta en ${rl.retryAfter} segundos.` }),
    };
  }

  let d;
  try { d = JSON.parse(event.body || "{}"); }
  catch (e) { return err(400, "JSON inválido"); }

  const motivo    = String(d.motivo    || "").trim().slice(0, 100);
  const descripcion = String(d.descripcion || "").trim().slice(0, 1000);
  const email     = String(d.email     || "").trim().slice(0, 100);
  const flare_id  = String(d.flare_id  || "").trim().slice(0, 64) || null;

  if (!motivo || !descripcion || !email) {
    return err(400, "motivo, descripcion y email son requeridos");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err(400, "email inválido");
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    await sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id          TEXT PRIMARY KEY,
        motivo      TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        email       TEXT NOT NULL,
        flare_id    TEXT,
        ip          TEXT,
        status      TEXT NOT NULL DEFAULT 'pendiente',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const ticketId = "t" + Date.now() + Math.random().toString(36).slice(2, 6);
    await sql`
      INSERT INTO support_tickets (id, motivo, descripcion, email, flare_id, ip)
      VALUES (${ticketId}, ${motivo}, ${descripcion}, ${email}, ${flare_id}, ${ip})
    `;

    // Enviar email via Zoho SMTP
    let emailError = null;
    if (process.env.ZOHO_USER && process.env.ZOHO_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: "smtp.zoho.com",
          port: 587,
          secure: false,
          auth: { user: process.env.ZOHO_USER.trim(), pass: process.env.ZOHO_PASS.trim() },
        });
        await transporter.sendMail({
          from: `"Flare Soporte" <${process.env.ZOHO_USER}>`,
          to: "soporteflare@zohomail.com",
          subject: `[Soporte Flare] ${motivo} — ${ticketId}`,
          text: [
            `Ticket: ${ticketId}`,
            `Motivo: ${motivo}`,
            `Email: ${email}`,
            flare_id ? `Flare ID: ${flare_id}` : "",
            ``,
            `Descripción:`,
            descripcion,
            ``,
            `IP: ${ip}`,
          ].filter(Boolean).join("\n"),
          html: `
            <div style="font-family:sans-serif;max-width:600px">
              <h2 style="color:#00f5a0">🔥 Ticket de Soporte — Flare</h2>
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr><td style="padding:6px 0;color:#888;width:120px">Ticket</td><td><code>${ticketId}</code></td></tr>
                <tr><td style="padding:6px 0;color:#888">Motivo</td><td><strong>${motivo}</strong></td></tr>
                <tr><td style="padding:6px 0;color:#888">Email</td><td>${email}</td></tr>
                ${flare_id ? `<tr><td style="padding:6px 0;color:#888">Flare ID</td><td><code>${flare_id}</code></td></tr>` : ""}
                <tr><td style="padding:6px 0;color:#888">IP</td><td>${ip}</td></tr>
              </table>
              <div style="margin-top:16px;padding:14px;background:#f5f5f5;border-radius:8px;font-size:14px;white-space:pre-wrap">${descripcion}</div>
            </div>
          `,
        });
      } catch (mailErr) {
        emailError = mailErr.message;
        console.error("Email falló:", mailErr.message);
      }
    } else {
      emailError = "ZOHO_USER o ZOHO_PASS no configurados";
    }

    return {
      statusCode: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, ticket: ticketId, emailSent: !emailError, emailError: emailError || undefined }),
    };
  } catch (e) {
    console.error(e);
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
  return { statusCode: code, headers: cors(), body: JSON.stringify({ error: msg }) };
}
