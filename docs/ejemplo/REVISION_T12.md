# Revisión T12 — APROBADA

- **Tarea:** T12, muestra de `monthly_series.csv` + `manifest.json` (produce Marco).
- **Revisa y aprueba:** Aldo, 14-nov-2026.
- **Estado:** ✅ Aprobada.

## Qué se verificó

| Punto | Resultado |
|---|---|
| Región | `PE-UCA`, filtrada con el polígono oficial INEI 2023 (`docs/region/ucayali_inei_2023.geojson`) |
| Periodo | 2013-01 a 2024-12 (`DECISIONS.md` §3; el test 2025-01 a 2026-07 no se tocó) |
| Filas | 288 = 144 meses × 2 sensores (MODIS, VIIRS) |
| `status` | 288 `ok`, 0 `missing`, sin celdas vacías (`DECISIONS.md` §8) |
| Manifest | `periodo.desde = 2013-01`; el hash de `monthly_series.csv` coincide con el archivo; `sources` incluido (opcional, contrato §6) |
| Coherencia | Los meses con más días-celda MODIS caen en septiembre (temporada de quemas) |

## Archivos aprobados (SHA-256)

- `monthly_series.csv`: `47f833ebf27f710847d68179b495c1a1b5033abb4b762af5617622223c02f171`
- `manifest.json`: `4092205003e59786f39596736ad9d9ba7b232a6300610d53d0d988efd77d5e1b`

Si cualquiera de estos archivos cambia, la aprobación deja de valer y hay que volver a revisar.

## Decisiones tomadas en esta revisión

- Todos los entregables empiezan en 2013-01 (`DECISIONS.md` §3).
- `sources` se acepta como campo opcional del manifest (`docs/contrato_datos.md` §6).
- `missing` también cuando no hay ninguna detección en todo Perú ese mes (`DECISIONS.md` §8).
- La diferencia de área del polígono (~105,100 km² frente a ~102,400 km²) se reporta sin corregir y va a `method.json` (`DECISIONS.md` §1).
