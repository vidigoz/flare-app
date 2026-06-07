# Flare App — Dev Log

Registro cronológico de implementaciones y cambios realizados en el proyecto, reconstruido desde el historial de git.

---

## 2026-06-07 — Filter Drawer: reemplazo de barra horizontal de filtros (v1.1.0)

### Motivación
La barra horizontal de filtros ocupaba espacio permanente y era difícil de usar en móvil. Se reemplazó por un botón "🎛️ Filtros" en el header que despliega un drawer que baja desde arriba con todos los filtros organizados por sección.

### Nuevo header simplificado
- Header queda solo con: logo + botón "🎛️ Filtros" + indicador de sync
- Botón `#hdr-filter-btn` con badge rosa en la esquina superior derecha que muestra cuántos filtros activos hay (vigencia + categoría)
- Badge se oculta automáticamente cuando no hay filtros activos
- Botón toma clase `.active` (borde verde) mientras el drawer está abierto

### Filter Drawer (`#fdr`)
- Panel que baja con animación `translateY(-110%) → 0` con cubic-bezier suave
- Fondo `rgba(8,11,18,.40)` — semitransparente, el mapa se ve difuminado detrás
- `backdrop-filter: blur(24px)` — efecto glassmorphism sobre el mapa
- Overlay invisible `#fdr-overlay` cubre el mapa para cerrar al tocar fuera
- Se cierra al tocar el overlay o al volver a presionar el botón Filtros
- 3 secciones: **Vigencia** (Todos / Nuevo / Maduro / Expirando), **Categoría** (chips dinámicos por CATS), **Vista** (Clusters / Nombres / Noche)

### Botón "↺ Reiniciar filtros"
- Aparece entre la sección Categoría y Vista
- Resetea `vigFilter = 'all'` y `activeCat = null` y llama `applyVigFilter()`
- NO toca clusters, nombres ni modo día/noche — esos son preferencias de vista del usuario
- Estilo discreto: borde y texto semi-transparentes, se ilumina al tap

### Funciones nuevas en map.js
- `toggleFilterDrawer()` — abre/cierra el drawer y sincroniza clase `.active` del botón
- `closeFilterDrawer()` — cierra sin toggle
- `resetFilters()` — reinicia vigencia y categoría
- `updateFilterBadge()` — actualiza el número en el badge del botón; se llama al final de `applyVigFilter()`
- `buildHdrCatChips()` actualizado: ahora inserta en `#hdr-cat-chips` dentro del drawer

**Archivos modificados:**
- `public/index.html` — nuevo header simplificado, drawer con 3 secciones y botón reiniciar
- `public/js/map.js` — toggleFilterDrawer, closeFilterDrawer, resetFilters, updateFilterBadge, buildHdrCatChips refactorizado
- `public/css/theme-dark.css` — estilos .hdr-left, .hdr-filter-btn, .hdr-filter-badge, .fdr, .fdr-overlay, .fdr-section, .fdr-lbl, .fdr-row, .fdr-reset-btn; eliminados .hdr-filters, .hf-sep, .hf-sep-lbl

---

## 2026-06-07 — Compresión de imagen en cliente + botones Galería/Cámara para móvil (v1.1.0)

### Problema
Fotos tomadas con cámara Android (8-15MP, 4-10MB) reventaban el límite de 6MB de Netlify Functions al convertirse a base64, causando que las imágenes nunca se subieran silenciosamente en móvil.

### Compresión canvas antes de subir (`modal.js`)
- `fileToDataUrl()` ya no hace `readAsDataURL` directo — primero dibuja en canvas
- Redimensiona a máximo 1920px manteniendo aspect ratio
- Convierte a JPEG con calidad 0.82 — una foto de 8MB queda ~300-600KB
- Elimina el límite práctico de tamaño para fotos de celular

### Dos botones separados: Galería y Cámara
- `#f-img` — input sin `capture`, abre galería de fotos
- `#f-img-cam` — input con `capture="environment"`, abre cámara trasera directo en Android/iOS
- En desktop ambos abren el selector de archivos del sistema (sin cámara física)
- `_selectedImageFile` — variable interna para trackear qué input tiene el archivo activo
- `accept="image/*"` en ambos inputs — más compatible con iOS/Android que tipos MIME específicos
- `validateImageFile()` — agregado soporte `image/heic` / `image/heif` (formato nativo iPhone/Android); eliminada validación de tamaño (obsoleta con compresión)

