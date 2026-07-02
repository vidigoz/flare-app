# Iconos — Mapa, Compartir, Reportar

## Mejor opción para Claude Code: NO uses imágenes, usa iconos vectoriales
Estos tres iconos son estándar y existen en cualquier librería. Pídele a Claude Code que use
la librería de iconos de tu proyecto:

| Diseño    | Lucide / lucide-react | SF Symbols (iOS)        | Material Icons        |
|-----------|-----------------------|-------------------------|-----------------------|
| Mapa      | `Map`                 | `map`                   | `map`                 |
| Compartir | `Share2`              | `square.and.arrow.up`   | `share` / `ios_share` |
| Reportar  | `Flag`                | `flag`                  | `flag` / `outlined_flag` |

Ejemplo (React + lucide-react):
```jsx
import { Map, Share2, Flag } from "lucide-react";
<Map size={21} strokeWidth={1.7} color="#aab4c4" />
<Share2 size={21} strokeWidth={1.7} color="#aab4c4" />
<Flag size={21} strokeWidth={1.7} color="#8794a6" />
```

## Si prefieres los SVG exactos del diseño
Están en esta carpeta como `map.svg`, `share.svg`, `report.svg`. Usan `currentColor`, así que
toman el color del texto del contenedor (cámbialo con `color:` en CSS, o `tint`/`color` en
nativo). Strokes 1.7, tamaño base 24×24 (en la tarjeta se muestran a 20–21px).

- Web: `<img src="map.svg">` (no recolorea) o inline `<svg>`/import como componente (sí recolorea con `currentColor`).
- React Native: `react-native-svg` + `SvgUri`, o pega el path en un `<Svg><Path/></Svg>`.

## PNG transparentes (último recurso)
`map-48 / 96`, `share-48 / 96`, `report-48 / 96`. Color ya quemado
(gris `#aab4c4`; Reportar `#8794a6`), fondo transparente. Úsalos solo si no puedes renderizar
SVG. **Recomendado quedarte con SVG/iconos** — escalan sin pixelarse y se recolorean.
