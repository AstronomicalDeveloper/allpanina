# T38 — Reproducción de indicadores y métricas desde cero

- **Tarea:** T38 (Marco + Antonella). Reproducir los indicadores y las métricas desde las salidas finales.
- **Fecha:** 14-nov-2026, ~16:10 (hora de Lima).
- **Estado:** ✅ reproducido por Marco. Falta que Antonella lo confirme.
- **Commit reproducido:** `9326e468d164582288acea81a9a829810909c2d6` (rama `feature/calibracion`).

## 1. Cómo se reprodujo

Se usó un clon nuevo del repositorio y un entorno virtual nuevo. No se usaron archivos intermedios guardados: todo se recalculó desde los zips de FIRMS que están en `docs/`.

```bash
git clone --branch feature/calibracion https://github.com/AstronomicalDeveloper/allpanina.git
cd allpanina
python -m venv .venv && .venv/bin/pip install -r requirements.txt
python -m pytest                                              # 77 passed
python scripts/01_download.py                                 # verifica el SHA-256 de los 2 zips
python scripts/02_normalize.py
python scripts/03_grid_dedupe.py
python scripts/04_monthly_series.py --include-test --out <dir>/monthly_series.csv --updated-at 2026-11-14
python scripts/04_monthly_series.py --out <dir>/monthly_series_2024.csv --updated-at 2026-11-14
python scripts/05_geojson_export.py --years 2013 ... 2026 --include-test --out-dir <dir>
python scripts/06_calibrate.py <dir>/monthly_series.csv --split test --autorizado-aldo-antonella --out <dir>/cal
python scripts/08_manifest.py --dir <dir>/man --info data/processed/source_info.json
```

Entorno: Python 3.13.18, pandas 2.3.3, numpy 2.5.4, pyarrow 26.0.1, pyproj 3.8.0, shapely 2.2.0.

`06_calibrate.py` imprimió `factor B1 = 0.2936037257560573`, que es el valor congelado en `DECISIONS.md` §10.

## 2. Resultado: comparación byte a byte con lo publicado

| Archivo reproducido | Archivo publicado | Resultado |
|---|---|---|
| serie 2013-01 a 2024-12 | `docs/ejemplo/monthly_series.csv` (aprobada en T12) | ✅ idéntico |
| serie 2013-01 a 2026-07 | `docs/t29/monthly_series_full.csv` (entrada de T29; antes en `docs/ejemplo/monthly_series_con_test.csv`) | ✅ idéntico |
| serie 2013-01 a 2026-07 | `frontend/public/data/monthly_series.csv` | ✅ idéntico |
| 14 GeoJSON (2013 a 2026) | `frontend/public/data/cells_PE-UCA_<año>.geojson` | ✅ los 14 idénticos |
| `validation.json` | `frontend/public/data/validation.json` y `docs/t29/validation.json` | ✅ idéntico |
| `calibrated_series.csv` | `frontend/public/data/calibrated_series.csv` y `docs/t29/calibrated_series.csv` | ✅ mismo contenido; solo cambia el salto de línea (ver punto 3) |

Métricas reproducidas en el test (2025-01 a 2026-07, n = 19, Σ MODIS = 1,829):

| Método | MAE | WAPE | Sesgo |
|---|---|---|---|
| B0 | 309.6 | 3.216 | +309.6 |
| B1 | 29.7 | 0.308 | +22.9 |

Coinciden con `docs/t29/RESULTADO_T29.md` y con `method.json` → `resultados`. También coinciden las métricas de validación (2023-2024): B1 con MAE 55.8, WAPE 0.178 y sesgo −32.2.

## 3. Diferencia encontrada: saltos de línea, no datos

`06_calibrate.py` escribe `calibrated_series.csv` con el módulo `csv` de Python. Por defecto, ese módulo termina cada línea con `\r\n` (CRLF). Git guarda los archivos con `\n` (LF), por la regla `* text=auto eol=lf` de `.gitattributes`. Por eso:

- El archivo que genera el script en local tiene sha256 `4ea85f3e…`. Es el hash que cita `RESULTADO_T29.md`.
- El archivo guardado en el repositorio tiene sha256 `b1ddeab9…`.
- Al quitar los `\r`, el archivo local es **idéntico** byte a byte al del repositorio.

Lo mismo pasa con el hash de `validation.json` en `RESULTADO_T29.md` (`0a72aa06…`): corresponde a una copia con CRLF. El del repositorio es `ea9ab3a6…`.

Propuesta para Antonella (no cambia ningún valor): agregar `lineterminator="\n"` al `csv.writer` de `06_calibrate.py`, para que el archivo local y el del repositorio tengan el mismo hash.

## 4. Hashes de referencia (como están en el repositorio, LF)

| Archivo | sha256 |
|---|---|
| `frontend/public/data/monthly_series.csv` | `5a388b39273d1ef8ba779e65922db1b30908ed64ad5c6686b9b0cb49d8c2d68c` |
| `frontend/public/data/calibrated_series.csv` | `b1ddeab98b973f0063e65b24a72d52ba9e14f0cc55df504875022d51db191d5c` |
| `frontend/public/data/validation.json` | `ea9ab3a6d297dde39af34806e4ede2a342dbe10ed93b9efb3a67eed23d877eb0` |
| `frontend/public/data/method.json` | `46f13e6b0526a1db31028cfa5997961aa089dc9120df9b63e068b3518a2c7cb6` |
| `docs/ejemplo/monthly_series.csv` | `47f833ebf27f710847d68179b495c1a1b5033abb4b762af5617622223c02f171` |

`frontend/public/data/manifest.json` lista los 18 archivos con estos hashes, y todos coinciden con los archivos del repositorio. El manifest regenerado desde cero solo difiere en el hash de `calibrated_series.csv`, por la razón del punto 3.

## 5. Limitaciones de esta reproducción

- Se reproduce con los mismos zips de FIRMS de `docs/`, cuyo SHA-256 verifica `01_download.py`. No se volvió a descargar de FIRMS. Una descarga nueva puede cambiar si NASA reprocesa el archivo.
- Se probó en un solo sistema (Linux, Python 3.13). No se probó en Windows ni en Mac.
- `updated_at` de la serie se fijó en `2026-11-14`. Con otra fecha, cambia esa columna y el hash, pero no los valores.
- La reproducción comprueba que el código da los mismos números. No valida el método: eso es T27 y T29.
- Siguen valiendo las limitaciones científicas de `method.json` y `docs/t29/RESULTADO_T29.md`: un solo κ global, subestimación en años extremos, sobreestimación en años tranquilos, 19 meses de test, y detecciones que no son incendios confirmados.
