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

**Caja de coordenadas (cubre el departamento completo) — CORREGIDA:**
- lat: -11.55 a -7.15
- lon: -76.10 a -70.40
- Corrección: la versión anterior de esta caja decía lat -11.45 a -8.37
  ("8°22'S a 11°27'S"). El límite norte del departamento está cerca de 7°20'S
  (polígono INEI-2007: lat máxima -7.27), no en 8°22'S; con ese límite la caja
  dejaba fuera la franja norte y solo contenía el 86.7% del área del
  departamento. Con la caja corregida contiene el 100%. Se dejó un margen de
  0.1° (≈ 11 km) sobre el polígono INEI-2007, que es simplificado y solo
  provisional; el margen se puede reducir cuando exista el GeoPackage oficial.
- Área real del departamento: ~102,400 km² (fuente: INEI, Compendio
  Estadístico Ucayali). La caja rectangular mide más que eso (no es un
  rectángulo), igual que antes — la caja solo acota la descarga de FIRMS, el
  filtro final del indicador se hace con el polígono real, no con la caja.

**Polígono oficial — EN USO (14-nov-2026):** se usa el GeoPackage oficial del
INEI, como decidió Aldo (no el provisional de `juaneladio/peru-geojson`).
- Fuente: Infraestructura de Datos Espaciales del INEI, archivo
  `https://ide.inei.gob.pe/files/Departamento.rar` ("Departamental (Actualizado
  al 2023)"; SHA-256 del .rar `c6c2b3075229e1b4bfb33e9bfe4979d0a71dbf452f4b04b7c831928bdfc574da`).
  Contiene `DEPARTAMENTO.gpkg` (EPSG:4326, 25 departamentos; campos `ccdd`,
  `nombdep`, `fuente`).
- Se extrajo Ucayali (`ccdd = 25`) sin modificar la geometría a
  `docs/region/ucayali_inei_2023.geojson` (MultiPolygon válido, 25,928 vértices;
  lon -75.948 a -70.494, lat -11.448 a -7.262).
- Área geodésica calculada: ~105,100 km². Difiere en ~2.7% del ~102,400 km² del
  Compendio Estadístico; se reporta la diferencia, no se corrige.
  **Aprobado por Aldo (14-nov-2026):** se reporta así, sin corregir; el filtro
  usa el polígono oficial. Mencionar la diferencia en `method.json` (limitaciones).
- Regla: una celda de 1 km pertenece a Ucayali si su **centro** cae dentro del
  polígono. La caja de arriba contiene todo el polígono y solo se usa como
  prefiltro rápido.
- Impacto (2013–2024): la caja contaba 65,459 días-celda MODIS y 233,671 VIIRS;
  con el polígono quedan 32,439 y 107,854. La diferencia caía sobre todo en
  Huánuco, Junín, Pasco y Loreto. Las series hechas con la caja quedan
  reemplazadas.

**Descarga de FIRMS — no se repite (verificado):** los archivos que ya están en
`docs/` cubren todo el Perú (MODIS: lat -18.16 a -0.03, lon -81.28 a -68.72;
VIIRS: lat -18.34 a -0.03, lon -81.29 a -68.69), así que la caja de Ucayali de
arriba cae completamente dentro. La caja solo se aplica al agregar
(`scripts/04_monthly_series.py`), no en la descarga. Los zips, sus hashes y
`docs/datos.md` siguen válidos. Lo que sí hay que regenerar con la caja nueva es
`monthly_series.csv`, el GeoJSON y `manifest.json` (los anteriores eran de la
caja de la provincia).


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

**Inicio en 2013-01 también para los entregables (revisión T12, Aldo, 14-nov-2026):**
la muestra de `monthly_series.csv` de Marco arrancaba en 2012-01. Se mantiene
2013-01 como primer mes de **todos** los entregables (`monthly_series.csv`,
GeoJSON, `manifest.json` → `periodo.desde = "2013-01"`). 2012 queda fuera: no
entra en el train (§4) y VIIRS 2012-01 es un mes incompleto (desde el 20 de
enero). Los datos de 2012 pueden seguir en `data/processed/`, pero no en lo que
se entrega a Antonella ni a Landry.

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
- **Verificado en los datos reales de Marco:** el campo `type` existe, sin nulos,
  en todos los años de ambos sensores (MODIS 2003–2026; VIIRS 2012–2026), y
  todos los registros VIIRS son `version = 2`. El filtro se comporta igual en
  todo el periodo train.
