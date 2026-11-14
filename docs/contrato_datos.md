# Contrato de datos — Equipo Datos → Landry (web)

Acordado por Aldo + Landry (T03 de la matriz atómica v1.4). Base para que Marco y Antonella
generen los archivos y para que Landry/Juan los consuman sin ambigüedad.

Estado: **v0 — borrador, pendiente de confirmar con Landry.**

## Dónde se entregan los archivos finales

**`frontend/public/data/`** — NO en `data/outputs/` ni en ninguna carpeta llamada
`outputs/`: el `.gitignore` del repo ignora cualquier carpeta con ese nombre, así que
nada ahí llega nunca a GitHub. `frontend/public/` sí está versionado y, al ser un sitio
sin backend (Vite/React estático), Landry puede hacer `fetch('/data/<archivo>')`
directamente sobre estos archivos sin necesitar servidor.

`data/raw/` y `data/processed/` siguen siendo las carpetas de trabajo intermedio de
Marco y Antonella (ignoradas a propósito — ahí sí pueden crecer los CSV grandes de FIRMS
sin inflar el repo). Solo lo que ya está listo para Landry se copia a `frontend/public/data/`.

## 1. `monthly_series.csv` — produce Marco, usan Antonella + Landry

Conteos mensuales observados (MODIS y VIIRS), por celda/región y mes.

- Clave: `region_id` (o `cell_id`), `year`, `month`, `sensor`
- Columnas mínimas: `n_detections`, `indicator` (días-celda con detección), `qc_status`
- `sin detección` ≠ `sin datos`: usar un campo de estado explícito, nunca dejarlo ambiguo con un 0.
- Evidencia de descarga y pruebas celda-día (ver `test_grid_dedupe.py`).

## 2. `calibrated_series.csv` — produce Antonella, usa Aldo (Landry lo integra)

- Columnas: `value`, `method` (B0/B1), `split` (train/valid/test), `status`, `residual`
- Sin ningún `NaN`.

## 3. `validation.json` — produce Antonella, usan Aldo + Landry

Por cada método y split:
- Métricas globales: `MAE`, `WAPE`, `sesgo`
- `n_months_matched`
- Colección de residuos mensuales en **test**:
  `{month, modis_observed, estimate, signed_error, absolute_error}`
- Ordenado por `absolute_error` (para el top-5 de la vista Método).
- No mezclar error de entrenamiento con el de test.
- Si faltan residuos: mostrar solo métricas globales + `"detalle_mensual": "no disponible"` — nunca inventar valores.

## 4. `method.json` — producen Aldo + Antonella, usa Landry

Explica en texto plano: indicador usado, sensores, periodos, cómo se calibró B1, limitaciones conocidas.

## 5. `cells_<region>_<year>.geojson` — produce Marco, usa Juan Matías

- **CRS: WGS84** (para visualización — el EPSG:6933 es solo interno para la malla de cálculo).
- Identificadores de celda, mes/año/sensor, y valores **observados** (nunca calibración regional aplicada a celda).

## 6. `manifest.json` — produce Marco, usa todo el equipo

- Qué archivos existen, de qué fecha, qué versión/hash, qué región cubren.

## Reglas generales (sección 3 y 5 de la matriz)

- Una tarea termina cuando: el archivo existe, cumple este contrato, tiene pruebas, pasa por PR y revisión, y quien lo consume puede integrarlo.
- Fixtures DEMO solo durante desarrollo — nunca se presentan como datos reales ni quedan en los artefactos finales.
