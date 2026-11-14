# Contrato de datos — Equipo Datos → Landry (web)

Acordado por Aldo + Landry (T03 de la matriz atómica v1.4). Base para que Marco y Antonella
generen los archivos y para que Landry/Juan los consuman sin ambigüedad.

Estado: **v0 — borrador, nombres de campo alineados con la matriz (no con inventos propios).**

## Dónde se entregan los archivos finales

**`frontend/public/data/`** — no en `data/outputs/` ni en ninguna carpeta llamada
`outputs/`: el `.gitignore` del repo ignora cualquier carpeta con ese nombre.
`frontend/public/` sí está versionado y, al ser un sitio sin backend (Vite/React
estático), Landry puede hacer `fetch('/data/<archivo>')` directamente.

`data/raw/` y `data/processed/` siguen siendo las carpetas de trabajo intermedio de
Marco y Antonella (ignoradas a propósito). Solo lo que ya está listo para Landry se
copia a `frontend/public/data/`.

## ⚠️ Pendiente de resolver con Landry (CI)

El `.github/workflows/ci.yml` actual solo revisa `backend/requirements.txt` y
`backend/tests/` — carpetas que no existen en este repo (los scripts y tests del
equipo de datos viven en la raíz: `scripts/`, `tests/`, `requirements.txt`). Eso
significa que el job "backend" se salta en silencio y **marca verde sin ejecutar
ninguna prueba real** — exactamente el "check ficticio" que prohíbe la sección 3
de la matriz. Falta que Landry actualice el workflow para que apunte a la raíz
(o para que el equipo de datos mueva su código a `backend/`, lo que decidan).
No lo toqué yo porque es su pieza del repo.

## 1. `monthly_series.csv` — produce Marco, usan Antonella + Landry

Conteos mensuales observados (MODIS y VIIRS), por región y mes.

| Campo | Tipo | Notas |
|---|---|---|
| `region_id` | string | Identificador fijo de la región piloto |
| `year` | int | |
| `month` | int | 1-12 |
| `sensor_group` | enum | `MODIS` \| `VIIRS` (agrupa Terra+Aqua o S-NPP) |
| `cell_days` | int | **suma de pares celda-día con detección en toda la región ese mes.** No está acotado a 0-31 — ese rango solo aplica a una sola celda; a escala región-mes puede ser del orden de miles (ej. 4,491 en agosto de 2024) |
| `status` | enum | `ok` (incluye cell_days=0 con sensor operando) \| `missing` (fuera de la ventana de disponibilidad del sensor) |
| `source_version` | string | **el valor literal de la columna `version` del CSV de FIRMS descargado** (ej. `6.03`, `61.03`, `2`) — no el nombre del producto (MCD14DL es el NRT de Collection 61; nosotros usamos el estándar MCD14ML, que trae su propia columna `version`) |
| `updated_at` | string (ISO 8601) | `YYYY-MM-DD` |

## 2. `calibrated_series.csv` — produce Antonella, usa Aldo (Landry lo integra)

- Columnas: `region_id`, `year`, `month`, `method` (B0/B1), `value`, `split` (train/valid/test), `status`, `residual`
- Sin ningún `NaN`: si `residual` no aplica (no es fila de test), se deja vacío.

## 3. `validation.json` — produce Antonella, usan Aldo + Landry

Por cada método y split:
- Métricas globales: `mae`, `wape`, `bias`
- `n_months_matched`
- Residuos mensuales en **test**: `{month, modis_observed, estimate, signed_error, absolute_error}`
- Ordenado por `absolute_error`. No mezclar train con test.
- Si faltan residuos: solo métricas globales + `"detalle_mensual": "no disponible"`.

## 4. `method.json` — producen Aldo + Antonella, usa Landry

Indicador, sensores, periodos, calibración, limitaciones conocidas — incluida la
limitación real de VIIRS S-NPP (NOAA: cese de entrega de todos los productos el
1 de noviembre de 2026; NASA: cese de datos científicos nuevos el 2 de noviembre
de 2026). Esta nota tiene que pasar del DEMO al `method.json` real, no quedarse
solo de ejemplo.