**Archivos modificados:**
- `public/index.html` — dos inputs + dos botones con grid 2 columnas
- `public/js/modal.js` — compresión canvas, dos inputs, _selectedImageFile
- `public/css/theme-dark.css` — .media-pick-btns grid 2 columnas

---

## 2026-06-06 — Botones de acción rápida en perfil Tier 3 (v1.1.0)

### Cambio de UX
Reemplazado el cuadro estático "✅ Perfil verificado" en el perfil Tier 3 por dos botones de acción rápida en grid 2 columnas.

- **🗺️ Ir al mapa** — `closeProfile() + closePanel()` — cierra el perfil y regresa al mapa directamente
- **⚡ Poner flare** — `closeProfile() + closePanel() + fab.click()` con delay 200ms — abre el FAB menu desplegable (Mi ubicación / Elegir en mapa), mismo flujo que el botón + del mapa

**Archivos modificados:**
- `public/js/profile.js` — reemplazado bloque profile-validate por .profile-quick-actions
- `public/css/theme-dark.css` — estilos .profile-quick-actions, .profile-quick-btn, .profile-quick-ico, .profile-quick-lbl

---

## 2026-06-05 — Refactor de header, filtros y onboarding (v1.0.18)

### Barra de filtros con grupos y logo integrado
- Logo de Flare movido dentro de `hdr-filters` para que se desplace con el scroll horizontal
- Logo aumentado 5% (59px → 62px)
- Chips de categoría ahora se insertan en contenedor fijo `#hdr-cat-chips` en lugar de antes del separador
- Labels "Categoría" y "Vista" como separadores de texto (`hf-sep-lbl`) en la misma fila
- Chip "Nombres" cambia ícono de `🏷` a **T** en negrita para diferenciarlo de "Ventas"
- Letras de chips en blanco (`#fff`) para mejor contraste con el fondo oscuro
- Labels "Categoría" y "Vista" en blanco total (`opacity:1`)

### Fondo del header
- Gradiente eliminado, reemplazado por fondo sólido semitransparente `rgba(8,11,18,.7)` con gradiente que se desvanece a partir del 60%
- Eliminado `box-shadow` del `#pbtn` (botón Ver Flares) que proyectaba un glow negro sobre el mapa
- Eliminado `box-shadow` del `#panel` que proyectaba sombra desde fuera de la pantalla

### Onboarding — tooltips estáticos con glow
- Eliminada animación `ob-float` (movimiento flotante arriba/abajo) de los tooltips
- Nueva animación `ob-glow` — glow verde pulsante estático en tooltips, card de celebración y botón Salir
- Botón Salir: color verde más vivo (`var(--neon)` al 100%), borde más opaco (`.9`), fondo más visible

**Archivos modificados:**
- `public/index.html` — logo dentro de hdr-filters, labels de grupo, chip Nombres con T
- `public/js/map.js` — buildHdrCatChips inserta en #hdr-cat-chips
- `public/css/theme-dark.css` — header bg, hf-sep-lbl, ob-glow, ob-btn-skip, logo-img, hdr-chip color

---

## 2026-06-05 — Sección Mis Flares y Mis Likes bloqueada para Tier 1-2 con overlay (v1.0.18)

### Cambio de UX en perfil para usuarios no verificados
- Eliminada la sección "Desbloquea más funciones" que era redundante con el overlay
- La sección "¿Ya tienes una cuenta?" sube a ocupar ese espacio
- Las tabs "📍 Mis Flares" y "❤️ Mis Likes" son visibles para todos los tiers pero bloqueadas con blur para Tier 1-2
- Sobre el área borrosa aparece un overlay con: ícono 🔒, título "Verifica tu cuenta", descripción "Verifica tu cuenta para administrar tus flares, ver tus likes y publicar sin límite desde cualquier dispositivo." y botón "Verificar por SMS"
- Al tocar el overlay o el botón se abre directamente `showVerifyPhone()`
- El contenido borroso muestra placeholders de flares falsos para dar contexto visual de lo que se desbloquea
- `renderMyFlaresInProfile()` solo se llama si el usuario es Tier 3 — no hace fetch innecesario

