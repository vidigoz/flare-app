# Flare — El mapa vivo

Plataforma social de geolocalización en tiempo real donde los usuarios publican posts efímeros ("Flares") que aparecen en un mapa interactivo y desaparecen solos al cabo de 1 hora.

---

## Propuesta de valor

> *"Descubre lo que está pasando cerca de ti, ahora mismo"*

Sin algoritmo. Sin cuenta. Sin scroll infinito. Solo un mapa con lo que está ocurriendo en tu zona en este momento.

---

## Funcionalidades

### Para quien consume
- Mapa en tiempo real con Flares activos, actualizados cada 15 segundos
- Filtros por frescura: Nuevo (verde), Maduro (amarillo), Expirando (rojo)
- Búsqueda geográfica por colonia, ciudad o negocio
- Categorías: Comida & Bebida, Ofertas (más en camino)

### Para quien publica
- Sin registro: identidad anónima por device ID
- Publicar en segundos: emoji + categoría + título + descripción
- Límite de 3 Flares por día por dispositivo
- Duración fija: 1 hora exacta

### El mecanismo diferenciador: el rescate
Los likes no son solo vanidad — cada like suma 5 minutos de vida al Flare. Si la comunidad considera valioso el post, lo mantiene vivo. Si no, muere. Crea un loop de engagement único y gamificado.

### Otras features
- Enlace directo a Google Maps desde el post
- Detección automática de teléfonos y URLs (se vuelven clickeables)
- PWA instalable: funciona como app nativa en iOS y Android sin pasar por tiendas
- Diseño dark con acento neón verde (#00f5a0), visualmente muy distintivo
- Reporte comunitario: 3 reportes ocultan el post automáticamente
- Sistema de soporte con tickets por email

---

## Usuarios objetivo

| Perfil | Caso de uso |
|--------|-------------|
| Vendedores ambulantes / pop-ups | "Estoy en Av. Juárez con tacos hasta las 3pm" |
| Negocios con promo del día | "Hoy 2x1 en café hasta las 12" |
| Usuarios buscando deals | Checa si hay algo cercano antes de salir |
| Organizadores de eventos pequeños | "Tocada hoy en el bar X, quedan lugares" |
| Comunidad local / vecinos | Alertas, situaciones, avisos de zona |

---

## Mercado objetivo

App completamente en español, orientada a **México y Latinoamérica**, con soporte para formatos de teléfono mexicano (+52).

---

## Tech stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vanilla JavaScript + Leaflet.js |
| Backend | Netlify Functions (serverless) |
| Base de datos | Neon PostgreSQL |
| Email | Nodemailer |
| PWA | Service Worker + Web App Manifest |

---

## Flujo de onboarding

1. **Bienvenida**: introducción con mascota
2. **Explorar**: explica cómo ver posts ajenos y la duración de 1 hora
3. **Tu turno**: invita a crear el primer Flare
4. **Celebración**: animación de confetti al publicar el primero

---

## Moderación y límites

- 3 Flares máximo por dispositivo por día (reset a medianoche hora local)
- Rate limiting por IP en todos los endpoints
- Filtro de contenido inapropiado del lado del servidor
- Panel de administración protegido con `ADMIN_SECRET`:
  - Gestión de configuración
  - Carga masiva de Flares via CSV
  - Gestión de tickets de soporte
  - Estadísticas y monitoreo
