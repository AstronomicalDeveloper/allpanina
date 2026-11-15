# AllpaNina frontend

## Wireframes: etapa 1, estructura global y navegación

Implementada sobre `feat/frontend-calendar`, conservando los cambios UX-04 existentes.
Referencias locales: las cuatro páginas (texto e imágenes) de `docs/Alpanina.pdf`
y las decisiones definitivas de `docs/AllpaNina_Decisiones_UI_UX_para_Codex.md`.
Se aplicó la skill local `frontend-design`: composición marca / navegación / menú,
verde bosque y marfil con acento cálido para la vista activa, sin fuentes remotas
ni nuevas dependencias de aplicación.

- Cabecera global sólida en Calendario/Método y translúcida, con fondo oscuro de
  respaldo y desenfoque cuando se soporte, superpuesta a MapLibre en Mapa.
- Navegación directa Calendario / Mapa / Método también en móvil; enlaces reales,
  parámetros, historial, modalidades compartidas y sensores independientes intactos.
- Hamburguesa reservada a Acerca de / Fuentes mediante `details/summary` nativo;
  Escape cierra y devuelve foco, pulsar fuera o navegar también cierra. No hay
  páginas ficticias ni roles ARIA de menú o pestañas para los enlaces.
- Región, período publicado y procedencia siguen viniendo de los metadatos reales.
  El modo DEMO explícito también se identifica en la cabecera común.
- En Mapa, la cartografía abre el contenido; los controles de archivo y contexto
  existentes quedan debajo. La cabecera local del mapa se conserva solo en pantalla
  completa. `ResizeObserver` mide la cabecera global y deja espacio a los controles;
  hay valores de respaldo CSS, y el observador se libera al desmontar.
- Los cambios de `FireMapTest` se limitan al alojamiento de la cabecera y el espacio
  del lienzo/controles. La reorganización de paneles y del panel inferior se reserva
  para la etapa 3. Calendario y Método no recibieron nuevos rediseños en esta etapa.

Verificación de esta etapa: **113 pruebas frontend aprobadas, cero fallos y omitidas**,
lint y build correctos. Se añadieron dos casos de menú/medición y se ampliaron las
pruebas existentes de navegación, contraste y transición al Mapa. Se conserva la
advertencia de tamaño de MapLibre. Comandos desde la raíz:
`npm.cmd test --prefix frontend`, `npm.cmd run lint --prefix frontend` y
`npm.cmd run build --prefix frontend`.

No se utilizó Computer Use, navegador, capturas ni revisión visual manual de la
aplicación. La revisión de distribución, responsive y acabado queda para Landry.
No se avanzó a las etapas 2–4 ni se hicieron commits, pushes o PR.

## UX-04: rediseño visual del Calendario

Implementado en `feat/frontend-calendar`. Esta sección actualiza la presentación
del Calendario; la modalidad compartida y la navegación descritas abajo se conservan.

- Controles compactos de serie/CSV, modalidad y período. La región solo requiere
  selector cuando existen varias; su contexto permanece en la cabecera global.
- Cuadrícula anual: seis columnas desde 75 rem, cuatro en tamaños intermedios y
  tres hasta 40 rem. Detalle lateral por encima de 68 rem y debajo en tamaños menores.
- Escala secuencial marfil/naranja, compartida con la leyenda numérica y configurable
  sin alterar valores. Cero, faltante y no publicado tienen texto y apariencia propia;
  la selección usa contorno e indicador. Contraste calculado mínimo de texto sobre
  la escala: 5,47:1, muestreando 1001 intensidades.
- Mensual destaca el valor observado; B0/B1, split y residual se presentan como
  estimaciones independientes. Todos los metadatos originales siguen disponibles
  en «Estado y procedencia», junto al archivo de observaciones.
- Comparación histórica conserva la matriz y su desplazamiento interno, con
  encabezados de meses y años fijos. CSV y selección compartida permanecen intactos.

Verificación: **111 pruebas frontend aprobadas**, lint y build correctos mediante
`npm.cmd test --prefix frontend`, `npm.cmd run lint --prefix frontend` y
`npm.cmd run build --prefix frontend`. Persiste la advertencia de tamaño del chunk
MapLibre. No se usaron navegadores, capturas ni pruebas manuales responsive;
la revisión visual corresponde a la responsable del frontend.

Ejecución desde la raíz: `npm.cmd run dev --prefix frontend` y abrir
`http://localhost:5173/?view=calendar` para los datos reales predeterminados.

## Corrección responsive y modalidad compartida (vigente)

Esta sección sustituye la modalidad exclusiva del Mapa documentada en fases anteriores.
Implementación en `integration/t32-scientific-data`, conservando T32 y UX-01/02/03.

### Estado y navegación

`App` mantiene una sola modalidad `ExplorationSelection.scope = year|month`,
compartida con ambas vistas; región/año/mes son comunes y `calendarSeries` y
`mapSensor` conservan la independencia de UX-03. Método no recibe estos filtros.
Los selectores accesibles del Calendario y del Mapa actualizan ese mismo estado;
navegar no restablece la modalidad.

URL canónica: `scope=year|month`. Se acepta `mapScope` de enlaces previos y se
escriben ambos como alias coherentes. Si hay conflicto, un `scope` válido tiene
prioridad; sin selección explícita se usa Anual. Se conservan sensores, período,
modo de datos y hash en enlaces, copia y atrás/adelante. La única transición que
establece Mensual explícitamente es «Ver este período en el mapa» desde un mes.

