# T35 — Control previo: carga de los datos reales en el frontend

- **Hecho por:** Aldo, 14-nov-2026, antes de T32/T33 (adelanto de T35, "control independiente sobre carga").
- **Frontend probado:** `feat/frontend-calendar` @ `c52d694` (Landry).
- **Datos probados:** `frontend/public/data/` de `feature/calibracion` @ `9326e46`. Son los archivos reales aprobados en T12, T27 y T29.
- **Cómo se probó:** se corrieron los validadores reales del frontend (`frontend/src/services/data/validators.ts`) con Node sobre cada archivo real, sin modificar código.

## Resultado: 3 de 6 archivos no cargan

| Archivo | Resultado | Error del validador |
|---|---|---|
| `monthly_series.csv` | ❌ FALLA | `CSV: falta columna obligatoria sensor` |
| `manifest.json` | ❌ FALLA | `region: texto obligatorio` |
| `cells_PE-UCA_<año>.geojson` | ❌ FALLA | `features[0].sensor: valor permitido: MODIS, VIIRS` |
| `calibrated_series.csv` | ✅ OK | 326 registros |
| `validation.json` | ✅ OK | |
| `method.json` | ✅ OK | |

## Causa

El frontend implementa el **contrato v0**, el de antes de las correcciones. Los datos siguen el contrato vigente, `docs/contrato_datos.md`:

| Contrato v0 (frontend) | Contrato vigente (datos reales) |
|---|---|
| `sensor` | `sensor_group` |
| `n_detections` + `indicator` | `cell_days` (un solo indicador) |
| `qc_status`: `ok` / `insufficient_data` / `no_pass` | `status`: `ok` / `missing` |
| `indicator` acotado a 0–31 | `cell_days` **sin tope**: es la suma región-mes (por ejemplo, 2,323 en 2024-09). El rango 0–31 solo vale para una celda. |
| manifest: `region` | manifest: `region_id` |
| manifest: `files` = lista de objetos `{name, version, rows}` | manifest: `files` = lista de nombres, más `hash`, `producto`, `periodo` y `sources` (opcional) |
| GeoJSON: `properties.sensor`, `properties.n_detections` | GeoJSON: `properties.sensor_group`, `properties.cell_days`, `properties.cell_id` |

## Qué hay que cambiar (Landry en T32, Juan Matías en T33)

1. **`validators.ts`:** `parseMonthlySeries`, `validateManifest` y `validateCells`, con los nombres y valores del contrato vigente.
2. **Calendario** (`CalendarGrid.tsx`, `CalendarDetail.tsx`, `HistoricalCalendar.tsx`):
   - Usar `cell_days` y `status`.
   - **Cambiar la escala de color fija de 0–31.** Con valores reales de cientos o miles, todos los meses activos salen saturados. Conviene una escala relativa al máximo de la serie, o por cuantiles.
   - La leyenda debe tener solo `ok` (incluido el 0), `missing` y "ausente".
3. **Mapa** (`MapPage.tsx`, `FireMapTest.tsx`, `map.ts`):
   - Usar `manifest.region_id`. Hoy arma `cells_${manifest.region}_`, que con datos reales da `cells_undefined_`.
   - Usar `properties.cell_days` y `properties.sensor_group`.
   - Hay GeoJSON de **2013 a 2024**. Del test, 2025-2026, no hay mapa: el filtro de año tiene que mostrar el fallback para esos años, no un error.
4. **Pantalla de Método:** `validation.json` final trae **solo el test** (T30). Las métricas de validación (2023-2024) están en `method.json` → `resultados.valid`. Si la pantalla compara validación y test, tiene que leer la validación de `method.json`.
5. **Quitar los avisos de "DATOS DEMO"** cuando se carguen los datos reales (criterio de T32: "no DEMO en producción").
6. **Integrar `main`.** La rama del frontend todavía no incluye `main`, así que no tiene los datos reales.

## Pendiente para el T35 completo (con Juan Matías, después de T32 y T33)

- Volver a correr esta prueba. Los 6 archivos tienen que dar OK.
- Recorrido completo: Mapa → Calendario → Método → tabla de errores → CSV.
- Comprobar que la web muestra exactamente las cifras aprobadas:
  - 2024-09: MODIS 2,323, VIIRS 5,581.
  - Test B1: MAE 29.7, WAPE 0.31.
  - Validación B1: WAPE 0.18.
  - κ = 0.2936.
- Comprobar que el CSV descargado coincide con lo que se ve en pantalla.
