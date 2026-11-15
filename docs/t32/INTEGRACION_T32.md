# L5/T32 — Integración científica para revisión T35

## Resultado

Integración implementada en `integration/t32-scientific-data`, desde el frontend limpio
y sincronizado `c52d694ca527663587ab81c0e9bdaa5e70f6f17c`. Se hizo fetch de origin antes
de comparar. No se fusionaron ramas a ciegas ni se hicieron commits, push o PR.

Fuente científica actual: `origin/feature/calibracion`,
`d27e6ebeb12b9afbeb152e69fc7f9c24bd8e3465`. Se consultaron contrato, PRECHECK T35,
T29 y la reproducción T38 actuales antes de editar.

Se importaron 49 archivos publicados, documentos, scripts, pruebas y configuración
**idénticos byte a byte al commit científico**. Incluyen 18 archivos enumerados y
hasheados en el manifiesto (14 GeoJSON, dos CSV, method y validation), más el propio
manifest. `PROCEDENCIA_T32.json` identifica todos los archivos importados, commit y
SHA-256; `.gitattributes` conserva LF para no romper los hashes al trabajar en Windows.
No se copiaron zips crudos, datos intermedios, entornos virtuales ni cachés.

## Arquitectura y problemas corregidos

Se mantienen App, navegación, contexto compartido, componentes, cartografía,
controles y estilos existentes. No se agregan dependencias al frontend.

- L3 usa el contrato vigente: `sensor_group`, `cell_days`, `status=ok|missing`;
  el CSV mensual tiene ocho columnas. Se rechazan números inválidos/negativos,
  conteos regionales decimales, duplicados y discrepancias estado/null.
  Se conservan fechas y versiones literales de FIRMS. GeoJSON valida WGS84,
  geometría cerrada y propiedades; rechaza el miembro `crs` (RFC 7946).
- Calendario carga monthly y calibrated con los loaders existentes, cancelación,
  errores y reintento. Años 2013–2026 y doce meses por año; después de julio de 2026,
  sin registros, el estado es ausente. Escala automática sobre ambas series de la
  región, máximo configurable y leyenda numérica; solo se satura el color.
  El detalle muestra observación y procedencia, más B0/B1, split, status y residual
  recibidos para ese mes. No se recalibra ningún valor.
- Mapa conserva MapLibre y el trabajo de Juan. Selecciona solo archivos anuales
  listados en manifest y filtra mes/sensor localmente. Leyenda, percentiles, popup,
  resumen e inspector leen días-celda observados, sin B1 por celda.
- Método muestra validación exclusivamente desde `method.resultados.valid`
  y test desde `validation.json`, en secciones separadas y en la tabla de
  disponibilidad. No se sustituye el test preciso por el resumen redondeado de
  method. WAPE recibido permanece como proporción; la presentación multiplica por
  100 y añade %. MAE y sesgo se identifican en días-celda. κ se lee del archivo.
- Producción usa `/data/`; `?data=demo` activa fixtures explícitos para cualquiera
  de las vistas. `?demo=1` mantiene el inspector L3. Un error HTTP/validación
  no carga DEMO. Los avisos y sufijos DEMO aparecen solo en ese modo.
- CSV exporta las ocho columnas vigentes, filas de la región/sensor seleccionado,
  todos los años cargados, en orden. Seleccionar un mes es detalle, no filtro.
  Conserva cero, null vacío, estados y fechas; sin filas sintéticas ni B0/B1 mezclado.
  Sigue usando Blob/BOM/CRLF, escape, protección de fórmulas y liberación de URL.
- CI ejecuta `python -m pytest tests/ -q` con `requirements.txt` de la raíz.
  Se importaron scripts/tests científicos sin modificarlos. La ausencia de tests
  falla; no se busca backend/tests ni se omiten pruebas silenciosamente.
  El job frontend exige tests, lint y build. Se mantiene comprobación de sintaxis
  del backend; no se ejecuta el pipeline ni se generan resultados científicos.
- Los fixtures DEMO se migraron al esquema nuevo y se recalcularon **solo sus**
  hashes. Las antiguas detecciones sintéticas se sustituyen por los días-celda
  sintéticos correspondientes: no se trasladan como si fueran la misma magnitud.

## Resultados verificados

| Comprobación | Resultado real |
|---|---|
| Serie mensual | 326 filas: 163 meses × 2 sensores, 2013-01 a 2026-07 |
| Serie calibrada | 326 filas, valores/splits/residuales conservados |
| Septiembre 2024 MODIS | 2323 días-celda |
| Septiembre 2024 VIIRS | 5581 días-celda |
| B1 test MAE | 29.676091927631973 días-celda |
| B1 test WAPE | 0.30828088935210907 = 30.828088935210907% (UI 30.8%) |
| B1 validación WAPE | 0.178 = 17.8% |
| κ | 0.2936037257560573 |
| Ceros mensuales reales | 5, todos status=ok |
| Missing dentro de la entrega | 0 filas; missing/null se prueba con fixtures explícitos |
| Meses fuera de la entrega | Ausentes; no se convierten a cero ni DEMO |
| Archivos anuales | 2013–2026, todos validados |
| Consistencia mapa/serie | Sumas observadas por año/mes/sensor coinciden con monthly |
| Integridad | 18/18 hashes del manifest coinciden; 49/49 importaciones idénticas |

