## Filtro territorial — corrección UX actual

Seleccionar un departamento oculta las celdas exteriores y recorta visualmente las fronterizas, incluidos los cuadrados ampliados. Sus valores originales se conservan completos, sin atribución exclusiva al departamento. El resumen procede del CSV. PE restaura todas las celdas; se usa exclusivamente el selector geográfico para cambiar ámbito. No hay máscara oscura, contorno naranja ni botón «Ver Perú completo». Se conservan Encuadrar, Pantalla completa, Copiar enlace, piloto y DEMO.

Detalles técnicos, procedencia y limitaciones: `docs/peru/NAVEGACION_DEPARTAMENTAL.md`. Las notas históricas siguientes describen implementaciones anteriores y quedan sustituidas por este comportamiento.

## Navegación territorial — corrección de etapa 2

El Mapa encuadra el departamento elegido y resalta su límite INEI simplificado, con atenuación exterior visual. `Encuadrar` vuelve al ámbito elegido y `Ver Perú completo` restaura la extensión nacional sin cambiar el resumen departamental. El inspector conserva valores de celdas nacionales; los indicadores departamentales proceden del CSV, sin recortes ni reparto. PE elimina el resaltado. La navegación manual y los cambios de mes/sensor no fuerzan otro encuadre.

Se carga una sola vez el recurso de 1,68 MB en `public/cartography/`, conservando el original de 14,2 MB fuera del despliegue. Procedencia, generación reproducible, limitaciones y requisitos para una futura desagregación: `docs/peru/NAVEGACION_DEPARTAMENTAL.md`. Las notas siguientes describen etapas anteriores; la referencia a mostrar siempre el país completo queda sustituida por este enfoque territorial. Piloto y DEMO permanecen disponibles.

## Integración nacional — etapa 2 (estado actual)

Mapa y Método nacionales ya están conectados. Las secciones de etapas previas que siguen documentan el proceso; los avisos de integración pendiente de etapa 1 fueron sustituidos por estas vistas funcionales.

- Mapa: `/mapa?mapRegion=PE&periodYear=2024&periodMonth=9&scope=month`. Carga un GeoJSON anual, mantiene cuadrados/polígonos e inspector y explica que cada geometría de 10 km acumula pares celda-día de 1 km. No hay límite de 31 ni calibración B1 en geometrías.
- Departamento: `/mapa?mapRegion=PE-25&periodYear=2024&periodMonth=9&scope=month`. El resumen procede de sus filas CSV; la capa sigue mostrando Perú completo, explícitamente como contexto nacional. No se reparte actividad por centroide/intersección ni se presenta como cartografía departamental exacta.
- Método: `/metodo?mapRegion=PE` o cualquier departamento. Metadatos, κ propios/agrupados, validación, test, motivos no reportables y serie calibrada corresponden a la región elegida. PE utiliza la suma de estimaciones departamentales; el κ nacional alternativo no se aplica en la interfaz. El test PE-SIN-25 se consulta como análisis separado dentro de Método PE.
- Fuentes piloto y DEMO continúan explícitas (`?data=pilot&mapRegion=PE-UCA`, `?data=demo`). No se modificaron el Calendario, el navbar ni el diseño editorial general en esta etapa.

Los 14 GeoJSON se copiaron byte a byte desde el mismo commit científico de etapa 1; todos coinciden con el manifiesto. Los productos nacionales y el piloto no se recalculan. Ver `docs/peru/INTEGRACION_ETAPA2.md` y `PROCEDENCIA_ETAPA2.json`.

**Despliegue pendiente:** el servidor debe comprimir JSON/GeoJSON. No se ha configurado ni verificado el servidor personal en esta sesión. Instrucciones Nginx y comandos de comprobación: `docs/peru/DESPLIEGUE_COMPRESION.md`. Las pruebas locales de gzip no sustituyen comprobar los encabezados HTTP reales.

## Integración nacional — etapa 1

La aplicación usa ahora `/data/peru/` por defecto en Calendario. Puede abrirse `/calendario?mapRegion=PE` (Perú) o `/calendario?mapRegion=PE-25&periodYear=2024&periodMonth=9` (Ucayali nacional). El selector compartido lee 26 identificadores desde el manifiesto y sus nombres desde `method.json`; `PE-SIN-25` solo es un agregado de evaluación y no aparece como opción geográfica.