## 5. `cells_<region>_<year>.geojson` — produce Marco, usa Juan Matías

FeatureCollection estándar RFC 7946 — **sin miembro `crs`** (la especificación lo
eliminó; GeoJSON es WGS84 por definición, no hace falta declararlo).
Propiedades por feature: `cell_id`, `year`, `month`, `sensor_group`, `cell_days`
(valores **observados**, nunca calibración regional aplicada a celda).

## 6. `manifest.json` — produce Marco, usa todo el equipo (T31 de la matriz)

- `region_id` (no `region` — mismo nombre que en los demás archivos)
- `files`: lista simple de nombres: `["monthly_series.csv", "calibrated_series.csv", "validation.json", "method.json", "cells_<region>_<year>.geojson"]`
- `generated_at`
- **`producto`**: nombre y versión del producto fuente (ej. `"MCD14ML v6.1"`, `"VNP14IMGML v2"`) — para que quede trazable de qué collection salió cada entrega.
- **`periodo`**: `{ "desde": "YYYY-MM", "hasta": "YYYY-MM" }` — rango real de fechas que cubren los archivos de esta entrega.
- **`hash`**: sha256 de cada archivo listado, para que Landry pueda verificar que lo que descargó es exactamente lo que Marco generó (no un archivo corrupto o a medio escribir).
- **`sources`** (opcional, aceptado en la revisión T12 de Aldo, 14-nov-2026): por sensor (`MODIS`, `VIIRS`), el zip de FIRMS de origen y su sha256, el nombre del CSV, filas crudas, primera y última fecha, y las versiones que aparecen en la columna `version`. No reemplaza a `producto` ni a `hash`; sirve para rastrear cada entrega hasta la descarga original de `docs/datos.md`. Landry puede ignorarlo.

## Ejemplos DEMO (datos inventados, nunca reales)

**monthly_series.csv**
```
region_id,year,month,sensor_group,cell_days,status,source_version,updated_at
DEMO-01,2024,8,MODIS,4491,ok,6.03,2026-11-14
DEMO-01,2024,8,VIIRS,3870,ok,2,2026-11-14
DEMO-01,2026,10,VIIRS,,missing,2,2026-11-14
```

**calibrated_series.csv**
```
region_id,year,month,method,value,split,status,residual
DEMO-01,2020,1,B0,8.0,train,ok,
DEMO-01,2020,1,B1,8.3,train,ok,
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
  "indicator": "cell_days (pares celda-dia con deteccion)",
  "sensors": ["MODIS Terra", "MODIS Aqua", "VIIRS S-NPP"],
  "period_train": "2013-01:2022-12",
  "period_valid": "2023-01:2024-12",
  "period_test": "2025-01:2026-07",
  "calibration": "B1 = B0 * kappa (factor global ajustado en train)",
  "limitations": [
    "VIIRS S-NPP: NOAA anuncio cese de entrega de todos los productos el 1 nov 2026; NASA indica cese de datos cientificos nuevos el 2 nov 2026. Se uso el producto estandar con rezago de 2-3 meses."
  ]
}
```

**cells_DEMO-01_2024.geojson**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "cell_id": "C-0001", "year": 2024, "month": 8, "sensor_group": "MODIS", "cell_days": 3 },
      "geometry": { "type": "Polygon", "coordinates": [[[-74.55,-8.38],[-74.54,-8.38],[-74.54,-8.37],[-74.55,-8.37],[-74.55,-8.38]]] }
    }
  ]
}
```

**manifest.json**
```json
{
  "generated_at": "2026-11-14T18:00:00Z",
  "region_id": "DEMO-01",
  "producto": "MCD14ML v6.1 / VNP14IMGML v2",
  "periodo": { "desde": "2013-01", "hasta": "2026-07" },
  "files": [
    "monthly_series.csv",
    "calibrated_series.csv",
    "validation.json",
    "method.json",
    "cells_DEMO-01_2024.geojson"
  ],
  "hash": {
    "monthly_series.csv": "sha256:REEMPLAZAR_AL_GENERAR",
    "calibrated_series.csv": "sha256:REEMPLAZAR_AL_GENERAR"
  }
}
```