**Archivos modificados:**
- `public/js/profile.js` — estructura de tabs con overlay condicional, placeholders, eliminada sección validate
- `public/css/theme-dark.css` — estilos `.profile-tabs-wrap`, `.profile-lock-overlay`, `.profile-lock-box`, `.profile-lock-icon`, `.profile-lock-title`, `.profile-lock-desc`

---

## 2026-06-05 — Fix: modal de primer flare aparecía al re-ingresar con número (v1.0.17)

### Problema
Al cerrar sesión como Tier 3 y volver a ingresar con número de teléfono, aparecía el modal "¡Tu primer flare está en vivo!" aunque el usuario ya había publicado flares antes.

### Causa raíz (dos partes)
1. `verify-firebase.js` no incluía `onboarding_complete` en los `RETURNING` de los queries SQL — el frontend recibía el campo como `undefined`
2. El modal de primer flare lo controla `flare_first_published` en localStorage, **no** `flare_onboarding_complete`. Al hacer sign out se borraba `flare_first_published` pero al hacer recovery nunca se restauraba

### Fix en backend (`verify-firebase.js`)
- Todos los `RETURNING` ahora incluyen `onboarding_complete`
- El `SELECT` del caso recovery también lo incluye
- En el UPDATE del caso recovery: si `flares_count > 0` se fuerza `onboarding_complete = TRUE` para corregir usuarios con el flag inconsistente en DB

### Fix en frontend (`profile.js`)
- Al hacer recovery exitoso, si `res.user.onboarding_complete` es true se setean **ambos** flags en localStorage: `flare_onboarding_complete` y `flare_first_published`
- Eliminados logs de debug temporales agregados durante el diagnóstico

**Archivos modificados:**
- `netlify/functions/verify-firebase.js` — RETURNING + onboarding_complete, fix CASE en UPDATE recovery
- `public/js/profile.js` — setear flare_first_published al hacer recovery

---

## 2026-06-05 — Sistema de likes persistente en DB, sincronización multi-dispositivo y sección Mis Likes (v1.0.16)

### Problema raíz identificado
Los likes se guardaban únicamente en `localStorage` (`flare_liked`). Al cambiar de dispositivo o cerrar sesión, el historial de likes se perdía. Además, el estado del botón like (❤️ / 🤍) se calculaba solo a partir de datos locales, sin consultar la DB.

### Fix: INSERT en user_likes con await (`like.js`)
- El `INSERT INTO user_likes` era fire-and-forget sin `await` — si fallaba se tragaba silenciosamente
- Ahora usa `await` con `try/catch` que loguea el error en consola
- Garantiza que si el like no se guarda en DB, al menos queda registrado en logs

### Sincronización masiva de likes al arrancar (`config.js`)
- Al iniciar la app en Tier 2 o Tier 3 (`IDENTITY.uid` presente), se hace GET a `/api/likes?uid=X`
- Los IDs devueltos se fusionan con `likedIds` en memoria y se persisten en `localStorage`
- Si los flares ya están en `pins[]`, se actualiza `pin.liked = true` y se llama `refreshPop()` para marcar el corazón visualmente de inmediato
- Cubre el caso de dispositivo nuevo donde `localStorage` está vacío pero la DB tiene el historial

### Verificación puntual al abrir popup del mapa (`markers.js`)
- En el evento `popupopen`, si `pin.liked` es `false` y hay sesión activa, se consulta `/api/likes?uid=X&flare_id=Y`
- Si la DB confirma el like, actualiza `pin.liked`, llama `markLiked()` y re-renderiza el popup
- Cubre el race condition donde los flares llegan antes que termine la sync masiva del arranque

### Verificación puntual al expandir en panel lateral (`panel.js`)
- Al expandir un flare en la barra lateral, si `pin.liked` es `false` y hay sesión activa, hace la misma consulta puntual
- Garantiza que ambas vistas (popup y panel) muestran el estado correcto del like

### Endpoint user-likes con filtro por flare_id (`user-likes.js`)
- GET `/api/likes` acepta parámetro opcional `flare_id` para consultar un solo registro
- Sin `flare_id`: devuelve todos los likes del usuario (hasta 500) — para sync masiva
- Con `flare_id`: devuelve solo ese registro — para verificación puntual al abrir popup/panel (query barata, una sola fila)

