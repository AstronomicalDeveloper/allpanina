# Revisión científica T27 — mes de control septiembre 2024

- **Tarea:** T27, revisión científica de la calibración (produce Antonella, revisa Aldo).
- **Fecha:** 14-nov-2026.
- **Estado:** ✅ **APROBADA CON CONDICIONES** — Aldo, 14-nov-2026 (aprobó el dictamen propuesto en la revisión). Condiciones 1-4 cumplidas; falta solo regenerar `manifest.json` (sección 4, punto 6).
- **Mes de control:** 2024-09. Es el mes con más actividad de todo el periodo (MODIS 2,323 celdas-día) y cae en **validación**, no en test.
- **Test reservado:** no se miró ni se calculó nada de 2025-01 a 2026-07. `calibrated_series.csv` no trae filas de esos años.

## 1. El conteo es real (datos crudos de FIRMS → serie)

Se contó de forma independiente, desde los CSV estándar de los zips de `docs/`, sin usar los scripts del equipo. Los puntos de Ucayali se tomaron por día de Lima, dentro del polígono INEI 2023:

| Sensor | Puntos crudos | Tras filtros (`type = 0` + confianza) | `cell_days` en la serie | Puntos por celda-día |
|---|---|---|---|---|
| MODIS | 2,645 | 2,524 | 2,323 | 1.09 |
| VIIRS | 8,806 | 8,395 | 5,581 | 1.50 |

Que haya más puntos que celdas-día es lo esperado:
- **MODIS:** Terra y Aqua pueden ver la misma celda el mismo día, y se cuenta una sola vez.
- **VIIRS:** con píxeles de 375 m, caben varios puntos en una celda de 1 km.

La escala coincide. ✅

Pendiente, opcional: comparar a ojo con el visor web de FIRMS. No cambia el dictamen, porque los datos crudos son la misma fuente.

## 2. El mapa coincide con la serie

Se sumó `cell_days` por mes y sensor en `cells_PE-UCA_2023.geojson` y `cells_PE-UCA_2024.geojson`. Los **48 de 48** valores coinciden exactamente con `monthly_series.csv` (en 2024-09: MODIS 2,323 y VIIRS 5,581). ✅

## 3. La calibración

Se recalculó todo de forma independiente y coincide con lo que entregó Antonella:
- κ = 24,902 / 84,815 = **0.29360**, igual al de `method.json`. ✅
- B1 = B0 × κ en las 288 filas. ✅
- Las métricas de `validation.json` coinciden. ✅

| Método (validación 2023-2024, 24 meses) | MAE | WAPE | Bias |
|---|---|---|---|
| B0 (VIIRS sin calibrar) | 645.9 | 2.06 (206%) | +645.9 |
| **B1 (calibrado)** | **55.8** | **0.18 (18%)** | **−32.2** |

Al calibrar, el error baja unas 11 veces. **Se elige B1.**

### Hallazgo: B1 subestima en los picos de temporadas extremas

| Mes | MODIS | B1 | Error |
|---|---|---|---|
| 2023-08 | 973 | 908 | −7% |
| 2023-09 | 1,258 | 1,166 | −7% |
| 2024-08 | 927 | 940 | +1% |
| **2024-09** | **2,323** | **1,639** | **−29%** |
| 2024-10 | 701 | 542 | −23% |

- **De dónde sale el bias:** casi todo el bias negativo viene de septiembre y octubre de 2024. En los 6 meses con 300 o más celdas-día MODIS, el bias medio es −158. En los 18 meses restantes es +10.
- **κ no es constante:** calculado año por año, en train va de 0.262 a 0.338. En 2024 da **0.354**, por encima de todo el rango de train. En 2024, un año de fuego extremo, MODIS vio proporcionalmente más que VIIRS. Una explicación posible, no comprobada: con fuegos más grandes e intensos, MODIS pierde menos detecciones frente a VIIRS.
- **No parece ser el cambio de versión de MODIS:** κ de 2023 (0.295, ya con V6.1) es normal.
- **Meses con poca actividad:** el error porcentual es grande (por ejemplo, 2023-03: 1 frente a 8), pero el error absoluto es pequeño. Por eso la métrica principal es WAPE y no el error porcentual por mes.

## 4. Dictamen

**Aprobada con condiciones.** B1 se acepta como método de AllpaNina para Ucayali. Antes de T29 (correr el test) tiene que cumplirse esto:

1. ✅ **Antonella** (hecho, commit `ed715f5`) agrega a `method.json` → `limitations`:
   - B1 puede subestimar los meses pico de temporadas extremas (2024-09: −29%).
   - κ varía de año a año (0.26 a 0.34 en train) y se usa un solo factor global.
2. ✅ **Antonella** (hecho, `ed715f5`) actualiza `method.json` → `status_rule` con el segundo caso de `missing` de `DECISIONS.md` §8: ninguna detección en todo Perú ese mes.
3. ✅ **Antonella** (hecho, `ed715f5`) cambia `method.json` → `estado` a "aprobado por Aldo (T27)" (Aldo ya confirmó el dictamen).
4. ✅ **Marco** (hecho, 14-nov-2026: `manifest.json` lista los 16 archivos y todos los hashes coinciden) vuelve a correr `08_manifest.py`, para que `manifest.json` liste también `calibrated_series.csv`, `validation.json` y `method.json` con sus hashes.
6. ⏳ **Marco** vuelve a correr `08_manifest.py`: el cambio de `method.json` dejó desactualizado su hash en `manifest.json`.
5. **Opcional:** agregar a `validation.json` los residuos mes a mes, si Landry los necesita en la pantalla de errores.

No se cambia κ ni el método después de ver estos resultados. Ajustar κ para corregir 2024 sería ajustarlo a la validación, y la validación dejaría de ser independiente.

## Archivos revisados (SHA-256)

- `monthly_series.csv`: `47f833ebf27f710847d68179b495c1a1b5033abb4b762af5617622223c02f171`
- `calibrated_series.csv`: `55d2c6da90475e2a22c5fbaf5ffa1a2fcab95fe0ff04c9a0280a55c0b009ccc3`
- `validation.json`: `8f24c8425b00b57d8476f3844f2df3d77aa42c04c60a7cc8dcc0158de665233f`
- `method.json`: `5555dfce408fb049f96c3146eb682f490de03733e37022750b3dc922bd7cdd60` (borrador; cambia con las condiciones 1 a 3)
- `cells_PE-UCA_2023.geojson`: `39ff565d5328c6768d7fa4c9ccf76cc9772daf44778d905df1b5330eb8da9d35`
- `cells_PE-UCA_2024.geojson`: `0a58aa3e087d6e093703ea6e82a3d94af7b295ee3a4244767af75dad70495233`

Si cambia `calibrated_series.csv` o `validation.json`, esta revisión deja de valer y hay que repetirla.
