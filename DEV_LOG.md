# Flare App — Dev Log

Registro cronológico de implementaciones y cambios realizados en el proyecto, reconstruido desde el historial de git.

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

## Historial de implementaciones (desde git log)

### 2026-04-08
- **Fix** `c45dbab` — Centrar card del onboarding step 1

### 2026-04-07
- **Feature** `5dd04da` — Mascota en onboarding y ajustes de logo SVG
- **Feature** `621c401` — Logo PWA, botones popup uniformes, eliminar tickets de soporte

### 2026-04-05
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

### 2026-04-04
- **Fix** `76ed539` — URLs con IDs numéricos (Facebook etc.) se mostraban como HTML roto
- **UI** `57d92d4` — Agregar texto +5min bajo el corazón en botón de like del popup
- **Redesign** `976bd2b` — Nuevo layout pop-foot con Like, Maps+Share, y Reportar
- **Fix** `5f2308c` — Deep link vuela al flare sin importar bbox actual
- **Feature** `6ca0761` — Deep link a flare por hash (#flare-ID)
- **Feature** `4ae2a32` — Compartir flare con Web Share API o clipboard

### 2026-03-21 — Inicio del proyecto
- **Init** `9fbc7bc` — Alpha
- **Create** `ffb36b6` — Crear flares.js
- **Create** `0d42141` — Crear like.js
- **Create** `50e3289` — Crear index.html
- **Create** `5fead23` — Subida inicial de archivos

---

> Actualizar este archivo al final de cada sesión de desarrollo.
