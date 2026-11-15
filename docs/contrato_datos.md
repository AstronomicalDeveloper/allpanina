# Contrato de datos — Equipo Datos → Landry (web)

Acordado por Aldo + Landry (T03 de la matriz atómica v1.4). Base para que Marco y Antonella
generen los archivos y para que Landry/Juan los consuman sin ambigüedad.

Estado: **v1.0 vigente** para el piloto Ucayali (`frontend/public/data/`, congelado) y
**v1.1** para la extensión Perú (`frontend/public/data/peru/`, al final de este documento).
Las secciones 1 a 6 son la v1.0 y siguen valiendo; la v1.1 solo agrega lo que cambia.

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

---

# v1.1 — Extensión Perú (P03, Aldo, 14-nov-2026)

Para la extensión de `DECISIONS.md` §11. **Todo lo de las secciones 1 a 6 sigue
igual** (columnas, tipos, `status`, convención de error, sin `crs`, hashes en LF).
Aquí solo va lo nuevo.

## A. Dónde van los archivos

- **`frontend/public/data/peru/`**: carpeta nueva solo para Perú.
- **`frontend/public/data/`** (Ucayali v1.0) **no se toca**. La web del piloto sigue
  funcionando aunque `peru/` esté vacía o incompleta.
- Los nombres de archivo son los mismos que en v1.0, dentro de `peru/`, salvo el mapa
  (sección G).

## B. Códigos `region_id`

| `region_id` | Qué es | Aparece en |
| --- | --- | --- |
| `PE` | Perú nacional = suma de los 25 departamentos | todos los archivos |
| `PE-01` … `PE-25` | Departamento, con el código INEI de 2 dígitos (`PE-25` = Ucayali; lista completa en `DECISIONS.md` §11.1) | todos los archivos |
| `PE-SIN-25` | Perú sin Ucayali. Solo es un agregado de métricas, porque el test de Ucayali ya se vio en T29 | solo `validation.json` y `method.json` |

`PE-UCA` es solo del piloto v1.0 y **no** aparece en `peru/`.

## C. `peru/monthly_series.csv` (Marco)

- **Mismas columnas que v1.0:** `region_id, year, month, sensor_group, cell_days, status, source_version, updated_at`.
- **Clave única:** (`region_id`, `year`, `month`, `sensor_group`).
- **Filas:** 26 regiones × 2 sensores × cada mes del periodo.
- **Regla de suma:** en cada mes y sensor, la suma de `PE-01` … `PE-25` = `PE`.
- **Regresión:** las filas de `PE-25` son iguales a las de `PE-UCA` del piloto, salvo el `region_id`.

## D. `peru/calibrated_series.csv` (Antonella)

- **Mismas columnas que v1.0:** `region_id, year, month, method, value, split, status, residual`.
- **Clave única:** (`region_id`, `year`, `month`, `method`).
- **κ de cada fila:** B1 usa el κ del estrato de la región. Qué κ es cada uno se lee en `method.json` (sección F); no se agrega columna.
- **`PE` (decisión P11, `DECISIONS.md` §12):** B1 de `PE` = **suma de las B1 de los 25 departamentos**, no VIIRS × κ nacional. Así se cumple la regla de suma de la sección C también en la serie calibrada. La versión con κ nacional se reporta solo como referencia en `method.json → resultados`. Lo mismo vale para `PE-SIN-25` en `validation.json` y `method.json`: su B1 es la suma de sus 24 departamentos.

## E. `peru/validation.json` (Antonella)

El mismo objeto de v1.0, repetido por región dentro de `regions`:

```json
{
  "contract_version": "1.1",
  "split": "test",
  "regions": [
    {
      "region_id": "PE-25",
      "estrato": "propio",
      "reportable": true,
      "methods": {
        "B0": { "split": "test", "metrics": { "mae": 0, "wape": 0, "bias": 0 }, "n_months_matched": 19, "residuals": [] },
        "B1": { "split": "test", "metrics": { "mae": 0, "wape": 0, "bias": 0 }, "n_months_matched": 19, "residuals": [] }
      }
    },
    {
      "region_id": "PE-07",
      "estrato": "agrupado",
      "reportable": false,
      "motivo": "Σ MODIS por debajo del mínimo de DECISIONS.md §11.3"
    }
  ]
}
```