- Piloto recuperable y operativo: `/calendario?data=pilot&mapRegion=PE-UCA`, `/mapa?data=pilot&mapRegion=PE-UCA`, `/metodo?data=pilot&mapRegion=PE-UCA`. Los enlaces anteriores con `mapRegion=PE-UCA` también abren el piloto. Su cartografía multiescala, popups e inspector permanecen disponibles.
- DEMO requiere `?data=demo`; jamás se utiliza como fallback. Si una URL combina un identificador nacional válido con `data=pilot`, prevalece el identificador nacional, evitando atribuirle cifras del piloto. La selección explícita DEMO conserva su conjunto separado.
- Mapa y Método nacionales muestran un aviso de integración pendiente con la región seleccionada y enlaces honestos al Calendario o al piloto. No cargan los productos del piloto como resultados nacionales. Sus etapas nacionales no se implementan aquí.
- `types/data.ts`, `peruValidators.ts` y los lectores `loadMethodDocument`/`loadValidationDocument` admiten los documentos v1.0 y v1.1 sin aplanar el sobre regional. Se conservan `reportable`, `motivo`, `nota`, null y los splits; se rechazan métricas añadidas a regiones no reportables. Los lectores existentes del piloto continúan disponibles. Se acepta el rango anual de κ nulo publicado para Callao.
- Calendario lee los CSV aprobados, filtra la región elegida y conserva series, años, selección de comparación, detalles, ceros/ausencia, procedencia y exportación. `PE` se lee directamente del CSV; no se calcula sumando departamentos en la interfaz.

**Archivos incorporados:** `frontend/public/data/peru/{monthly_series.csv,calibrated_series.csv,method.json,validation.json,manifest.json}`, idénticos a `origin/feature/calibracion` en el commit `78f2ca71e59dd41b03f5557e6063e7fa42bcb4ca`. Se importó el contrato vigente y se conservó una copia del README científico en `docs/peru/SOURCE_README.md`. Procedencia y SHA-256: `docs/peru/PROCEDENCIA_ETAPA1.json`; informe: `docs/peru/INTEGRACION_ETAPA1.md`. No se trajeron los 14 GeoJSON nacionales ni algoritmos. El manifiesto original enumera esos GeoJSON; esta etapa entrega solo los cinco archivos necesarios y no pretende ser la publicación cartográfica completa.

**Diferencia documentada:** las 326 filas mensuales de PE-25 coinciden con PE-UCA en período, sensor, valor, estado y versión; `updated_at` cambia de 2026-11-14 a 2026-11-15. Las 326 filas calibradas coinciden salvo `region_id`. Se conserva esa diferencia de publicación, sin tocar el piloto ni el producto nacional.

El contrato científico importado también documenta v1.2 para salidas futuras del algoritmo; los archivos nacionales publicados siguen declarando v1.1, sin `sin_validar` ni `actualizacion.json`. Esta etapa no implementa esa extensión futura. No hay dependencias ni pasos de instalación nuevos: desde `frontend/`, `npm ci`, `npm run dev`, `npm test`, `npm run lint`, `npm run build`.

## Comunicación científica en Calendario y Mapa

Los textos distinguen el indicador regional del valor de una sola celda, según el contrato y `public/data/method.json`. No se cambiaron magnitudes, productos científicos ni clasificación cromática.

- `services/data/map.ts` construye popups seguros con título, período/sensor, días registrados en la celda, explicación corta e identificador secundario. La modalidad anual recibe el número de meses utilizables para indicar año parcial/completo; cuando no se conoce, no inventa disponibilidad. `useJuanMap.ts` los abre tanto al pasar el cursor como al seleccionar por clic/toque. Se conservan cuadrados/polígonos, filtros y controles.
- `CalendarDetail` presenta mes/año, nombre regional obtenido de metadatos (o código cuando falta), sensor, valor observado, días-celda acumulados y estado. Explica que la suma abarca distintas celdas y no equivale a incendios ni días distintos regionales. Cero, missing y no publicado tienen explicaciones diferentes. B0/B1 y procedencia permanecen en detalles secundarios.
- `components/ui/CellDaysHelp.tsx` es un desplegable HTML nativo reutilizado en ambas leyendas: define un par celda-día y explica aportes simultáneos de varias celdas. Funciona con teclado y toque, sin dependencias adicionales. Los estilos quedan limitados a sus clases.
- La leyenda del Mapa identifica los percentiles por período y sensor, mantiene sus valores y explica que el color no mide riesgo, gravedad ni superficie quemada. Los cuadrados siguen identificados como símbolos ampliados de localización.
- El inspector anual conserva su desglose mensual y explica la suma de días, no necesariamente consecutivos, durante los meses disponibles.