Sin período explícito, Calendario resuelve el último período utilizable de las
filas publicadas (actualmente julio de 2026), nunca el mes del reloj. Mapa utiliza
el último año disponible y el último mes utilizable publicado cuando faltan esos
parámetros. Al elegir año/mes se conserva el período común entre perspectivas.

### Calendario

- **Anual:** doce meses del año seleccionado; navegación anterior/siguiente y
  selector de año; serie MODIS/VIIRS. Móvil: tres columnas por cuatro filas.
  A 768 px: cuatro por tres; escritorio amplio: seis por dos y detalle lateral.
- **Mensual:** un único mes, selector y navegación al mes anterior/siguiente,
  incluido el paso diciembre/enero. Conserva valor, estado, procedencia, B0/B1
  disponibles y enlace al mismo período en Mapa. No se implementó una nueva serie
  estimada ni se recalcula calibración.
- **Comparar años:** opción local adicional, disponible en ambos tamaños y desde
  ambas modalidades. Recupera la matriz años × doce meses con scroll horizontal
  interno y columna de años fija. Conserva la selección; abrir/cerrar no cambia
  la modalidad común. Se vuelve a la cuadrícula anual o al mes según el modo vigente.
- Se reutiliza el mismo botón/escala/estado para tarjetas y matriz. Cero válido,
  missing y ausente siguen separados, sin rellenar períodos con valores.
- Leyenda compacta con dominio numérico y escala configurable desplegable. No
  hay un límite científico fijo 0–31. La fuente técnica está en un desplegable;
  el mensaje principal conserva unidades y la advertencia sobre incendios.
- El detalle queda debajo en móvil/tableta y al lado en escritorio. El enlace
  al Mapa se adelantó a los metadatos y tiene subrayado y objetivo de 44 px.
- CSV mantiene todos los registros cargados de región/serie, sin introducir un
  filtro nuevo por año/mes/modo o comparación. Datos y serializador intactos.

### Mapa y correcciones táctiles

Se conservan agregación anual, cobertura, inspector/desglose, percentiles por modo,
popups seguros, fondos, overlays, opacidad, fullscreen y limpieza de recursos.
El modo que se elige en Mapa también se refleja al volver al Calendario.

La barra inferior móvil tiene dos columnas y botones/selector de al menos 44 px;
la selección de celda ocupa una fila propia. El panel desplaza su contenido sin
quedar bajo esa barra. La línea de coordenadas/período permite envolver texto
dentro del mapa, y los mensajes/atribución se sitúan sobre la barra.

### Verificaciones ejecutadas

- **111 pruebas frontend aprobadas, 0 fallos y 0 omitidas**: 108 previas adaptadas
  únicamente donde el diseño anual/mensual cambió sus expectativas, y tres casos
  nuevos de cuadrícula anual, navegación mensual y modalidad común con historial.
- Cubren fuentes y hashes reales T32, estados ok/missing/cero/ausente, CSV, Mapa y
  Método; precedencia de scope/mapScope, enlaces contextuales, copia, sensores
  independientes, comparación local y restauración atrás/adelante.
- `npm.cmd run lint --prefix frontend`: correcto.
- `npm.cmd run build --prefix frontend`: correcto. Sigue la advertencia previa de
  tamaño del chunk MapLibre (~1.1 MB).
- No se alteraron archivos científicos, contratos, scripts ni hashes; no se
  incorporaron dependencias ni se hicieron commits, push o PR.

### Revisión visual realmente realizada

Computer-use sobre Opera, build local servido en `http://127.0.0.1:4175/`,
con datos reales de `/data/` y emulación responsive del navegador:

| Tamaño | Observación |
|---|---|
| 320 px | Doce meses 3×4; cero y ausentes legibles; leyenda compacta y detalle debajo. |
| 360 px | Tres columnas, leyenda y detalle ajustados sin corte lateral. |
| 390 px | Anual y mensual, controles táctiles, comparación y Mapa. |
| 768 px | Cuadrícula 4×3; detalle debajo, navegación y Método ajustados. |
| Escritorio >1280 px | Cuadrícula 6×2, detalle lateral y enlace contextual visible. |

Recorridos comprobados:
1. Calendario móvil inicial con doce meses y sin matriz histórica.
2. Cambio a Mensual, mes seleccionado y botones anterior/siguiente presentes.
3. Navegación al Mapa conservando Mensual y el período.
4. Cambio a Anual desde Mapa y retorno al Calendario en Anual.
5. Apertura y cierre de Comparar años; desplazamiento horizontal interno,
   permaneciendo visible la columna de años y el resto de la página estable.
6. Elección de 2024 y septiembre (MODIS **2323**); enlace al Mapa en Mensual,
   conservando septiembre de 2024.
7. Cambio de sensor geográfico a VIIRS y retorno al Calendario: continúa MODIS.
8. Atrás/adelante reales con el teclado del navegador, conservando vista/modo/período.
9. Tres vistas; menú de fuentes abierto en móvil, enlaces de metadatos legibles;
   Tab y Shift+Tab con foco visible y cierre del desplegable con Enter.
10. Mapa con imagen satelital y observaciones reales; mostrar/ocultar controles,
    desplazar el panel y cambiar sensor; barra inferior corregida y recomprobada.