- **Limitación conocida de VIIRS `version = 2`:** NASA documenta que en las
  versiones 1 y 2 algunos puntos de tipo 2 (fuente estática) quedaron marcados
  como tipo 0, y que se corrigió en la versión 3 (mayo 2025). El filtro
  `type = 0` puede dejar algunas fuentes estáticas en VIIRS. Documentarlo en
  `method.json`.
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
- **Segundo caso de `missing` (aprobado por Aldo, 14-nov-2026, propuesto por
  Marco):** el sensor estaba en su ventana pero ese mes **no tiene ninguna
  detección en todo Perú** (no solo en Ucayali). Un mes entero sin un solo foco
  en el país no es creíble y se trata como hueco de datos. Si Ucayali tiene 0 y
  el resto de Perú sí tiene detecciones, el mes es `ok` con `cell_days = 0`.
  En 2013-2024 esta regla no se activa; queda escrita por si se amplía el periodo.
  Implementada en `scripts/04_monthly_series.py`.

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

### Valor congelado para T29 (14-nov-2026, aprobado por Aldo + Antonella en T27)

- **κ = 0.2936037257560573**
  (Σ MODIS train 24,902 / Σ VIIRS train 84,815; 120 meses, 2013-01 a 2022-12)
- Serie de entrada: `docs/ejemplo/monthly_series.csv`
  (sha256 `47f833ebf27f710847d68179b495c1a1b5033abb4b762af5617622223c02f171`, polígono INEI).
- **Método elegido para el test: B1.** Criterio: menor WAPE en valid
  (B1 0.178 vs B0 2.06; 24 meses, 2023-01 a 2024-12). Revisión: `docs/REVISION_T27.md`.
- Métricas que se reportan en test: MAE, WAPE, sesgo, n de meses emparejados
  y residuos mensuales ordenados por error absoluto. Se reportan B0 y B1.
- Ejecución: una sola vez, con
  `python scripts/06_calibrate.py <serie_con_test> --split test --autorizado-aldo-antonella`.
  Antes de mirar métricas se verifica que el script imprima κ = 0.2936…;
  si no coincide, se detiene y se revisa con Aldo.
- Nada de lo anterior se modifica después de ver el resultado del test.

## 11. Extensión Perú (versión 2)

### 11.1 Alcance — P01 (aprobado por Aldo, 14-nov-2026)

Plan de referencia: *AllpaNina Perú — Plan de pasos para incluir todo el Perú v2.1*.
Esta sección se escribe **antes** de que nadie calcule métricas de validación o
test para cualquier región que no sea Ucayali.

- **Regiones (26):** Perú nacional + sus 25 departamentos, con los polígonos
  oficiales del INEI, capa "Departamental (Actualizado al 2023)", la misma fuente
  que el polígono de Ucayali (§1).
- **Códigos `region_id`:**
  - `PE`: Perú nacional.
  - `PE-<ccdd>` por departamento, con el código INEI de 2 dígitos: `PE-01` Amazonas,
    `PE-02` Áncash, `PE-03` Apurímac, `PE-04` Arequipa, `PE-05` Ayacucho,
    `PE-06` Cajamarca, `PE-07` Callao, `PE-08` Cusco, `PE-09` Huancavelica,
    `PE-10` Huánuco, `PE-11` Ica, `PE-12` Junín, `PE-13` La Libertad,
    `PE-14` Lambayeque, `PE-15` Lima, `PE-16` Loreto, `PE-17` Madre de Dios,
    `PE-18` Moquegua, `PE-19` Pasco, `PE-20` Piura, `PE-21` Puno, `PE-22` San Martín,
    `PE-23` Tacna, `PE-24` Tumbes, `PE-25` Ucayali.
  - Ucayali dentro de la extensión es `PE-25`. `PE-UCA` queda **solo** para el
    piloto v1. Así la prueba de regresión compara `PE-25` con `PE-UCA` sin
    ambigüedad: deben ser iguales salvo el nombre de la región.
