# AllpaNina · C2 — Plan de refactorización del frontend

**Fecha:** 15-nov-2026 · **Responsable:** Marco (con Claude) · **Base:** `AUDITORIA_C1.md` (misma carpeta)
**Rama de trabajo:** `refactor/frontend-fase2` (al 15-nov apunta al mismo commit que `main`, `384654f`). El nombre `refactor/frontend-experience` que figuraba en versiones anteriores de este plan no existe en el repositorio remoto. Fase 1 y C5 se hicieron primero sobre `refactor/frontend-v2` (`0526391`, `6555baf`) y se unieron después a la integración nacional de Landry (`feat/peru-integration`, fusionada en `main` por el PR #8).
**Estado:** plan escrito. **Fase 1** y **Fase 1b (C5)** ejecutadas y en `main`. **Fase 2** parcial: parte la resolvió Landry durante la integración nacional. **Fase 3** pendiente. El detalle está en la sección 0.

## 0. Estado verificado (15-nov-2026, sobre `main` `384654f`)

Verificado en un clon de trabajo limpio: `npm ci` correcto; `npm test` 185 de 185; `npm run lint` sin errores; `npm run build` correcto (solo un aviso de tamaño por `maplibre-gl`, que se carga únicamente en `/mapa`). **No verificado todavía:** capturas a 390 y 1440 px, navegación con teclado, contraste ni lector de pantalla (todo eso es C6).

| # | Estado | Evidencia o pendiente |
|---|---|---|
| 1.1–1.6 | ✅ Hecho | `index.html` con `lang="es"` y título propio; `public/favicon.svg`; `useDocumentTitle.ts`; landing en `/`; `/?…` redirige a `/calendario`; `router.test.ts` y `landing.test.ts` |
| 1b.1, 1b.3 | ✅ Hecho | `CellDaysHelp` con `purpose`; contexto de la celda en `ExplorationPanel.tsx`; `clarity.test.ts` y `map-ui.test.ts` |
| 2.1 Nombres de región | ✅ Hecho (Landry, A3) | `GeographicSelection.tsx` y `CalendarPage.tsx` toman el `nombre` de `peru/method.json` |
| 2.2 Textos del mapa nacional | 🟡 Parcial | Los textos de 10 km ya existen (`CartographyPanel`, `ExplorationPanel`, `AnnualCellDetail`, `MapWorkspace`). Falta: el título «Inspector de celda» no cambia en el modo nacional |
| 2.3 Capa «Áreas protegidas · Ucayali» | ⬜ Pendiente | Se sigue ofreciendo en el modo nacional (`CartographyPanel.tsx`). Decide Landry |
| 2.4 Mensajes de error | ⬜ Pendiente | Se muestran textos técnicos (`String(error)`) en `GeographicSelection.tsx`, `MapPage.tsx` y `useJuanMap.ts`. Coordinar con Landry |
| 2.5 Párrafo nacional en Método | ✅ Hecho (Landry, A5) | `NationalMethodNotes.tsx` |
| 2.6 Menú «Acerca de» (nuevo) | ✅ Hecho (Marco) | `Navbar.tsx`: el enlace al manifiesto sigue al conjunto de datos activo (Perú v1.1, piloto Ucayali v1.0 o DEMO) y lo nombra; el texto de ayuda obsoleto se sustituyó por una descripción de las tres vistas. Prueba en `app-header.test.ts` |
| 3.1 Leyenda del mapa | ⬜ Pendiente | `CartographyPanel.tsx` sigue usando `toFixed(1)` en los cortes por percentil |
| 3.2 Escala del calendario | ⬜ Pendiente | `CalendarExplorer.tsx` sigue usando `toFixed(1)` en las marcas de la escala |
| 3.3 Móvil del mapa | ⬜ Sin verificar | Requiere capturas con el mapa base real |
| 3.4 Tokens y orden del código | ⬜ Pendiente | `tokens.css` sin ampliar; `juanLayers.ts` sin renombrar |
| 3.5 Contexto comparativo | ✅ Cubierto (Landry) | `HistoricalAnalysis.tsx`: mismo mes en años anteriores |

**Para revisar con Landry (C5):** según `frontend/README.md`, al elegir un departamento el mapa «oculta las celdas exteriores y recorta visualmente las fronterizas». La interfaz aclara que el recorte es solo cartográfico, pero conviene confirmar juntos que no se lea como un mapa departamental exacto (precaución A7).

## 1. Reglas que este plan respeta

- Marco cambia el **frontend de presentación**: páginas nuevas, textos, estilos, metadatos.
- Marco **no** cambia lectores, validadores, contratos de datos, cifras ni la lógica de selección compartida sin coordinar con Landry (plan de coordinación §4).
- No se borra ni reemplaza la cartografía multiescala existente.
- Ninguna fase cambia un número publicado: solo cómo se explica o se rotula.
- Nada se anuncia como disponible si no lo está: la landing describe lo que la aplicación **muestra hoy**.

## 2. Fases

### Fase 1 — Ejecutable ahora (no depende de Landry)

| # | Cambio | Archivos | Criterio de aceptación (verificable) |
|---|---|---|---|
| 1.1 | Idioma y metadatos | `index.html`, `public/favicon.svg` (nuevo) | `lang="es"`; título y descripción propios; el favicon existe (hoy 404 / sin archivo) |
| 1.2 | Título distinto por ruta | `app/layouts/MainLayout.tsx`, `app/useDocumentTitle.ts` (nuevo) | `document.title` cambia en `/`, `/calendario`, `/mapa`, `/metodo` y en rutas inexistentes (prueba automática) |
| 1.3 | **Landing en `/`** | `pages/landing/LandingPage.tsx` y `landing.css` (nuevos), `app/AppRoutes.tsx`, `main.tsx` | Explica qué es AllpaNina, qué preguntas permite explorar, de dónde vienen los datos y sus límites; enlaza a las 3 vistas; **sin** afirmar predicción, tiempo real, incendio confirmado ni cobertura nacional; un solo `h1`; sin desbordamiento a 390 px |
| 1.4 | La marca lleva al inicio; 404 también | `components/layout/Navbar.tsx`, `pages/NotFoundPage.tsx` | Clic en «AllpaNina» abre `/`; las rutas directas `/calendario`, `/mapa`, `/metodo` siguen funcionando |
| 1.5 | Enlaces antiguos no se rompen | `app/AppRoutes.tsx` | `/` **con** parámetros de consulta (como los de enlaces compartidos antes) sigue redirigiendo a `/calendario` conservando parámetros y ancla |
| 1.6 | Pruebas | `tests/router.test.ts`, `tests/landing.test.ts` (nuevo) | Pasan las 125 previas (ajustando solo la de la ruta `/`) y las nuevas; `lint` y `build` limpios |

**Riesgo de conflicto con Landry:** `AppRoutes.tsx`, `MainLayout.tsx` y `Navbar.tsx` pueden ser editados también por él (selector de región). Los cambios de la Fase 1 en esos tres archivos son pequeños y aislados (una ruta, un hook, un enlace); si Landry ya modificó alguno, se integra a mano, no se pisa.

### Fase 1b — C5 · Claridad científica (ejecutable sin Landry; solo presentación)

| # | Cambio | Archivos | Criterio de aceptación (verificable) |
|---|---|---|---|
| 1b.1 | Landry ya había añadido la explicación «¿Qué significa días-celda?» (`CellDaysHelp`) en Calendario y Mapa. C5 **no la duplica**: le añade un párrafo según la vista (para qué sirve comparar períodos / cómo leer el valor de una celda) | `components/ui/CellDaysHelp.tsx` (prop `purpose`), `components/ui/cellDaysPurpose.ts` (nuevo), `CalendarExplorer.tsx`, `CartographyPanel.tsx` | El párrafo aparece en ambas vistas (`clarity.test.ts`, `map-ui.test.ts`) |
| 1b.2 | **No implementado, a propósito.** Se había previsto mostrar la posición del mes dentro de toda la serie, pero mezcla estaciones (diciembre frente a agosto) y Landry añadió después el **Análisis histórico** (mismo mes de años anteriores, mediana, mínimo de tres años), que es más riguroso | — | Se evita duplicar la función; no queda texto ni código de esta idea en el Calendario |
| 1b.3 | Contexto de la celda seleccionada en el mapa: cuántas celdas con registro de la vista tienen más días-celda y el máximo | `ExplorationPanel.tsx` | Prueba en `map-ui.test.ts` |

Los números mostrados son conteos de valores ya publicados (posición dentro de la serie o la vista), no métricas nuevas ni cifras científicas modificadas. No se tocaron lectores, validadores, contratos ni `public/data/`.

### Fase 2 — Depende de Landry (A2, A3, A6, A7)

No se inicia hasta que Landry confirme los lectores v1.1 y el selector de región.

| # | Cambio | Depende de |
|---|---|---|
| 2.1 | Nombres de región en lugar de códigos (`PE-05` → nombre) en títulos y selectores | A3: lista de nombres |
| 2.2 | Textos científicos del mapa nacional: bloque de 10 km, valores que pueden superar 31, «Inspector de celda» → texto correcto por resolución | A6/A7 y revisión científica |
| 2.3 | Quitar o condicionar «Áreas protegidas · Ucayali» en el contexto nacional | decisión de Landry |
| 2.4 | Mensajes de error comprensibles (el detalle técnico queda en un desplegable) | A2 (cambia qué falla y cómo) |
| 2.5 | Párrafo de dominio en Método para el ámbito nacional | A5 |

### Fase 3 — Mejoras (P1), tras estabilizar P0

| # | Cambio | Nota |
|---|---|---|
| 3.1 | Leyenda del mapa sin cortes repetidos («> 1.0 a 1.0») y sin decimales en conteos | toca la cartografía de Juan/Landry: coordinar |
| 3.2 | Escala del calendario sin decimales y con explicación | `CalendarExplorer.tsx` (compartido con A4) |
| 3.3 | Móvil del mapa: controles que no tapan la atribución; objetivos táctiles ≥ 24 px | revisar con el mapa base real |
| 3.4 | Ampliar `tokens.css` (espaciado, tamaños) y ordenar líneas muy largas | sin cambiar aspecto |
| 3.5 | Contexto comparativo para interpretar datos históricos | solo si P0 está estable |

## 3. Fuera de alcance de Marco (se deja a Landry)

H1, H2, H4 (lectores, validadores, contrato v1.2), H12 (`package-lock.json` con 24 paquetes en un espejo bloqueable) y H13 (compresión HTTP de los GeoJSON, A8).

## 4. Verificación común de cada fase

`npm test`, `npm run lint` y `npm run build` sin errores; capturas en 1440 px y 390 px; sin desbordamiento horizontal; navegación directa a las 4 rutas; ningún cambio en archivos de `public/data/`.