Las comprobaciones pertenecen a estos recorridos, no a una auditoría integral ni
a una certificación de accesibilidad. La revisión usa emulación de anchos, no
dispositivos físicos. No hay bloqueos conocidos en los recorridos comprobados;
permanecen las limitaciones científicas y la advertencia de bundle ya documentadas.

### Archivos modificados en esta corrección

No se crearon archivos nuevos. Se editaron:
`src/App.tsx`, `src/types/selection.ts`,
`src/components/calendar/HistoricalCalendar.tsx`, `CalendarGrid.tsx`,
`CalendarPage.tsx`, `CalendarDetail.tsx`, `calendar.css`,
`src/components/map/MapPage.tsx`, `FireMapTest.tsx`, `map.css`,
`tests/calendar-ui.test.ts`, `tests/map-ui.test.ts`,
`tests/method-ui.test.ts`, `tests/scientific.test.ts` y este README.
Se conservaron los cambios pendientes de las tareas previas.

## Exploración geográfica anual y mensual

Implementada sobre T32 y UX-01/02/03 en `integration/t32-scientific-data`.
No se rediseñan el mapa ni los controles originales, ni se implementa UX-04.

### Uso y navegación

- `?view=map` abre **Año completo** por defecto. URL explícita: `mapScope=year`.
- **Mes específico** usa `mapScope=month` y conserva año/mes/sensor. Cambiar de
  modalidad no borra el mes compartido ni cambia la serie del Calendario.
- Desde el detalle del Calendario, **Ver este período en el mapa** abre mensual
  con ese año, mes y sensor observado. Es un enlace real, compatible con clic
  modificado; la navegación principal conserva cualquier modalidad explícita previa.
- `Copiar enlace`, parámetros de UX-03 y atrás/adelante incluyen/restauran modalidad,
  ambas selecciones independientes y período. Los enlaces anteriores sin mapScope
  abren anual, según la nueva regla; su mes sigue disponible al elegir mensual.
- El selector de modalidad también está disponible en los controles de pantalla
  completa. Calendario, Método y exportación CSV mantienen su comportamiento.

### Datos, cobertura y representación

`MapPage` reutiliza el archivo anual y carga `monthly_series.csv` con el loader
existente. `buildMapYear` crea una proyección de interfaz en una pasada: agrupa por
celda/sensor del año, suma exclusivamente cell_days observados y conserva la
geometría original. No mezcla regiones, recalibra, predice ni escribe archivos.
No aplica B1. Los campos mensuales oficiales no se modifican; los totales son
valores derivados de visualización, no un nuevo formato de intercambio científico.

La cobertura se obtiene de las filas de región/año/sensor de monthly_series:
`ok` es mes publicado utilizable, `missing` es sin dato utilizable y una fila ausente
es período no publicado. El año se rotula completo solo con doce meses utilizables;
en otro caso se listan meses disponibles, faltantes y no publicados. En 2026 se
representan enero–julio, **7/12**, no un año completo. Esta disponibilidad no certifica
observación continua, ausencia de nubes ni inexistencia de incendios.

Antes de interpretar una ausencia de actividad de celda como cero registrado en un
mes `ok`, se verifica que la suma geográfica por mes/sensor coincida con monthly_series.
Esto utiliza la naturaleza dispersa del exportador científico (solo celdas con
registros de detección). Nunca se rellenan con cero meses `missing`, ausentes o de
cobertura desconocida. Un año con meses utilizables y ninguna detección informa cero
registrado en esos meses sin fabricar polígonos nuevos.

Duplicados (año/mes/sensor/celda), geometrías distintas para el mismo cell_id y
sumas inconsistentes generan errores visibles; no se suman o fusionan silenciosamente.
La comparación de geometría es conservadora, por representación exacta: un anillo
geométricamente equivalente pero reordenado puede requerir revisión del equipo Datos.

Anual recalcula percentiles sobre los totales anuales por celda; mensual sobre los
valores del mes. La leyenda declara magnitud y modalidad, sin compartir cortes entre
ambas. Se mantienen colores y opacidad de Juan.

El inspector anual muestra identificador, sensor, año, total, meses utilizables del
conjunto y doce filas de desglose con barras proporcionales, números y estados
textuales accesibles. El mensual conserva su inspector original y popup seguro.
La cuenta de meses no se deduce de los meses donde una celda tuvo actividad.

### Rendimiento y funciones conservadas

La agrupación y cobertura se memorizan por archivo/año; cambiar mes, sensor o
modalidad no vuelve a descargar el GeoJSON ni crea otro runtime MapLibre. Los
resultados derivados y percentiles se memorizan; el cursor usa un índice por cell_id
en lugar de recorrer todas las celdas para resolver hover/clic. No hay dependencias,
workers nuevos, modificación de fuentes cartográficas ni arquitectura adicional.

Se conservan los cuatro fondos, overlays, zoom, navegación, controles, selección con
clic/teclado, popups de texto, inspector, percentiles, opacidad, pantalla completa,
estados de carga/error y limpieza de recursos. Las dimensiones y el diseño final
siguen reservados para las fases UX correspondientes.

### Verificación y límites

- **108 pruebas frontend aprobadas, 0 fallos, 0 omitidas** (99 anteriores y nueve
  pruebas adicionales; escenarios mensuales existentes ahora especifican su modalidad).
