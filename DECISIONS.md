# DECISIONS.md — AllpaNina

Decisiones científicas congeladas por Aldo (T04 de la matriz atómica v1.4).
No se modifican sin que Aldo + Antonella lo autoricen explícitamente (ver sección
"Test reservado" al final).

## 1. Región piloto

**Departamento de Ucayali, Perú (región completa) — decisión revisada el
14-nov-2026 por Aldo.**

**Cambio de alcance respecto a la versión anterior de este documento:** antes
decía "Provincia de Coronel Portillo" y excluía explícitamente el departamento
completo ("demasiado grande para procesar a mano"). Se revierte esa decisión
porque la caja de coordenadas usada para la provincia cubría solo el 61% del
área real de Coronel Portillo según el polígono INEI (Marco cruzó la caja
contra el polígono oficial). En vez de parchar la caja de la provincia, Aldo
decidió subir de escala a todo el departamento.

Razón original (sigue aplicando, ahora a nivel departamento): es la región con
más hectáreas quemadas acumuladas en el ranking nacional satelital (MapBiomas
Fuego Perú, 2013-2024: Ucayali lidera con ~350,600 ha).

**Caja de coordenadas (cubre el departamento completo):**
- lat: -11.45 a -8.37 (8°22'S a 11°27'S — límites del departamento)
- lon: -76.08 a -70.50 (70°30'W a 76°05'W)
- Área real del departamento: ~102,400 km² (fuente: INEI, Compendio
  Estadístico Ucayali). La caja rectangular mide más que eso (no es un
  rectángulo), igual que antes — la caja solo acota la descarga de FIRMS, el
  filtro final del indicador se hace con el polígono real, no con la caja.

**Polígono oficial — pendiente, NO se usa el provisional:** Marco propuso usar
el polígono INEI-2007 del repo `juaneladio/peru-geojson` (licencia MPL-2.0,
confirmada) como límite provisional del departamento mientras se consigue el
GeoPackage oficial del INEI. **Aldo decidió NO usarlo** y esperar el
GeoPackage oficial. Hasta que ese polígono oficial exista, el indicador final
sigue acotado por la caja de coordenadas de arriba, no por un polígono real —
esto es una limitación conocida, documentarla en `method.json`.

**Acción pendiente para Marco (bloqueante, con fecha límite):** la descarga de
FIRMS que ya existe fue hecha con la caja de la provincia (demasiado chica).
Hay que repetir la descarga con la caja nueva de arriba **antes del 29 de
diciembre de 2026** (FIRMS borra los archivos de descarga a los 45 días) y
actualizar los hashes en `docs/datos.md`. El GeoJSON de 2024 y `monthly_series.csv`
generados con la caja vieja quedan invalidados y hay que regenerarlos.


## 2. Sensores

- MODIS Terra + Aqua (producto estándar MCD14ML, FIRMS)
- VIIRS Suomi NPP (producto estándar, FIRMS)

VIIRS S-NPP: NOAA anunció el cese de entrega de todos los productos el 1 de
noviembre de 2026; NASA indica que la entrega de nuevos datos científicos cesó el
2 de noviembre de 2026 (fuente: NASA LP DAAC). El archivo histórico no se ve
afectado. Documentado como limitación en `method.json`.

**Corrección sobre VIIRS Version 2 (verificado contra datos reales de Marco):**
NASA lanzó VIIRS Version 2 el 29 de agosto de 2023 anunciando cobertura "desde
2018 en adelante", lo que hizo pensar que 2013-2017 se quedaría en Version 1.
**Eso ya no es así**: en el archivo real descargado por Marco, todos los
registros VIIRS de 2012 a 2026 vienen con `version = 2` — NASA terminó de
reprocesar el archivo histórico completo a V2. No hay mezcla de versiones
dentro de nuestro periodo train. Se retira esta limitación de `method.json`.

## 3. Periodo de referencia

**2013-01 a 2026-07** (corregido — no 2026-09). El producto estándar de FIRMS tiene
2-3 meses de rezago; al momento de la descarga, 2026-09 solo existe como NRT
(near real-time), no como producto estándar validado. No se usa NRT para el método
congelado — solo para el mapa observacional, si acaso, y marcado como tal.

## 4. Split train / validation / test

- **Train:** 2013-01 a 2022-12 (10 años) — ajusta el factor de calibración B1.
- **Validation:** 2023-01 a 2024-12 (2 años) — compara B0 vs B1 y elige método.
- **Test (reservado):** 2025-01 a 2026-07.

