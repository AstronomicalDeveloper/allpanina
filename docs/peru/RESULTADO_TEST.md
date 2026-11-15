# AllpaNina Perú — Resultado del test nacional (P15)

- **Paso:** P15 del plan v2.1.
- **Periodo:** 2025-01 a 2026-07 (19 meses).
- **Fecha:** 15-nov-2026.
- **Estado:** ✅ **FIRMADO** por Aldo el 15-nov-2026, después de verificar las cifras de forma independiente (sección 7). Redacción de Marco, con Claude, con dos correcciones de fuentes hechas por Aldo (sección 7).
- **Origen de las cifras:** `docs/peru/P14.md` y `docs/peru/test/` (Antonella). Marco y Claude las recalcularon de forma independiente desde la serie de P13 (SHA-256 `a633da77…`), sin usar `scripts/09_test_peru.py`, y coinciden.
- **Regla:** se reporta el resultado tal cual. No se cambió ningún κ ni el método después de ver el test (`AUTORIZACION_TEST.md` §5).

## 1. Resultado principal

La lectura limpia de generalización es **`PE-SIN-25`** (Perú sin Ucayali). `PE` incluye a Ucayali, cuyo test ya se vio en T29.

| Región | n | WAPE B0 | WAPE B1 | MAE B1 | Sesgo B1 |
|---|---:|---:|---:|---:|---:|
| `PE-SIN-25` (resultado limpio) | 19 | 4.580 | **0.326** | 120.9 | +120.9 |
| `PE` | 19 | 4.299 | 0.308 | 143.8 | +143.8 |
| `PE-25` Ucayali (test ya visto en T29) | 19 | 3.216 | 0.308 | 29.7 | +22.9 |
| Referencia `PE` con κ nacional (0.24891) | 19 | — | 0.319 | 149.1 | +149.1 |

- **B1 mejora mucho a B0** en todas las regiones reportables.
- **Reportables:** 23 (`PE`, `PE-SIN-25` y 21 departamentos). **No reportables (Σ MODIS < 50 en test):** Callao (0), Moquegua (26), Tacna (7) y Tumbes (38). Sus meses sí cuentan en `PE` y `PE-SIN-25`.
- **Mejor y peor departamento:** Puno (WAPE B1 0.18) y Pasco (1.01). Huánuco, 0.80. El detalle por departamento está en `docs/peru/P14.md`.
- **Regresión con el piloto:** `PE-25` da lo mismo que en T29 (MAE 29.7, WAPE 0.308, sesgo +22.9).

## 2. Cómo se compara con la validación

| | Validación 2023-2024 | Test 2025-2026-07 |
|---|---:|---:|
| WAPE B1 de `PE-SIN-25` | 0.122 | 0.326 |
| WAPE B1 de `PE` | 0.122 | 0.308 |
| MAE B1 de `PE` | 164.0 | 143.8 |
| MODIS promedio por mes en `PE` (celdas-día) | 1,349 | 467 |

- **El error relativo subió, pero el error absoluto no.** El MAE de `PE` bajó. El WAPE subió porque hubo mucha menos actividad en el test (MODIS mensual de `PE` bajó de 1,349 a 467) y el denominador es menor.
- **El sesgo es sistemático.** B1 quedó **por encima de MODIS en los 19 meses de test**, tanto en `PE` como en `PE-SIN-25`. No es ruido de meses sueltos.

## 3. Qué muestra la serie (diagnóstico, no corrección)

Razón anual MODIS/VIIRS de todo el Perú (celdas-día), calculada de la serie de P13:

| Años | Razón |
|---|---|
| 2013-2024 | 0.22 a 0.29 (κ nacional de train = 0.249) |
| **2025** | **0.191** |
| **2026 (ene-jul)** | **0.176** |

- En 2025 y 2026 la razón cae por debajo de todo el rango histórico. Con un κ fijado con 2013-2022, B1 queda alto y sobreestima.
- **Hipótesis, no probada con estos datos:** la deriva orbital de Terra y Aqua. Una presentación de L. Giglio (Universidad de Maryland, mayo de 2025) dice que esa deriva afecta el muestreo del ciclo diurno y el tamaño y espaciado de píxel de MODIS, y que su impacto en los productos de fuego se está investigando (LANCE UWG, `landweb.modaps.eosdis.nasa.gov/data/filePost/LANCE_UWG_Orbit_Drift_Giglio_202505.pdf`). Es compatible con la caída observada, pero no se probó que sea la causa.
- Esto **no** se usa para cambiar κ. Un κ más reciente sería un método nuevo, a evaluar con datos posteriores y no con este test.

## 4. Limitaciones que se declaran (para P17 y `method.json`)

