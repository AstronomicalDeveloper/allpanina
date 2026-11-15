# Mi región (exploratorio)

Página `/mi-region`. El usuario elige **País → Región** (primer nivel: departamento, provincia, estado…), trae los CSV estándar de NASA FIRMS (MODIS C6.1 y VIIRS S-NPP) y la web arma el calendario y el mapa con el mismo método del piloto. El resultado queda marcado como **exploratorio**.

## Dónde se procesa

**En la computadora del usuario**, dentro de un Web Worker (`frontend/src/services/region/`). El servidor entrega archivos estáticos. Se reutilizan reglas de los scripts Python 02–06; `allpanina/region.py` no existe en este checkout. La prueba de Ucayali compara **byte a byte** las dos series y los 14 mapas publicados, con κ = 0.2936037257560573. Está omitida por defecto: para ejecutarla, usa `ALLPANINA_LENTO=1 npm test` en un shell compatible, o `$env:ALLPANINA_LENTO='1'; npm.cmd test` en PowerShell. Pasó durante la auditoría, pero no demuestra equivalencia mundial.

El procesamiento mantiene varias copias de datos en memoria; no hay streaming ni máximo seguro medido para archivos grandes. El Worker mantiene la interfaz disponible y Cancelar lo termina. El progreso es orientativo y puede retroceder al cambiar de etapa.

## Flujo

1. **Región:** `public/cartography/world/index.json` y `<ISO3>.geojson`. También se puede subir un polígono GeoJSON propio. La zona horaria se sugiere sola y se puede cambiar.
2. **Datos:** subir CSV o ZIP de FIRMS, o descargar con el MAP_KEY del usuario. En ZIP se ignoran archivos cuyo nombre empieza por `fire_nrt`; NRT en CSV directo o con otro nombre se rechaza al validar.
3. **Procesar:** el resultado se guarda en IndexedDB y se abre en Calendario/Mapa/Método con `?data=local&mapRegion=<id>`. Si falla la persistencia, se avisa y queda disponible en memoria durante la sesión: descarga el ZIP antes de recargar.
4. **Descargar / subir** el resultado como `.zip`. Se verifican CRC, hashes, archivos mínimos, esquemas y coherencia de región/período antes de reemplazar el conjunto local. Los hashes no autentican la fuente ni acreditan revisión científica.

## Archivos de países

`python scripts/11_world_boundaries.py` (necesita internet, solo una vez) descarga geoBoundaries (ADM1 simplificado, CC BY 4.0) y escribe `frontend/public/cartography/world/`. Perú ya viene con los 25 departamentos del INEI.

Solo Perú está incluido en el selector del checkout. El GeoJSON propio permite otras regiones sin ejecutar ese script. Usa polígonos cerrados WGS84 con superficie positiva y revisa manualmente la zona horaria sugerida por longitud; no identifica automáticamente todas las zonas civiles ni regiones con varias zonas. No hay verificación general de topología o tratamiento específico del antimeridiano.

## Descarga y configuración

El cliente usa `MODIS_SP` y `VIIRS_SNPP_SP` en bloques de hasta 5 días, según la [API de área de NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/area). Mantiene un presupuesto conservador de 4000 días solicitados por 10 minutos; no conoce consumos de otras pestañas o aplicaciones. No se promete duración de descarga ni disponibilidad de todo el período.

Por defecto se conecta directamente a NASA. Opcionalmente configura `VITE_FIRMS_BASE` en el entorno de Vite, por ejemplo `VITE_FIRMS_BASE=/firms`, **solo si ese proxy ya fue implementado por el equipo**. No se instala ni presupone Nginx. Es configuración pública; nunca incluyas una MAP_KEY en variables `VITE_*`. La clave se introduce en la interfaz y transita por el proxy si lo configuras. Ante CORS o errores de red, usa descarga manual de CSV/ZIP. La descarga real con MAP_KEY y los encabezados CORS no se han verificado en esta auditoría.

## Cambios en lo existente

Los validadores aceptan `contract_version = "1.0-region"`, `split = "sin_validar"`, `kappa = null`, métricas ausentes cuando la región no es reportable y `source_version` vacío en meses `missing`. Método respeta `reportable = false`. El sobre `1.0-region` es una extensión implementada por esta funcionalidad; su sección formal no aparece en `docs/contrato_datos.md` y necesita acuerdo del equipo antes de considerarse contrato publicado. La navegación suma "Mi región". Ver el [informe de auditoría](../docs/AUDITORIA_MI_REGION.md) para evidencia, cambios y límites.
