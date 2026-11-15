# Integración nacional, etapa 1

Rama: `feat/peru-integration`, basada en `refactor/frontend-v2` (`0526391`). Se conservaron todos los cambios locales anteriores; no se hizo merge, reset, commit ni push.

## Fuente y archivos

Se consultó `origin/feature/calibracion` tras fetch. Fuente: `78f2ca71e59dd41b03f5557e6063e7fa42bcb4ca`. Los cinco productos nacionales necesarios (dos CSV, method, validation y manifest) se copiaron byte a byte; suman 912811 bytes. El contrato y el README de origen se conservaron sin editar su contenido científico. `PROCEDENCIA_ETAPA1.json` identifica rutas y SHA-256. El piloto en `/data/` y DEMO no se modificaron.

No se incorporaron GeoJSON de 10 km: esta tarea no integra el mapa nacional. Su futura visualización no puede reutilizar la interpretación de una celda piloto de 1 km como si fueran días distintos en una sola celda nacional. El contrato exige comprobar compresión HTTP antes de aquella integración; esa comprobación de Nginx queda para la etapa del Mapa.

## Implementación

- Selector compartido `GeographicSelection`, fuera del navbar: 26 opciones del manifiesto y nombres publicados. `mapRegion` es la única selección regional por URL. Recarga, navegación e historial la conservan. Acceso explícito al piloto; DEMO permanece separado.
- Calendario predeterminado nacional, con selección de región local sobre los CSV cargados. No se recalculan los productos ni se agregan departamentos para generar PE. Comparación, sensores independientes, período, escala, detalles científicos, ayuda y CSV permanecen.
- Lectores de documentos y tipos v1.1 preservan la estructura regional. Validación distingue resultados reportables y no reportables, exige razones y conserva métricas/rangos null sin convertirlos en cero. La tabla de evaluación incluye 27 entradas porque PE-SIN-25 no es una región seleccionable.
- Mapa y Método nacionales permanecen protegidos con mensajes de etapa pendiente. No se publican métricas ni mapas piloto bajo un identificador nacional. Las implementaciones piloto y todos sus controles permanecen operativas bajo `data=pilot` / `PE-UCA`.

## Verificación científica

- 26 regiones; 8476 filas mensuales y 8476 calibradas; claves únicas por región/período/serie.
- La suma de los 25 departamentos coincide exactamente con PE para cada mes/sensor comparable (163 meses, 2 sensores).
- PE-25: valores, estados, períodos y versiones observadas iguales al piloto. La igualdad literal solicitada tiene una diferencia de metadatos: las 326 fechas `updated_at` pasan de 2026-11-14 a 2026-11-15. Se documenta; no se modifica ningún producto para ocultarla.
- Las 326 filas calibradas PE-25 coinciden con PE-UCA salvo el identificador regional.
- Se conservan ceros, null y meses no publicados. Enero de 2013 a julio de 2026; agosto–diciembre de 2026 no se convierten en cero.
- Cuatro departamentos no reportables en test: PE-07, PE-18, PE-23, PE-24; los motivos coinciden entre method y validation. El rango anual de κ de Callao es null y permanece null.
- SHA-256 de los cuatro productos listados incorporados coinciden con el manifiesto. El propio manifiesto y los documentos se cotejan por la procedencia de importación.

## Límites

La revisión visual queda a Landry. No se utilizó navegador ni Computer Use. Los metadatos nacionales se cargan en el selector y en el Calendario de forma independiente, con cancelación y error visible; no se añadió un sistema de caché ni una biblioteca de estado. Los productos v1.2 descritos por el contrato no están publicados en esta entrega ni se implementan aquí.

## Verificaciones automatizadas

`npm test`: **153 aprobadas, 0 fallidas, 0 omitidas**. `npm run lint`: correcto. `npm run build`: correcto; permanece el aviso previo de tamaño del paquete MapLibre, cargado de forma diferida. `peru-integration.test.ts` cubre integridad, sumas, regresión del piloto, flags/motivos/null, selección, CSV, historial/recarga, ausencia de fallback y protección de las vistas pendientes. Las pruebas de v2 anteriores pasan a declarar explícitamente el piloto; no se omiten ni desactivan.
