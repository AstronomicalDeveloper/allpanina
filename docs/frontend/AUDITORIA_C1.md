# AllpaNina · C1 — Auditoría del frontend existente

**Fecha:** 15-nov-2026 · **Responsable:** Marco (con Claude) · **Estado:** auditoría hecha; el plan (C2) y la implementación (C4) **no** están hechos.
**Objeto auditado:** rama `refactor/frontend-v2`, commit `0526391`, carpeta `frontend/`. Nada fue modificado en el repositorio.

## 1. Resumen

El frontend actual es **sólido para el piloto de Ucayali** (compila, 125 pruebas pasan, lint limpio, estados de dato bien tratados, textos honestos). Pero **no está listo para los datos nacionales**: probado con los archivos reales de `peru/`, la página Método falla y el Calendario muestra un aviso de error. Además no tiene landing, tiene metadatos básicos sin configurar (idioma y título) y varios textos del mapa son del piloto.

| # | Hallazgo principal | Quién lo resuelve |
|---|---|---|
| H1 | Los validadores rechazan `method.json` y `validation.json` de Perú (contrato v1.1) | **Landry** (A2) |
| H2 | La app lee solo `/data` y asume una sola región por manifiesto | **Landry** (A1–A3) |
| H3 | El mapa mantiene textos y capas del piloto (Ucayali, «celda» de 1 km) con celdas nacionales de 10 km | Landry (A6–A7) + **Marco** (C5, textos) |
| H5 | No hay landing: `/` redirige a `/calendario` | **Marco** (C3) |
| H7 | `lang="en"` y `<title>frontend</title>` en todas las rutas | **Marco** (C4) |

## 2. Cómo se auditó

- Clon limpio de `refactor/frontend-v2` (`0526391`), Node 22, instalación con `npm ci`, pruebas, lint y build.
- Lectura del código de rutas, selección, carga de datos, validadores y páginas.
- Compilación servida en local y fotografiada (escritorio 1440×900, móvil 390×844) en las cinco rutas.
- **Prueba clave:** la misma compilación servida con los **archivos nacionales reales** (`feature/calibracion`, commit `ac99c16`) en lugar de los del piloto, para ver qué ocurre con datos v1.1.
- Prueba de los validadores del frontend directamente contra cada archivo nacional.

**Límites de esta auditoría (no verificado):** contraste de color medido, lector de pantalla, dispositivos reales, rendimiento en red lenta, y el aspecto del mapa **con** mapa base (desde mi entorno estaban bloqueados los servidores de NASA GIBS y Esri, así que solo vi las celdas sobre fondo oscuro). Los tamaños de objetivos táctiles son una medición automática, no una revisión de usabilidad.

## 3. Línea base técnica (verificada)

| Comprobación | Resultado |
|---|---|
| `npm test` | 125 de 125 pasan |
| `npm run lint` | sin errores |
| `npm run build` | correcto (JS 341 kB / 107 kB gzip; librería de mapas aparte, 1,1 MB / 300 kB gzip) |
| Librería del mapa | se carga solo en `/mapa` (comprobado: en `/metodo` no se descarga) |
| Desbordamiento horizontal a 390 px | ninguno en las 5 rutas |
| Instalación limpia | **falla sin arreglo previo** (ver H12) |

## 4. Hallazgos

### P0 — Bloquean una demostración nacional

**H1 · Los validadores rechazan los archivos de Perú** *(Landry, A2)*
Evidencia (ejecutando los validadores reales del frontend contra los archivos publicados):
`manifest.json` OK · `monthly_series.csv` OK · `calibrated_series.csv` OK · los 4 mapas probados OK · **`method.json` FALLA** (`valid.periodo: texto obligatorio`) · **`validation.json` FALLA** (`region_id: texto obligatorio`).
Causa: el código espera un `validation.json` de una región (`region_id` y `methods` en la raíz) y un `method.json` con `resultados.valid` de una región; los archivos nacionales traen una lista `regions`. Efecto en pantalla: Método muestra dos errores y ninguna métrica; Calendario muestra un aviso y no muestra el nombre de la región.
Además, `parseCalibratedSeries` solo admite `split` ∈ {train, valid, test}; el contrato v1.2 agrega `sin_validar` y fallaría. Esto último sale de leer el código, no de una prueba con datos.

