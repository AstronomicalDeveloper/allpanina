# AllpaNina · C2 — Plan de refactorización del frontend

**Fecha:** 15-nov-2026 · **Responsable:** Marco (con Claude) · **Base:** `AUDITORIA_C1.md` (misma carpeta)
**Rama de trabajo:** `refactor/frontend-experience`, creada desde `feat/peru-integration` (`a4c59f2`, Landry) e integrada con los cambios de la Fase 1 (publicados antes en `refactor/frontend-v2`, `6555baf`). Fase 1 y C5 se hicieron primero sobre `refactor/frontend-v2` (`0526391`) y se unieron después a la integración nacional de Landry.
**Estado:** plan escrito. **Fase 1** ejecutada (`6555baf`). **C5** (claridad científica en la interfaz, ver Fase 1b) ejecutada después. Las fases 2 y 3 **no** están hechas.

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