- **Asignación de celdas:** una celda de 1 km pertenece al departamento cuyo polígono
  contiene su **centro** (misma regla que §1), así que cada celda cae en uno solo.
  Las celdas cuyo centro cae fuera de los 25 polígonos se descartan. `PE` es la
  suma de los 25 departamentos.
- **Datos:** no hay descarga nueva. Se usan los mismos zips de FIRMS de `docs/`
  (MODIS hasta 2026-08 y VIIRS hasta 2026-07, todo Perú), con los mismos hashes
  de `docs/datos.md`.
- **Reglas que no cambian:** periodo y split (§3 y §4: train 2013-01 a 2022-12,
  valid 2023-01 a 2024-12, test 2025-01 a 2026-07), celda y malla (§5), día en hora
  de Lima (§6), filtros (§7), `status` `ok`/`missing` (§8), fórmula de κ y
  convención de signo del error (§10).
- **Test reservado:** el test 2025-01 a 2026-07 queda reservado para todas las
  regiones nuevas. El de Ucayali ya se vio en T29, así que el test nacional se
  reporta con y sin Ucayali (detalle en 11.3).
- **Dónde va:** todo lo de Perú va en `frontend/public/data/peru/`. Los archivos del
  piloto Ucayali v1 en `frontend/public/data/` quedan **congelados**: no se
  modifican. Se trabaja en la rama `feature/calibracion`.
- **Mapa nacional:** celdas de 10 km, armadas sumando las celdas de 1 km ya
  deduplicadas. Las series por departamento siempre usan la celda de 1 km.
  Detalle en el contrato v1.1 (P03).
- **No incluye:** el resto del mundo, pronóstico, calibración por celda ni trabajo
  de frontend (Landry recibe los archivos al final, en P20).

### 11.2 Estratos de κ — P02 (aprobado por Aldo, 14-nov-2026)

**Regla, fijada antes de calcular cualquier métrica de validación o test fuera de Ucayali:**

- Un departamento tiene **κ propio** si en train (2013-01 a 2022-12) tiene
  **Σ VIIRS ≥ 5,000 y Σ MODIS ≥ 1,000** celdas-día. Cumplen 17.
- Los otros 8 (Lima, Huancavelica, Arequipa, Ica, Tumbes, Moquegua, Tacna y Callao)
  forman **un estrato agrupado** con un solo κ, calculado con la suma de los 8.
- `PE` (nacional) tiene su propio κ con la suma de los 25. Se usa como referencia
  en la validación (P10), no para calibrar departamentos.
- Fórmula, la misma de §10, **solo con train**:
  κ = Σ cell_days MODIS (train) / Σ cell_days VIIRS (train), y B1 = VIIRS × κ del estrato.
  La validación y el test solo evalúan κ, nunca lo ajustan.
- **La lista de estratos queda congelada** tal como está en la tabla. Si el cálculo
  oficial de P09 diera números algo distintos, un departamento no cambia de estrato:
  se reporta la diferencia y se revisa con Aldo.

**Por qué esta regla:** con un umbral de 1,000 VIIRS pasaban Moquegua e Ica, cuyo κ
anual va de 0.06 a 0.39. Los 8 de poca actividad tienen κ bajos (0.207 juntos); el
κ nacional (0.249) los sobreestimaría.

**Tabla de los 25 (train 2013-2022, celdas-día de 1 km dentro de cada polígono INEI):**