El producto actual continúa siendo PE-UCA. Aunque el método declara una malla de 1 km × 1 km en EPSG:6933, no se añade una equivalencia de superficie quemada a los popups. Las pruebas `scientific-copy.test.ts` cubren jerarquía del popup, selección táctil, cobertura anual, descripción regional, estados y ayuda desplegable. No se modificaron Método ni navbar; sin revisión visual mediante navegador o Computer Use.

## Mapa multiescala — cuadrados individuales y polígonos originales

Se conserva la composición de Mapa y las fuentes cartográficas de Juan. No hay agrupación ni círculos en la visualización principal: la fuente GeoJSON de localización usa `cluster: false` y cada registro de celda origina un símbolo individual, sin sumar celdas vecinas.

- `services/data/mapSymbols.ts` prepara un punto interior por celda del período/sensor seleccionado. Usa intersecciones de una línea horizontal con los anillos, excluye los huecos y elige un intervalo interior; admite Polygon cóncavo y MultiPolygon. Son coordenadas derivadas para localizar símbolos, nunca observaciones nuevas ni reemplazos de las coordenadas/geometrías originales. Se rechazan celdas duplicadas, períodos/sensores incompatibles y valores inválidos.
- `pages/map/cartography/multiscaleLayers.ts` dibuja una sola capa `symbol` mediante un pequeño cuadrado SDF generado localmente; no requiere sprites ni tipografías externas. El tamaño visual aproximado crece de 6 a 10 píxeles con el zoom. Los iconos permiten superposición y no se descartan por colisión. El halo es fino (0.35 px). Los colores y percentiles por valor observado son los mismos que en los polígonos originales.
- Los símbolos se desvanecen al acercarse al zoom 9; su rango termina en 9 y los polígonos empiezan exactamente en 9. Esta sustitución excluyente evita dibujar dos veces la misma celda en una transición cruzada. Los contornos de los polígonos recuperan grosor y opacidad progresivamente; la geometría real permanece intacta.
- Clic y hover sobre el cuadrado utilizan el mismo identificador, popup seguro e inspector que el polígono. El inspector anual conserva el desglose mensual. Cambiar el zoom no recrea fuentes ni actualiza sus datos; cambiar período/sensor actualiza ambas fuentes y bloquea temporalmente la interacción antigua.
- La leyenda explica que los cuadrados ampliados son símbolos de localización, no área ocupada ni incendios individuales. No hay una escala de totales agrupados. Se conserva B1 exclusivamente en su ámbito regional; nunca se aplica a estas capas.

**Alcance y rendimiento:** la entrega integrada sigue siendo PE-UCA, 2013-01 a 2026-07. No se inventaron datos nacionales. La preparación requiere recorrer la geometría una vez por selección y memoria proporcional a las celdas; se usan capas de MapLibre, sin componentes React por celda. A escala nacional los cuadrados podrán superponerse y ocultarse parcialmente entre sí, sin que eso cambie los datos ni sus totales; no se reintroduce clustering automáticamente. Antes de incorporar productos nacionales debe medirse tamaño, tiempo y memoria de la carga anual completa, y acordar con el equipo cualquier particionado o contrato de teselas necesario.

**Pruebas:** `map-multiscale.test.ts` comprueba una posición interior por celda (incluidos huecos y geometrías cóncavas), ausencia de clustering/círculos, sumas observadas, separación de períodos/sensores, anual, ceros/vacíos, rangos de zoom excluyentes, escala de colores, inspector y cobertura parcial. Se valida el estilo completo con el compilador incluido en MapLibre. Las pruebas UI usan runtime simulado. La revisión visual queda a cargo de Landry: no se utilizó navegador ni Computer Use. Sin cambios de productos científicos ni contratos.

## Publicación v2 sin dependencia de legacy

`frontend/src/legacy/` queda excluido por `.gitignore` y se conserva únicamente en el disco local. Una copia limpia utiliza exclusivamente la arquitectura v2. El frontend anterior permanece recuperable en el commit `26a7a7745694339cfd66352ab5c51f4cf8da230d` (historial Git), sin necesitar incluir su copia local en esta versión.

Los módulos cartográficos de Juan utilizados en producción están ahora en `src/pages/map/cartography/`: construcción MapLibre, proveedores/capas/percentiles, runtime/worker e inspector anual. Sus fuentes y lógica se conservan; las páginas y los tests ya no importan legacy.

