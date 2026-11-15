# Revisión P07 — Serie de 26 regiones (2013-2024) y polígonos

- **Pasos revisados:** P05 (polígonos), P06 (serie multirregión) y P07 (muestra). Los hizo Marco.
- **Revisa:** Aldo, 14-nov-2026.
- **Estado:** ⏳ **Dictamen propuesto: aprobada.** Falta la confirmación de Aldo.
- **Validación y test:** no se calcularon métricas de validación ni de test. Solo se revisó estructura, sumas y train.

## Qué se verificó (de forma independiente, sin los scripts del equipo)

| Punto | Resultado |
|---|---|
| Filas | 7,488 = 26 regiones × 144 meses × 2 sensores, de 2013-01 a 2024-12. No hay filas de test ✅ |
| Columnas | Las mismas de la v1.0 (contrato v1.1, sección C) ✅ |
| `status` | Las 7,488 filas en `ok`; ningún vacío; ningún duplicado en la clave ✅ |
| Suma | `PE-01` + … + `PE-25` = `PE` en los 288 pares mes-sensor ✅ |
| Regresión Ucayali | `PE-25` es idéntica a la serie `PE-UCA` aprobada en T12 (`cell_days`, `status` y `source_version`), salvo el `region_id` ✅ |
| Train frente a §11.2 | Las Σ VIIRS y Σ MODIS de 2013-2022 de los 25 departamentos coinciden **exactamente** con la tabla de `DECISIONS.md` §11.2. `PE`: 531,910 VIIRS, 132,400 MODIS, κ 0.2489 ✅ |
| Polígonos | 25 features, de `PE-01` a `PE-25`; el hash coincide con el informe de Marco ✅ |
| Polígono de Ucayali | Los mismos 25,928 vértices que el del piloto; la diferencia máxima es de 7×10⁻¹⁴ grados (redondeo al exportar). Es el mismo polígono ✅ |

## Observaciones

- **Celdas fuera del Perú:** 2,619 de 824,137 celdas-día (0.3%) caen fuera de los 25 polígonos y se descartan. Va como limitación en `method.json`.
- **Mapa a 10 km (P08):** Marco detectó que, sin una regla explícita, las celdas de la frontera sumarían detecciones de países vecinos. Se corrigió la sección G del contrato v1.1: solo se suman las celdas de 1 km asignadas a un departamento.

## Archivos aprobados (SHA-256, LF)

- `docs/peru/ejemplo/monthly_series.csv`: `b3ceeae6df820b19f7f132558cea08e51d27f6528f04b460c4c6c8b517893109`
- `docs/region/departamentos_inei_2023.geojson`: `06cfcdd4e1a5a7747c30fc23a8ddb51f7ca166fd66e9b1bc04f87d57b1279c7d`

Si cambia cualquiera de los dos, esta revisión deja de valer.
