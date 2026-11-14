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

---

## Tipos de campo (para que Landry tipe en TS sin adivinar)

### monthly_series.csv

| Campo | Tipo | Notas |
|---|---|---|
| `region_id` | string | Identificador fijo de la región piloto, ej. `PE-LOR-01` |
| `year` | int | |
| `month` | int | 1-12 |
| `sensor` | enum | `MODIS` \| `VIIRS` |
| `n_detections` | int | conteo crudo, puede ser 0 |
| `indicator` | float | días-celda con detección, 0 a 31 |
| `qc_status` | enum | `ok` \| `insufficient_data` \| `no_pass` |
| `source_version` | string | ej. `FIRMS-MCD14DL-v061` |
| `updated_at` | string (ISO 8601) | `YYYY-MM-DD` |

### calibrated_series.csv

| Campo | Tipo | Notas |
|---|---|---|
| `region_id` | string | |
| `year` / `month` | int | |
| `method` | enum | `B0` \| `B1` |
| `value` | float | |
| `split` | enum | `train` \| `valid` \| `test` |
| `status` | enum | `ok` \| `insufficient_data` |
| `residual` | float, vacío si no aplica | **nunca escribir la palabra `NaN`** — dejar la celda vacía |

### validation.json / method.json / manifest.json

Ver ejemplos DEMO abajo — los campos se infieren del JSON mismo (no hace falta tabla aparte).

## Ejemplos DEMO (datos inventados, nunca reales)

**monthly_series.csv**
```
region_id,year,month,sensor,n_detections,indicator,qc_status,source_version,updated_at
DEMO-01,2026,1,MODIS,12,8.0,ok,FIRMS-MCD14DL-v061,2026-11-14
DEMO-01,2026,1,VIIRS,0,0.0,ok,FIRMS-VNP14IMGML-v2,2026-11-14
DEMO-01,2026,2,MODIS,,,insufficient_data,FIRMS-MCD14DL-v061,2026-11-14
```

**calibrated_series.csv**
```
region_id,year,month,method,value,split,status,residual
DEMO-01,2026,1,B0,8.0,train,ok,
DEMO-01,2026,1,B1,8.3,train,ok,
DEMO-01,2025,8,B1,9.1,test,ok,-1.5
```

**validation.json**
```json
{
  "region_id": "DEMO-01",
  "methods": {
    "B1": {
      "split": "test",
      "metrics": { "mae": 1.2, "wape": 0.18, "bias": -0.3 },
      "n_months_matched": 6,
      "residuals": [
        { "month": "2025-08", "modis_observed": 10, "estimate": 8.5, "signed_error": -1.5, "absolute_error": 1.5 }
      ]
    }
  }
}
```

**method.json**
```json
{
  "indicator": "dias-celda con deteccion",
  "sensors": ["MODIS Terra", "MODIS Aqua", "VIIRS S-NPP"],
  "period_train": "2015-01:2023-12",
  "period_valid": "2024-01:2024-12",
  "period_test": "2025-01:2025-12",
  "calibration": "B1 = B0 * kappa (factor global ajustado en train)",
  "limitations": [
    "Suomi NPP VIIRS dejo de operar el 1-2 nov 2026; se usa producto estandar con rezago de 2-3 meses"
  ]
}
```

**cells_DEMO-01_2026.geojson**
```json
{
  "type": "FeatureCollection",
  "crs": { "type": "name", "properties": { "name": "EPSG:4326" } },
  "features": [
    {
      "type": "Feature",
      "properties": { "cell_id": "C-0001", "year": 2026, "month": 1, "sensor": "MODIS", "n_detections": 3 },
      "geometry": { "type": "Polygon", "coordinates": [[[-73.3,-6.1],[-73.29,-6.1],[-73.29,-6.09],[-73.3,-6.09],[-73.3,-6.1]]] }
    }
  ]
}
```

**manifest.json**
```json
{
  "generated_at": "2026-11-14T18:00:00Z",
  "region": "DEMO-01",
  "files": [
    { "name": "monthly_series.csv", "version": "v0", "rows": 24 },
    { "name": "calibrated_series.csv", "version": "v0", "rows": 24 },
    { "name": "validation.json", "version": "v0" },
    { "name": "method.json", "version": "v0" },
    { "name": "cells_DEMO-01_2026.geojson", "version": "v0" }
  ]
}
```
