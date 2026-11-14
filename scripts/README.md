# Cadena de datos FIRMS (scripts 01 a 05 y 08)

Convierte los CSV de NASA FIRMS (MODIS y VIIRS S-NPP, ver `docs/datos.md`) en la serie mensual,
el GeoJSON de celdas y el manifest que consumen Antonella, Juan y Landry
(contrato: `docs/contrato_datos.md`; decisiones: `DECISIONS.md`).

Instalar: `pip install -r requirements.txt`. Probar: `python -m pytest`.

| Paso | Script | Tarea | Entrada | Salida (`data/processed/`) |
|---|---|---|---|---|
| 1 | `01_download.py` | T05 | zips en `data/raw/` o `docs/` | `data/raw/firms_raw_*.csv` |
| 2 | `02_normalize.py` | T10 | CSV crudos | `points_clean.parquet`, `excluded_rows.csv`, `qc_counts.csv`, `qc_reasons.csv`, `source_info.json` |
| 3 | `03_grid_dedupe.py` | T11 | `points_clean.parquet` | `cell_days.parquet` |
| 4 | `04_monthly_series.py` | T12, T19 | `cell_days.parquet` | `monthly_series.csv` |
| 5 | `05_geojson_export.py` | T20 | `cell_days.parquet` | `cells_<region>_<anio>.geojson` |
| 8 | `08_manifest.py` | T12, T31 | carpeta de entregables | `manifest.json` |

Los pasos 6 y 7 (calibracion y metricas) son de Antonella.

```bash
python scripts/01_download.py
python scripts/02_normalize.py
python scripts/03_grid_dedupe.py
python scripts/04_monthly_series.py          # 2013-01 a 2024-12
python scripts/05_geojson_export.py          # por defecto, solo 2024
python scripts/08_manifest.py
```

## Reglas que aplican los scripts

- Dia = dia local de Lima (UTC-5); el instante UTC original se conserva.
- Se excluyen (con motivo en `excluded_rows.csv`): coordenadas o fecha invalidas, duplicados exactos,
  `type != 0`, MODIS con confianza < 30 y VIIRS con confianza fuera de {n, h}.
- Celda de 1 km en EPSG:6933. Terra y Aqua cuentan una sola vez por celda-dia.
- Un mes con sensor operativo y cero detecciones vale `0` con `status = ok`. Un mes sin datos queda
  **vacio** con `status = insufficient_data`. Nunca se confunden.
- Region: caja provisional de `DECISIONS.md` (seccion 1), filtrada por el centro de la celda.

## Test reservado

`04` termina en 2024-12 y `05` rechaza los anios 2025-2026 salvo `--include-test`. Solo se usa con la
autorizacion conjunta de Aldo y Antonella (`DECISIONS.md`, "Test reservado").

## Puntos pendientes de acordar (no bloquean la ejecucion)

- `VIIRS_TYPE_FILTER` (`02_normalize.py`): `DECISIONS.md` dice que VIIRS no trae `type`, pero el archivo
  estandar si lo trae. Se aplica a ambos sensores; en la version 2 de VIIRS algunos puntos de tipo 2
  quedaron como tipo 0.
- `status`: `DECISIONS.md` (seccion 8) usa un valor unico ambiguo; aqui se usa `ok` / `insufficient_data`
  del contrato para cumplir T19.
- `manifest.json`: se agregan `sha256`, `sources` y `period` para T31; falta reflejarlo en el contrato.
- Region: la caja es provisional hasta tener el poligono oficial de la provincia.
