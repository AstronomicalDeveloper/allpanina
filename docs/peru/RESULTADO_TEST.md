# AllpaNina Perú — Resultado del test nacional (P15)

- **Paso:** P15 del plan v2.1.
- **Periodo:** 2025-01 a 2026-07 (19 meses).
- **Fecha:** 15-nov-2026.
- **Estado:** **PROPUESTA** de redacción (Marco, con Claude). Pasa a **FIRMADO** cuando Aldo la firme en la sección 6.
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
- **Hipótesis, no probada con estos datos:** la deriva orbital de Terra y Aqua. Una presentación de L. Giglio (Universidad de Maryland, mayo de 2025) dice que esa deriva afecta el muestreo del ciclo diurno y el tamaño de píxel de los productos de fuego de MODIS, que el impacto se está investigando y que los efectos aumentaron de forma abrupta a fines de 2024 (LANCE UWG, `landweb.modaps.eosdis.nasa.gov/data/filePost/LANCE_UWG_Orbit_Drift_Giglio_202505.pdf`). Es compatible con la caída observada, pero no se probó que sea la causa.
- Esto **no** se usa para cambiar κ. Un κ más reciente sería un método nuevo, a evaluar con datos posteriores y no con este test.

## 4. Limitaciones que se declaran (para P17 y `method.json`)

1. **κ fijo con 2013-2022 no sigue un cambio de régimen de MODIS.** Los resultados de 2025-2026 no deben leerse como la precisión normal del método. Para usar B1 hacia adelante hay que recalibrar y volver a validar.
2. **`PE-25` no es una evaluación ciega** (test visto en T29). `PE` tampoco lo es del todo. La lectura principal es `PE-SIN-25`.
3. **Mucha menos actividad en el test.** El WAPE se infla por un denominador pequeño. Con MODIS bajo, los departamentos de poca actividad (Pasco, Huánuco, Amazonas, Piura) dan WAPE altos aunque el MAE sea de pocas celdas-día.
4. **Cuatro departamentos sin métricas** por tener menos de 50 celdas-día MODIS en test (Callao, Moquegua, Tacna y Tumbes).
5. **Celdas de frontera:** 0.3% de las celdas-día de 2013-2024 quedan fuera de los 25 polígonos y no cuentan (P05).
6. **Riesgo de datos futuros:** NASA dejará de producir en FIRMS los datos de VIIRS de Suomi NPP el 2 de noviembre de 2026 (`earthdata.nasa.gov`, «Transitioning from Suomi NPP VIIRS»). La serie hasta 2026-07 no se afecta; cualquier actualización necesita otro VIIRS.

## 5. Qué sigue

- **P16:** mapas nacionales de 2025 y 2026, solo después de que Aldo firme esta sección.
- **P17:** limitaciones de la sección 4 en `method.json` (Antonella).
- **P18:** manifest nacional (Marco).

## 6. Firma (P15)

Con mi firma confirmo que verifiqué de forma independiente las cifras de P14, que acepto la lectura de las secciones 1 a 4 y que el resultado se reporta sin cambiar κ ni el método.

| Persona | Rol | Firma (nombre y fecha) |
| :-- | :-- | :-- |
| Aldo | Verifica y firma P15 | — pendiente — |