- **`split`:** `valid` durante P10 y `test` en el archivo final (P17). Igual que en el piloto, las métricas de validación de la entrega final quedan en `method.json`.
- **`estrato`:** `propio` | `agrupado` | `nacional` (este último solo para `PE` y `PE-SIN-25`).
- **`reportable`:** `false` cuando la región no cumple el mínimo de §11.3. En ese caso no lleva `methods` y lleva `motivo`. No se inventan métricas.
- **`wape`:** `null` si Σ MODIS = 0, nunca 0.
- **Residuos:** igual que v1.0, solo en test y ordenados por `absolute_error`.

## F. `peru/method.json` (Aldo + Antonella)

Los mismos campos de v1.0 (`indicator`, `sensors`, periodos, `calibration`, `limitations`, `estado`) y además:

```json
{
  "contract_version": "1.1",
  "regions": [
    {
      "region_id": "PE-25", "nombre": "Ucayali", "estrato": "propio",
      "kappa": 0.0, "kappa_inputs": { "suma_modis_train": 0, "suma_viirs_train": 0, "meses_train": 120 },
      "kappa_anual_rango": [0.0, 0.0]
    }
  ],
  "estratos": {
    "agrupado": { "miembros": ["PE-04", "PE-07", "PE-09", "PE-11", "PE-15", "PE-18", "PE-23", "PE-24"], "kappa": 0.0 },
    "nacional": { "region_id": "PE", "kappa": 0.0 }
  },
  "resultados": {
    "valid": { "PE": {}, "PE-SIN-25": {}, "PE-25": {} },
    "test": { "PE": {}, "PE-SIN-25": {}, "PE-25": {} }
  }
}
```

- **`regions`:** las 26, con el κ que usa cada una. Los miembros del estrato agrupado llevan el κ del estrato.
- **`resultados`:** por split y región, con la misma forma que en el piloto (`periodo`, `n_meses`, `suma_modis`, `B0`, `B1`).
- **`limitations`:** las del piloto, más las de Perú (κ variable por región y año, departamentos agrupados).

## G. Mapa nacional: `peru/cells_PE_<año>.geojson` (Marco)

- **Un archivo por año.** Solo nacional: no hay GeoJSON por departamento.
- **Celda de 10 km** en EPSG:6933. Su `cell_days` = **suma** de los `cell_days` de las celdas de 1 km ya deduplicadas que caen dentro. No se vuelve a deduplicar a 10 km.
- **Solo celdas de Perú:** se suman únicamente las celdas de 1 km asignadas a uno de los 25 departamentos, es decir, con su centro dentro de un polígono (`DECISIONS.md` §11.1). Las demás se descartan **antes** de agregar a 10 km. Si no, las celdas de 10 km de la frontera sumarían detecciones de Brasil, Bolivia y los otros países vecinos. (Corrección pedida por Marco al cerrar P06.)
- **Propiedades:** las mismas de v1.0: `cell_id`, `year`, `month`, `sensor_group`, `cell_days`. La celda de 10 km puede cruzar límites de departamento, así que **no lleva `region_id`**.
- **Solo observados**, sin ningún κ aplicado.
- **Regla de suma:** en cada mes y sensor, la suma de `cell_days` del archivo = `PE` en `monthly_series.csv`.
- **Tamaño (decisión de Aldo en P08, 15-nov-2026):** hasta **8 MB sin comprimir y 1 MB
  comprimido con gzip** por archivo. Si un año pasa de eso, se avisa antes de entregarlo.
  - Antes la sección decía "unos 6 MB". Era una meta aproximada, no un límite técnico.
    Con los datos reales, 4 años quedan entre 6.3 y 7.2 MB, y comprimidos pesan
    0.3–0.5 MB (`docs/peru/P08.md`). Se descartaron dividir por semestre y pasar a 20 km,
    porque ambas cambiaban el contrato.
  - **Condición:** el servidor tiene que entregar los `.json` y `.geojson` comprimidos.
    Landry lo configura y lo comprueba en Nginx antes de integrar el mapa nacional. Si no
    se puede, el respaldo es dividir por semestre (`cells_PE_<año>_S1/S2.geojson`).