| `region_id` | Departamento | Σ VIIRS | Σ MODIS | κ train | κ anual mín–máx | Estrato |
| --- | --- | ---: | ---: | ---: | :---: | --- |
| `PE-22` | San Martín | 87,753 | 18,715 | 0.213 | 0.155–0.245 | κ propio |
| `PE-25` | Ucayali | 84,815 | 24,902 | 0.294 | 0.262–0.338 | κ propio |
| `PE-10` | Huánuco | 61,639 | 16,634 | 0.270 | 0.218–0.323 | κ propio |
| `PE-16` | Loreto | 52,653 | 10,524 | 0.200 | 0.159–0.237 | κ propio |
| `PE-12` | Junín | 45,682 | 10,684 | 0.234 | 0.188–0.298 | κ propio |
| `PE-17` | Madre de Dios | 35,838 | 12,087 | 0.337 | 0.305–0.349 | κ propio |
| `PE-08` | Cusco | 23,796 | 6,442 | 0.271 | 0.225–0.325 | κ propio |
| `PE-19` | Pasco | 21,019 | 5,592 | 0.266 | 0.226–0.308 | κ propio |
| `PE-06` | Cajamarca | 15,750 | 3,025 | 0.192 | 0.134–0.273 | κ propio |
| `PE-20` | Piura | 14,491 | 2,773 | 0.191 | 0.137–0.265 | κ propio |
| `PE-13` | La Libertad | 13,861 | 3,466 | 0.250 | 0.215–0.303 | κ propio |
| `PE-01` | Amazonas | 11,310 | 1,851 | 0.164 | 0.133–0.195 | κ propio |
| `PE-21` | Puno | 10,910 | 3,163 | 0.290 | 0.195–0.381 | κ propio |
| `PE-05` | Ayacucho | 10,536 | 2,635 | 0.250 | 0.168–0.322 | κ propio |
| `PE-14` | Lambayeque | 8,641 | 2,350 | 0.272 | 0.213–0.347 | κ propio |
| `PE-02` | Áncash | 8,381 | 1,897 | 0.226 | 0.206–0.265 | κ propio |
| `PE-03` | Apurímac | 5,536 | 1,657 | 0.299 | 0.191–0.373 | κ propio |
| `PE-15` | Lima | 4,626 | 836 | 0.181 | 0.109–0.233 | Agrupado |
| `PE-09` | Huancavelica | 4,452 | 1,071 | 0.241 | 0.168–0.277 | Agrupado |
| `PE-04` | Arequipa | 4,068 | 945 | 0.232 | 0.177–0.283 | Agrupado |
| `PE-11` | Ica | 2,788 | 348 | 0.125 | 0.070–0.203 | Agrupado |
| `PE-24` | Tumbes | 1,781 | 489 | 0.275 | 0.132–0.388 | Agrupado |
| `PE-18` | Moquegua | 1,003 | 243 | 0.242 | 0.063–0.385 | Agrupado |
| `PE-23` | Tacna | 480 | 71 | 0.148 | 0.073–0.353 | Agrupado |
| `PE-07` | Callao | 101 | 0 | 0.000 | — | Agrupado |
| — | **Estrato agrupado (8)** | **19,299** | **4,003** | **0.207** | — | — |
| `PE` | **Perú (25 departamentos)** | **531,910** | **132,400** | **0.249** | — | Referencia |

Fuente de los números: plan v2.1, calculados por Marco con `cell_days.parquet`
(scripts 01-03, zips FIRMS de `docs/`) y los polígonos INEI 2023, solo train.
Son **preliminares**: los κ oficiales los calcula Antonella en P09 con el pipeline
y deben coincidir. Callao tiene Σ MODIS = 0 en train; solo entra en el estrato
agrupado, nunca con κ propio.

### 11.3 Reglas de métricas — P04 (Aldo + Antonella, 14-nov-2026)

Versión unificada. Antonella había escrito su propia versión de P04 (commit `0bef9b3`),
coincidente en todo menos el criterio del punto 4. Aldo decidió combinar las dos:
decide el criterio por departamentos y se reporta además el de Antonella.

Fijadas **antes** de calcular cualquier métrica de validación o test fuera de Ucayali.

**1. Mínimo para reportar una región.**
- Una región se reporta en un split si en ese split tiene **Σ MODIS ≥ 50 celdas-día**.
- Se evalúa por separado en validación y en test: una región puede ser reportable en
  una y no en la otra.
- Si no llega al mínimo, en `validation.json` va como `reportable: false`, con
  `motivo` y sin métricas (contrato v1.1, sección E). Sus meses sí cuentan dentro de
  `PE` y de `PE-SIN-25`.

**2. WAPE.**
- Si Σ MODIS = 0 en el split, el WAPE no se reporta (`null`, nunca 0).
- MAE y sesgo se reportan igual si la región es reportable.
- Las métricas se calculan con los meses emparejados (`status = ok` en los dos
  sensores), como en el piloto.

