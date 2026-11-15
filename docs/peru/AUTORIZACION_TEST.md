# AllpaNina Perú — Autorización del test nacional (P12)

- **Paso:** P12 del plan v2.1. Depende de P11 (`docs/peru/REVISION_P11.md`, aprobada con condiciones y ratificada por Aldo el 15-nov-2026).
- **Autorizan:** Aldo, Marco y Antonella Karla Montes. Marco firmó primero por delegación de Aldo; Aldo ratificó y firmó antes de P14.
- **Fecha:** 15-nov-2026.
- **Commit de referencia:** el último commit de `docs/peru/AUTORIZACION_TEST.md` en `feature/calibracion` (un archivo no puede citar su propio hash; ver el historial del archivo).
- **Estado:** **AUTORIZADO** el 15-nov-2026 por Aldo, Marco y Antonella (secc. 7). Aldo firmó antes de que se corra P14.

Sin las dos firmas no se ejecuta nada sobre el periodo de test.

## 1. Qué se autoriza

Una sola corrida del test (P14) sobre **2025-01 a 2026-07** (19 meses), para:

- `PE` (Perú nacional, B1 = suma de los B1 de los 25 departamentos);
- `PE-SIN-25` (Perú sin Ucayali, B1 = suma de los B1 de los 24 departamentos), que es el **resultado limpio**;
- cada departamento que cumpla el mínimo de §11.3 en test (Σ MODIS ≥ 50);
- la referencia de `PE` con κ nacional (`0.24891429001146811`), solo informativa.

No se autoriza: otro periodo, ningún ajuste de κ, ninguna alternativa nueva ni una segunda corrida.

## 2. Condiciones previas

| # | Condición | Evidencia | Estado |
| :-: | :-- | :-- | :-: |
| 1 | P11 aprobada con condiciones por Marco (con Claude), por delegación de Aldo | `docs/peru/REVISION_P11.md` §5 | ✅ |
| 2 | Condiciones 1 a 4 de P11 cumplidas por Antonella y verificadas de forma independiente. La 5 (ratificación de Aldo) se cumplió el 15-nov-2026 | `REVISION_P11.md` §4 y anexo A | ✅ (1 a 5) |
| 3 | κ congelados, calculados solo con train 2013-01 a 2022-12 | `DECISIONS.md` §12 | ✅ |
| 4 | Estratos (P02) y reglas de métricas (P04) fijados antes de ver la validación | `DECISIONS.md` §11.2 y §11.3 | ✅ |
| 5 | Validación 2023-2024 hecha, con las alternativas (b) κ nacional y (c) κ de Ucayali | `docs/peru/valid/comparacion_alternativas.json` | ✅ |
| 6 | `PE-25` coincide con Ucayali v1 (serie y κ) | `REVISION_P07.md`, `REVISION_P11.md` | ✅ |
| 7 | Nadie ha mirado valores de test de Perú (salvo el test de Ucayali en T29, declarado en la sección 4) | firmas de la sección 7 | ✅ |

## 3. Insumos congelados

| Archivo | SHA-256 |
| :-- | :-- |
| `docs/peru/ejemplo/monthly_series.csv` (serie 2013-2024, P07) | `b3ceeae6df820b19f7f132558cea08e51d27f6528f04b460c4c6c8b517893109` |
| `docs/region/departamentos_inei_2023.geojson` | `06cfcdd4e1a5a7747c30fc23a8ddb51f7ca166fd66e9b1bc04f87d57b1279c7d` |
| `docs/peru/valid/method.json` («aprobado en P11») | `51045b2f36188c0393f391f9b5a13cbbf865befaa33de601ebb31875bbff2110` |

En P13, los meses 2013-01 a 2024-12 de `monthly_series_full.csv` deben ser idénticos a la serie de arriba.

### κ congelados (`DECISIONS.md` §12)

Antes de calcular cualquier métrica, el script de P14 imprime estos κ. Si alguno no coincide, se detiene todo y se revisa con Aldo.