**H2 · Una sola fuente de datos, una sola región** *(Landry, A1–A3)*
Las páginas leen `/data/...` fijo (o `/data/demo`). No existe ruta a `/data/peru`. El mapa solo busca el archivo `cells_<region_id del manifiesto>_<año>.geojson`; con `?mapRegion=PE-05` responde «No hay GeoJSON publicado para este año y región», lo cual es honesto y coherente con A7, pero no hay todavía una vista departamental.
Lo que ya existe y sirve: el Calendario **ya muestra un selector de región** cuando los datos traen varias (26 opciones con los datos nacionales) y su selección viaja en la URL (`mapRegion`). Muestra códigos (`PE-05`), no nombres.

**H3 · El mapa nacional conserva textos y capas del piloto** *(Landry + Marco/C5)*
Con datos nacionales el mapa dibuja las celdas de 10 km, pero:
- la capa **«Áreas protegidas · Ucayali»** sigue disponible;
- los textos dicen «celdas con registro · máximo 17 días-celda por celda» y «Inspector de celda», pensados para celdas de 1 km. En el mapa nacional cada polígono es un bloque de 10 km que **suma** días-celda de 1 km; un valor mensual puede superar 31. Esto es exactamente la precaución científica del plan (A7/C5);
- la página Método tiene un párrafo que solo se muestra para `PE-UCA` (celdas de 1 km, EPSG:6933, días de Lima); con datos nacionales no aparece ninguno equivalente que describa el dominio de Perú ni los bloques de 10 km.

**H4 · Contrato v1.2** *(Landry)*: ver H1; además `actualizacion.json` y el valor `sin_validar` no tienen presentación prevista.

**H5 · No hay landing** *(Marco, C3)*
`/` ejecuta una redirección a `/calendario` (`AppRoutes.tsx` y la prueba `router.test.ts`). La única explicación del proyecto está en un ícono «i» del menú y en la página Método. Quien llega no sabe qué es AllpaNina ni qué preguntas puede explorar.

### P1 — Mejoras de comprensión y calidad

**H6 · Códigos en lugar de nombres** *(Marco con Landry, A3)*: «PE-UCA», «PE-05», «PE» aparecen como títulos y opciones. Hace falta una lista de nombres (la fuente debe definirla el equipo de datos o Landry).

**H7 · Metadatos** *(Marco)*: `index.html` declara `lang="en"` y `<title>frontend</title>`; ninguna página cambia el título (verificado en las 5 rutas). Afecta accesibilidad (lector de pantalla pronuncia en inglés), pestañas, historial y enlaces compartidos.

**H8 · Leyendas que confunden** *(Marco, C5)*
- Leyenda del mapa (piloto 2026): «P25–P50 > 1.0 a 1.0» y «P50–P75 > 1.0 a 1.0»: los cortes por percentil coinciden cuando hay pocos valores distintos, y se muestran con un decimal aunque son conteos enteros.
- Escala del calendario: «0.0 · 1395.3 · 2790.5 …» con decimales para conteos, y su máximo por defecto se calcula sobre todos los años (existe un control «Escala» para ajustarlo): en 2026 (máximo 75) casi todos los meses quedan en tonos claros parecidos.
- «Por qué comparar períodos» y «qué significa día-celda» están en Método, no junto al dato.

**H9 · Mensajes de error técnicos** *(Marco, presentación)*: al usuario se le muestran textos como `AJAXError: Failed to fetch (0): https://gibs...` o `valid.periodo: texto obligatorio`. Son útiles para el equipo, no para quien explora. En Calendario, el aviso de error empuja hacia abajo el título de la página.

**H10 · Móvil y objetivos táctiles** *(Marco)*: en 390 px el calendario y Método se ven bien. En el mapa (probado en estado de error) los botones «Encuadrar / Pantalla completa / Copiar enlace» se superponen con la atribución. Medición automática: 7 controles menores de 24 px en Mapa y Método (identifiqué solo dos: el enlace «Manifiesto…» de 20 px de alto y el texto «MapLibre» de 15 px).

### P2 — Infraestructura y mantenimiento

**H11 · El mapa depende de servicios externos** (NASA GIBS, Esri, MINAM): sin internet no hay fondo; la interfaz lo declara («requieren internet») y no se cae, pero el mensaje es técnico (H9).

