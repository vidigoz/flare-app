// netlify/functions/run-migrations.js
// POST /api/admin/run-migrations — ejecuta migraciones SQL pendientes
// Requiere header x-admin-key

import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Con nft bundler, los archivos incluidos quedan en la raíz del bundle
// En local apunta a ../../db/migrations, en Netlify a db/migrations desde la raíz del repo
const MIGRATIONS_DIR = process.env.NETLIFY
  ? join(process.cwd(), "db/migrations")
  : join(__dirname, "../../db/migrations");

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== "POST") return err(405, "Method not allowed");

  const secret   = process.env.ADMIN_SECRET;
  const provided = event.headers["x-admin-key"] || "";
  if (!secret || provided !== secret) return err(401, "No autorizado");

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // Crear tabla de control si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Leer migraciones ya aplicadas
    const applied = await sql`SELECT filename FROM schema_migrations`;
    const appliedSet = new Set(applied.map(r => r.filename));

    // Leer archivos de migración ordenados
    let files;
    try {
      files = readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();
    } catch (e) {
      return err(500, "No se pudo leer la carpeta db/migrations: " + e.message);
    }

    const pending = files.filter(f => !appliedSet.has(f));
    const isDryRun = event.headers["x-dry-run"] === "1";

    if (isDryRun || pending.length === 0) {
      return ok({
        message: pending.length === 0
          ? "Todo al día — no hay migraciones pendientes."
          : pending.length + " migración(es) pendiente(s): " + pending.join(", "),
        applied: pending.map(f => ({ filename: f, status: "pending" })),
        already_applied: [...appliedSet],
        total: files.length,
      });
    }

    const results = [];
    for (const filename of pending) {
      const filePath = join(MIGRATIONS_DIR, filename);
      const sqlText = readFileSync(filePath, "utf8");

      // Separar por ; y filtrar vacíos/comentarios
      const statements = sqlText
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--"));

      try {
        for (const stmt of statements) {
          await sql.unsafe(stmt);
        }
        await sql`INSERT INTO schema_migrations (filename) VALUES (${filename})`;
        results.push({ filename, status: "ok" });
      } catch (e) {
        results.push({ filename, status: "error", error: e.message });
        // Detener en el primer error — no continuar con siguientes migraciones
        return {
          statusCode: 500,
          headers: { ...cors(), "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Error en migración " + filename + ". Las anteriores ya fueron aplicadas.",
            results,
          }),
        };
      }
    }

    return ok({
      message: results.length + " migración(es) aplicada(s) correctamente.",
      applied: results,
      total: files.length,
    });

  } catch (e) {
    console.error("run-migrations error:", e.message);
    return err(500, "Error: " + e.message);
  }
};

function ok(data) {
  return { statusCode: 200, headers: { ...cors(), "Content-Type": "application/json" }, body: JSON.stringify(data) };
}
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
  };
}
function err(code, msg) {
  return { statusCode: code, headers: cors(), body: JSON.stringify({ error: msg }) };
}
