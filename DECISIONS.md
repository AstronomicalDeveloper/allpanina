# DECISIONS.md — AllpaNina

Decisiones científicas congeladas por Aldo (T04 de la matriz atómica v1.4).
No se modifican sin que Aldo + Antonella lo autoricen explícitamente (ver sección
"Test reservado" al final).

## 1. Región piloto

**Provincia de Coronel Portillo, departamento de Ucayali, Perú.**

Razón: es la región con más hectáreas quemadas acumuladas en el ranking nacional
satelital (MapBiomas Fuego Perú, 2013-2024: Ucayali lidera con ~350,600 ha, y dentro
de Ucayali, Coronel Portillo concentra ~204,800 ha). Suficiente actividad de incendios
para que MODIS/VIIRS tengan señal real que calibrar y validar.

No se trabaja el departamento de Ucayali completo (102,400 km²) ni Loreto (368,852 km²,
el más grande del país) — ambos son demasiado grandes para procesar y revisar a mano
en el tiempo del evento. Coronel Portillo (~36,000 km²) sí es manejable.

**Caja de coordenadas (provisional — Marco la ajusta con la densidad real de FIRMS):**
- Centro: -8.38, -74.55 (Pucallpa)
- lat: -9.30 a -7.70
- lon: -75.30 a -73.60

No incluimos una segunda región ni comparamos entre regiones (regla explícita de la
matriz, sección 1). El mapa, el calendario y el método se construyen todos sobre esta
misma región — no se separa el alcance.

## 2. Sensores

- MODIS Terra + Aqua (producto estándar, FIRMS)
- VIIRS Suomi NPP (producto estándar, FIRMS)

Nota: VIIRS Suomi NPP dejó de recibir datos operativos nuevos el 1-2 de noviembre de
2026 (el archivo histórico no se ve afectado). Como trabajamos con el producto
estándar (2-3 meses de rezago), el mes más reciente que vamos a poder descargar ya es
anterior al corte — no debería afectarnos esta entrega, pero queda documentado como
limitación conocida en `method.json`.

## 3. Periodo de referencia

2013-01 a 2026-09 (último mes disponible del producto estándar al momento de la
descarga). 2013 porque es cuando VIIRS S-NPP ya tiene cobertura estable sobre la zona.

## 4. Split train / validation / test

- **Train:** 2013-01 a 2022-12 (10 años) — para ajustar el factor de calibración B1.
- **Validation:** 2023-01 a 2024-12 (2 años) — para comparar B0 vs B1 y elegir método.
- **Test (reservado):** 2025-01 en adelante, hasta el último mes disponible.

## 5. Reglas de calidad iniciales

- Terra y Aqua detectando la misma celda el mismo día cuentan como **una sola**
  detección, no dos (ver `test_grid_dedupe.py`).
- "Sin detección" (hubo monitoreo, no se vio fuego) y "sin datos" (no hubo cobertura
  ese mes) son estados distintos — nunca se confunden con un simple 0.
- Un mes con cobertura de datos por debajo del 80% se marca `qc_status: insufficient_data`,
  no se descarta pero tampoco se usa para calibrar sin revisión de Aldo.
- WAPE queda indefinido (no se calcula) si la suma de observaciones MODIS de ese
  periodo es 0 — se reporta como "no aplica", nunca como 0% de error.

## Test reservado — regla de oro

Nadie corre el test (2025 en adelante) ni mira sus resultados hasta que Aldo +
Antonella lo autoricen juntos (T29 de la matriz). Se corre **una sola vez**. Modificar
cualquier parte del método después de ver el resultado del test invalida la validación.
