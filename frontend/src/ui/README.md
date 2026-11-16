# `ui/` — sistema visual de AllpaNina (F0)

Base para rediseñar las páginas. Tokens en `src/styles/app.css` (`@theme`), detalle en `frontend/docs/PLAN_REDISENO.md` §A2.

## Cómo se usa
```tsx
import { Button, ButtonLink, Panel, PageHeader, Segmented, Select, Field, Notice, FireLegend, fireColor, quantileBreaks, fireStep, formatCount } from '../../ui'
```

## Colores (clases de Tailwind)
| Clase | Hex | Uso |
|---|---|---|
| `bg-night` / `text-night` | `#0B1736` | barra, portada, mapa |
| `bg-orbit` | `#16264F` | paneles sobre Noche |
| `border-rule` | `#2A3B66` | bordes sobre Noche |
| `bg-paper` | `#F6F7F9` | fondo de lectura |
| `border-hairline` | `#DDE1E8` | bordes sobre Papel |
| `text-ink` | `#14213D` | texto principal |
| `text-muted` | `#55607A` | texto secundario sobre Papel |
| `text-mist` | `#C9D1E6` | texto secundario sobre Noche |
| `bg-ember` | `#FB9C38` | acción sobre Noche (texto `text-ink`) |
| `bg-cinder` | `#B23A0E` | acción sobre Papel (texto blanco) |
| `bg-fire-1` … `bg-fire-9` | | escala de fuego sobre Papel |
| `bg-glow-1` … `bg-glow-9` | | escala de fuego sobre Noche (invertida) |
| `bg-zero` / `bg-zero-dark` | | cero válido |
| `bg-hatch` / `bg-hatch-dark` | | rayado de «sin dato» |

Tipografía: `font-sans` (IBM Plex Sans) y `font-display` (IBM Plex Sans Condensed). Tamaños `text-xs` (13 px) … `text-5xl` (64 px); nada por debajo de 13 px. Radios: `rounded-cell` (3), `rounded-control` (6), `rounded-panel` (10). Sombra: `shadow-float`, solo sobre el mapa.

## Componentes
| Componente | Para qué |
|---|---|
| `Button`, `ButtonLink`, `ButtonAnchor` | `variant`: `primary` (sobre Papel), `glow` (sobre Noche), `secondary`, `ghost`; `size`: `sm`, `md`, `lg` |
| `Field` + `Select` / `TextInput` | etiqueta, ayuda y error enlazados por id |
| `Tabs` | pestañas ARIA con teclado |
| `Segmented` | opciones excluyentes (sensor, período) con `aria-pressed` |
| `Panel`, `PageHeader`, `Stat`, `Disclosure` | superficies, títulos, cifras, plegables («Technical detail») |
| `Notice` | `info`, `warning`, `error` (role=alert) y `exploratory` (My region, DEMO) |
| `Progress`, `Steps` | progreso del Worker y pasos del flujo de My region |
| `FireLegend`, `DataStateLegend` | leyenda por clases y estados que no son magnitud |
| `fireColor`, `fireTextColor`, `quantileBreaks`, `fireStep`, `classLabels` | escala de fuego por cuantiles (solo presentación) |
| `formatCount`, `formatMonth`, `formatMonthLong` | «25,046», «Aug 2024», «August 2024» |

## Reglas
- Todo texto visible en inglés (B7).
- Tailwind no lleva *preflight*: el CSS anterior vive en la capa `legacy` (`styles/legacy.css`) y las utilidades siempre ganan. Al rediseñar una página, quita su hoja de `legacy.css`.
- MapLibre y lo que Tailwind no cubra: CSS normal, sin problema.
- Cero, sin dato y no publicado nunca dependen solo del color.