- Validación de los seis formatos y hashes publicados; coherencia anual/mensual de
  los **14 GeoJSON reales**, cobertura de 2026, separación de sensores, duplicados,
  geometrías, cero/faltante/no publicado, inspector, barras, modalidad, contexto desde
  Calendario, copia/recarga de enlaces, historial, Método y CSV.
- Pruebas de reutilización: un solo archivo GeoJSON y runtime al cambiar modalidad/mes.
- `npm.cmd run lint --prefix frontend`: correcto.
- `npm.cmd run build --prefix frontend`: correcto. Permanece la advertencia previa
  de tamaño del chunk MapLibre (~1.1 MB).
- No se utilizaron navegador, Computer Use, capturas ni revisión responsive manual.
  La revisión visual corresponde a Landry; no se realizó una auditoría integral.

La cobertura requiere el CSV mensual válido; si no está disponible se muestra error
con reintento. La validación/agregación inicial continúa en el hilo principal; no se
ha hecho un benchmark en dispositivos modestos. No hay bloqueos conocidos con la
entrega T32 actual. Los archivos científicos y algoritmos permanecen intactos.
Sin commits, push ni PR.

### Archivos de esta tarea

- `src/services/data/mapExploration.ts` (nuevo): proyección anual y cobertura.
- `src/components/map/AnnualCellDetail.tsx` (nuevo): desglose y barras.
- `tests/map-exploration.test.ts` (nuevo): agregación, cobertura e inconsistencias.
- `src/services/data/map.ts`: popup anual/mensual seguro.
- `src/components/map/MapPage.tsx`: carga de cobertura, modo y errores derivados.
- `src/components/map/FireMapTest.tsx`: modalidades, inspector, percentiles e índice.
- `src/components/map/mapConstruction.ts`: tipo de la fuente renderizada; estilo intacto.
- `src/components/map/map.css`: barras del desglose.
- `src/types/selection.ts`, `src/App.tsx`: modalidad en estado, URL y navegación.
- `src/components/calendar/CalendarPage.tsx`, `HistoricalCalendar.tsx` y
  `CalendarDetail.tsx`: enlace contextual mensual y props.
- `tests/map-ui.test.ts`, `tests/scientific.test.ts`: regresiones y datos reales.
- Este README. Se preservaron los cambios previos de UX-01/02/03.

## UX-03 — Selecciones independientes y período compartido

Implementado sobre UX-01/02 y T32 en `integration/t32-scientific-data`.
`App` mantiene un único `ExplorationSelection`: región, año y mes comunes,
`calendarSeries` y `mapSensor` independientes. Las vistas reciben proyecciones
mediante `CalendarSelection` y `MapSelection`, sin duplicar el período en dos estados.

- Calendario → Mapa conserva el período y copia al Mapa la serie observada MODIS/VIIRS.
  El guard de sensores observados evita transferir futuras series no observadas;
  no se añadió una serie estimada ni se implementó UX-07.
- Cambiar sensor en Mapa no modifica la serie del Calendario. Al volver, Calendario
  mantiene su serie anterior y muestra el período compartido actualizado.
- Método no recibe filtros de exploración ni cambia sus métricas. Al volver desde
  Método al Mapa se mantiene el sensor observado previo del Mapa.
- URL: se mantienen `view`, `mapRegion`, `periodYear`, `periodMonth`, modo de datos
  y hash. Se añaden `calendarSeries=MODIS|VIIRS` y `mapSensor=MODIS|VIIRS`.
  Los enlaces antiguos con solo `sensor` inicializan ambas selecciones con ese valor;
  los parámetros nuevos válidos tienen prioridad. Se conserva `sensor` para clientes
  anteriores y al copiar enlaces del Mapa representa su sensor observado.
- Cambiar filtros reemplaza la entrada actual del historial; navegar entre vistas
  añade una entrada con ambas selecciones. `popstate` restaura los valores de esa
  URL sin repetir la transferencia Calendario → Mapa. Los enlaces modificados
  conservan el comportamiento nativo del navegador.
- El CSV continúa exportando todos los registros de región/serie del Calendario:
  el mes seleccionado no limita la descarga y el sensor del Mapa no la cambia.

Ejemplo compartible:
`/?view=map&mapRegion=PE-UCA&periodYear=2024&periodMonth=9&calendarSeries=VIIRS&mapSensor=MODIS&sensor=MODIS`.
Al volver al Calendario se conserva VIIRS; al entrar directamente al Mapa desde
ese Calendario se aplica VIIRS al Mapa, como exige el contrato.

Archivos de UX-03: `src/types/selection.ts`, `src/App.tsx`,
`src/components/calendar/CalendarPage.tsx`, `src/components/calendar/HistoricalCalendar.tsx`,
`src/components/map/FireMapTest.tsx` (enlace), `tests/map-ui.test.ts` y este README.
Se conservan los cambios pendientes de UX-01/02. No se cambian estilos, archivos
científicos, validadores científicos, algoritmos, B0/B1 ni serialización CSV.

Verificación: **99 pruebas frontend aprobadas** (96 anteriores y tres escenarios
adicionales, con la expectativa anterior de sensor compartido corregida). Se comprueban
navegación bidireccional, independencia, período, enlaces antiguos/nuevos, copia y
recarga de enlaces, historial atrás/adelante, CSV y estabilidad de Método.
Lint y build correctos; permanece la advertencia previa del chunk MapLibre.
Solo verificaciones automatizadas; no se usaron navegador, Computer Use, capturas
ni revisión responsive. Sin dependencias nuevas, commits, push o PR.
Sin bloqueos conocidos para UX-03. No se implementó UX-04.

