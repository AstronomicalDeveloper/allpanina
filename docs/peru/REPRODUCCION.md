# P19 — Reproducción desde cero de la extensión Perú

- **Paso:** P19 del plan v2.1 (Marco + Antonella). Equivalente a T38 del piloto.
- **Fecha:** 15-nov-2026.
- **Hecho por:** Antonella (con Claude). **Falta:** que Marco lo confirme.
- **Commit reproducido:** `39d67c40e41da5a6d759537b2d7379490492cb97` (rama `feature/calibracion`), más la corrección 3.1. El manifest se comparó también con el regenerado por Marco en `730ad58` (sección 3.2).

## 1. Cómo se reprodujo

Clon nuevo del repositorio y entorno virtual nuevo. No se usó ningún archivo intermedio guardado: todo se recalculó desde los zips de FIRMS de `docs/`.

```bash
git clone --branch feature/calibracion https://github.com/AstronomicalDeveloper/allpanina.git
cd allpanina
python -m venv .venv && .venv/bin/pip install -r requirements.txt
python -m pytest                                                     # 125 passed
python scripts/01_download.py                                        # verifica el SHA-256 de los 2 zips
python scripts/02_normalize.py
python scripts/03_grid_dedupe.py
python scripts/04_monthly_series.py --peru --out <dir>/serie_2024.csv --updated-at 2026-11-14
python scripts/04_monthly_series.py --peru --include-test --out <dir>/serie_full.csv --updated-at 2026-11-15
python scripts/05_geojson_export.py --peru --include-test --years 2013 ... 2026 --out-dir <dir>/maps
python scripts/06_calibrate_peru.py <dir>/serie_2024.csv --out <dir>/valid --estado "aprobado en P11"
python scripts/09_test_peru.py <dir>/serie_full.csv --out <dir>/test
python scripts/10_final_peru.py          # sobre una copia con docs/peru/test y docs/peru/valid reproducidos
python scripts/08_manifest.py --peru --dir <dir>/man --info data/processed/source_info.json
```

Entorno: Linux, Python 3.13.18, pandas 2.3.3, numpy 2.5.4, pyarrow 26.0.1, pyproj 3.8.0, shapely 2.2.0.

`09_test_peru.py` imprimió los 26 κ y los 26 son iguales a los congelados en `DECISIONS.md` §12.

## 2. Resultado: comparación byte a byte con lo publicado

| Archivo reproducido | Archivo publicado | Resultado |
|---|---|---|
| serie 2013-01 a 2024-12 | `docs/peru/ejemplo/monthly_series.csv` (P07) | ✅ idéntico (`b3ceeae6…`) |
| serie 2013-01 a 2026-07 | `docs/peru/test/monthly_series_full.csv` (P13) y `frontend/public/data/peru/monthly_series.csv` | ✅ idéntico (`a633da77…`) |
| 14 mapas 2013 a 2026 | `frontend/public/data/peru/cells_PE_<año>.geojson` (P08 y P16) | ✅ los 14 idénticos |
| `valid/`: `method.json`, `validation.json`, `calibrated_series.csv`, `comparacion_alternativas.json` | `docs/peru/valid/` (P09, P10, P11) | ✅ los 4 idénticos |
| `test/`: `validation.json`, `calibrated_series.csv`, `resumen_test.json`, `corrida.log` | `docs/peru/test/` (P14, firmados en P15) | ✅ los 4 idénticos |
| `calibrated_series.csv` y `validation.json` finales | `frontend/public/data/peru/` (P17) | ✅ idénticos |
| `method.json` final | `frontend/public/data/peru/method.json` (aprobado en P17, `52f4cacd…`) | ✅ idéntico, con la corrección 3.1 |
| `manifest.json` | `frontend/public/data/peru/manifest.json` (P18, regenerado por Marco en `730ad58`) | ✅ mismos campos y 18 hashes, salvo `generated_at` |

A diferencia de T38, no hay diferencias de saltos de línea: todos los scripts de Perú escriben LF.

## 3. Diferencias encontradas y corregidas

Ninguna es un cambio de datos ni de métricas.

1. **`scripts/10_final_peru.py` no generaba el `method.json` aprobado.** Aldo, al aprobar P17 (`REVISION_P17.md`), agregó a mano una limitación (B1 subestima los picos de temporadas intensas, `REVISION_P11.md` anexo A.2). El script no la tenía, así que generaba la versión anterior (`6dade17d…`). Se agregó al script con el mismo texto y en la misma posición. Ahora genera exactamente `52f4cacd…`.
2. **El primer manifest publicado (`235a37c`) tenía el hash viejo de `method.json`** (`6dade17d…` en lugar de `52f4cacd…`). La reproducción lo detectó; Marco lo corrigió al mismo tiempo regenerando el manifest (`730ad58`, ver nota en `P16_P18.md`). El manifest vigente es igual al reproducido desde cero salvo `generated_at`, y sus 18 hashes coinciden con los archivos publicados.

## 4. Hashes de referencia (como están en el repositorio, LF)

| Archivo (`frontend/public/data/peru/`) | SHA-256 |
|---|---|
| `monthly_series.csv` | `a633da77d258c832b929d9cc672b11a08a6d3651f620469dcb3d7233acf73ede` |
| `calibrated_series.csv` | `5eb84f1675f826544dc978df6de210630443024aa9a16bf97eb535e0c4a67458` |
| `validation.json` | `b2b259928bf830abfdcc53641693343c82699f0dc9738f8fe60644677c7f1d1e` |
| `method.json` | `52f4cacdea8ac97d609d79283aef1f9a9d001d8df14d2d06f1ff710f3fc1a60b` |
| `manifest.json` | `c481e3ae2374e67b43fee6e96cb9134c6e8298b7a62abc245b0066895f2326a6` (regenerado por Marco) |

Los 14 mapas tienen los hashes que lista `manifest.json`.

## 5. Limitaciones de esta reproducción

- Se usaron los mismos zips de FIRMS de `docs/`, verificados por SHA-256 en `01_download.py`. No se volvió a descargar de FIRMS; una descarga nueva puede cambiar si NASA reprocesa el archivo. Con el cese de VIIRS S-NPP (2-nov-2026) no habrá datos nuevos de ese sensor.
- Se probó en un solo sistema (Linux, Python 3.13). No se probó en Windows ni en Mac.
- `updated_at` se fijó en 2026-11-14 (serie 2013-2024) y 2026-11-15 (serie completa), como en P07 y P13.
- La reproducción comprueba que el código da los mismos números. No valida el método: eso es P11 y P15.
- La corrección 3.1 se aplicó después del commit reproducido. Al subirla, conviene repetir la corrida de `10_final_peru.py` sobre el commit nuevo para cerrar el paso.