### GET /api/flares con JOIN a user_likes (`flares.js`)
- El GET acepta parámetro opcional `uid`
- Cuando viene `uid`, todos los queries (bbox, por id, por owner_uid) hacen LEFT JOIN con `user_likes`
- Devuelve campo `user_liked: true/false` en cada fila
- `fetchFlares` en frontend manda `uid` si hay sesión activa
- `rowToPin` y `reconcilePins` usan `row.user_liked || hasLiked(row.id)` — DB tiene prioridad, localStorage es fallback

### Flujo de doLike invertido: DB primero (`interactions.js`)
- Antes: optimistic update — se marcaba el like en UI y localStorage inmediatamente, luego llamaba al backend
- Ahora: primero llama al backend, solo si confirma se actualiza `pin.liked`, `pin.likes`, `pin.expires_at` y `markLiked()`
- Si el backend falla por cualquier razón (no solo 429), el like NO se guarda en localStorage ni se muestra en UI
- Flag `pin._liking` y botón deshabilitado durante la petición para evitar doble tap
- Rollback limpio en caso de error 429 con mensaje al usuario

### Fix: cerrar sesión limpia likes en memoria (`profile.js`)
- `doSignOut` ahora limpia `likedIds = []` en memoria además de borrar `flare_liked` del localStorage
- También itera todos los `pins` en memoria y setea `pin.liked = false`
- Evita que likes del usuario anterior aparezcan en Tier 1 durante el segundo y medio antes del reload

### Sección "Mis Likes" en perfil (`profile.js`, `theme-dark.css`)
- Nuevo par de tabs "📍 Mis Flares" / "❤️ Mis Likes" reemplaza el título estático
- Tab activo resaltado con borde y fondo verde neón
- `renderMyLikesInProfile()`: carga IDs desde `/api/likes?uid=X`, luego hace fetch individual de cada flare por ID para obtener solo los vigentes
- Muestra título, @username del autor, tiempo restante, contador de likes y botón "📍 Ver aquí"
- "Ver aquí" usa `flyToLikedFlare(id, lat, lng)` — no depende de que el pin esté en memoria

### Función flyToLikedFlare (`panel.js`)
- Cierra el panel y vuela al mapa a las coordenadas exactas del flare
- Si el pin ya está en `pins[]` (estaba en viewport) → abre popup directo
- Si no está en memoria (fuera del viewport) → hace fetch por ID, crea el marker, lo agrega al mapa y abre popup
- Mismo comportamiento que los deep links por hash (`#flare-ID`)

### Ignorar artefactos de Netlify CLI (`.gitignore`)
- Agregado `netlify/functions/*.zip` y `netlify/functions/manifest.json` al `.gitignore`
- Estos archivos los genera Netlify CLI localmente al buildear, no deben versionarse

**Archivos modificados:**
- `netlify/functions/like.js` — await en INSERT user_likes
- `netlify/functions/user-likes.js` — nuevo archivo, soporte filtro por flare_id
- `netlify/functions/flares.js` — LEFT JOIN user_likes cuando viene uid
- `public/js/config.js` — sync masiva de likes al arrancar
- `public/js/api.js` — manda uid en fetchFlares, usa row.user_liked
- `public/js/interactions.js` — doLike espera confirmación DB antes de actualizar UI
- `public/js/markers.js` — verificación puntual en popupopen
- `public/js/panel.js` — verificación puntual al expandir, flyToLikedFlare
- `public/js/profile.js` — tabs Mis Flares/Mis Likes, renderMyLikesInProfile, fix signout
- `public/css/theme-dark.css` — estilos profile-tab
- `.gitignore` — ignorar zips y manifest de Netlify CLI

---

## 2026-06-05 — Migración completa a users.id como fuente de verdad

### Arquitectura de identidad rediseñada
- `flares.owner_uid` = `users.id` (UUID permanente) — ya no usa device_id
- `users.id` es el identificador real del usuario en toda la app
- `device_id` solo se usa internamente al crear el primer perfil Tier 2 para detectar duplicados
- `IDENTITY.uid` en localStorage = `users.id` de la DB

