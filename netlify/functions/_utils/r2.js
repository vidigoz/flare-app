import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getEnv } from "./env.js";

let cachedClient = null;

function cleanBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function hasR2WriteConfig() {
  return Boolean(
    getEnv("R2_ACCOUNT_ID") &&
    getEnv("R2_ACCESS_KEY_ID") &&
    getEnv("R2_SECRET_ACCESS_KEY") &&
    getEnv("R2_BUCKET")
  );
}

function requireEnv(name) {
  const value = getEnv(name);
  if (!value) throw new Error(`${name} no configurado`);
  return value;
}

function getR2Client() {
  if (cachedClient) return cachedClient;

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });

  return cachedClient;
}

export function getR2PublicBaseUrl() {
  return cleanBaseUrl(getEnv("R2_PUBLIC_BASE_URL"));
}

export function publicUrlForR2Key(key) {
  const base = getR2PublicBaseUrl();
  if (!base) throw new Error("R2_PUBLIC_BASE_URL no configurado");
  return `${base}/${String(key).replace(/^\/+/, "")}`;
}

export function isR2PublicUrl(url) {
  const base = getR2PublicBaseUrl();
  if (!base || !url) return false;
  return String(url).startsWith(`${base}/`);
}

export function keyFromR2PublicUrl(url) {
  if (!isR2PublicUrl(url)) return null;
  const base = getR2PublicBaseUrl();
  return decodeURIComponent(String(url).slice(base.length + 1)).replace(/^\/+/, "");
}

export async function uploadR2Object({ key, body, contentType, cacheControl }) {
  if (!hasR2WriteConfig()) throw new Error("Credenciales de R2 incompletas");

  await getR2Client().send(new PutObjectCommand({
    Bucket: requireEnv("R2_BUCKET"),
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl || "public, max-age=31536000, immutable",
  }));

  return publicUrlForR2Key(key);
}

export async function deleteR2ObjectByUrl(url) {
  const key = keyFromR2PublicUrl(url);
  if (!key || !hasR2WriteConfig()) return false;

  try {
    await getR2Client().send(new DeleteObjectCommand({
      Bucket: requireEnv("R2_BUCKET"),
      Key: key,
    }));
    return true;
  } catch (e) {
    console.error("No se pudo borrar objeto R2:", e.message);
    return false;
  }
}
