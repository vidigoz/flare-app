import fs from "fs";
import path from "path";

let loaded = false;

function cleanValue(value) {
  const clean = String(value || "").trim();
  if (!clean || clean === "undefined" || clean === "null") return "";
  if (
    (clean.startsWith("\"") && clean.endsWith("\"")) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    return clean.slice(1, -1);
  }
  return clean;
}

function candidateEnvPaths() {
  const moduleDir = typeof __dirname !== "undefined" ? __dirname : "";
  const roots = [
    moduleDir,
    moduleDir ? path.resolve(moduleDir, "../../..") : "",
    process.cwd(),
    process.env.PWD,
    process.env.INIT_CWD,
  ].filter(Boolean);

  const paths = [];
  roots.forEach((root) => {
    let dir = path.resolve(root);
    for (let i = 0; i < 8; i += 1) {
      paths.push(path.join(dir, ".env"));
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  });

  return [...new Set(paths)];
}

function loadLocalEnvOnce() {
  if (loaded) return;
  loaded = true;

  const envPath = candidateEnvPaths().find((p) => fs.existsSync(p));
  if (!envPath) return;

  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) return;

    const key = trimmed.slice(0, eq).trim();
    const value = cleanValue(trimmed.slice(eq + 1));
    if (!key || !value) return;
    process.env[key] = value;
  });
}

export function getEnv(name, fallback = "") {
  let value = cleanValue(process.env[name]);
  if (value) return value;

  loadLocalEnvOnce();
  value = cleanValue(process.env[name]);
  return value || fallback;
}

export function getNumberEnv(name, fallback) {
  const value = parseInt(getEnv(name), 10);
  return Number.isFinite(value) ? value : fallback;
}