### Tier 1 → Tier 2 (primer flare)
- Al publicar primer flare: sube avatar aleatorio a R2, crea registro en `users` con UUID
- Backend detecta si ya existe un perfil con ese `device_id` — si existe, devuelve el perfil existente
- Frontend guarda `IDENTITY.uid = users.id` y restaura `username` y `avatar_url` del perfil existente si aplica
- `flares.owner_uid = users.id` desde el primer flare

### Tier 2 → Tier 3 (verificación)
- Backend busca por `users_id` (UUID del Tier 2) y hace `UPDATE SET phone, tier=3`
- Mismo registro, mismo UUID — solo se agrega phone y cambia tier
- Si no encuentra el perfil devuelve 404, no crea perfil nuevo
- Eliminado campo de cambiar username del flujo de verificación

### Recovery (Tier 3 sin localStorage)
- Busca por phone en `users`, devuelve perfil completo con `id`
- Frontend guarda `IDENTITY.uid = res.user.id` al recuperar

### Eliminado uso de device_id como identificador
- `getOwnerUid()` devuelve `IDENTITY.uid`, null si Tier 1
- `update-username.js` y `update-avatar.js` buscan por `uid`
- `identity.js` solo acepta GET por `phone`
- `flares.js` GET Mis Flares solo por `owner_uid` (users.id)
- `flares.js` POST tier check por `WHERE id = uid`
- `api.js` eliminadas `postIdentity` y `fetchIdentity`
- `config.js` eliminado bloque auto-recuperación por device_id

### Pendiente en Neon (migración de flares viejos)
```sql
UPDATE flares f SET owner_uid = u.id
FROM users u
WHERE f.owner_uid = u.device_id AND f.owner_uid != u.id;
```

---

## 2026-06-04 — Tarjeta de perfil en panel lateral y fixes de UI

### Tarjeta de perfil en panel de flares
- Nueva tarjeta entre el header y el buscador de lugar en el panel lateral
- Muestra avatar, `@username`, tier (✓ Verificado / ○ Sin validar) y flares publicados hoy
- Al tocarla navega al perfil igual que el ícono 👤
- Solo visible cuando hay identidad (Tier 2 o 3)
- Fix: subtítulo del header en vista de perfil ahora muestra "✓ Verificado" en vez de "Sin validar" para Tier 3

---

## 2026-06-04 — Mis Flares multi-dispositivo y fixes de flares por usuario

### Mis Flares por dispositivo / username
- **Tier 2** — Mis Flares carga por `owner_uid` (device_id), ligado al dispositivo
- **Tier 3** — Mis Flares carga por `owner_uid` OR `username` — visible en cualquier dispositivo donde se inicie sesión, porque el username es único y persistente
- Fix query Neon: `OR` separado en 3 casos (ownerUid+username / solo ownerUid / solo username) para evitar error con parámetros nullables en template literals
- Al recuperar cuenta (`is_recovery`), se transfieren los flares de las últimas 24h del `device_id` anterior al nuevo (`owner_uid` actualizado en tabla `flares`)

---

## 2026-06-04 — Tiers, verificación, perfiles, estadísticas y UX (v1.0.14)

### Límites y tiers
- **Tier 3 sin límite diario** — rate limit propio de 100 flares/hora por IP, verificado en DB por `owner_uid`
- **Tier 1-2** mantiene 10 flares/día y 20/hora
- `getTier()` ahora lee `identity.tier` del localStorage — devuelve 3 correctamente
- Badge cambia de "Sin validar ✕" a "Verificado ✓" post-verificación
- Sección de validación se reemplaza por confirmación verde en Tier 3
- "Restantes hoy" solo se muestra en Tier 1-2, no en Tier 3

### Verificación de teléfono
- Fix bundler `nft` para `verify-firebase` y `media` en Netlify (esbuild fallaba)
- `verify-firebase` reemplaza `firebase-admin` por Google Identity REST API (`accounts:lookup`) — sin dependencias nativas
- Fix reCAPTCHA: se destruye y recrea en cada intento evitando el error de div obsoleto
- Fix recuperación: manda `is_recovery: true` para que el backend transfiera el perfil al nuevo `device_id` en vez de rechazar con 409
- Fix `device_id` duplicado al recuperar desde mismo dispositivo: libera el `device_id` antes de asignarlo
- Mensajes de error muestran código exacto de Firebase (`auth/invalid-verification-code`, etc.)
- Auto-submit al 6to dígito eliminado — solo el botón confirma

