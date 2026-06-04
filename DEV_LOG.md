# Flare App — Dev Log

Registro cronológico de implementaciones y cambios realizados en el proyecto, reconstruido desde el historial de git.

---

## 2026-06-03 — Fotos moderadas con OpenAI y Cloudflare R2

**Objetivo:** permitir fotos en flares sin publicar contenido no verificado.

**Implementado:**
- Nuevo endpoint `/api/media` para recibir imágenes como `data:image/...;base64`.
- Validación server-side de formato real: `image/jpeg`, `image/png`, `image/webp`.
- Límite default de 3 MB por imagen (`MEDIA_MAX_BYTES` opcional).
- Moderación con OpenAI `omni-moderation-latest` antes de subir a storage.
- Upload a Cloudflare R2 usando API compatible S3.
- `/api/flares` solo acepta `image_url` si pertenece a `R2_PUBLIC_BASE_URL`.
- Eliminar flares borra también su objeto en R2 cuando aplica.
- Limpieza de flares archivados después de 24 horas intenta borrar imágenes de R2.
- Modal de crear flare agrega selector, preview y botón para quitar foto.
- Popup, panel lateral y perfil muestran foto/thumbnail cuando el flare tiene imagen.

**Variables requeridas:**
```env
OPENAI_API_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_PUBLIC_BASE_URL=https://...
```

**Variables opcionales:**
```env
R2_KEY_PREFIX=flares
MEDIA_MAX_BYTES=3145728
```

**SQL requerido:** ninguno si la tabla `flares` ya tiene `image_url`.

**Archivos clave:**
- `netlify/functions/media.js`
- `netlify/functions/_utils/r2.js`
- `netlify/functions/flares.js`
- `netlify/functions/delete-flare.js`
- `public/index.html`
- `public/js/modal.js`
- `public/js/api.js`
- `public/js/markers.js`
- `public/js/panel.js`
- `public/js/profile.js`
- `public/css/theme-dark.css`
- `netlify.toml`

**Estado:** implementado localmente, pendiente de configurar credenciales R2/OpenAI en Netlify y probar upload real.

---

## 2026-06-02 — Avatares, repost y herramientas DEV

**Objetivo:** mejorar el perfil de usuario y agregar herramientas de prueba controladas desde admin.

**Implementado:**
- Avatares automáticos para perfiles al crear/restaurar identidad local.
- Copia pública de 56 avatares en `public/avatares/` para que Netlify los sirva.
- Perfil muestra flares propios de las últimas 24 horas aunque estén vencidos.
- Flares vencidos aparecen apagados con etiqueta `Vencido` y botón `Republicar`.
- Republicar reactiva el flare por 1 hora, reinicia `created_at`, `expires_at`, `likes`, `reports_count` y `hidden`.
- Limpieza de flares pasa de borrar al vencer (`expires_at`) a borrar después de 24 horas desde `created_at`.
- Tier 2 cambió de `Anónimo` a `Sin validar` con icono `✕`.
- Admin agrega toggle `DEV Custom Duration`.
- La categoría `DEV` aparece en Crear Flare solo si el toggle está activo.
- Publicar con duración personalizada requiere categoría `DEV`, minutos entre 1 y 720, y `ADMIN_SECRET`.

**SQL recomendado:**
```sql
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO admin_settings (key, value)
VALUES ('dev_duration_mode', 'off')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS flares_owner_created_idx
ON flares (owner_uid, created_at DESC);

CREATE OR REPLACE FUNCTION delete_expired_flares()
RETURNS void AS $$
  DELETE FROM flares
  WHERE created_at < NOW() - INTERVAL '24 hours';
$$ LANGUAGE sql;
```

**Archivos clave:**
- `netlify/functions/admin-config.js`
- `netlify/functions/flares.js`
- `public/admin.html`
- `public/index.html`
- `public/js/config.js`
- `public/js/modal.js`
- `public/js/profile.js`
- `public/css/theme-dark.css`
- `schema.sql`

