# T29 — Autorización para evaluar el test reservado

- **Autorizan:** Aldo y Antonella, juntos, el 14-nov-2026 a las 15:40 (hora de Lima).
- **Qué se evalúa:** el test reservado, 2025-01 a 2026-07 (19 meses), **una sola vez**.
- **Método y κ congelados antes de ver el test:** `DECISIONS.md` §10 (κ = 0.2936037257560573, método B1) y `docs/REVISION_T27.md`.

## Procedimiento acordado

1. **Marco** genera la serie completa con `04_monthly_series.py --include-test` y la sube. Ruta real: `docs/ejemplo/monthly_series_con_test.csv` (sha256 `5a388b39273d1ef8ba779e65922db1b30908ed64ad5c6686b9b0cb49d8c2d68c`). Antes de calcular nada se verifica:
   - que 2013-01 a 2024-12 sea idéntico a la serie aprobada en T12 (sha256 `47f833eb…`);
   - que estén los 19 meses del test, con `status`.
2. **Antonella** corre una sola vez:
   `python scripts/06_calibrate.py docs/ejemplo/monthly_series_con_test.csv --split test --autorizado-aldo-antonella --out docs/t29/`
   - Antes de mirar las métricas se confirma que imprima `factor B1 = 0.2936037257560573`. Si no coincide, se detiene y se revisa con Aldo.
   - La salida va a `docs/t29/` y **no** a `frontend/public/data/`, para no sobrescribir el `validation.json` de validación.
3. Se recalculan las métricas de forma independiente, se revisan los meses problemáticos y se publica `docs/t29/RESULTADO_T29.md`, con los denominadores, el n y las limitaciones de B0 y B1.

## Regla

Nada de `DECISIONS.md` §10 se modifica después de ver el resultado. Si el resultado es malo, se reporta tal cual y se explica; no se reajusta κ ni se cambia de método.

## Verificación de la serie (paso 1, hecho)

Se revisó solo la estructura del test; no se miraron sus valores:
- 326 filas = 163 meses × 2 sensores (2013-01 a 2026-07).
- 2013-01 a 2024-12: idéntico, fila por fila, a la serie aprobada en T12. ✅
- Test: 19 meses (2025-01 a 2026-07), 19 filas MODIS y 19 VIIRS, todas `status = ok`, sin vacíos. Versiones: MODIS `61.03`, VIIRS `2`. ✅