Las suites históricas `app-header`, `calendar-ui`, `map-ui`, `method-ui` y `scientific` se adaptaron a las rutas y componentes v2. `uiHarness.ts` aporta montaje y runtime cartográfico simulado. Las suites de contratos, validadores, CSV, agregación y los 18 hashes científicos permanecen activas. Las suites `*-v2` conservan navegación/historial, sensores independientes, estados y cancelación.

El total pasa de 147 a 125 pruebas al consolidar comprobaciones duplicadas y reemplazar expectativas de interfaz retiradas. No hay tests omitidos ni desactivados: la antigua vista mensual del Calendario, el inspector L3 `?demo=1`, la cabecera con metadatos duplicados y su cálculo de altura ya no forman parte de v2; sus requisitos vigentes se verifican en el detalle del calendario, `?data=demo`, metadatos de publicación y navbar compartido. Se conservan las pruebas de errores de datos, ceros/null, sumas, residuos, filtros, CSV, popups seguros, WebGL, fullscreen, limpieza StrictMode, respuestas tardías y coherencia regional.

Las secciones históricas que siguen documentan etapas anteriores; las referencias a rutas legacy describen el estado previo a esta publicación.

## Método v2 — explicación y evaluación científica

La página completa está en `/metodo`; `?data=demo` activa exclusivamente los fixtures de prueba. Se ejecuta con los mismos comandos de la aplicación (`npm ci`, `npm run dev`, `npm test`, `npm run lint`, `npm run build`, desde `frontend/`). No hay dependencias ni pasos nuevos.

- `src/pages/method/MethodPage.tsx` carga `method.json`, `validation.json` y `manifest.json` con los loaders/validadores existentes, en paralelo y con cancelación. Permite resultados parciales y reintento. Los filtros de exploración no afectan Método; una discrepancia de `region_id` bloquea la combinación de métricas.
- `sections/ProcessingSection.tsx` explica FIRMS, sensores, agregación y la definición de días-celda, el alcance regional de B1 y los períodos train/valid/test. Las reglas específicas del piloto se muestran solo para PE-UCA en modo real, según `method.json`, `docs/datos.md` y T27.
- `sections/EvaluationSection.tsx` compara B0/B1 con barras proporcionales al WAPE, selecciona la etapa y conserva todas las métricas en una tabla. Validación procede de `method.resultados.valid`; la evaluación precisa procede de `validation.json` y conserva su split declarado. No se inventan métricas de entrenamiento. Las proporciones WAPE se multiplican por 100 solo para mostrarlas. Los valores completos permanecen en los títulos y en los productos enlazados. Los residuos de prueba se consultan por método con `topTestErrors`, sin recalcularlos.
- `sections/SourcesSection.tsx` presenta ceros/faltantes/no publicados, todas las limitaciones recibidas, enlaces a los productos y hashes del manifiesto. Mostrar hashes no equivale a verificarlos en tiempo de ejecución.
- `method.css` utiliza una composición editorial responsive y detalles HTML nativos. El navbar y las otras vistas no cambian; legacy permanece disponible como referencia.

**Ámbito de la evidencia:** el manifiesto vigente contiene PE-UCA, 2013-01 a 2026-07. No hay un producto nacional aprobado integrado. Las cifras de prueba B0 WAPE 321.6%, B1 WAPE 30.8%/MAE 29.7, la validación B1 WAPE 17.8% y κ 0.2936037257560573 proceden de los archivos publicados. Las revisiones T27, T29 e integración T32 documentan la metodología; los documentos históricos se interpretan según su fecha (T27 precede a la prueba T29). No se cambiaron productos científicos, contratos ni fórmulas. La CI existente ya ejecuta frontend y pruebas Python científicas en trabajos independientes; no requirió cambios para esta página.

**Verificación y límites:** pruebas de Método v2 cubren cifras reales, etapas, residuos, null/cero, ausencia de métodos, lectura parcial/reintento, discrepancias regionales, DEMO y cancelación. La revisión visual corresponde a Landry; no se utilizó navegador ni Computer Use. La expansión nacional requiere nuevos productos y evidencia científica del equipo antes de atribuirle estas métricas.

## Mapa v2 — exploración geográfica

La ruta `/mapa` ya utiliza MapLibre y los productos científicos publicados. Ejemplo reproducible:
`/mapa?periodYear=2024&periodMonth=9&scope=month&calendarSeries=VIIRS&mapSensor=MODIS`.
Ejecutar `npm ci`, `npm run dev` desde `frontend/`; comprobar con `npm test`, `npm run lint`, `npm run build`.