**3. Test con y sin Ucayali.**
- El test se reporta para `PE`, para `PE-SIN-25` (Perú sin Ucayali) y para cada
  región reportable.
- `PE-25` (Ucayali) se marca como "test ya visto en T29". El resultado limpio, el que
  nadie había visto, es `PE-SIN-25`.

**4. Cómo se decide en P10 si estratificar mejora** (una regla que el plan nombra pero
no deja fija):
- Se comparan tres alternativas, ya definidas aquí, todas con κ calculado solo en train:
  - **(a) Estratificada**, la de §11.2.
  - **(b) κ nacional único** (el de `PE`) para todos los departamentos.
  - **(c) κ de Ucayali** (0.29360) para todos los departamentos.
- **Criterio:** el WAPE agregado de los 25 departamentos en validación:
  Σ |error| / Σ MODIS, sumando todos los departamentos y los 24 meses.
- **Se elige la estratificada si su WAPE agregado es menor que el de (b) y el de (c).**
  Si no lo es, en P11 se elige entre (a), (b) y (c) la de menor WAPE agregado, se
  documenta y se congela. No se crean alternativas nuevas después de ver validación.
- **Se reporta además** (propuesta de Antonella), sin que decida la elección:
  - el WAPE de `PE` nacional, con la estimación nacional = suma de los B1 de los
    departamentos, para las tres alternativas y para B0;
  - en cuántas regiones reportables la estratificada tiene menor WAPE que (b).
- El test no interviene en esta elección.

**5. Sin cambios.** Se usan las mismas métricas del piloto (MAE, WAPE y sesgo), sin
agregar ni quitar ninguna. Estas reglas no se cambian después de ver los resultados
de validación ni de test.

## 12. Extensión Perú: calibración congelada — P11 (15-nov-2026)

Revisión: `docs/peru/REVISION_P11.md`. La hizo Marco, con Claude, por delegación de Aldo, que no estaba presente. **Aldo la ratificó sin cambios el 15-nov-2026, antes de P14** (`REVISION_P11.md`, anexo A).
Dictamen: **aprobada con condiciones**; las condiciones 1 a 5 están cumplidas (15-nov-2026), incluida la ratificación de Aldo. Esto queda congelado **antes** de correr el test.

- **Serie de entrada:** `docs/peru/ejemplo/monthly_series.csv` (P07), SHA-256
  `b3ceeae6df820b19f7f132558cea08e51d27f6528f04b460c4c6c8b517893109`.
- **Método:** (a) estratificado (§11.2). Se eligió con la regla 4 de §11.3: WAPE agregado de los 25 departamentos en validación de 0.203, contra 0.265 con κ nacional y 0.280 con κ de Ucayali.
- **Fórmula:** κ = Σ MODIS (train) / Σ VIIRS (train), con train de 2013-01 a 2022-12, y B1 = VIIRS × κ del estrato de la región.
- **`PE` y `PE-SIN-25`:** B1 = **suma de las B1 de sus departamentos** (todos para `PE`; todos menos `PE-25` para `PE-SIN-25`). Así se cumple la misma regla de la serie (`PE` = Σ departamentos). La versión VIIRS × κ nacional (0.24891429001146811) se reporta como referencia en valid y en test, como pide §11.3. Esto reemplaza lo que decía el contrato v1.1 §D.
- **κ congelados** (si al correr el test el script imprime otros valores, se detiene):

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
| `PE-25` | Ucayali | propio | `0.2936037257560573` (igual al piloto, §10) |
| `PE` | Perú (solo referencia) | nacional | `0.24891429001146811` |

- **Condiciones antes de P12:** las 5 de `docs/peru/REVISION_P11.md` §4. Son:
  1. `PE` como suma de departamentos.
  2. Las limitaciones en `method.json`.
  3. Las correcciones en `P09_P10.md`.
  4. `method.json` con estado aprobado.
  5. La ratificación de Aldo.

  Estado: condiciones 1 a 4 cumplidas el 15-nov-2026 (ver `REVISION_P11.md` §4); la 5 cumplida el mismo día: Aldo ratificó sin cambios. P12 la firman Aldo, Marco y Antonella (`docs/peru/AUTORIZACION_TEST.md`).
