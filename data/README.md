# data/

Carpeta de datos de la cadena de FIRMS (MODIS y VIIRS S-NPP, Peru). Los datos descargados y generados
**no se suben a Git** (ver `.gitignore`); solo se documenta su procedencia en `docs/datos.md`.

```
data/
  raw/        zips de FIRMS tal cual llegaron + CSV crudos extraidos (no se versionan)
  processed/  salidas intermedias y finales de scripts/ (no se versionan por ahora)
```

## Como regenerar todo

Desde la raiz del repositorio, con los dos zips de FIRMS dentro de `data/raw/`
(nombres y SHA-256 en `scripts/01_download.py` y `docs/datos.md`):

```bash
pip install -r scripts/requirements.txt
python scripts/01_download.py        # verifica los zips y extrae los CSV estandar
python scripts/02_normalize.py       # hora de Lima + QC (qc_none / qc_strict)
python scripts/03_grid_dedupe.py     # malla de 1 km (EPSG:6933) y celda-dias unicos
python scripts/04_monthly_series.py  # data/processed/monthly_series.csv
python -m pytest tests               # pruebas de los cuatro scripts
```

Ningun script hace preguntas interactivas. Cada uno falla con un mensaje claro si falta su entrada.

## Archivos de salida

| Archivo | Lo produce | Contenido |
|---|---|---|
| `processed/points_clean.parquet` | 02 | Puntos que pasan `qc_none`, con la bandera `qc_strict` y el dia local de Lima |
| `processed/excluded_rows.csv` | 02 | Cada fila fuera de `qc_strict`, con su motivo |
| `processed/qc_counts.csv` | 02 | Conteos por sensor: crudo / `qc_none` / `qc_strict` |
| `processed/cell_days.parquet` | 03 | Una fila por celda de 1 km, dia local y grupo-sensor |
| `processed/monthly_series.csv` | 04 | Serie mensual del contrato v0 (`region_id, year, month, sensor_group, cell_days, status, qc`) |

## Limites que conviene tener presentes

- Se usa solo el producto estandar de FIRMS; el NRT se descarta (otra version y sin la columna `type`).
- Ultimo mes estandar comun: 2026-07. VIIRS S-NPP solo existe desde 2012-01-20, por lo que 2003-2011 y enero de 2012 son `sin_datos`.
- MODIS cambia de version el 2023-01-02 (`6.03` a `61.03`): posible discontinuidad en la serie.
- Una deteccion es un punto caliente satelital, no un incendio confirmado.
