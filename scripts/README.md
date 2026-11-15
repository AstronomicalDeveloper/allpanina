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
python scripts/04_monthly_series.py --peru   # extension Peru (P06): 26 regiones -> data/processed/peru/
python scripts/05_geojson_export.py          # por defecto, solo 2024
python scripts/08_manifest.py
```

## Reglas que aplican los scripts

- Dia = dia local de Lima (UTC-5); el instante UTC original se conserva.
- Se excluyen (con motivo en `excluded_rows.csv`): coordenadas o fecha invalidas, duplicados exactos,
  `type != 0`, MODIS con confianza < 30 y VIIRS con confianza fuera de {n, h}.
- Celda de 1 km en EPSG:6933. Terra y Aqua cuentan una sola vez por celda-dia.
- Un mes con sensor operativo y cero detecciones vale `0` con `status = ok`. Un mes sin datos queda
  **vacio** con `status = missing`. Nunca se confunden.
- Region: departamento de Ucayali (`region_id = PE-UCA`, `DECISIONS.md` secciones 1 y 9). Se filtra por el
  centro de la celda dentro del poligono oficial del INEI (`docs/region/ucayali_inei_2023.geojson`). La caja
  lat -11.55 a -7.15, lon -76.10 a -70.40 solo es un prefiltro. Requiere `shapely` (en `requirements.txt`).
- Extension Peru (`--peru`, `DECISIONS.md` seccion 11, contrato v1.1): 26 regiones, `PE` y `PE-01` a `PE-25`.
  Cada celda va al departamento que contiene su centro (`docs/region/departamentos_inei_2023.geojson`, 25
  poligonos INEI 2023). Si un centro cayera en dos departamentos, el script falla. Las celdas fuera de los 25
  poligonos no cuentan. `PE` = suma de los 25. `PE-25` sale igual a la serie `PE-UCA` del piloto.

## Test reservado

`04` termina en 2024-12 y `05` rechaza los anios 2025-2026 salvo `--include-test`. Solo se usa con la
autorizacion conjunta de Aldo y Antonella (`DECISIONS.md`, "Test reservado").

## Puntos pendientes (no bloquean la ejecucion)

- Un mes dentro de la ventana de un sensor, sin ninguna deteccion en todo Peru, sale como `missing`
  (hueco de datos). Es una regla de `04_monthly_series.py` que no esta escrita en `DECISIONS.md`.
- `VIIRS_TYPE_FILTER` (`02_normalize.py`): en la version 2 de VIIRS algunos puntos de tipo 2 quedaron
  como tipo 0, asi que el filtro puede dejar fuentes estaticas.
- `manifest.json`: `sources` es un campo extra (no esta en el contrato).
