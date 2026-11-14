# DECISIONS.md — AllpaNina

Decisiones científicas congeladas por Aldo (T04 de la matriz atómica v1.4).
No se modifican sin que Aldo + Antonella lo autoricen explícitamente (ver sección
"Test reservado" al final).

## 1. Región piloto

**Provincia de Coronel Portillo, departamento de Ucayali, Perú.**

Razón: es la región con más hectáreas quemadas acumuladas en el ranking nacional
satelital (MapBiomas Fuego Perú, 2013-2024: Ucayali lidera con ~350,600 ha, y dentro
de Ucayali, Coronel Portillo concentra ~204,800 ha).

No se trabaja el departamento de Ucayali completo (102,400 km²) ni Loreto (368,852 km²)
— demasiado grandes para procesar y revisar a mano en el tiempo del evento.

**Caja de coordenadas — CORREGIDA:** la provincia mide unos 335 km de largo (es
alargada, no cuadrada); la caja anterior de ~180 km por lado la cortaba y perdía
cerca de un tercio de los días-celda reales. Nueva caja, con margen de +0.25° ya
incluido para no cortar zonas activas:

- Centro aprox.: -8.5, -74.5 (cerca de Pucallpa)
- lat: -10.00 a -7.00 (≈ 335 km)
- lon: -75.60 a -73.30 (≈ 275 km)

**Sigue siendo provisional** — Marco la ajusta con el shapefile oficial de INEI o
viendo la densidad real de FIRMS antes de descargar en serio. No se usa una segunda
región ni se compara entre regiones (regla de la matriz, sección 1). Mapa, calendario
y método se construyen todos sobre esta misma región.

## 2. Sensores

- MODIS Terra + Aqua (producto estándar MCD14ML, FIRMS)
- VIIRS Suomi NPP (producto estándar, FIRMS)

VIIRS S-NPP: NOAA anunció el cese de entrega de todos los productos el 1 de
noviembre de 2026; NASA indica que la entrega de nuevos datos científicos cesó el
2 de noviembre de 2026. El archivo histórico no se ve afectado. Documentado como
limitación en `method.json`.

## 3. Periodo de referencia

**2013-01 a 2026-07** (corregido — no 2026-09). El producto estándar de FIRMS tiene
2-3 meses de rezago; al momento de la descarga, 2026-09 solo existe como NRT
(near real-time), no como producto estándar validado. No se usa NRT para el método
congelado — solo para el mapa observacional, si acaso, y marcado como tal.

## 4. Split train / validation / test

- **Train:** 2013-01 a 2022-12 (10 años) — ajusta el factor de calibración B1.
- **Validation:** 2023-01 a 2024-12 (2 años) — compara B0 vs B1 y elige método.
- **Test (reservado):** 2025-01 a 2026-07.

**Riesgo documentado:** MODIS cambia de versión (V6 → V6.1) justo donde arranca
nuestra validación — NASA confirma que el procesamiento V6 terminó el 15 de febrero
de 2023, a semanas de nuestro corte de enero 2023. Esto puede meter un salto en los
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

## 7. Filtro `type` y control de calidad (QC)

- **MODIS:** se descartan filas con `type != 0` (0 = fuego de vegetación presumido;
  se excluyen 1=volcán, 2=fuente estática, 3=offshore).
- **VIIRS:** el producto estándar de FIRMS no trae columna `type` como MODIS —
  no se puede aplicar el mismo filtro. Se filtra solo por confianza.
- **Confianza mínima:** MODIS `confidence >= 30`; VIIRS `confidence` en
  {nominal, high} (se excluye `low`). Umbral ajustable — si Antonella ve que esto
  descarta demasiados datos reales en la región piloto, se revisa con Aldo antes
  de tocar el train.

## 8. Regla de cobertura — CORREGIDA

La regla anterior ("mes con <80% de cobertura = insufficient_data") **no se puede
calcular con los CSV de descarga de FIRMS** — esos archivos no traen información de
pases/cobertura del satélite, solo detecciones. Se retira esa regla.

**Reemplazo:** un mes con cero detecciones en ambos sensores para la región se marca
`status: "sin_actividad_o_sin_cobertura"` — es ambiguo a propósito, porque sin datos
de cobertura no podemos distinguir "no hubo fuego" de "no hubo pase útil del
satélite". Se documenta como limitación en vez de inventar un porcentaje que no
podemos medir.

## 9. Códigos

- `region_id`: **PE-UCA-CPO** (Perú — Ucayali — Coronel Portillo). Los archivos
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
