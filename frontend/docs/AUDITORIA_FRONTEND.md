# Auditoría del frontend de AllpaNina

- **Fecha:** 15-nov-2026
- **Rama auditada:** `feat/peru-integration` (`30c5f3e`)
- **Rama de trabajo creada:** `refactor/frontend-redesign`, desde `30c5f3e`. Por ahora es local, en el espacio de Claude.
- **Método:** lectura del código; `npm ci`, `lint`, `test` y `build`; recorrido de las 5 rutas en Chrome sin interfaz, en escritorio (1440×900) y móvil (390×844), con 16 capturas y registro de consola y red.
- **Alcance:** solo `frontend/`. Los datos científicos de `public/data/` no se evaluaron; ya están validados en P11 a P19.

---

## 1. Resumen

El frontend **funciona y es sólido en lo técnico**:
- lint sin errores, 185 de 185 pruebas y build correcto;
- valida cada archivo de datos antes de mostrarlo y nunca inventa valores;
- es accesible en lo básico: enlace «Saltar al contenido», `aria-*` y foco visible.

El problema no es que esté roto. Es que **se ve y se lee como una herramienta interna**:
- se filtran nombres de archivos, códigos y referencias a documentos del equipo;
- el calendario, la pieza central, casi no comunica, por cómo está calculada la escala de color;
- no hay un sistema visual: 5 colores, ninguna tipografía propia, ninguna escala de tamaños.

Para el rediseño, la lógica de datos (`services/`, `types/`) se puede conservar casi entera. Lo que hay que rehacer es la capa visual y la jerarquía de contenido.

**Lo que más pesa ante un jurado, en orden:**
1. El calendario sale «lavado»: todos los meses se ven del mismo color (§4, C1).
2. La página Método muestra texto interno, como «contrato v1.1 D», `DECISIONS.md §11.3`, «aprobado por Aldo (P11 y P15)» o `PE-SIN-25` (§4, C2).
3. Hay códigos en vez de nombres en varias partes: `PE-08` en lugar de «Cusco» (§4, C3).
4. Si falla una sola capa base, el mapa entero muestra un error técnico en medio de la pantalla (§4, C4).
5. No hay identidad visual formal ni un pie de página con créditos de NASA y del equipo (§5).

---

## 2. Estado de las ramas