**H12 · `package-lock.json` apunta a un espejo** *(quien mantenga el lockfile, probablemente Landry)*: 24 de 308 paquetes se resuelven desde `registry.npmmirror.com`. En mi entorno ese servidor estaba bloqueado (403) y `npm ci` se quedó trabado más de 10 minutos. Con las URLs cambiadas al registro oficial instaló en 5 segundos. **Puede afectar a la integración continua o al servidor de despliegue**. Yo solo lo cambié en mi copia local, no lo subí.

**H13 · Peso de los datos** *(Landry, A8)*: los archivos nacionales suman 70 MB sin comprimir (5,2 MB con gzip); un mapa anual llega a 6,3 MB sin comprimir (450 kB con gzip). Sin compresión HTTP en el servidor la experiencia del mapa se degrada. Además la compilación incluye `/data/demo` (datos DEMO etiquetados como tales).

**H14 · Mantenibilidad** *(Marco)*: `tokens.css` solo define 5 colores (`--forest`, `--fire`, `--page`, `--soft`, `--ink`) y una tipografía del sistema; no hay tokens de espaciado, tamaño ni sombras, y varias hojas repiten valores sueltos (corrección del 15-nov: la primera versión de este informe decía por error que estaba vacío); `index.html` enlaza `/favicon.svg` pero ese archivo no existe en `public/` ni en la compilación; el enrutador está escrito en una sola línea y varias vistas tienen líneas de más de 400 caracteres; un archivo del mapa lleva el nombre de una persona (`juanLayers.ts`).

**H15 · Pruebas**: las 125 pasan, pero ninguna usa datos del contrato v1.1 (no hay referencias a `contract_version` ni a regiones `PE-xx` en `tests/`). Por eso H1 no se detectó.

## 5. Qué conservar

- **Identidad visual y jerarquía** del Calendario y Método (paleta, tipografía, tarjetas legibles).
- **Estados de dato correctos**: `ok` / `missing` / cero válido / no publicado, con cero nunca sustituido; años parciales señalados.
- **Textos prudentes**: «las detecciones no equivalen a incendios confirmados ni a superficie quemada».
- **Accesibilidad de base**: enlace «Saltar al contenido», regiones y `aria-label`, botones con `aria-pressed`, tablas con título, `:focus-visible` y `prefers-reduced-motion` presentes en las hojas de estilo.
- **Estado en la URL** (año, mes, sensor, región), exportación CSV, estados de carga y reintento.
- **Carga diferida del mapa** (la librería no pesa en Calendario ni Método).
- **Mapa multiescala e inspector**: el plan pide conservarlos; no los toqué ni los evalué en profundidad.

## 6. Qué corregir y qué se puede eliminar

**Corregir (Marco):** H5, H6 (presentación), H7, H8, H9, H10, textos de H3, H14.
**Corregir (Landry, antes de que Marco toque esos archivos):** H1, H2, H4, H12, H13, y las capas del piloto de H3.
**Eliminar / revisar:** capa «Áreas protegidas · Ucayali» en el contexto nacional (decisión de Landry); ampliar `tokens.css` si se quiere un sistema de diseño; `/data/demo` en la compilación de producción (decisión del equipo).

## 7. Riesgos de coordinación con Landry

1. **Archivos compartidos:** `AppRoutes.tsx` (landing en `/`), `useExplorationSelection.ts` y `Navbar.tsx` (selector de región) los tocarían Marco y Landry a la vez. Acordar quién edita cada uno **antes** de escribir código.
2. **Base de trabajo:** `refactor/frontend-v2` aún no contiene los datos nacionales ni `main`. La rama de Marco debe partir del resultado de A1.
3. **Cualquier cambio en lectores y validadores es de Landry** (límite de responsabilidad de Marco del plan). Marco puede proponer los textos de error (H9) pero no cambiar su lógica.
4. **Un cambio visual no debe alterar cifras ni significados** (H8: se pueden redondear etiquetas de leyenda, no los valores).

## 8. Próximo paso (C2, no iniciado)

Proponer el plan priorizado de refactorización con alcance por página, dependencias con Landry, riesgos y criterios verificables. Una propuesta concreta: **primero landing + metadatos + textos del mapa (Marco, sin tocar lectores)**, mientras Landry resuelve H1–H2; después, leyendas y mensajes de error.
