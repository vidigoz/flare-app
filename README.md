# Flare App 🔥
**El mapa que respira** — con backend real en Netlify + Neon DB

---

## Estructura del proyecto

```
flare-app/
├── public/
│   └── index.html          ← Tu app completa
├── netlify/
│   └── functions/
│       ├── flares.js       ← GET y POST flares
│       └── like.js         ← PATCH like (+5 min)
├── schema.sql              ← Corre esto en Netlify DB
├── netlify.toml            ← Config de Netlify
└── package.json
```

---

## Cómo deployar paso a paso

### 1. Crear repo en GitHub
1. Ve a https://github.com/new
2. Nombre: `flare-app`
3. Sube todos estos archivos (arrastra la carpeta o usa `git push`)

### 2. Conectar Netlify
1. Ve a https://app.netlify.com
2. **"Add new site" → "Import an existing project"**
3. Elige GitHub → selecciona `flare-app`
4. Build settings:
   - Build command: *(dejar vacío)*
   - Publish directory: `public`
5. Click **"Deploy site"**

### 3. Crear la base de datos
1. En tu sitio de Netlify → **"Database"** en el menú izquierdo
2. Click **"Create new database"** → confirma con Neon
3. Netlify automáticamente agrega `DATABASE_URL` a tus variables de entorno

### 4. Crear las tablas
1. En Netlify → Database → **"Open in Neon"** (o ve a console.neon.tech)
2. En el SQL Editor, pega y ejecuta el contenido de `schema.sql`
3. Deberías ver la tabla `flares` creada exitosamente

### 5. Instalar dependencia
En Netlify → **Site configuration → Environment variables**, verifica que `DATABASE_URL` existe.

Netlify instalará `@neondatabase/serverless` automáticamente al deployar.

### 6. Re-deploy
Haz un pequeño cambio en cualquier archivo y push, o en Netlify → **"Trigger deploy"**

---

## URLs de la API (una vez deployed)

```
GET  https://tu-sitio.netlify.app/api/flares?minLat=32.5&maxLat=32.6&minLng=-116.7&maxLng=-116.6
POST https://tu-sitio.netlify.app/api/flares
PATCH https://tu-sitio.netlify.app/api/like?id=FLARE_ID
```

### POST /api/flares — body ejemplo:
```json
{
  "lat": 32.572,
  "lng": -116.628,
  "title": "Tacos de carne asada",
  "emoji": "🌮",
  "cat": "food",
  "cat_lbl": "Comida y Bebida",
  "cat_color": "#ff9500",
  "cat_icon": "🍽️",
  "type": "text",
  "body_text": "Los mejores de Tecate",
  "dur_min": 60
}
```

---

## Cómo funciona el "tiempo real"

La app hace **polling cada 15 segundos** al servidor:
- Pide los flares del área visible en el mapa
- Agrega los nuevos que otros usuarios crearon
- Actualiza likes y tiempos de los existentes
- Elimina los que ya expiraron

El indicador **"sincronizado"** en el header muestra el estado.

---

## Notas

- Los flares duran **1 hora** por defecto (ajustable en `dur_min`)
- Máximo **12 horas** con likes
- Cada like suma **+5 minutos**
- Los likes se guardan en `localStorage` para no repetir
- Imágenes se guardan como **base64** — para producción seria reemplazar con Cloudinary o Supabase Storage
