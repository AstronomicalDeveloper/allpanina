# Revisión P17 — Archivos finales de Perú (`frontend/public/data/peru/`)

- **Paso:** P17, hecho por Antonella. **Aprueba:** Aldo, 15-nov-2026.
- **Estado:** ✅ **APROBADA**, con una limitación agregada a `method.json` (ver abajo).

| Comprobación | Resultado |
|---|---|
| `calibrated_series.csv` y `validation.json` | Idénticos byte a byte a la corrida firmada en P15 (`docs/peru/test/`) ✅ |
| `monthly_series.csv` | Idéntico a la serie de P13 (`docs/peru/test/monthly_series_full.csv`) ✅ |
| `method.json`: los 26 κ | Iguales a los congelados en `DECISIONS.md` §12 ✅ |
| `method.json`: estratos | 17 propios y 8 agrupados (κ 0.20742) ✅ |
| `method.json`: `PE` y `PE-SIN-25` | B1 = suma de los B1 de los departamentos; el κ nacional queda solo como referencia (b) ✅ |
| `method.json`: resultados | Validación (24 regiones) y test (23 reportables), iguales a `REVISION_P11.md` y `RESULTADO_TEST.md` ✅ |
| `method.json`: limitaciones | Incluye las de `RESULTADO_TEST.md` §4, con las correcciones de fuentes de P15 ✅ |
| Mapas 2025 y 2026 (P16, Marco) | La suma por mes y sensor = `PE` en 38 de 38 ✅ |

**Limitación agregada al aprobar:** faltaba la de `REVISION_P11.md`, anexo A.2. En años de mucha actividad, B1 subestima el pico (setiembre de 2024: San Martín −31%, Ucayali −29%), lo opuesto a lo que pasó en el test. Ahora `method.json` tiene 19 limitaciones.

**`method.json` aprobado (SHA-256, LF):** `52f4cacdea8ac97d609d79283aef1f9a9d001d8df14d2d06f1ff710f3fc1a60b`. Marco genera el manifest (P18) a partir de esta versión.