- `src/pages/map/MapPage.tsx` carga y valida manifiesto, serie mensual y GeoJSON anual. Aborta solicitudes al cambiar de archivo; un archivo ausente no se convierte en cero. No hay fallback DEMO. El modo de prueba requiere `?data=demo`.
- `useJuanMap.ts` extrae el ciclo de vida de `legacy/FireMapTest`: inicialización diferida, actualización de fuentes, popups seguros, selección, encuadre por geometrías, observación de tamaño, fullscreen y limpieza. Reutiliza sus módulos conservados en `pages/map/cartography/`. Legacy sigue siendo recuperable.
- Las secciones `MapWorkspace`, `CartographyPanel` y `ExplorationPanel` organizan la interfaz: paneles independientes en escritorio y un panel inferior expandible en móvil. El navbar existente adopta únicamente una variante translúcida en `/mapa`.
- La URL comparte región, año, mes y modalidad con Calendario; `mapSensor` permanece independiente de `calendarSeries`. Los cambios del mapa agregan entradas al historial. Copiar enlace utiliza `/mapa`, no `?view=map`.
- La agregación anual y el desglose mensual reutilizan `mapExploration.ts`, que comprueba coherencia con los totales regionales. 2026 muestra siete meses utilizables. No se aplica B1 geográfico ni se infieren meses faltantes como cero.
- Se conservan los proveedores NASA GIBS, Esri y MINAM, sus atribuciones y overlays. El panel principal ofrece Blue Marble y Topographic; Firefly y Streets siguen en los módulos originales. Los percentiles y colores conservan la expresión de Juan y se recalculan por período/sensor.

**Disponibilidad y límites:** el manifiesto vigente publica solamente PE-UCA, sin producto nacional aprobado integrado. El encuadre usa las geometrías disponibles; la capa MINAM de áreas protegidas conserva su filtro explícito Ucayali y deberá revisarse al ampliar el ámbito. La cobertura mensual describe disponibilidad publicada, no nubes. Los fondos externos necesitan internet y WebGL; los errores se muestran sin reemplazar observaciones. La lectura sigue siendo de un GeoJSON por año; entregas nacionales mucho mayores requerirán medir rendimiento antes de elegir otra estrategia. No se añadieron dependencias ni configuración de servidor.

**Verificación:** pruebas automatizadas con datos reales y un runtime MapLibre simulado cubren filtros, sumas, estados, inspector, capas, paneles, enlaces, historial, abortos, coherencia y limpieza. No equivalen a una revisión visual ni a una verificación de disponibilidad de los proveedores externos; ambas quedan pendientes. No se utilizó navegador ni Computer Use.

# Nueva base frontend

## Calendario v2 — segunda iteración UI/UX (vigente)

`/calendario` ya utiliza observaciones reales y los servicios L3 compartidos. El
navbar, Mapa y Método no se modifican en esta etapa. La distribución vigente
sustituye las descripciones históricas posteriores de esta documentación.

- Barra única con título/región derivados de metadatos, instrumento, Un año /
  Comparar años, navegación anual cuando corresponde y descarga CSV con icono
  etiquetado. La información de publicación queda en un desplegable inferior y
  el ajuste de escala está junto a la leyenda.
- Un año muestra doce meses, 6×2 en escritorio ancho, 4×3 intermedio y 3×4 móvil,
  con tarjetas compactas. Descripción lateral en escritorio y debajo en pequeño.
- Comparar años permite combinaciones no consecutivas, todos o ninguno. La
  selección inicial editable son los últimos tres años disponibles; no constituye
  una recomendación científica. Las selecciones se conservan por región en
  sessionStorage durante la sesión y al alternar las vistas. Si el almacenamiento
  no está disponible, funcionan mientras la vista permanezca montada.
- Los años parciales se identifican por meses con observaciones válidas. La matriz
  mantiene doce columnas y la columna de años fija, con scroll horizontal interno.
  Descripción horizontal precede a la matriz, también en el orden del DOM.
- Descripción prioriza observación, instrumento, estado y enlace al Mapa. B0/B1,
  split, residual y procedencia están en un desplegable. Los decimales se muestran
  con un máximo de dos cifras; el valor original de cada estimación se conserva en
  su atributo title, sin modificar el archivo ni el cálculo científico.