### Comandos ejecutados

- `npm.cmd test --prefix frontend`: **91 passed, 0 failed, 0 skipped**.
  Incluye pruebas anteriores migradas al contrato vigente y nuevas pruebas de
  loaders reales, hashes, coherencia anual GeoJSON/serie, valores científicos,
  vistas reales, escala configurable/saturación, selección, CSV, fuente por defecto,
  error sin fallback y DEMO explícito.
- `npm.cmd run lint --prefix frontend`: correcto.
- `npm.cmd run build --prefix frontend`: correcto (TypeScript y Vite).
  Advertencia de chunk MapLibre de ~1.1 MB; sigue cargándose bajo demanda.
- `.venv/Scripts/python.exe -m pytest tests/ -q`: **77 passed**, una advertencia
  de deprecación de Timedelta/NumPy en `scripts/02_normalize.py:37`.
- `.venv/Scripts/python.exe -m compileall -q backend/app`: correcto.
- `git diff --check`: correcto.
- Entorno Python local: 3.14.6; pandas 2.3.3, numpy 2.5.4,
  pytest 8.4.2, pyarrow 26.0.1, pyproj 3.8.0, shapely 2.2.0.
  Las dependencias se instalaron en .venv ignorado; CI configura Python 3.12.
  No se ha ejecutado GitHub Actions remoto (sin push/PR).

### HTTP y revisión visual

Se sirvió el build con:

```sh
npm.cmd run preview --prefix frontend -- --host 127.0.0.1 --port 4175 --strictPort
```

HTTP 200 en raíz, `?view=map`, `?view=method`, manifest y sus 18 archivos.
Los bytes descargados de esos 18 archivos conservan los SHA-256 del manifiesto.
Worker y cartografía cargaron en la revisión visual de Opera.

Revisión visual mediante computer-use en Opera: Calendario con PE-UCA, 163 registros
por sensor, escala 5581 y ceros visibles; Método con fuentes reales, κ, limitaciones
y secciones separadas; Mapa anual 2024 con cartografía satelital y celdas reales
del contexto de septiembre de 2024. No aparecieron avisos DEMO.
La descarga se comprobó por Blob y contenido en jsdom, no como archivo guardado
manualmente por Opera. No se hizo una auditoría visual exhaustiva de móvil.

## Ejecución reproducible

1. Desde la raíz: instalar las dependencias científicas de requirements.txt en un
   entorno virtual y ejecutar `python -m pytest tests/ -q`.
2. Desde frontend: Node.js 24, `npm ci`, `npm test`, `npm run lint`,
   `npm run build` y `npm run dev` (en PowerShell puede requerirse npm.cmd).
3. Abrir `http://127.0.0.1:5173/`. Septiembre de 2024:
   `/?periodYear=2024&periodMonth=9`; cambiar MODIS/VIIRS o navegar al Mapa
   conserva contexto. Método: `/?view=method`.
4. DEMO explícito: `/?data=demo`, `/?data=demo&view=map`,
   `/?data=demo&view=method` o inspector `/?demo=1`.
5. Verificar procedencia contra los hashes de PROCEDENCIA_T32.json y manifest.
   Si se actualiza la rama científica, revisar primero el contrato, volver a
   importar únicamente entregables aprobados y ejecutar las comprobaciones.
   No regenerar ciencia durante una integración de frontend.

Vercel mantiene raíz frontend, salida dist y build existente. No requiere claves,
servicios nuevos ni backend para estos datos estáticos. Los fondos/overlays del
mapa mantienen sus conexiones externas y requieren internet.

## Incompatibilidades y limitaciones pendientes

No hay incompatibilidades funcionales bloqueantes con los archivos actuales.

- Se detecta una diferencia documental histórica: T38 cita para method.json
  `46f13e6b…`, mientras el manifest y el commit científico actual contienen
  `3a4f977b…`. Se usa el archivo actual y su hash verificado; no se cambia T38.
  Los hashes CRLF históricos de T29 también difieren de los blobs LF; T38 ya
  explica esa diferencia. Los resultados y factores no se alteraron.
- El encabezado del contrato aún dice v0/borrador, aunque T27/T29 declaran
  aprobación científica. Se conserva literalmente; Aldo debe decidir su rotulado.
- La integración verifica la entrega y sus pruebas; no repite el pipeline completo
  desde los zips originales ni sustituye una evaluación científica independiente.
- Los 14 GeoJSON suman alrededor de 35 MB y se valida un archivo anual en el hilo
  principal al abrir/cambiar año. No se añadió worker de datos ni simplificación.
  Medir en dispositivos modestos durante T35 antes de decidir optimizaciones.
- Una sola región por manifest; no hay observaciones después de 2026-07.
  Las limitaciones de VIIRS, cambios de colección, nubosidad y κ global siguen
  expuestas desde method.json. Hotspots no equivalen a incendios confirmados.
