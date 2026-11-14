# T29 — Resultado del test reservado

- **Tarea:** T29, evaluación del test reservado (Aldo + Antonella).
- **Fecha:** 14-nov-2026, ~15:55 (hora de Lima). Corrida **única**, con Aldo y Antonella presentes.
- **Autorización y procedimiento:** `docs/t29/AUTORIZACION_T29.md`.
- **Método congelado antes de ver el test:** `DECISIONS.md` §10 (κ = 0.2936037257560573, método B1) y `docs/REVISION_T27.md`.
- **Estado:** ✅ **FIRMADO por Aldo**, 14-nov-2026. Verificación independiente en la sección 8. Pendientes de publicación en la sección 7.

## 1. Ejecución

```
python scripts/06_calibrate.py docs/ejemplo/monthly_series_con_test.csv --split test --autorizado-aldo-antonella --out docs/t29/
```

- Salida impresa: `factor B1 = 0.2936037257560573` → **coincide** con el valor congelado. ✅
- Serie de entrada: `docs/ejemplo/monthly_series_con_test.csv`
  (sha256 `5a388b39273d1ef8ba779e65922db1b30908ed64ad5c6686b9b0cb49d8c2d68c`).
  - **Diferencia con el procedimiento:** `AUTORIZACION_T29.md` pedía la ruta `docs/t29/monthly_series_full.csv`; Marco la subió en `docs/ejemplo/`. El contenido es el acordado, así que se usó tal cual.
  - Verificado antes de correr: 2013-01 a 2024-12 es **idéntico** a la serie aprobada en T12 (sha256 `47f833eb…`), y están los 19 meses de test (38 filas, todas con `status = ok`).
- Salidas:
  - `docs/t29/validation.json` (sha256 `0a72aa066a403fd90fb6e9a2524b24bf81f54208e242bb074d0c1044ec331a4e`)
  - `docs/t29/calibrated_series.csv` (sha256 `4ea85f3ea033397ebe8a6390cf2db18f480b7c9e20f00d2cabade6b385851535`)
- **Verificación independiente:** κ y las métricas de B0 y B1 se recalcularon directamente desde la serie, sin usar los scripts del equipo. Coinciden en todos los decimales. ✅

## 2. Resultado (test 2025-01 a 2026-07)

- n = **19** meses emparejados.
- Denominador del WAPE: Σ MODIS observado = **1,829** celdas-día (Σ VIIRS = 7,711).

| Método | MAE | WAPE | Sesgo |
|---|---|---|---|
| B0 (VIIRS sin calibrar) | 309.6 | 3.22 (322%) | +309.6 |
| **B1 (VIIRS × κ)** | **29.7** | **0.31 (31%)** | **+22.9** |

**B1 reduce el error unas 10 veces frente a B0**, igual que en validación. Se mantiene B1 como método de AllpaNina.

### Comparación con validación

| B1 | Validación 2023-2024 (24 meses) | Test 2025-01 a 2026-07 (19 meses) |
|---|---|---|
| MAE | 55.8 | 29.7 |
| WAPE | 0.178 (18%) | 0.308 (31%) |
| Sesgo | −32.2 (subestima) | +22.9 (sobreestima) |
| MODIS promedio por mes | ~314 | ~96 |

En test, el error relativo (WAPE) es mayor que en validación, aunque el error absoluto (MAE) es menor. **Se reporta tal cual.** No se cambió κ ni el método después de ver estos números.

## 3. Meses con mayor error (B1)

| Mes | MODIS | B1 | Error | Error relativo | Parte del error total |
|---|---|---|---|---|---|
| 2025-09 | 472 | 657 | +185 | +39% | 33% |
| 2025-07 | 97 | 160 | +63 | +65% | 11% |
| 2025-10 | 361 | 423 | +62 | +17% | 11% |
| 2025-08 | 433 | 479 | +46 | +11% | 8% |
| 2026-07 | 75 | 120 | +45 | +61% | 8% |

- Estos 5 meses suman el **71%** del error absoluto total.
- Solo 2025-09 aporta un tercio del error.
- B1 sobreestima en **14 de los 19 meses**. El sexto mes con más error, 2025-11, es la excepción: subestima (−45, −31%).

## 4. Interpretación