- Calendario presenta solo Un año y Comparar años. Los enlaces entrantes Mensual
  siguen recuperando el período y su detalle; el botón contextual abre /mapa con
  scope=month y mapScope=month. Se conservan parámetros, hash y los sensores
  independientes. El estado de exploración se deriva de la URL mediante
  app/useExplorationSelection.ts, sin router adicional.
- Cero válido, missing y no publicado siguen diferenciados. La intensidad usa el
  máximo regional de todos los sensores/años cargados; filtrar los años comparados
  no cambia el dominio. El ajuste manual solo satura colores. CSV mantiene todos
  los registros cargados de región/instrumento, su contrato y protecciones.

La lógica científica y de descarga se reutiliza desde services/data, sin importar
la pantalla legacy. La presentación reside íntegramente en pages/calendar y sus
sections. Se retiró la sección preliminar del Calendario.

Verificación: 126 pruebas frontend aprobadas (incluye selección múltiple,
Todos los años, selección vacía, persistencia, orden de Descripción, datos reales,
CSV y enlaces/historial), lint y build. Comandos desde la raíz:
`npm.cmd test --prefix frontend`, `npm.cmd run lint --prefix frontend`,
`npm.cmd run build --prefix frontend`.

No se usó Computer Use, navegador ni revisión visual manual. La revisión de aspecto
y responsive queda a cargo de Landry. Mapa y Método siguen pendientes de migración;
el enlace contextual ya conserva el período para la futura cartografía. Sin nuevas
bibliotecas, cambios en artefactos científicos, commits ni pushes.


Rama: `refactor/frontend-v2`. Estado previo limpio y recuperable en el commit
`26a7a7745694339cfd66352ab5c51f4cf8da230d`; respaldo local adicional en
`.cache/frontend-v2/before-migration.zip` (no versionado).

Estructura: `src/app/` contiene rutas y layout; `pages/<vista>/sections/` las
secciones preliminares; `components/layout/` el navbar; `components/ui/` piezas
comunes; `styles/` tokens y estilos. `services/` y `types/` se conservan compartidos.

Se trasladaron `App.tsx`, `main.tsx`, `index.css` y todo el antiguo `components/`
a `src/legacy/`. Las importaciones de sus pruebas apuntan ahora a legacy; siguen
incluidos en TypeScript, lint y pruebas, pero no en el bundle de la nueva interfaz.
Para recuperar la interfaz anterior localmente, cambiar temporalmente la entrada
de `index.html` a `/src/legacy/main.tsx`. No hay una segunda aplicación desplegada.

Rutas BrowserRouter: `/` redirige con replace a `/calendario`, conservando query y
hash; `/calendario`, `/mapa`, `/metodo` y 404 para cualquier otra ruta.
NavLink mantiene filtros y estado activo. El navbar ocupa todo el ancho, no tiene
subtítulo y ofrece fuentes y ayuda reales en un desplegable. El mapa es preliminar:
la superposición translúcida se incorporará con la cartografía real.

Pendiente de migrar: Calendario, CSV, selección compartida, Mapa de Juan, capas,
inspectores, Método y métricas. La interfaz nueva no presenta observaciones ficticias.
Los datos y algoritmos permanecen intactos. No se usaron navegadores ni Computer Use.

## Servidor propio

`npm ci` y `npm run build` desde frontend generan `dist/`. Servir ese directorio
con Nginx o Apache; no se necesita backend Node. No se añade configuración Vercel.
Ejemplo dentro de un server Nginx, ajustando root al directorio publicado:

```nginx
root /srv/allpanina/frontend/dist;
location /data/ { try_files $uri =404; }
location /assets/ { try_files $uri =404; }
location / { try_files $uri $uri/ /index.html; }
```

Alternativa Apache (.htaccess en dist, con mod_rewrite y AllowOverride habilitados):

```apache
Options -MultiViews
RewriteEngine On
RewriteRule ^(?:data|assets)(?:/|$) - [END]
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [END]
RewriteRule ^ index.html [END]
```

Los archivos inexistentes de datos/assets deben devolver 404, nunca index.html.
Una ruta desconocida de la SPA recibe index.html y muestra la página 404 cliente
(con HTTP 200 por el fallback estático). Verificar en el servidor definitivo:
`curl -I https://HOST/mapa`, `/metodo` (200 HTML) y `/data/no-existe.csv` (404).
La configuración del servidor no se ha ejecutado en este entorno.

La documentación histórica sigue abajo como referencia de funcionalidades legacy.

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