## UI/UX fase 1 — UX-01 y UX-02

Implementada sobre T32 en `integration/t32-scientific-data`, con referencia al
contrato UI/UX de Adriana (`docs/AllpaNina_Contrato_UI_UX_v0_1.md`).

- **UX-01:** cinco tokens de color del contrato en `src/index.css`, tipografía local,
  espaciados 4/8/12/16/24/32 px y ancho máximo 1200 px. Primitivas reutilizables
  `ui-surface`, `ui-button`, `ui-source-note`; foco visible y enlace de salto al contenido.
  El naranja es un acento decorativo: no se usa como texto pequeño sobre fondo claro.
  Las escalas científicas del Calendario y del Mapa permanecen intactas.
- **UX-02:** `AppHeader` común con identidad compacta, contexto de región/período y
  `Acerca de / Fuentes` mediante un desplegable HTML nativo. Región desde el identificador
  del manifest y la primera frase de `method.region`, únicamente si coinciden sus
  identificadores. Sin descripción válida se muestra solo el identificador real;
  sin manifest, estado explícito no disponible y reintento. Producto, período y fecha
  de generación se leen del manifest; la fecha no se presenta como fecha de observación
  ni el período como cobertura completa. No hay nombres, fechas ni métricas inventadas.
- Navegación con enlaces reales y `aria-current="page"`, sin roles tab/tablist.
  Se mantienen URL, historial, clic modificado, enlaces compartibles y selección T32.
  La marca interna de Juan aparece solo en fullscreen, donde no se ve la cabecera común.
  Filtros, controles internos, selección y lógica científica no se rediseñan en esta fase.
- Cabecera responsive: tres enlaces con etiquetas completas y objetivos de al menos
  44 px. En móvil se oculta solo el subtítulo descriptivo de la marca; región, período,
  fuentes y navegación permanecen visibles. No se incorporan fuentes remotas ni dependencias.

**Verificación:** 96 pruebas frontend aprobadas (91 previas + 5 de cabecera/metadatos,
recuperación, región discordante, enlaces/historial y contraste AA), lint y build correctos.
Los 49 archivos importados registrados en `docs/t32/PROCEDENCIA_T32.json` conservan sus
hashes; no se modificaron datos, algoritmos, fixtures ni documentos científicos.
Permanece la advertencia previa de tamaño del chunk MapLibre.

Revisión visual con computer-use en Opera: navegación de las tres vistas en escritorio
y móvil; anchos 400 y 320 px, etiquetas legibles y contexto ajustado al ancho. La revisión
fue detenida por el usuario con Escape antes de completar la comprobación visual de foco
con teclado y apertura del desplegable. El contraste AA se comprobó automáticamente para
los pares de texto/fondo comunes; esto no equivale a auditar todos los controles internos.

**Archivos de esta fase:** `src/App.tsx`, `src/index.css`,
`src/components/AppHeader.tsx` (nuevo), `src/types/data.ts`,
`src/services/data/validators.ts`, `src/components/map/FireMapTest.tsx`,
`src/components/map/map.css`, `src/components/method/method.css`,
`tests/app-header.test.ts` (nuevo), `tests/map-ui.test.ts` y este README.

**Adriana:** revisar composición final de la cabecera y confirmar si se desea un nombre
público de región más breve en metadatos. Se utiliza la descripción disponible sin
introducir una etiqueta manual ni bloquear la implementación. No se implementó UX-03
ni ninguna fase posterior. Sin commits, push ni PR.

## L5/T32: datos científicos reales (vigente)

La aplicación usa `/data/` por defecto: Ucayali (PE-UCA), enero de 2013 a julio
de 2026. Fuente científica: `feature/calibracion@d27e6eb`. Contrato:
[contrato_datos.md](../docs/contrato_datos.md). Informe y procedencia:
[INTEGRACION_T32.md](../docs/t32/INTEGRACION_T32.md).

Con Node.js 24, ejecutar desde esta carpeta:

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

En PowerShell se puede usar `npm.cmd`. Calendario: `/`; Mapa: `/?view=map`;
Método: `/?view=method`. Para septiembre de 2024:
`/?periodYear=2024&periodMonth=9`. DEMO solo por selección explícita
`?data=demo` (combinar con `view=map|method`) o inspector `?demo=1`.
No se reemplaza un archivo inaccesible por datos sintéticos.

- El intercambio usa `sensor_group`, `cell_days`, `status=ok|missing`.
- Calendario: escala automática regional común a ambos sensores, máximo editable,
  leyenda numérica. El color puede saturarse; los datos conservan su valor.
  El detalle presenta también las estimaciones B0/B1 recibidas, su split y residual.
- Mapa: archivos anuales por manifiesto; días-celda observados por celda, sin B1.
- Método: validación desde `method.resultados.valid`; test preciso desde
  `validation.json`. WAPE es proporción y se presenta multiplicado por 100 con %.
- CSV: ocho columnas oficiales; todos los registros cargados de región/sensor.
  Nombre real `allpanina_<region>_<sensor>.csv`; sufijo `_demo` solo en modo DEMO.
- Los fixtures sintéticos se migraron al mismo esquema; no se alteraron los
  archivos científicos importados. Sus hashes se verifican en `npm test`.