### Recuperación de cuenta
- Botón "📱 Ingresar con mi número" en Tier 1 y Tier 2
- Flujo completo: `showRecoverPhone` → `doRecoverSendCode` → `doRecoverConfirm`
- Al recuperar exitosamente: marca `flare_onboarding_complete` para evitar onboarding
- Onboarding no se muestra si hay `flare_identity` en localStorage (map.js y panel.js)

### Cerrar sesión
- Botón "↩ Cerrar sesión" en Tier 3 — limpia `flare_identity` sin tocar DB ni `flare_first_published`
- Fix: `doSignOut` ya no borra `flare_first_published` ni `flare_onboarding_complete` para evitar celebrate y onboarding al volver

### Avatar de perfil
- Avatar asignado en Tier 2 se persiste inmediatamente en localStorage — no cambia aleatoriamente
- `ensureIdentityAvatar` guarda en localStorage al asignar por primera vez
- Al verificar (Tier 2 → Tier 3): avatar local se migra automáticamente a R2 via Canvas → base64 → `/api/media`
- Nuevo endpoint `POST /api/profile/avatar` persiste `avatar_url` en `users`
- `verify-firebase` devuelve `avatar_url` en todos los `RETURNING`
- Foto de perfil personalizada para Tier 3: tap en avatar abre selector, comprime a 400px y sube a R2
- CSS: ícono 📷 en esquina del avatar en Tier 3

### Cambio de username
- Botón "✏️ Cambiar" debajo del username en Tier 3
- Primeros 2 cambios libres, del 3ro en adelante espera 7 días
- Mensaje indica días exactos restantes
- Nuevo endpoint `POST /api/profile/username` con validación de unicidad, tier e intervalo
- Al cambiar, actualiza `username` en flares de las últimas 24h
- SQL requerido: `username_changes INTEGER`, `username_changed_at TIMESTAMPTZ` en `users`

### Popup y UI del mapa
- Popup ancho fijo `min(280px, 100vw-48px)` responsive, `maxWidth:280` en Leaflet
- Imagen en popup con caja fija 240px altura, `object-fit:contain` sin recortar
- Like ya no cierra el popup: flag `_likeInProgress` bloquea `fetchFlares` en `popupclose`
- FAB wrap con `pointer-events:none` — área transparente no bloquea toques al mapa
- Lightbox: tap en imagen abre fullscreen, cierra con tap/✕/ESC (popup y panel lateral)

### DEV mode en perfil
- Bloque DEV reset de tier visible solo con `DEV_DURATION_MODE` activo
- → Tier 1: borra identidad local con confirmación
- → Tier 2: baja tier y limpia phone, mantiene username y avatar

### Estadísticas en admin
- Nuevo endpoint `GET /api/admin/stats?days=N` — requiere `x-admin-key`
- Retorna: usuarios por tier (total, nuevos, activos), flares (total, activos, con imagen)
- Tier 2 se cuenta desde `owner_uid` únicos en `flares` no registrados en `users`
- Panel 📊 Estadísticas en admin con selector de período (1d a 1 año) y exportación CSV
- `last_seen_at TIMESTAMPTZ` agregado a `users`, se actualiza al publicar flare y al verificar
- SQL requerido: `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW()`
- SQL requerido: `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`
- SQL requerido: `ALTER TABLE users ADD COLUMN IF NOT EXISTS username_changes INTEGER DEFAULT 0`
- SQL requerido: `ALTER TABLE users ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ`

**Archivos clave:**
- `netlify/functions/verify-firebase.js` — reescrito sin firebase-admin
- `netlify/functions/update-username.js` — nuevo
- `netlify/functions/update-avatar.js` — nuevo
- `netlify/functions/admin-stats.js` — nuevo
- `netlify/functions/flares.js` — tiers, last_seen_at
- `public/js/profile.js` — tiers, avatar, username, recover, signout, DEV
- `public/js/config.js` — getTier(), ensureIdentityAvatar()
- `public/js/map.js` / `panel.js` — onboarding condicional
- `public/css/theme-dark.css` — estilos tier3, avatar, signout, recover, dev
- `public/admin.html` — sección estadísticas

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
