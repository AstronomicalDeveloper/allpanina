# Filtrado cartográfico por departamento — corrección UX

La selección PE muestra todas las celdas nacionales. Seleccionar PE-01 a PE-25 muestra solo intersecciones con su límite INEI simplificado. Las celdas se recortan visualmente, conservando su identificador y propiedades originales, incluido el valor completo `cell_days`. No hay reparto de valores ni suma de fragmentos para obtener indicadores departamentales: el resumen continúa leyendo `monthly_series.csv` por `region_id`.

Se eliminan el sombreado exterior, el contorno naranja y el botón «Ver Perú completo». El selector compartido es la única forma de cambiar país/departamento. «Encuadrar» vuelve al ámbito seleccionado; mes, sensor y zoom no disparan otro encuadre automático.

## Implementación y rendimiento

`departmentCells.ts` prepara geometrías de presentación sin modificar archivos. `territorialClip.ts` triangula la referencia con `earcut` (3.2.4, ya presente con MapLibre y declarado ahora como dependencia directa), respetando huecos y componentes. Un índice espacial de 0,25 grados descarta triángulos lejanos; la intersección convexa usa Sutherland–Hodgman. Los resultados por geometría/departamento se reutilizan mediante WeakMap. Solo se descarga el catálogo territorial compartido, nunca un nuevo GeoJSON por cambio de departamento.

En zoom lejano se dibujan cuadrados de localización como rellenos recortados contra el mismo territorio. Su tamaño se prepara en píxeles mediante coordenadas Web Mercator y se actualiza al terminar el zoom. Por ello puede variar durante el gesto, antes de estabilizarse. En zoom 9 se sustituyen de forma excluyente por los fragmentos de las celdas. Se conserva el inspector por identificador y valor original. Los fragmentos triangulados se dibujan sin líneas internas; queda un único límite territorial fino. PE, piloto y DEMO conservan sus cuadrados SDF y polígonos anteriores.

Los colores/percentiles describen las celdas visibles para el período/sensor; no son una escala de contribuciones departamentales. Los cuadrados son símbolos ampliados de localización, no superficie ocupada. Los textos de ayuda, resumen e inspector aclaran que una celda de 10 km puede contener observaciones de territorios vecinos y que su valor no es proporcional al fragmento visible. B1 nunca se aplica por celda.

## Referencia y reproducibilidad

## Fuente y derivación reproducible

- Original: `docs/region/departamentos_inei_2023.geojson`, recuperado sin cambios de `origin/feature/calibracion`, commit `78f2ca71e59dd41b03f5557e6063e7fa42bcb4ca`.
- Atribución del original: INEI, IDE (`ide.inei.gob.pe/files/Departamento.rar`), capa Departamental actualizada al 2023. Contiene 25 geometrías identificadas por `region_id` PE-01 a PE-25.
- Original: 14 210 051 bytes; SHA-256 `06cfcdd4e1a5a7747c30fc23a8ddb51f7ca166fd66e9b1bc04f87d57b1279c7d`.
- Derivado: `frontend/public/cartography/departamentos_inei_2023.navigation.geojson`, 1 681 124 bytes (88% menos); gzip local: 515 285 bytes.
- SHA-256 del derivado: `8a35a0ae878ba16c0bdef13ebb85a776fded00e9e456c9139ffc99e6de7c6bff`.

Desde la raíz, con las dependencias científicas existentes instaladas (Shapely, pyproj y NumPy):

```powershell
.venv\Scripts\python.exe scripts/prepare_department_navigation.py
```

El script proyecta WGS84 a EPSG:6933, simplifica con tolerancia de 100 metros preservando la topología de cada geometría y regresa a WGS84. Normaliza la orientación de anillos y valida todas las geometrías antes de publicar. Conserva la precisión de las coordenadas resultantes y los límites de encuadre exactos del original. Incluye hash de origen, tolerancia y `purpose: navigation_only`, sin magnitudes de observaciones.

Es una referencia visual simplificada, sin validez para asignar contribuciones. Simplificar cada departamento tampoco garantiza una cobertura analítica conjunta sin pequeñas diferencias entre bordes vecinos. El original queda fuera de `public/` y no se descarga desde la aplicación.

## Futura desagregación: decisión del equipo Datos

Para mostrar contribuciones exclusivas por departamento se requiere un producto aprobado que atribuya observaciones originales antes de agregarlas, con:

- Regla territorial, versión de límites y tratamiento de celdas fronterizas, costa y puntos sobre límites.
- Aportes por `region_id`, celda, año, mes y sensor, unidad, cobertura, estados de calidad, procedencia y geometría/identificador estable.
- Trazabilidad a unidades originales de 1 km y pares celda-día. Si se conserva la malla de 10 km, sus aportes departamentales deben publicarse explícitamente y reconciliarse con el total nacional sin doble conteo.
- Contrato, validación y pruebas de reconciliación con indicadores departamentales, incluyendo ceros y faltantes.

Una intersección visual, centroide o fracción de área no permiten inferir esos aportes. Esta implementación no los calcula; el equipo de Datos debe definir y aprobar el producto.

## Despliegue

Recurso estático Vite, sin nuevas dependencias frontend ni backend. Servir `/cartography/` como GeoJSON con compresión HTTP y 404 para archivos inexistentes; ver `DESPLIEGUE_COMPRESION.md`. El tamaño gzip es una medición local; la configuración y los encabezados del servidor personal siguen pendientes de verificación.

## Verificación de esta corrección

Suite frontend: 170/170 aprobadas; lint y build correctos. Las seis pruebas territoriales se repitieron tras ampliar la comprobación de Ucayali en cambios de año, mes, sensor, zoom y modalidad anual. Se verifican PE, Callao, Ucayali, Loreto, propiedades originales, caché, ausencia del botón eliminado y recortes con huecos/concavidad/componentes separados. Las suites existentes conservan hashes de los productos científicos, piloto y DEMO. Persiste el aviso de tamaño del chunk MapLibre. No hubo revisión visual ni uso de navegador/Computer Use; no se realizaron commits ni pushes.