- Vercel mantiene raíz `frontend/`, build `npm run build`, salida `dist`.
  Los datos estáticos y el worker se incluyen automáticamente.

Las notas de L9/L6/L4/L3 que siguen conservan la documentación histórica del
desarrollo con DEMO. Sus nombres de campo, límites y restricciones anteriores
quedan sustituidos por esta sección y por el contrato científico vigente.

## Integración del Mapa de Juan Matías

Desde `frontend/`, con Node.js 24: `npm ci`, `npm run dev` y abrir
`http://127.0.0.1:5173/?view=map`. La aplicación conserva las tres vistas
**Calendario | Mapa | Método** y el inspector L3 `?demo=1`.

El mapa se adaptó desde `docs/NASA SAC.zip`, `src/FireMapTest.tsx`, conservando
el estilo MapLibre, cuatro fondos, capas, filtros, leyenda por percentiles,
opacidad, selección, inspector, escala, navegación, cuadrícula y fullscreen.
No se copió `node_modules`, el generador de observaciones ni los puntos de entrada
del ZIP. Su implementación se distribuye entre:

- `components/map/FireMapTest.tsx`: controles e interacción de Juan adaptados.
- `mapConstruction.ts`: estilo, fuentes y capas originales.
- `juanLayers.ts`: fondos, overlays, cuadrícula y utilidades de percentiles de Juan.
- `MapPage.tsx`: manifiesto, carga por L3, ausencia de archivos y errores visibles.
- `mapRuntime.ts` y `map-worker.d.ts`: MapLibre y worker cargados bajo demanda.
- `map.css`: contenedor acotado, sin cambiar scroll global, accesibilidad básica.
- `services/data/map.ts`: resolución de archivos, filtros, límites y popup textual.
- `types/selection.ts`: contexto de selección compartido (no un contrato de datos).

Dependencias nuevas: `maplibre-gl@6.18.0` y `@types/geojson@7946.0.16` como tipos de
desarrollo. El registro oficial rechazó conexiones en este entorno; se instalaron
desde el espejo público npm npmmirror, registrado en las URLs del lockfile. La
integridad del paquete MapLibre coincide con la registrada en el lockfile de Juan.
No se sustituyen React, Vite ni TypeScript por los del ZIP.

### Contexto compartido y datos

Seleccionar una celda del Calendario comparte región, año, mes y sensor con Mapa.
Los filtros del mapa actualizan el período común y su sensor propio; regresar al
Calendario restaura su serie anterior y el período compartido (UX-03). **La selección temporal es de detalle**:
CSV sigue exportando todas las filas de la región y sensor, sin filtrar por mes.
Los enlaces de navegación preservan ese contexto en query params; «Copiar enlace»
comparte región/período/sensor. No incluye centro/zoom ni publica en redes sociales.

MapPage lee `manifest.json` y solo solicita `cells_<region>_<year>.geojson` si el
archivo existe en el manifiesto y la región coincide. El contrato actual describe
una región por manifiesto; otras regiones/años sin archivo se muestran como no
disponibles. Para varios conjuntos aprobados, proporcionar su `dataRoot` y sus
manifiestos sin mezclar regiones dentro de un archivo no identificable.

Cambiar mes/sensor filtra localmente; no descarga el GeoJSON de nuevo. Todos los
archivos pasan por `loadCells`/`validateCells`: un archivo oficial de cuatro
features conserva las cuatro al validar, antes de filtrar. Los errores rechazan
el archivo, sin descartar features silenciosamente. No hay fallback sintético.

Se usa `cell_id`, `sensor_group=MODIS|VIIRS` y `cell_days`. Las leyendas, popups y
resúmenes representan **días-celda observados por celda**, nunca calibración regional ni
superficie quemada. Ceros válidos se conservan; ausencia de filas no equivale a
cero. No se aplica B1. Los percentiles son relativos al conjunto visible y no
sirven como escala absoluta comparable entre meses ni como riesgo de incendio.

### Seguridad, recursos y límites

- Popups con nodos de texto, sin HTML interpolado.
- DEMO visible solo en modo explícito, incluso en fullscreen; no se exportan imágenes.
- Carga/error de GeoJSON, worker, WebGL y recursos cartográficos visibles, con
  reintento. Tras 20 segundos sin cargar se avisa de demora, sin crear datos.
- Mapas, popups, observadores, listeners y temporizadores se limpian al desmontar;
  una importación que termine tarde no crea un mapa después de salir de la vista.
- Selección alternativa por teclado mediante el control de celda; botones y filtros
  nativos. El contenedor no modifica estilos de body y respeta la navegación común.
- Se conserva la conectividad externa original: NASA GIBS, ArcGIS/Esri y MINAM.
  Se mantienen atribuciones. Su disponibilidad/CORS no se garantiza ni se usa para
  simular observaciones; un fallo se muestra al usuario.
- Se posponen PNG/JPG, GIF, PDF y GeoTIFF. Incorporaban dependencias y procesos de
  captura costosos, problemas CORS y rotulado DEMO pendiente. No se instalan
  geotiff, gifenc ni jsPDF ni se activa preserveDrawingBuffer.
- Los overlays MINAM y sus descripciones territoriales siguen siendo de Ucayali,
  como en Juan; son capas de contexto opcionales, no evidencia sobre PE-DEMO.
- L3 valida estructura, WGS84, cierre y campos numéricos; no certifica topología
  completa de polígonos. No hay benchmark de archivos grandes ni datos reales.