- **Test reservado:** 2025 y 2026 se generan solo después de firmado el test (P16).

## H. `peru/manifest.json` (Marco)

Los mismos campos de v1.0 (`generated_at`, `producto`, `periodo`, `files`, `hash` en LF, `sources` opcional), con dos cambios:

- **`region_id`:** `"PE"`.
- **`regions`:** lista nueva con los 26 `region_id` presentes.

Agrega además `"contract_version": "1.1"`.

## I. Ejemplo DEMO v1.1 (datos inventados)

**peru/monthly_series.csv**
```
region_id,year,month,sensor_group,cell_days,status,source_version,updated_at
PE,2020,9,MODIS,30,ok,6.03,2026-11-14
PE-17,2020,9,MODIS,12,ok,6.03,2026-11-14
PE-25,2020,9,MODIS,18,ok,6.03,2026-11-14
```
(En este DEMO, `PE` = `PE-17` + `PE-25` porque los demás departamentos valen 0.)

## J. Qué tiene que hacer Landry

Nada mientras el equipo de datos trabaja. Cuando `peru/` esté completa (P20), integrarla necesita:
- Un selector de región que lea `regions` del manifest.
- Los mismos lectores de v1.0, filtrando por `region_id`.
- `validation.json` y `method.json` leídos por región.
- Un mapa nacional distinto, a 10 km.

Antes de eso tiene que tener el frontend al día con la v1.0 (`docs/t35/PRECHECK_T35.md`).

---

# v1.2 — Salidas del algoritmo `allpanina` (15-nov-2026)

Agrega dos cosas a la v1.1. Todo lo demás no cambia.

1. **`calibrated_series.csv` → `split`:** nuevo valor **`sin_validar`**, para los meses posteriores a 2026-07 que se procesen con el algoritmo (`docs/ALGORITMO.md`). B1 sale de los κ congelados; esos meses no tienen `residual` ni métricas. La web los debe mostrar distintos de `train`, `valid` y `test`.
2. **`actualizacion.json`:** archivo nuevo, listado en `manifest.json`. Trae el algoritmo y su versión, las entradas (archivo, sha256, sensor, filas, fechas y versiones), el periodo, la fuente de κ (`recalibrado: false`), el periodo validado, `meses_sin_validar` y las advertencias.

Los archivos publicados en `frontend/public/data/peru/` (hasta 2026-07) no tienen meses `sin_validar` ni `actualizacion.json`: siguen siendo v1.1.

# v1.0-region — Salidas de `procesar_region` (cualquier región, 15-nov-2026)

`procesar_region` (modo región del paquete `allpanina`, ver `docs/ALGORITMO.md`) escribe **los mismos archivos y columnas que el contrato v1.0** de una región (el piloto de Ucayali), con `region_id` elegido por el usuario (p. ej. `AR-M`). La web los lee igual que `frontend/public/data/`. Diferencias:

- `manifest.json → contract_version = "1.0-region"` y un archivo más: `procedencia.json` (CSV de entrada con sha256, región, zona horaria, κ y advertencias).
- `method.json` agrega `estado` (siempre empieza con "exploratorio"), `zona_horaria`, `celda_mapa_km`, `area_km2`, `kappa_anual_rango` y `resultados` (métricas `valid` y `test` con `reportable`). `kappa` puede ser `null`: entonces todas las filas B1 de `calibrated_series.csv` van con `status = "missing"` y la web no muestra B1.
- `validation.json` es el bloque `test` (2025-01 a 2026-07) con `evaluacion` y `reportable`; si los datos no llegan a 2025, sus métricas son `null`.
- `cells_<region_id>_<año>.geojson`: celdas de 1 km, o bloques de `celda_mapa_km` km si la región es grande (mismas propiedades).
- Recomendación para la web: rotular estos resultados como **"estimación exploratoria"** y mostrar `procedencia.json → advertencias`.