- B0/B1 se presentan en detalle regional; la cuadrícula sigue siendo observada.
  La descarga corresponde a esa cuadrícula observada.
- No se ejecutó CI remoto ni despliegue en Vercel; se comprobó el build local.
  Permanecen la advertencia de bundle y la deprecación científica citadas.

## Estado para T35

**Lista para revisión técnica T35 del equipo**, con las limitaciones anteriores.
Esto no constituye aprobación científica ni de despliegue.
Aldo/Antonella deben confirmar la trazabilidad y los resultados preservados;
Juan, la leyenda/unidad y la experiencia del mapa con el archivo real;
Landry, el recorrido visual y la preview de despliegue. No requiere cambiar
metodología, factores, fuentes ni el contrato para revisar la versión actual.

## Archivos modificados o creados

### Adaptación e informe

- `.github/workflows/ci.yml`
- `.gitignore`
- `README.md`
- `docs/t32/INTEGRACION_T32.md`
- `docs/t32/PROCEDENCIA_T32.json`
- `frontend/README.md`
- `frontend/public/data/demo/calibrated_series.csv`
- `frontend/public/data/demo/cells_PE-DEMO_2024.geojson`
- `frontend/public/data/demo/manifest.json`
- `frontend/public/data/demo/monthly_series.csv`
- `frontend/src/App.tsx`
- `frontend/src/components/DemoDataCheck.tsx`
- `frontend/src/components/calendar/CalendarDetail.tsx`
- `frontend/src/components/calendar/CalendarGrid.tsx`
- `frontend/src/components/calendar/CalendarPage.tsx`
- `frontend/src/components/calendar/HistoricalCalendar.tsx`
- `frontend/src/components/calendar/calendar.css`
- `frontend/src/components/map/FireMapTest.tsx`
- `frontend/src/components/map/MapPage.tsx`
- `frontend/src/components/map/juanLayers.ts`
- `frontend/src/components/method/MethodComparison.tsx`
- `frontend/src/components/method/MethodExplanation.tsx`
- `frontend/src/components/method/MethodMetrics.tsx`
- `frontend/src/components/method/MethodPage.tsx`
- `frontend/src/services/data/calendar.ts`
- `frontend/src/services/data/csvExport.ts`
- `frontend/src/services/data/map.ts`
- `frontend/src/services/data/validators.ts`
- `frontend/src/types/data.ts`
- `frontend/tests/calendar-ui.test.ts`
- `frontend/tests/calendar.test.ts`
- `frontend/tests/csv-export.test.ts`
- `frontend/tests/data.test.ts`
- `frontend/tests/map-ui.test.ts`
- `frontend/tests/map.test.ts`
- `frontend/tests/method-ui.test.ts`
- `frontend/tests/scientific.test.ts`

### Importados sin modificación desde la rama científica

- `.gitattributes`
- `DECISIONS.md`
- `docs/REVISION_T27.md`
- `docs/contrato_datos.md`
- `docs/datos.md`
- `docs/region/ucayali_inei_2023.geojson`
- `docs/t29/AUTORIZACION_T29.md`
- `docs/t29/RESULTADO_T29.md`
- `docs/t35/PRECHECK_T35.md`
- `docs/t38/REPRODUCCION_T38.md`
- `frontend/public/data/calibrated_series.csv`
- `frontend/public/data/cells_PE-UCA_2013.geojson`
- `frontend/public/data/cells_PE-UCA_2014.geojson`
- `frontend/public/data/cells_PE-UCA_2015.geojson`
- `frontend/public/data/cells_PE-UCA_2016.geojson`
- `frontend/public/data/cells_PE-UCA_2017.geojson`
- `frontend/public/data/cells_PE-UCA_2018.geojson`
- `frontend/public/data/cells_PE-UCA_2019.geojson`
- `frontend/public/data/cells_PE-UCA_2020.geojson`
- `frontend/public/data/cells_PE-UCA_2021.geojson`
- `frontend/public/data/cells_PE-UCA_2022.geojson`
- `frontend/public/data/cells_PE-UCA_2023.geojson`
- `frontend/public/data/cells_PE-UCA_2024.geojson`
- `frontend/public/data/cells_PE-UCA_2025.geojson`
- `frontend/public/data/cells_PE-UCA_2026.geojson`
- `frontend/public/data/manifest.json`
- `frontend/public/data/method.json`
- `frontend/public/data/monthly_series.csv`
- `frontend/public/data/validation.json`
- `pytest.ini`
- `requirements.txt`
- `scripts/01_download.py`
- `scripts/02_normalize.py`
- `scripts/03_grid_dedupe.py`
- `scripts/04_monthly_series.py`
- `scripts/05_geojson_export.py`
- `scripts/06_calibrate.py`
- `scripts/07_metrics_export.py`
- `scripts/08_manifest.py`
- `scripts/README.md`
- `scripts/__init__.py`
- `tests/__init__.py`
- `tests/test_calibrate.py`
- `tests/test_geojson_export.py`
- `tests/test_grid_dedupe.py`
- `tests/test_manifest_download.py`
- `tests/test_metrics.py`
- `tests/test_monthly_series.py`
- `tests/test_normalize.py`