### Verificación y despliegue

Ejecutar `npm test`, `npm run lint` y `npm run build` (en PowerShell puede requerirse
`npm.cmd`). Las pruebas nuevas cubren contrato oficial, filtros, XSS, estados,
selección, fullscreen, montaje/desmontaje y el recorrido Calendario–Mapa–Calendario
con regresión de CSV. MapLibre se simula en los tests DOM: no certifican WebGL real.

El build genera un worker local y un chunk MapLibre separado, que solo se importa
al abrir Mapa. Vite advierte que MapLibre supera 500 kB; no se silencia esa alerta.
Vercel puede conservar raíz `frontend/`, `npm ci`, `npm run build` y salida `dist`.
No hay rutas de pathname nuevas ni necesidad de backend. Comprobar el worker
generado, GeoJSON, CSS y servicios externos en una preview antes de publicar.

## L9: Exportación CSV del Calendario

En el Calendario, el botón **Descargar CSV** exporta los registros ya cargados de
la región y sensor seleccionados. No hace peticiones HTTP adicionales. Se comparte
`filterCalendarRecords` con la cuadrícula y se ordena una copia por año/mes.
Actualmente no hay filtro temporal: se exportan todos los años cargados de esa
serie. Seleccionar una celda abre el detalle y no filtra la descarga.

Se conservan las nueve columnas oficiales de `monthly_series.csv`, los estados de
calidad y los ceros. Los nulos se escriben como campos vacíos. Los meses sin fila
no se añaden al CSV, aunque aparezcan como «Ausente» en la cuadrícula. No se
recalculan indicadores ni se incluyen B0/B1. El botón queda deshabilitado si no
hay registros exportables; los errores de generación/inicio de descarga son visibles.

`services/data/csvExport.ts` incluye serialización reutilizable, nombre sanitizado
y descarga nativa mediante Blob y URL temporal. El archivo es UTF-8 con BOM y
filas CRLF, con escape de comas, comillas y saltos de línea. Los textos que puedan
interpretarse como fórmulas se prefijan con un apóstrofo antes de escaparlos; ese
prefijo es una protección de exportación y no modifica los registros en memoria.
Los valores numéricos permanecen numéricos. La interpretación final depende del
programa de hojas de cálculo; no se garantiza un comportamiento idéntico en todos.

La descarga usa `allpanina_<region>_<sensor>_demo.csv`; el origen actual es DEMO y
el marcador no se infiere del código de región. El enlace temporal se elimina tras
el clic y la URL se revoca un segundo después, incluso si el clic lanza un error.
Iniciar la descarga no permite confirmar que el usuario guardó el archivo.

Ejemplo actual para PE-DEMO / MODIS, sin filas inventadas:

```csv
region_id,year,month,sensor,n_detections,indicator,qc_status,source_version,updated_at
PE-DEMO,2024,8,MODIS,12,3,ok,DEMO-MODIS-v0,2026-11-14
PE-DEMO,2024,9,MODIS,0,0,ok,DEMO-MODIS-v0,2026-11-14
PE-DEMO,2024,10,MODIS,,,insufficient_data,DEMO-MODIS-v0,2026-11-14
```

Ejecutar desde `frontend/`: `npm test`, `npm run lint`, `npm run build` y
`npm run dev`. En PowerShell con scripts deshabilitados usar `npm.cmd`.
Las pruebas cubren columnas oficiales, filtros, orden, cero/null, estados, Unicode,
escape, fórmulas, nombre DEMO, botón deshabilitado, Blob/enlace/URL y errores. Los
clics de descarga están simulados en jsdom: no equivalen a verificar un archivo
guardado por un navegador real. No se añaden dependencias ni se cambian fixtures.

## L6: Método y evaluación

Ejecutar `npm ci` y `npm run dev` desde `frontend/` (Node.js 24). Abrir
`http://127.0.0.1:5173/?view=method` o usar el enlace «Método» de la navegación.
«Calendario» vuelve a L4; `?demo=1` conserva el inspector L3. La navegación usa
enlaces y el historial del navegador, sin librería de rutas. En PowerShell con
scripts deshabilitados usar `npm.cmd`.

La pantalla carga `method.json` y `validation.json` de `public/data/demo/` mediante
los loaders/validadores existentes. Las cargas son independientes: un archivo
inválido o inaccesible no oculta el otro. Hay carga, errores por archivo, reintento,
resultados parciales y ausencia de métricas/residuos. Las peticiones se cancelan
al abandonar la pantalla. No se carga `calibrated_series.csv` porque esta versión
presenta métricas y disponibilidad por split, sin dibujar series.

- `components/method/MethodPage.tsx`: carga, estados y composición.
- `MethodExplanation.tsx`: indicador, sensores, períodos y texto de calibración
  B0/B1 conservado desde el archivo, junto con sus limitaciones.
- `MethodMetrics.tsx`: MAE, WAPE, sesgo y meses emparejados por método/split.
- `MethodComparison.tsx`: disponibilidad B0/B1 separada en train, valid y test.
- `MethodErrors.tsx`: hasta cinco residuos de test ordenados por error absoluto.
- `services/data/method.ts`: presentación y ordenamiento, sin cálculos científicos.
- `method.css`: estilos provisionales y acotados; `main.tsx` importa los estilos.