**Estado:** implementado y pusheado a `dev` y `main`.

---

## 2026-05-31 — Sistema de perfiles Tier 1 / Tier 2

**Objetivo:** Identidad progresiva — visitante anónimo → publicador con username automático.

**Reglas de negocio:**
- **Tier 1 (Visitante):** puede ver, filtrar, compartir, reportar. NO puede dar likes.
- **Tier 2 (Anónimo):** se activa al publicar el primer flare. Recibe username automático (`coyote_7x4k2`). Puede dar likes. Límite 3 flares/día.

**DB (Neon — SQL a correr manualmente):**
```sql
ALTER TABLE flares ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE flares ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 1;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  device_id TEXT UNIQUE,
  tier INTEGER DEFAULT 2,
  email TEXT UNIQUE,
  flares_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS users_device ON users (device_id);
CREATE INDEX IF NOT EXISTS users_tier ON users (tier);
```

**Archivos modificados:**
- `public/js/config.js` — pool de palabras (`WORDS`), funciones `generateUsername()`, `getDeviceFingerprint()`, `getTier()`, `createIdentity()`, `saveIdentity()`, variable global `IDENTITY`
- `public/js/interactions.js` — bloqueo de likes para Tier 1 al inicio de `doLike()`
- `public/js/api.js` — `rowToPin()` incluye campo `username`
- `public/js/markers.js` — `popHTML()` muestra `@username` debajo del título
- `public/js/modal.js` — al publicar: crea identidad si es primer flare, actualiza `flares_hoy`, envía `username` y nuevo `owner_uid` en el payload, llama `obCelebrate(isFirstFlare)`
- `public/js/onboarding.js` — `obCelebrate(isFirstFlare)` recibe flag y muestra el username asignado en el step 4
- `netlify/functions/flares.js` — INSERT guarda `username` y `tier`
- `public/index.html` — botón `🤝` en header del panel, div `#panel-profile`, carga de `profile.js`
- `public/css/theme-dark.css` — estilos de perfil (badge de tier, username, stats, CTA, validate, `.pop-username`)

**Archivo nuevo:**
- `public/js/profile.js` — módulo completo del panel de perfil: `openProfile()`, `closeProfile()`, `renderProfile()`, `renderMyFlaresInProfile()` (Mis Flares integrado dentro del perfil)

**Estado:** implementado, pendiente de probar con `netlify dev` y correr el SQL en Neon.

---

## 2026-05-20 — Seed nocturno

- **Fix** `99d9b34` — Seed nocturno para mapa no vacío (ajuste a versión sin markers temporales)
- **Update** `5e723ae` — Actualización de `seed-scheduled.mjs` (función programada de seeds)

---

## 2026-05-19 — Onboarding no invasivo

- **Fix** `83fed20` — Ocultar botón "Salir" del onboarding cuando el menú FAB está abierto
- **Feature** `075c910` — Onboarding no invasivo con tooltips flotantes y botón "Salir" funcional (reemplaza cards bloqueantes)

---

## 2026-05-17 — Gran sesión: refactor + UI + fixes

**Refactor:**
- **Refactor** `7366b8e` — Modularizar `app.js` en 8 módulos independientes + fix fetch al cerrar popup

**Features y fixes de UI:**
- **Feature** `28f6d32` — Modo día/noche del mapa + reducción de tamaño de pins y clusters
- **Feature** `661b20b` — Rediseño de botones del popup de flare
- **Fix/Feature** `8405639` — Categorías completas, FAB visible, sombra en pins, mejoras UI generales
- **Fix/Feature** `86685ab` — FAB oculto en panel/modal + tamaño reducido 20%
- **Fix/Feature** `79a150f` — Popup de like no cierra al dar like + toggle rate limit en panel admin
- **Fix** `6a9e1fc` — Popup de flare no se cierra involuntariamente
- **Fix** `afbfbdb` — Link duplicado al compartir flare

