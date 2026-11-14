# Datos de origen (FIRMS) — AllpaNina

Responsable: Marco (escuadrón Datos). Revisa: Aldo.
Objetivo de este documento: que otra persona pueda repetir la descarga y verificar que usa los mismos archivos.

## 1. Fuente

- Portal: NASA FIRMS, *Archive Download* (https://firms.modaps.eosdis.nasa.gov/download/).
- Solicitud enviada el 2026-11-14 a las 14:45:54 UTC (09:45:54 hora de Lima), según el correo de confirmación de NASA FIRMS. IDs de descarga: 848370 (fuente `modis-c6.1`) y 848371 (fuente `suomi-viirs-c2`). Rango pedido: 2003-01-01 a 2026-11-02. Formato: CSV.
- Los dos correos de «solicitud completada» llegaron a las 14:51:20 y 14:52:21 UTC (09:51 y 09:52 hora de Lima). FIRMS conserva los archivos hasta 45 días en su servidor (hasta ~2026-12-29); pasada esa fecha los enlaces del correo pueden dejar de funcionar.
- Fecha de descarga de los archivos: 2026-11-14, 09:51–09:54 (hora de Lima).
- Área: Perú (país completo).
- Nota de uso: citar FIRMS/NASA en el README (elegibilidad, términos 2026 de Space Apps). Atribución: NASA pide reconocer el uso de datos e imágenes de FIRMS, parte de LANCE y del ESDIS de NASA, y replicar o enlazar su aviso de responsabilidad; los datos se entregan «tal cual» y NASA no recomienda usarlos para decisiones tácticas a escala local. Texto oficial en inglés para copiar en el README: https://www.earthdata.nasa.gov/data/tools/firms (sección *Acknowledgments*).

## 2. Archivos descargados

| Sensor | Archivo | ID en el nombre | SHA-256 |
|---|---|---|---|
| MODIS (Terra + Aqua), Colección 6.1 | `DL_FIRE_M-C61_848370.zip` | 848370 | `26cf9ee849ee4736c9c321ad79445275d908cb9f3b50c959d26eecfda4d972a6` |
| VIIRS S-NPP 375 m, Colección 2 | `DL_FIRE_SV-C2_848371.zip` | 848371 | `f6b49a31341a195d5321caf061866ed5a7b1d285714a3e48b530596700f6a2f9` |

Cada zip trae un CSV de **archivo estándar** (`fire_archive_*`) y uno **NRT** (`fire_nrt_*`).

| CSV | Filas | Primera fecha | Última fecha | Versión |
|---|---|---|---|---|
| `fire_archive_M-C61_848370.csv` | 352 572 | 2003-01-02 | 2026-08-31 | `6.03` (hasta 2022-12-30), `61.03` (desde 2023-01-02) |
| `fire_nrt_M-C61_848370.csv` | 4 056 | 2026-09-01 | 2026-11-02 | `6.1NRT` |
| `fire_archive_SV-C2_848371.csv` | 1 058 423 | 2012-01-20 | 2026-07-31 | `2` |
| `fire_nrt_SV-C2_848371.csv` | 43 565 | 2026-08-01 | 2026-11-01 | `2.0NRT` |

Revisión hecha sobre los archivos: coordenadas dentro de Perú (lat −18.3 a 0; lon −81.3 a −68.7), sin meses faltantes dentro de cada archivo estándar, `acq_time` siempre de 4 dígitos.

## 3. Columnas observadas

- Archivo estándar: `latitude, longitude, brightness, scan, track, acq_date, acq_time, satellite, instrument, confidence, version, bright_t31, frp, daynight, type`.
- Archivo NRT: las mismas, **sin `type`**.
- `acq_time`: HHMM en UTC (completar con ceros a la izquierda antes de convertir).
- `confidence`: numérica 0–100 en MODIS; `l`, `n`, `h` en VIIRS.
- `type` (archivo estándar): valores 0, 1, 2 y 3 en ambos sensores. Significado documentado por NASA: 0 = incendio de vegetación presunto, 1 = volcán activo, 2 = otra fuente terrestre estática, 3 = detección costa afuera. Conteos en los archivos (0 / 1 / 2 / 3): MODIS 343 585 / 625 / 8 210 / 152; VIIRS 1 031 180 / 3 971 / 19 568 / 3 704.
- **Limitación en VIIRS:** el archivo es de versión 2. Según la guía de usuario de VIIRS 375 m, en las versiones 1 y 2 algunos puntos de tipo 2 quedaron etiquetados como tipo 0; se corrigió en la versión 3 (mayo de 2025). Filtrar `type == 0` en VIIRS puede dejar algunas fuentes estáticas. Pendiente: comprobar si FIRMS ofrece la versión 3 para Perú; si no, queda como limitación declarada.

## 4. Decisiones que se derivan (llevar a `DECISIONS.md` con Aldo)

1. **Solo producto estándar.** Se ignoran los CSV NRT: es otra versión y no trae `type`, así que `qc_strict` no se aplicaría igual.
2. **Último mes estándar común: 2026-07.** MODIS estándar llega a agosto de 2026 y VIIRS a julio de 2026.
3. **Calendario en día local de Lima (UTC−5, sin horario de verano).** Un foco a las 02:00 UTC pertenece al día anterior en Perú.
4. **VIIRS enero de 2012 es un mes incompleto** (solo 12 días, desde el 20 de enero). Se marca `sin_datos` para `viirs_snpp` en ese mes, o se anota explícitamente.
5. **MODIS cambia de etiqueta de versión el 2023-01-02** (`6.03` → `61.03`; fecha tomada del archivo). NASA indica que el procesamiento de V6 terminó el 17 de febrero de 2023 (Terra) y el 23 de febrero de 2023 (Aqua), y que C6.1 cambia solo la calibración de Nivel 1B, no el algoritmo de detección. Posible discontinuidad; avisar a Antonella para la calibración y mencionarlo en la pantalla Método.
6. **Cobertura anterior a 2012 en VIIRS:** 2003–2011 es `sin_datos` para `viirs_snpp` (FIRMS indica disponibilidad de VIIRS S-NPP desde el 2012-01-20).

## 5. Plan alternativo (si hay que repetir o ampliar)

- Resumen anual por país de FIRMS (`firms.modaps.eosdis.nasa.gov/country/`): zips globales por instrumento y año, procesamiento estándar. Habría que filtrar Perú. No incluye 2026.
- VIIRS S-NPP ya dejó de entregar datos nuevos: NOAA terminó la entrega el 2026-11-01 (13:00 UTC) y NASA indica que dejó de publicar el 2026-11-02 (15:40 UTC). El archivo estándar usado llega a 2026-07 y no se ve afectado. Para ampliar el periodo más adelante habría que evaluar NOAA-20 (desde 2018-04-01), con el costo de calibración que implica.

## 6. Cómo repetir la descarga

1. Entrar a *Archive Download* de FIRMS y autenticarse con el código enviado por correo.
2. Área: Perú. Fuentes: MODIS y VIIRS S-NPP únicamente. Fechas: desde 2003-01-01 hasta la última disponible. Formato: CSV.
3. Enviar la solicitud y descargar los zips desde el correo de «solicitud completada» (los archivos quedan 45 días en el servidor de FIRMS).
4. Verificar que el SHA-256 coincida con la tabla de la sección 2 (si FIRMS regenera el archivo, los hashes pueden variar; en ese caso, anotar los nuevos).

## 7. Ubicación local de los crudos

Los archivos crudos **no se suben al repo** (el CSV de VIIRS pesa ~86 MB; `AGENTS.md` pide aprobación del equipo para datos voluminosos). Van en `data/raw/` (incluido en `.gitignore`). Copia de respaldo de los zips originales: `docs/DL_FIRE_M-C61_848370.zip` y `docs/DL_FIRE_SV-C2_848371.zip` en la rama `feature/calibracion` (SHA-256 verificados contra la sección 2). `AGENTS.md` exige aprobación del equipo para datos voluminosos: aprobación de Aldo pendiente, y los zips **no se llevan a `main`** (se retiran de `docs/` antes del PR). Quien los use debe verificar el SHA-256 de la sección 2.