| `region_id` | Departamento | Estrato | κ |
| --- | --- | --- | --- |
| `PE-01` | Amazonas | propio | `0.1636604774535809` |
| `PE-02` | Áncash | propio | `0.2263453048562224` |
| `PE-03` | Apurímac | propio | `0.2993135838150289` |
| `PE-04` | Arequipa | agrupado | `0.2074200735789419` |
| `PE-05` | Ayacucho | propio | `0.25009491268033407` |
| `PE-06` | Cajamarca | propio | `0.19206349206349208` |
| `PE-07` | Callao | agrupado | `0.2074200735789419` |
| `PE-08` | Cusco | propio | `0.2707177676920491` |
| `PE-09` | Huancavelica | agrupado | `0.2074200735789419` |
| `PE-10` | Huánuco | propio | `0.2698616135887993` |
| `PE-11` | Ica | agrupado | `0.2074200735789419` |
| `PE-12` | Junín | propio | `0.23387767610875182` |
| `PE-13` | La Libertad | propio | `0.2500541086501695` |
| `PE-14` | Lambayeque | propio | `0.27195926397407705` |
| `PE-15` | Lima | agrupado | `0.2074200735789419` |
| `PE-16` | Loreto | propio | `0.19987465101703605` |
| `PE-17` | Madre de Dios | propio | `0.3372677046710196` |
| `PE-18` | Moquegua | agrupado | `0.2074200735789419` |
| `PE-19` | Pasco | propio | `0.2660450068985204` |
| `PE-20` | Piura | propio | `0.19136015457870403` |
| `PE-21` | Puno | propio | `0.28991750687442713` |
| `PE-22` | San Martín | propio | `0.21326906202636947` |
| `PE-23` | Tacna | agrupado | `0.2074200735789419` |
| `PE-24` | Tumbes | agrupado | `0.2074200735789419` |
| `PE-25` | Ucayali | propio | `0.2936037257560573` |
| `PE` | Perú (solo referencia) | nacional | `0.24891429001146811` |

## 4. Advertencia sobre Ucayali

**El test 2025-01 a 2026-07 de Ucayali (`PE-25`) ya se vio en T29** del piloto. Por eso:

- `PE-25` se reporta marcado como «test ya visto en T29»; no es una evaluación ciega.
- `PE` incluye a Ucayali, así que tampoco es del todo ciego. La lectura principal de generalización es `PE-SIN-25`.
- Ninguna decisión de P02, P04, P09, P10 ni P11 se apoyó en el test de Ucayali. Excepciones declaradas: ninguna.

## 5. Reglas de la corrida

1. El script imprime los κ de la sección 3 antes de calcular métricas.
2. Se corre una sola vez. Si falla por un error técnico **antes** de producir métricas, se documenta y se repite con la misma configuración. Si ya se vieron métricas, no se repite.
3. Si el resultado es malo, se declara como limitación. No se reajusta ningún κ con datos de test.
4. Las salidas van a `docs/peru/test/` sin editarlas a mano.
5. Los mapas de 2025 y 2026 (P16) se generan solo después de P15.

## 6. Qué se reporta, sea cual sea el resultado

Para `PE`, `PE-SIN-25` y cada región reportable en test: MAE, WAPE y sesgo de B0 y B1 frente a MODIS Terra+Aqua, número de meses emparejados y residuos mensuales ordenados por error absoluto. WAPE = `null` si Σ MODIS = 0. Las regiones que no lleguen al mínimo van como `reportable: false` con su motivo. Si B1 no mejora a B0, se publica igual.

## 7. Firmas

Con mi firma confirmo que se cumplen las condiciones de la sección 2, que acepto las reglas de las secciones 4 a 6 y que no he visto valores de test de Perú.

| Persona | Rol | Firma (nombre y fecha) |
| :-- | :-- | :-- |
| Aldo | Autoriza; ratifica P11 sin cambios | Aldo Ruiz, 15-nov-2026 (antes de P14) |
| Marco | Autoriza, por delegación de Aldo (Datos) | Marco, 15-nov-2026 |
| Antonella | Autoriza y ejecuta P14 | Antonella Karla Montes, 15-nov-2026 |