1. **κ fijo con 2013-2022 no sigue un cambio de régimen de MODIS.** Los resultados de 2025-2026 no deben leerse como la precisión normal del método. Para usar B1 hacia adelante hay que recalibrar y volver a validar.
2. **`PE-25` no es una evaluación ciega** (test visto en T29). `PE` tampoco lo es del todo. La lectura principal es `PE-SIN-25`.
3. **Mucha menos actividad en el test.** El WAPE se infla por un denominador pequeño. Con MODIS bajo, los departamentos de poca actividad (Pasco, Huánuco, Amazonas, Piura) dan WAPE altos aunque el MAE sea de pocas celdas-día.
4. **Cuatro departamentos sin métricas** por tener menos de 50 celdas-día MODIS en test (Callao, Moquegua, Tacna y Tumbes).
5. **Celdas de frontera:** 0.3% de las celdas-día de 2013-2024 quedan fuera de los 25 polígonos y no cuentan (P05).
6. **Riesgo de datos futuros:** FIRMS dejó de producir datos nuevos de VIIRS de Suomi NPP el 2 de noviembre de 2026, a las 13:00 UTC (`earthdata.nasa.gov`, «Transitioning from Suomi NPP VIIRS»). La serie hasta 2026-07 no se afecta; cualquier actualización necesita otro VIIRS.

## 5. Qué sigue

- **P16:** mapas nacionales de 2025 y 2026, solo después de que Aldo firme esta sección.
- **P17:** limitaciones de la sección 4 en `method.json` (Antonella).
- **P18:** manifest nacional (Marco).

## 6. Firma (P15)

Con mi firma confirmo que verifiqué de forma independiente las cifras de P14, que acepto la lectura de las secciones 1 a 4 y que el resultado se reporta sin cambiar κ ni el método.

| Persona | Rol | Firma (nombre y fecha) |
| :-- | :-- | :-- |
| Aldo | Verifica y firma P15 | Aldo Ruiz, 15-nov-2026 |

## 7. Verificación independiente de Aldo (P15)

Se recalculó todo desde `docs/peru/test/monthly_series_full.csv` y los κ congelados de `DECISIONS.md` §12, sin usar `scripts/09_test_peru.py` ni el cálculo de Marco.

| Comprobación | Resultado |
|---|---|
| Corrida hecha después de la autorización completa (P12 con firma de Aldo, commit `7facbac`); la corrida es el commit `d9ea6bf` | ✅ |
| `corrida.log`: los 26 κ impresos son iguales a los congelados; la serie de entrada es la de P13 (SHA-256 `a633da77…`) | ✅ |
| MAE, WAPE y sesgo de B0 y B1 de las 27 regiones; n = 19; residuos ordenados por error absoluto | ✅ iguales a `validation.json` |
| Reportables: 23. No reportables: Callao (0), Moquegua (26), Tacna (7) y Tumbes (38) | ✅ |
| Regresión: `PE-25` da en el test lo mismo que Ucayali en T29 (MAE 29.7, WAPE 0.308, sesgo +22.9) | ✅ |
| B1 por encima de MODIS en los 19 meses, tanto en `PE` como en `PE-SIN-25` | ✅ 19 de 19 |
| Razón anual MODIS/VIIRS de `PE`: 0.222 a 0.286 entre 2013 y 2024; 0.191 en 2025; 0.176 en 2026 | ✅ |
| B1 mejor que B0 en los 21 departamentos reportables | ✅ 21 de 21 |
| Referencia `PE` con κ nacional: WAPE 0.319 (la estratificada da 0.308) | ✅ |

**Correcciones de fuentes hechas al firmar:**
- **Presentación de Giglio:** se quitó la frase "los efectos aumentaron de forma abrupta a fines de 2024". La presentación confirma los impactos en el muestreo diurno y en el tamaño y espaciado de píxel, y que el impacto en los productos de fuego se investiga, pero esa frase no se pudo comprobar.
- **Cese de Suomi NPP:** se corrigió el tiempo verbal. El cese ya ocurrió el 2 de noviembre de 2026, a las 13:00 UTC (NASA Earthdata, "Transitioning from Suomi NPP VIIRS & OMPS: What FIRMS Users Need to Know").

**Archivos firmados (SHA-256, LF):**
- `docs/peru/test/monthly_series_full.csv`: `a633da77d258c832b929d9cc672b11a08a6d3651f620469dcb3d7233acf73ede`
- `docs/peru/test/validation.json`: `b2b259928bf830abfdcc53641693343c82699f0dc9738f8fe60644677c7f1d1e`
- `docs/peru/test/calibrated_series.csv`: `5eb84f1675f826544dc978df6de210630443024aa9a16bf97eb535e0c4a67458`

Si cambia cualquiera de los tres, esta firma deja de valer.
