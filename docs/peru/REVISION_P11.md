# P11 — Revisión científica de la calibración Perú (P09 y P10)

- **Paso:** P11 del plan v2.1 (`DECISIONS.md` §11).
- **Revisor:** Aldo 15-nov-2026
- **Autora de lo revisado:** Antonella (`docs/peru/P09_P10.md`, `docs/peru/valid/`).
- **Fecha:** 15-nov-2026.
- **Dictamen:** ✅ **APROBADA CON CONDICIONES** (sección 4). Los κ quedan congelados en `DECISIONS.md` §12.
- **Test reservado:** no se miró ningún valor de 2025-01 a 2026-07.

## 1. Qué se verificó y cómo

Todo se recalculó de forma independiente, sin usar `scripts/06_calibrate_peru.py`. El cálculo partió de la serie aprobada en P07 (`docs/peru/ejemplo/monthly_series.csv`, SHA-256 `b3ceeae6…`) y se comparó con los archivos de Antonella en el commit `3a10a5d`.

| Comprobación | Resultado |
|---|---|
| κ de las 26 regiones en `method.json`, con la fórmula de §11.2 (solo train 2013–2022) | ✅ 26 de 26 iguales a precisión de máquina |
| Estratos: 17 con κ propio y 8 agrupados (κ = 0.20742), la lista congelada de §11.2 | ✅ |
| `calibrated_series.csv`: B0 = VIIRS y B1 = κ del estrato × VIIRS en las 7,488 filas | ✅ diferencia máxima 0; ninguna fila de 2025–2026 |
| Splits: train 2013–2022 (6,240 filas) y valid 2023–2024 (1,248) | ✅ |
| Regiones reportables con la regla de §11.3 (Σ MODIS ≥ 50 en valid) | ✅ 22 departamentos + `PE` + `PE-SIN-25` = 24. No reportables: Callao (0), Moquegua (43) y Tacna (11) |
| Métricas B1 (WAPE y sesgo) de las 24 reportables en `validation.json` | ✅ 24 de 24 iguales |
| Regla 4 de §11.3: WAPE agregado de los 25 departamentos en validación | ✅ (a) estratificada 0.203 < (b) κ nacional 0.265 < (c) κ Ucayali 0.280 |
| Regresión con el piloto: `PE-25` κ = 0.2936037257560573; valid MAE 55.8, WAPE 0.178, sesgo −32.2 | ✅ igual a T27 |

**Conclusión.** Según la regla fijada antes de la validación (§11.3, regla 4), corresponde el método **(a), estratificado**: cada departamento usa su κ y los 8 de poca actividad usan el κ del estrato agrupado. El κ nacional no se usa para calibrar departamentos.

## 2. Hallazgo principal: cómo se calcula `B1` de `PE` y de `PE-SIN-25`

Hoy el contrato v1.1 §D dice que, para `PE`, B1 = VIIRS nacional × κ nacional (0.24891). Antonella lo aplicó así y también a `PE-SIN-25`, y dejó la duda anotada para P11.

Eso no es coherente con el método elegido:

- La serie cumple `PE` = Σ departamentos (contrato v1.1 §C). Con κ nacional, la estimación B1 de `PE` **no** es igual a la suma de las B1 de los departamentos. El total nacional y el mapa de los departamentos dirían cosas distintas.
- El método aprobado es el estratificado. Con un κ nacional para `PE`, la cifra principal del Perú no usaría ese método.
- §11.3 (regla 4) ya define, **antes de la validación**, la "estimación nacional = suma de los B1 de los departamentos" como cantidad a reportar. No es una alternativa nueva.

**Decisión (condición 1):** B1 de `PE` = Σ B1 de los 25 departamentos, y B1 de `PE-SIN-25` = Σ B1 de los 24 departamentos sin Ucayali. La versión con κ nacional se sigue reportando en `method.json` como referencia, en valid y en test, como pide §11.3.

**Transparencia:** esta decisión se toma después de ver la validación. Con la suma de departamentos el WAPE de `PE` en valid es 0.122, y con κ nacional es 0.143. La razón de la decisión es de coherencia y no ese número: el resultado del test no cambia cuál de las dos versiones se reporta, porque las dos se reportan.

## 3. Limitaciones que deben quedar escritas en `method.json`

1. **Estrato agrupado con error alto.** Arequipa (WAPE B1 0.59) y Lima (0.52) son los peores casos. Son departamentos de poca actividad con un κ compartido.
2. **El κ nacional gana en 4 de 22 departamentos reportables:** Áncash, Cajamarca, Huancavelica y Pasco. Estratificar mejora en conjunto, pero no en cada departamento.
3. **κ variable de un año a otro dentro de cada región,** igual que en el piloto. Ejemplos: Ucayali 0.26–0.34; Moquegua 0.06–0.39 en train.
4. **Tres departamentos sin métricas** (Callao, Moquegua y Tacna) por tener menos de 50 celdas-día MODIS en valid. Sus meses sí cuentan en `PE`.
5. **Celdas de frontera:** 0.3% de las celdas-día de 2013–2024 quedan fuera de los 25 polígonos y no cuentan (P05).

## 4. Condiciones antes de P12 (autorizar el test)

| # | Condición | Quién | Estado |
|---|---|---|---|
| 1 | B1 de `PE` y de `PE-SIN-25` = suma de las B1 de sus departamentos. El contrato v1.1 §D se actualiza en este mismo cambio. Ajustar `06_calibrate_peru.py`, sus pruebas y las salidas de `docs/peru/valid/`. La versión con κ nacional queda como referencia en `method.json → resultados`. | Antonella | ✅ Ajustado el 15-nov-2026: `verificar_sumas` lo comprueba mes a mes; 104/104 pruebas |
| 2 | Agregar las 5 limitaciones de la sección 3 a `method.json`. | Antonella | ✅ Hecho, cifras tomadas de `validation.json` |
| 3 | Corregir `docs/peru/P09_P10.md`: los reportables son **22** de 25 (dice 23), y P06 ya está aprobada (dice que espera revisión). | Antonella | ✅ Hecho |
| 4 | Cambiar el estado de `method.json` a "aprobado en P11" cuando se cumplan las condiciones 1 a 3. | Antonella | ✅ Hecho |
| 5 | Aldo ratifica o cambia este dictamen. Si cambia algo, lo hace antes de P12. | Aldo | ✅ Ratificado por Aldo sin cambios, 15-nov-2026 |

Con las 5 condiciones cumplidas (15-nov-2026), P12 (autorización del test) puede firmarse.


## 5. Firma y aprobación

- **Estado de P11:** ✅ **APROBADA CON CONDICIONES** (condiciones de la sección 4).
- **Firmada por:** Marco (Datos), por delegación de Aldo, que no estaba disponible. Marco dio la autorización en el chat el 15-nov-2026.
- **Revisión realizada con:** Claude.
- **Alcance de la firma:** aprueba la revisión científica y congela los κ de `DECISIONS.md` §12. **No** da por cumplidas las condiciones 1 a 4 (las aplica Antonella) ni la 5 (ratificación de Aldo).
- **Efecto:** P12 (autorización del test 2025-01 a 2026-07) puede firmarse solo cuando las condiciones 1 a 4 estén cumplidas y verificadas. Hasta entonces el test sigue sin tocarse.
- **Firma:** Marco, 15-nov-2026.
- **Actualización (15-nov-2026):** las condiciones 1 a 4 están cumplidas (ver la columna «Estado» de la sección 4) y Aldo ratificó el dictamen sin cambios (condición 5). P12 puede firmarse.