**Riesgo documentado (fecha corregida — la primera cita estaba mal):** MODIS
cambia de versión (V6 → V6.1) justo donde arranca nuestra validación. La fecha
correcta, según el anuncio final de NASA LP DAAC (no el anuncio preliminar del
15 de febrero, que fue superado por una actualización), es:
**Terra: 17 de febrero de 2023. Aqua: 23 de febrero de 2023**
(https://www.earthdata.nasa.gov/data/alerts-outages/modis-version-6-forward-processing-has-been-discontinued).
Esto cae a semanas de nuestro corte de enero 2023 — puede meter un salto en los
datos que no es un cambio real de incendios, sino un cambio de algoritmo. Se
documenta como limitación explícita en `method.json`; si Antonella ve un salto raro
justo ahí, no se interpreta como señal real sin revisarlo primero con Aldo.

## 5. Tamaño de celda y malla

- Malla EPSG:6933 (equal-area), **celda de 1 km × 1 km**.

## 6. Día: Lima o UTC

Se usa **hora local de Lima (UTC-5, sin horario de verano)** para decidir a qué día
calendario pertenece una detección. El timestamp UTC original se conserva sin tocar
en `data/raw/` y `data/processed/` para trazabilidad — la conversión a día-Lima
pasa solo en la agregación a `cell_days`.

## 7. Filtro `type` y control de calidad (QC) — CORREGIDO

**El producto estándar de VIIRS sí trae columna `type`** (la misma codificación
que MODIS: 0=fuego de vegetación presumido, 1=volcán, 2=fuente estática,
3=offshore). Me equivoqué antes diciendo que no existía — solo falta en el
producto NRT de VIIRS, no en el estándar, que es el que usamos.

- **MODIS y VIIRS (ambos):** se descartan filas con `type != 0`.
- **Limitación de la versión 2 de VIIRS:** el campo `type` de VIIRS Collection 2
  viene del algoritmo rediseñado (ver sección 2) — para los años 2013-2017
  (Collection 1) revisar si el campo existe igual en esos archivos antes de
  asumir que el filtro se comporta igual en todo el periodo train.
- **Confianza mínima:** MODIS `confidence >= 30`; VIIRS `confidence` en
  {nominal, high} (se excluye `low`). Umbral ajustable — si Antonella ve que esto
  descarta demasiados datos reales en la región piloto, se revisa con Aldo antes
  de tocar el train.

## 8. Regla de `status` — CORREGIDA (otra vez)

La regla anterior mezclaba sin querer "sin detección" con "sin datos" en un solo
estado ambiguo. Versión corregida, más simple y sin inventar un porcentaje de
cobertura que no se puede calcular desde los CSV de FIRMS:

- **`status: "ok"`** — el sensor estaba operando ese mes, **aunque `cell_days` sea 0**.
  Cero detecciones con el sensor operando es una observación real, no un vacío.
- **`status: "missing"`** — el mes cae **fuera de la ventana de disponibilidad**
  conocida del sensor (antes de su lanzamiento/arranque de cobertura estándar,
  después de un cese documentado como el de VIIRS S-NPP en nov-2026, o cualquier
  otro vacío oficialmente documentado). Nunca se usa `missing` solo porque
  `cell_days` dio 0 — eso es `ok`.

No existe un tercer estado ambiguo. Si en algún momento se necesita distinguir
nubosidad/mala pasada de ausencia real de fuego, eso requeriría datos de cobertura
que FIRMS no entrega — se deja fuera de alcance para este hackathon.

## 9. Códigos

- `region_id`: **PE-UCA** (Perú — departamento de Ucayali). Cambia de
  `PE-UCA-CPO` a `PE-UCA` por el cambio de alcance de la sección 1
  (provincia → departamento completo), 14-nov-2026. Los archivos
  DEMO siguen usando `DEMO-01` porque son inventados a propósito.
- `sensor_group`: `MODIS` | `VIIRS` (ya fijado en el contrato de datos).

## Test reservado — regla de oro

Nadie corre el test (2025-01 a 2026-07) ni mira sus resultados hasta que Aldo +
Antonella lo autoricen juntos (T29 de la matriz). Se corre **una sola vez**. Modificar
cualquier parte del método después de ver el resultado del test invalida la validación.

## 10. Fórmula del factor de calibración (B1) y convención de signo del error

**Factor κ (kappa):**

```
κ = Σ cell_days_MODIS(train, región completa) / Σ cell_days_VIIRS(train, región completa)
B1 = B0 × κ
```

Un solo número κ para toda la región, ajustado una sola vez sobre **todo** el periodo
train (2013-2022) sumado — no mes a mes, no promedio de factores mensuales. Si la
suma de VIIRS en train es 0, κ no se puede calcular: se documenta como caso borde
en `method.json`, no se usa un valor por defecto inventado (ej. κ=1).

**Convención de signo del error (obligatoria para Antonella y para cómo lo muestra Landry):**

```
signed_error = estimate - modis_observed
```

- Positivo → el método **sobreestima** (dice más de lo que MODIS observó).
- Negativo → el método **subestima**.
- `absolute_error = |signed_error|`
- `bias` (sesgo) = promedio de `signed_error` sobre el periodo evaluado (no de
  `absolute_error` — el sesgo debe poder ser negativo).
- `MAE` = promedio de `absolute_error`.
- `WAPE` = Σ|signed_error| / Σ modis_observed, sobre el periodo evaluado (indefinido
  si el denominador es 0 — ver sección 8).

Esta convención es la misma en `validation.json`, en `method.json` y en cualquier
gráfico que Landry construya con el signo del error — nadie la invierte por su cuenta.