Se muestra siempre **DATOS DEMO — NO SON OBSERVACIONES REALES**. Los fixtures
originales no se modifican: sus métricas nulas aparecen como «No disponible», sus
cero meses emparejados como 0 y sus residuos ausentes como «Detalle mensual no
disponible». No se afirma una mejora de B1 ni se inventan resultados.

Límites científicos pendientes:

- WAPE se muestra literalmente, sin convertirlo a porcentaje ni añadir %. Falta
  confirmar escala, unidades de métricas, convenciones de sesgo y residuos.
- El contrato contiene un split por entrada de método; la UI lo respeta. No se
  combinan train/valid/test ni se supone que ambos métodos usaron los mismos meses.
- method.json tiene un texto de calibración, sin definiciones separadas de B0/B1.
  Se presenta ese texto sin deducir fórmulas o completar metodología ausente.
- El top-5 cuenta registros método-mes entre todos los métodos con split test;
  un mes puede aparecer en ambos métodos. No se recalculan errores, se conservan
  los signos recibidos y se desempata por mes/método para mantener orden estable.
- Un método ausente o métrica null se muestra sin cifra. Un archivo que omite
  campos obligatorios sigue siendo inválido según L3 y genera error visible.

Pruebas: `npm test`, `npm run lint`, `npm run build`. L6 añade pruebas de lectura
con los fixtures existentes, presentación, ceros/null, splits, top-5, errores,
recuperación y navegación, usando las dependencias ya instaladas. Los números
adicionales solo existen en entradas de prueba en memoria; no son datos publicados.

L6 está preparado funcionalmente para recibir archivos reales aprobados; el
componente de errores prepara L7, pero no constituye una evaluación científica
completada. Se necesitan residuos verificables de test y revisión de Antonella y
Aldo. La integración visual final y la conexión del mapa siguen pendientes.

## L4: Calendario histórico básico

Desde `frontend/`, con Node.js 24:

```sh
npm ci
npm run dev
```

Abrir `http://127.0.0.1:5173/`. La ruta inicial muestra el Calendario; `?demo=1`
conserva el inspector L3. Ambos usan **DATOS DEMO — NO SON OBSERVACIONES REALES**.
El Calendario carga `public/data/demo/monthly_series.csv` con el loader existente.
Elige región y sensor (MODIS/VIIRS), y selecciona un mes para ver su detalle.

- Filas: años presentes en la región, ordenados; columnas: enero–diciembre.
- Azul: `indicator` positivo, escala fija contractual 0–31 días-celda.
- Verde y texto «0 · válido»: cero con `qc_status=ok`.
- Trama y texto «Insuficiente»: `insufficient_data`; «Sin paso»: `no_pass`.
- Gris con borde discontinuo y texto «Ausente»: no hay fila; nunca equivale a cero.
- Los estados no válidos prevalecen sobre cualquier valor parcial del CSV.

La tabla permite desplazamiento horizontal en pantallas pequeñas. Las celdas son
botones operables con teclado; muestran selección y actualizan el panel de detalle.
Cambiar sensor/región limpia el detalle para no mostrar datos de otra serie.
Hay estados de carga, error con reintento, CSV vacío y sensor sin registros.

`services/data/calendar.ts` transforma registros validados sin calcular indicadores.
`components/calendar/CalendarPage.tsx` carga por URL, cancela al desmontar y controla
errores; `HistoricalCalendar.tsx` mantiene filtros/selección; `CalendarGrid.tsx` y
`CalendarDetail.tsx` presentan datos. `calendar.css` contiene solo estilos básicos
acotados al Calendario, listos para sustituir con el diseño final.

Pruebas: `npm test`, `npm run lint`, `npm run build`. En PowerShell con scripts
deshabilitados usar `npm.cmd`. `tsx` ejecuta las pruebas TypeScript/TSX con el runner
de Node y `jsdom` permite probar cambios reales de controles, clics y estados de
React sin navegador; ambas son dependencias solo de desarrollo. L3 sigue cubierto.

Limitaciones: el fixture actual contiene solo 2024; las pruebas incluyen varios
años y regiones. Solo se dibujan años presentes en la región; no se inventan años
enteros sin filas. El Calendario no incorpora B0/B1 ni mapa; la pantalla Método
se describe en L6. `n_detections` e
`indicator` se mantienen separados; `updated_at` es actualización del archivo.
El límite regional 0–31 conserva la definición oficial pendiente de aclaración
científica; la intensidad no expresa riesgo ni incendios confirmados.

Siguiente integración: aplicar diseño/leyendas del equipo; añadir series B0/B1
desde su loader diferenciando estimados de observados; acordar filtros compartidos
región/año/mes/sensor con mapa y Método sin modificar sus contratos. Antes de datos
reales, revisar fuentes, estados y significado del indicador con Marco/Aldo.

## L3: datos DEMO

L3 utiliza el [contrato oficial de Aldo](../docs/contrato_datos.md).
Ver [guía L3](../docs/l3-demo.md) para la adaptación, decisiones
pendientes y uso de los loaders. Desde esta carpeta: `npm ci`, `npm test`,
`npm run lint`, `npm run build` y `npm run dev`. Requiere Node.js 24.
La comprobación temporal se abre en `http://127.0.0.1:5173/?demo=1`.
**DATOS DEMO — NO SON OBSERVACIONES REALES**. El inspector L3 no incluye Mapa ni Método;
el Calendario básico de L4 se describe arriba.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
