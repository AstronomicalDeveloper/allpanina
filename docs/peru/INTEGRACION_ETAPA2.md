# Integración nacional — etapa 2

Rama `feat/peru-integration`. Se conserva el trabajo local de la etapa 1 y las mejoras previas. Sin merge, commits, pushes, PR, cambios estéticos generales ni automatización científica.

## Datos e integridad

Se incorporaron los 14 `cells_PE_2013.geojson` … `cells_PE_2026.geojson` desde `origin/feature/calibracion`, commit `78f2ca71e59dd41b03f5557e6063e7fa42bcb4ca`, sin alterar su contenido. Tamaño total original: 72,446,535 bytes. Los 14 SHA-256 coinciden con el manifiesto nacional ya importado. `PROCEDENCIA_ETAPA2.json` registra las rutas y hashes. Los cinco productos de etapa 1 y los archivos piloto/DEMO permanecen sin cambios.

## Mapa

- `MapPage` utiliza `/data/peru/`, carga solo el GeoJSON del año elegido y valida su suma contra las filas `PE` del CSV. Mes/sensor se filtran localmente. Los cambios de departamento conservan el mismo archivo y la instancia MapLibre.
- Se conservan Anual/Mensual, MODIS/VIIRS, fondos y overlays de Juan, cuadrados ampliados, transición excluyente a polígonos, opacidad, inspector, popups, fullscreen, atribuciones y limpieza.
- Las geometrías de 10 km son **contexto nacional**. Sus valores suman pares celda-día de 1 km; pueden superar 31 al mes. No se deduplican de nuevo ni se aplica B1.
- La selección departamental no recorta ni asigna celdas por centroide/intersección. Sin un producto celda-departamento no es posible una distribución exacta de su indicador. La vista conserva Perú completo y lo explica de forma visible. No se incorporan límites ni una asignación nueva en esta etapa.
- `regionalSummary.ts` calcula el resumen temporal únicamente de las filas CSV de la región/sensor seleccionados (anual: suma de meses disponibles). Los totales departamentales nunca se derivan de las geometrías. En un departamento no se presentan recuentos/máximos de las celdas nacionales como estadísticas locales.
- Popups, inspector anual y ayuda diferencian la geometría de 10 km del indicador de 1 km. El conjunto mantiene la disponibilidad publicada, ceros y año parcial; no se presupone observación continua ni cobertura de nubes.

## Método

- Lectura de `method.json`, `validation.json` y `calibrated_series.csv` nacionales con los validadores v1.1 de etapa 1.
- `regionalMethod.ts` selecciona metadatos, κ departamental/agrupado y resultados de validación/prueba de la región actual. No calcula métricas. Para PE no se presenta la ecuación B1 = VIIRS × κ nacional: se explica la suma de estimaciones departamentales y se omite el κ de referencia como factor operativo.
- El resultado PE incluye a Ucayali; PE-SIN-25 se presenta separadamente como análisis del test que excluye el piloto visto previamente, sin convertirlo en región seleccionable ni reemplazar silenciosamente a PE.
- `reportable:false` conserva el motivo publicado y no crea métricas. Las métricas de otras etapas que sí existan se distinguen por split. Null conserva el estado no disponible.
- El detalle de la serie calibrada filtra únicamente la región elegida y muestra los últimos 24 registros (hasta 12 meses), con valores recibidos, splits, estados y residuos; conserva el enlace de descarga del archivo original completo.
- Se conserva el diseño editorial y los servicios piloto/DEMO. El navbar y el trabajo de Marco no se modifican.

## Estado, rendimiento y límites

`mapRegion` sigue siendo la única selección geográfica en la URL, compartida entre las tres vistas. `PE-UCA` y `PE-25` siguen separados. `data=pilot` y `data=demo` mantienen sus fuentes; los sensores de Calendario/Mapa siguen independientes. Solicitudes abortadas y respuestas tardías no reemplazan la selección actual.

Se evita descargar todos los mapas en paralelo en la aplicación. La prueba de integridad sí recorre los 14 secuencialmente. Se actualizan fuentes sin recrear capas al cambiar modalidad, mes, sensor o departamento; cambiar de archivo anual reconstruye la instancia como en la implementación previa, liberando recursos. No se añadió una caché de años ni dependencias nuevas.

La carga/validación del GeoJSON completo y las opciones del inspector pueden costar memoria/tiempo en móviles modestos; no se afirma que haya un benchmark de dispositivo real. Las pruebas son automatizadas, sin navegador ni Computer Use. No se implementa desagregación departamental exacta, zoom a límites departamentales ni teselas nuevas.

**Compresión HTTP pendiente:** no se ha configurado ni probado el servidor personal. `DESPLIEGUE_COMPRESION.md` documenta Nginx y comprobaciones GET de MIME, gzip, Vary, 404 e integridad. La compresión local de los productos cumple los límites del contrato, pero no certifica despliegue HTTP.

## Verificación

`peru-stage2.test.ts` cubre hashes/lectura de 14 GeoJSON, sumas PE, tamaño gzip, carga por año, modalidades/sensores, cuadrados y unidades 10 km/1 km, ceros/año parcial, estadísticas departamentales del CSV, ausencia de reparto geográfico, resultados reportables/no reportables/null, análisis PE-SIN-25, serie calibrada y respuestas tardías. Las pruebas anteriores conservan piloto, DEMO, Calendario e historial.


Resultado final: `npm test` **164 aprobadas, 0 fallidas, 0 omitidas**; `npm run lint` correcto; `npm run build` correcto. Persiste el aviso previo por el tamaño del paquete MapLibre, cargado de forma diferida. Las 7 importaciones de etapa 1 y los 14 GeoJSON de etapa 2 se cotejaron de nuevo contra su procedencia y permanecen idénticos byte a byte. El piloto y DEMO no tienen cambios en Git. No se configuró ni verificó compresión HTTP de producción.