- **El test fue un periodo de poca actividad.** MODIS promedió unas 141 celdas-día por mes en 2025 y unas 20 en los 7 meses de 2026. En validación fueron 259 (2023) y 369 (2024). Con un denominador pequeño, el WAPE sube aunque el error absoluto baje.
- **La proporción MODIS/VIIRS del test fue más baja que en train.** Fue 0.237 en todo el test (0.241 en 2025 y 0.203 en 2026), por debajo del rango anual de train (0.26 a 0.34). Por eso B1 sobreestima, igual que en 2024 subestimaba con una proporción de 0.354.
- **Hipótesis (no comprobada):** la proporción MODIS/VIIRS depende de la intensidad de la temporada. En años de fuego extremo, MODIS ve proporcionalmente más; en años tranquilos, menos. Esto amplía la limitación ya registrada en `method.json` sobre la variación anual de κ.

## 5. Limitaciones

- Con 19 meses, el resultado tiene incertidumbre. Un solo mes (2025-09) explica un tercio del error.
- El test incluye 7 meses de 2026 con muy poca actividad. Ahí el error relativo de cada mes es grande, aunque el absoluto sea pequeño.
- κ es un factor global único. No corrige la variación entre años tranquilos y extremos (ver `method.json`).
- Este error retrospectivo **no** es un porcentaje de confianza para meses futuros.
- El indicador cuenta detecciones satelitales de anomalías térmicas, no incendios confirmados.

## 6. Para la presentación

> "VIIRS detecta entre 3 y 4 veces más que MODIS. Con un solo factor de corrección ajustado en 2013-2022, el error en meses que el método nunca vio (2025-2026) bajó de 322% a 31%. El factor funciona mejor en años de mucha actividad y tiende a exagerar en años tranquilos."

## 7. Siguientes pasos

- **T30 (Antonella):** exportar el `validation.json` final con los residuos de test y actualizar `method.json` con el resultado del test y la limitación del punto 4.
- **T38 (Marco + Antonella):** reproducir desde cero, con el repositorio limpio, y comparar con los hashes de este documento.

## 8. Verificación de Aldo (independiente)

Se recalculó todo desde `docs/ejemplo/monthly_series_con_test.csv` y κ congelado, sin usar los scripts del equipo:

- κ = 24,902 / 84,815 = 0.2936037257560573, igual al valor de la ejecución. ✅
- Test: n = 19, Σ MODIS = 1,829, Σ VIIRS = 7,711. ✅
- B0: MAE 309.579, WAPE 3.2160, sesgo +309.579. B1: MAE 29.676, WAPE 0.3083, sesgo +22.894. Coinciden con `validation.json`. ✅
- Los 5 meses con más error suman el 71.1% del error. B1 sobreestima en 14 de 19 meses. Proporción MODIS/VIIRS: 0.237 en el test, 0.241 en 2025 y 0.203 en 2026. ✅
- `calibrated_series.csv` de `docs/t29/`: 326 filas (train 240, valid 48, test 38), B0 = VIIRS y B1 = B0 × κ en todas. ✅
- `method.json` conserva las métricas de validación y agrega las del test, así que no se perdió nada al reemplazar `validation.json`. ✅

**Nota sobre los hashes de la sección 1:** se calcularon en Windows, con saltos de línea CRLF. El repositorio guarda los archivos con LF (`.gitattributes`). El contenido es idéntico. Hashes de los archivos tal como están en el repositorio:

- `docs/t29/validation.json`: `ea9ab3a6d297dde39af34806e4ede2a342dbe10ed93b9efb3a67eed23d877eb0`
- `docs/t29/calibrated_series.csv`: `b1ddeab98b973f0063e65b24a72d52ba9e14f0cc55df504875022d51db191d5c`

Para comparar en T38, usar estos hashes (LF).

### Pendientes para publicar (no cambian el resultado)

- ✅ **Marco** (hecho, `0834eff`: hashes correctos y `periodo` hasta 2026-07; además agregó los GeoJSON de 2025 y 2026, que cuadran con la serie): volver a correr `08_manifest.py`. Ahora hay 3 hashes desactualizados (`calibrated_series.csv`, `validation.json`, `method.json`), y `periodo.hasta` tiene que pasar de 2024-12 a 2026-07, porque `frontend/public/data/` ya incluye el test.
- ⏳ **Antonella:** cambiar `method.json` → `estado` a "aprobado por Aldo (T27 y T29)".