---

## 2026-05-06 — Fixes post-release

- **Fix** `85369e2` — Fondo negro en iconos PWA
- **Temporal** `b00987d` — Mapa no vacío (seed temporal mientras no hay datos reales)

---

## 2026-04-30 — Sesión de planeación

**Tema:** Registro por celular para levantar límite de flares

**Análisis:**
- Límite de 3 flares/día implementado en `netlify/functions/flares.js` — constante `DAILY_LIMIT_MAX = 3`, función `checkDailyLimit()` consultando tabla `user_daily_flares` por `uid`
- Sistema de identidad actual: anónimo, `uid` random generado en cliente y guardado en `localStorage`
- Sin registro, sin autenticación, sin integración SMS/WhatsApp

**Plan definido (pendiente de implementar):**
- DB: tabla `users` (uid, phone, verified) + tabla `phone_verifications` (OTP)
- Backend: `POST /api/auth/send-code` — envía OTP vía Twilio
- Backend: `POST /api/auth/verify-code` — verifica OTP, marca uid como verificado
- Backend: modificar `checkDailyLimit()` para omitir límite si uid está verificado
- Frontend: modal de registro al llegar al flare #3, formulario celular + OTP
- Config: variables `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

**Estado:** pendiente — esperando decisión del usuario (SMS vs WhatsApp)

---

## 2026-04-08

- **Fix** `c45dbab` — Centrar card del onboarding step 1

---

## 2026-04-07

- **Feature** `5dd04da` — Mascota en onboarding y ajustes de logo SVG
- **Feature** `621c401` — Logo PWA, botones popup uniformes, eliminar tickets de soporte

---

## 2026-04-05

- **Fix** `125b7f3` — Popup de flare solo se cierra con la X
- **Feature** `f3d695a` — PWA: manifest, service worker y meta tags
- **Feature** `a9f0e7c` — Animación de fuego en flares + fix popup que se cerraba solo
- **Feature** `9800374` — Categorías Comida y Ventas visibles en header, modal y panel lateral
- **Fix** `6caa4dd` — Mis Flares carga desde DB por owner_uid, independiente del mapa
- **Fix** `b909ac5` — Email soporte + botón más grande en móvil
- **Feature** `faedc01` — Formulario de soporte con email y seguimiento en admin
- **Fix** `c42adca` — Evitar que el mismo usuario reporte el mismo flare más de una vez
- **Feature** `3c1aa77` — Revisión de flares ocultos en panel admin
- **Feature** `a2dd466` — Buscar y eliminar flare por ID en panel admin
- **Feature** `8733209` — Mostrar ID del flare en popup, tap copia al portapapeles
- **Fix** `44dbd7e` — Toast del paso 3 onboarding tapaba el modal de crear flare
- **Fix** `a2b940b` — Botón Saltar paso 3 interceptado por FAB en móvil
- **Fix** `e34749c` — Botón Saltar paso 3 onboarding no funcionaba en móvil (touch)

---

## 2026-04-04

- **Fix** `76ed539` — URLs con IDs numéricos (Facebook etc.) se mostraban como HTML roto
- **UI** `57d92d4` — Agregar texto +5min bajo el corazón en botón de like del popup
- **Redesign** `976bd2b` — Nuevo layout pop-foot con Like, Maps+Share, y Reportar
- **Fix** `5f2308c` — Deep link vuela al flare sin importar bbox actual
- **Feature** `6ca0761` — Deep link a flare por hash (#flare-ID)
- **Feature** `4ae2a32` — Compartir flare con Web Share API o clipboard

---

## 2026-03-21 — Inicio del proyecto

- **Init** `9fbc7bc` — Alpha
- **Create** `ffb36b6` — Crear flares.js
- **Create** `0d42141` — Crear like.js
- **Create** `50e3289` — Crear index.html
- **Create** `5fead23` — Subida inicial de archivos

---

> Actualizar este archivo al final de cada sesión de desarrollo.