| Rama | Último commit | Qué tiene |
|---|---|---|
| `main` | `384654f` (13:44) | `peru-integration` + calibración (PR #7 y #8) |
| `feat/peru-integration` | `30c5f3e` (13:29) | **Base de esta auditoría** |
| `refactor/frontend-fase2` | `0e2a7e8` (14:38) | `main` + 4 correcciones de Landry: leyendas sin decimales, el menú «Acerca de» enlaza el manifest de Perú, el inspector dice «cuadrículas de 10 km» y un documento del plan C2 |
| `feat/region-mundial` | `7554830` | `peru-integration` + página «Mi región» (≈3 200 líneas nuevas) |

- **«Mi región» no está en `feat/peru-integration`.** Solo existe en `feat/region-mundial`.
- **Las 4 correcciones de `fase2` tampoco están en `peru-integration`.** Al rediseñar conviene traerlas, o partir de `fase2`, para no repetir esos arreglos. Son 10 archivos y 99 líneas.

---

## 3. Cómo está construido

### 3.1 Stack
- React 19, TypeScript, Vite 8 y React Router 7.
- MapLibre GL 6.18 para el mapa.
- **Tailwind 4 está instalado pero no se usa:** ningún CSS lo importa y ningún componente usa sus clases. Es una dependencia muerta.
- 3 269 líneas en `src/`, más 185 pruebas en `frontend/tests/` (Node test runner con `tsx`).

### 3.2 Rutas
Están en `src/app/AppRoutes.tsx`. Todas comparten `MainLayout`, que es `Navbar` + `<main>`.

| Ruta | Página | Qué hace |
|---|---|---|
| `/` | `LandingPage` | Portada: titular, 3 tarjetas, origen de los datos, «Lo que estos datos no dicen». Si llega `?algo`, redirige a `/calendario` |
| `/calendario` | `CalendarPage` | Calendario de 12 meses por año, comparación de años, sensor, descarga CSV y panel de detalle |
| `/mapa` | `MapPage` | Mapa a pantalla completa con paneles «Cartografía» y «Explorar observaciones» |
| `/metodo` | `MethodPage` | Explicación del indicador, calibración, partición en entrenamiento, validación y prueba, WAPE, fuentes |
| `*` | `NotFoundPage` | 404 |

### 3.3 Estado y datos
- **El estado vive en la URL** (`?mapRegion=PE-08&year=…`), mediante `useExplorationSelection`. Por eso las vistas se pueden compartir con un enlace. Hay que conservarlo.
- **Hay tres modos de datos** (`services/data/geography.ts`): `peru` (por defecto), `pilot` (Ucayali v1, `?data=pilot`) y `demo`.
- **Cada página carga sus propios archivos** con `loaders.ts`, sin caché compartida. Al pasar de Calendario a Mapa a Método se vuelven a descargar `manifest.json`, `method.json` y la serie.
- **Los validadores** (`validators.ts`, `peruValidators.ts`) comprueban el contrato v1.1 y rechazan archivos inconsistentes. Es un punto fuerte.

### 3.4 Componentes principales
- **`Navbar`**: marca, 3 enlaces y un menú «Acerca de» dentro de `<details>`.
- **`GeographicSelection`**: el selector de región. Se inyecta en el layout por encima de cada página, y en el mapa queda flotando con `position: fixed`.
- **Calendario**: `CalendarExplorer` (controles), `CalendarGrid` (rejilla), `CalendarDetail` (panel derecho) e `HistoricalAnalysis`.
- **Mapa**:
  - `useJuanMap` (272 líneas): el ciclo de vida de MapLibre;
  - `mapConstruction.ts` (287): fuentes y capas;
  - `juanLayers.ts` (220): fondos;
  - `MapWorkspace`: los paneles.
- **Método**: `ProcessingSection`, `NationalMethodNotes`, `EvaluationSection` y `SourcesSection`.

### 3.5 Estilos
- **Un CSS global por página**, todos importados en `main.tsx`. No hay módulos ni alcance por componente. Hay unos 600 líneas de CSS entre `calendar.css`, `map.css`, `method.css`, `landing.css` y `global.css`.
- **`tokens.css` define solo 5 variables:** `--forest`, `--fire`, `--page`, `--soft` e `--ink`.
  - No hay escala tipográfica, espaciados, radios ni sombras.
  - Hay colores sueltos repetidos a mano: `#376258`, `#2c554c`, `#a4b9ab`, `#FFD0AD`…
- **Tipografía: `"Segoe UI", system-ui`.** Ese tipo solo existe en Windows, así que en Mac, Linux y móviles la web se ve con otra fuente.

### 3.6 Datos publicados
- `public/data/` pesa **105 MB**: `peru/` 70 MB y los mapas del piloto de Ucayali 35 MB.
- Se sirven como archivos estáticos, y Vite los copia tal cual a `dist/`.

---

## 4. Fallas encontradas

Gravedad: 🔴 se ve mal o es incorrecto · 🟠 confunde o resta formalidad · 🟡 técnica o mantenimiento.

### Contenido y datos en pantalla

| # | Gravedad | Dónde | Problema | Evidencia |
|---|:-:|---|---|---|
| C1 | 🔴 | Calendario | **La escala de color usa el máximo de toda la serie, y de los dos sensores juntos** (`scaleMax`, línea 52 de `CalendarExplorer.tsx`, que no filtra por sensor). VIIRS cuenta unas 4 veces más que MODIS, así que con MODIS la escala queda aún más alta. En Perú el máximo es 25 046, y en 2026 (meses de 40 a 576) todo sale casi del mismo crema. El calendario deja de mostrar la estacionalidad, que es su razón de ser. Además, «Abril · 0» se pinta en verde agua y destaca más que los meses con fuego. | Capturas `movil-calendario` y `desktop-calendario-cusco` |
| C2 | 🔴 | Método | **Se filtra texto interno.** Aparecen «contrato v1.1 D», «alternativa (b) de DECISIONS.md §11.3», «PE-SIN-25», «aprobado por Aldo (P11 y P15)» y rutas como `docs/t29/RESULTADO_T29.md`. El recuadro «La calibración declarada» pega tal cual el campo `calibration` de `method.json`, que está escrito para el equipo, no para el público. | `ProcessingSection.tsx`, `SourcesSection.tsx`; captura `desktop-metodo-cusco` |
| C3 | 🟠 | Mapa, Método | **Códigos en vez de nombres:** el mapa muestra «PE-08 · Año 2026» y Método muestra «PE-08» como título del conjunto. El público espera leer «Cusco». | Capturas de mapa y método |
| C4 | 🔴 | Mapa | **Si falla una sola capa base, todo el mapa queda en error.** Aparece un recuadro grande con la URL técnica: «Recurso cartográfico o WebGL no disponible: AJAXError… gibs.earthdata.nasa.gov…». Lo correcto sería cambiar a otro fondo, o a ninguno, y seguir mostrando los datos. | Captura `desktop-mapa-cusco`. En mi entorno GIBS está bloqueado, pero un corte de GIBS el día del jurado produciría lo mismo. |
| C5 | 🟠 | Calendario, Mapa | **El año por defecto es 2026, que es parcial** (7 de 12 meses). La primera impresión es un calendario con 5 meses vacíos. Conviene abrir en el último año completo (2025). | Capturas |
| C6 | 🟠 | Selector | **El enlace «Piloto v1.0» está siempre visible** junto al selector. Para un usuario externo no significa nada y lleva a otro conjunto de datos. | `GeographicSelection.tsx` línea 31 |
| C7 | 🟠 | Mapa | **La capa «Áreas protegidas · Ucayali» sigue filtrada solo a Ucayali**, aunque la web ya cubre todo el Perú. | `mapConstruction.ts`; panel Cartografía |
| C8 | 🟠 | Leyendas | **Decimales en conteos:** «458.5», «6261.5». Los días-celda son enteros. *Ya está corregido en `fase2`.* | Capturas de calendario |
| C9 | 🟠 | Navbar | **«Acerca de» enlaza `/data/manifest.json`**, que es el manifest del piloto de Ucayali, no el de Perú. Además su texto dice «Las herramientas científicas se incorporarán progresivamente», que suena a borrador. *El enlace ya está corregido en `fase2`; el texto no.* | `Navbar.tsx` |
| C10 | 🟠 | Calendario | **El panel «Descripción» queda vacío** («Selecciona un mes») y ocupa un tercio del ancho hasta que se elige un mes. Es espacio muerto en la primera vista. | Captura `desktop-calendario-cusco` |
| C11 | 🟠 | Calendario | **Texto técnico debajo de la tarjeta:** «CSV: 163 registros de PE-08 / MODIS, todos los años disponibles. La selección del mes no filtra la descarga.» | Captura `desktop-calendario-cusco` |
| C12 | 🟡 | Mapa | **MapLibre avisa que falta el icono `celda-cuadrada-sdf`.** La capa de celdas lo pide antes de registrarlo. | Consola en `/mapa` |

### Diseño y experiencia

| # | Gravedad | Problema |
|---|:-:|---|
| D1 | 🟠 | **No hay sistema visual.** Hay 5 colores, ninguna escala tipográfica ni de espaciado, y colores sueltos repetidos. Cada página se ve un poco distinta. |
| D2 | 🟠 | **La tipografía depende del sistema operativo** (Segoe UI). Fuera de Windows cambia el aspecto. No se carga ninguna fuente web. |
| D3 | 🟠 | **El texto es muy pequeño:** hay elementos de menos de 12 px (39 en Método, 27 en Mapa y 13 a 27 en Calendario). Cuesta leer y se ve poco cuidado. |
| D4 | 🟠 | **La navbar es una «píldora» flotante con bordes redondeados.** Se ve amigable pero poco institucional. Herramientas como FIRMS usan una barra plana y fija, con la identidad a la izquierda y las secciones claras. |
| D5 | 🟠 | **No hay pie de página.** Faltan créditos (NASA FIRMS, LANCE y ESDIS, INEI, MINAM, Esri), equipo, enlace al repositorio y el aviso de uso. FIRMS y GFW siempre los tienen. |
| D6 | 🟠 | **El inicio no muestra el producto.** Es solo texto: no hay ningún mapa, cifra ni imagen que diga «esto es lo que vas a ver». Tampoco tiene una llamada a la acción por región, como «Elige tu departamento». |
| D7 | 🟠 | **El selector de región va separado del encabezado de cada página**, como una barra suelta encima. En el mapa flota sobre el mapa con `position: fixed` y tapa parte del territorio. |
| D8 | 🟡 | **En móvil el mapa queda tapado.** Entre la navbar, que ocupa dos filas, el selector, la etiqueta de contexto, el panel inferior y el aviso de error, apenas queda mapa visible. |
| D9 | 🟡 | **No hay página «Acerca de» ni «Equipo».** Su maqueta original tenía «¿Qué es AllpaNina?», «Misión y visión» y «Nuestro equipo». |

### Técnica y mantenimiento

| # | Gravedad | Problema |
|---|:-:|---|
| T1 | 🔴 | **`package-lock.json` resuelve 24 paquetes en `registry.npmmirror.com`**, un espejo chino, en vez del registro oficial (`registry.npmjs.org`). Ahí `npm ci` se cuelga: en mi entorno estuvo más de 10 minutos y respondió 403. Cualquier servidor de despliegue o CI con red restringida fallará. Hay que regenerar el lockfile contra el registro oficial. |
| T2 | 🟡 | **MapLibre (1,1 MB) ya se carga de forma diferida:** comprobado, la portada y el calendario no lo descargan. El aviso de Vite sobre paquetes de más de 500 kB es por ese archivo. Lo que se puede mejorar es que el paquete principal (388 kB, 122 kB comprimido) trae las 4 páginas juntas; con `React.lazy` por ruta, la portada cargaría más rápido. |
| T3 | 🟡 | **Código muy comprimido:** 64 líneas de más de 300 caracteres; la más larga tiene 965, en `NationalMethodNotes.tsx`. Hay componentes enteros escritos en una sola línea. Es difícil de revisar y de modificar. |
| T4 | 🟡 | **Tailwind instalado sin usar** (ver §3.1). Hay que decidir: o se adopta o se quita. |
| T5 | 🟡 | **Cada página vuelve a descargar los mismos archivos** (§3.3). Una caché simple por URL evitaría esperas al navegar. |
| T6 | 🟡 | **No hay metadatos para compartir** (`og:title`, `og:image`). Un enlace pegado en WhatsApp o LinkedIn sale sin vista previa. |
| T7 | 🟡 | **`public/data/` pesa 105 MB**, y 35 MB son mapas del piloto de Ucayali. El hosting gratuito (GitHub Pages, Vercel) lo soporta, pero el despliegue será lento. |

### «Mi región» (rama `feat/region-mundial`)

No la pude probar en vivo: mi red no llega a FIRMS. Leyendo el código:

- **Causa probable de que no funcione: el navegador llama directo a la API de FIRMS.** El propio código lo anticipa: «La base se puede cambiar a un proxy propio (`VITE_FIRMS_BASE=/firms`) si FIRMS bloquea CORS». Si FIRMS no permite llamadas desde otro dominio, todo pedido falla. *Hipótesis no verificada.*
- **El volumen hace la descarga inviable en el navegador.** La API admite como máximo 5 días por pedido. 2013-2026 son unos 1 000 pedidos por sensor, y el usuario además debe pegar su propio `MAP_KEY`.
- **Choca con el mensaje científico.** Calcula un κ y corre un «test» automático para cualquier región del mundo. Eso contradice la regla del proyecto de un test ciego corrido una sola vez con autorización. Si se presenta, debe ir claramente marcada como exploratoria; mejor aún, se deja fuera de la entrega.

**Recomendación:** no incluir «Mi región» en el rediseño de hoy.

---

## 5. Lo que hay que conservar

- **El estado en la URL**: la región, el año, el mes y el sensor se pueden compartir con un enlace.
- **Los validadores y los tres estados de dato:** «cero válido», «sin dato» y «no publicado». Es una distinción científica valiosa.
- **La regla del mapa:** solo muestra observaciones, nunca B1 por celda.
- **«Lo que estos datos no dicen»** en la portada. Es honesto y a los jurados les gusta.
- **Las bases de accesibilidad:** enlace de salto, `aria-*`, foco visible y `prefers-reduced-motion`.
- **Las 185 pruebas.** El rediseño tiene que mantenerlas en verde.

---

## 6. Recomendación para el rediseño (resumen)

1. **Partir de `refactor/frontend-fase2`**, o traer sus 4 correcciones, y regenerar el `package-lock.json` contra el registro oficial (T1).
2. **Crear un sistema visual** en `tokens.css`, con este estilo institucional y sobrio, cercano a FIRMS:
   - barra superior plana y fija;
   - fondo claro y texto oscuro;
   - una fuente web propia (por ejemplo Inter o IBM Plex Sans);
   - escala tipográfica y de espaciado;
   - acento de fuego reservado para datos y acciones.
3. **Nueva portada:**
   - titular con la cifra clave y un mini mapa o calendario real del Perú;
   - selector «Elige tu departamento» que lleve directo al calendario;
   - tres pasos (Calendario → Mapa → Método);
   - créditos.
4. **Arreglar C1 a C7 y C10 a C11**:
   - escala de color por año, con opción de escala global;
   - texto público en Método; los detalles técnicos van en «Detalle técnico», plegados;
   - nombres en vez de códigos;
   - el mapa resiste la caída de una capa base;
   - año por defecto completo;
   - fuera el enlace «Piloto v1.0» de la vista principal.
5. **Pie de página** con fuentes, equipo, repositorio y aviso de uso. **Página «Acerca de»** con misión y equipo.
6. **Carga diferida por ruta** (T2) y metadatos para compartir (T6).

El detalle visual del rediseño se acordará en el siguiente paso.
