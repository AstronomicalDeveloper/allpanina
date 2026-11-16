<p align="center"><a href="README.md">English</a> · <strong>Español</strong></p>

<h1 align="center">🔥 AllpaNina</h1>

<p align="center"><strong>Comprende catorce años de actividad térmica, con ciencia reproducible detrás de cada comparación.</strong></p>

<p align="center">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?logo=react&amp;logoColor=white">
  <img alt="TypeScript 6" src="https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&amp;logoColor=white">
  <img alt="Python 3.12+" src="https://img.shields.io/badge/Python-3.12%2B-3776ab?logo=python&amp;logoColor=white">
  <img alt="MapLibre GL" src="https://img.shields.io/badge/MapLibre-GL-396cb2">
  <a href="LICENSE"><img alt="Licencia MIT" src="https://img.shields.io/badge/License-MIT-fb9c38"></a>
  <a href="https://github.com/AstronomicalDeveloper/allpanina/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/AstronomicalDeveloper/allpanina/actions/workflows/ci.yml/badge.svg?branch=main"></a>
</p>

<p align="center"><strong>NASA Space Apps Challenge 2026 · Prototipo científico</strong></p>
<p align="center">MODIS y VIIRS · Perú y sus 25 departamentos · Enero de 2013–julio de 2026</p>

---

*Allpa* significa tierra y *nina*, fuego en quechua. AllpaNina reúne un explorador histórico, una calibración explícita entre sensores y sus resultados de evaluación. El despliegue público está previsto; todavía no se afirma una URL de la aplicación en funcionamiento.

## ¿Qué problema aborda?

MODIS y VIIRS observan con instrumentos y tamaños de píxel diferentes. Unir directamente sus conteos puede introducir un salto aparente que refleje el cambio de sensor y no un cambio de actividad.

AllpaNina permite comparar series de **días-celda**, consultar una estimación calibrada y conocer su error retrospectivo. Las observaciones y las estimaciones permanecen identificadas por separado.

## Explora el proyecto

| Página | Función |
|---|---|
| **Home** | Calendario de 14 años, selección de departamento y meses destacados calculados con los datos |
| **Calendar** | Matriz mensual, MODIS/VIIRS y B1 cuando está publicado, comparación histórica y descarga CSV |
| **Map** | Celdas observadas, fondos de respaldo, inspector, panel móvil y leyenda en el menú **+** |
| **Method** | Indicador, calibración, evaluación publicada, limitaciones y procedencia |
| **My region** | Cinco secciones para cargar archivos FIRMS y procesar resultados exploratorios en el navegador |
| **About** | Equipo, fuentes, reconocimientos y uso de IA |

La interfaz está en inglés. Se conservan las redirecciones desde `/calendario`, `/mapa`, `/metodo` y `/mi-region`, incluidos los parámetros y el ancla. El piloto Ucayali está disponible con `?data=pilot&mapRegion=PE-UCA`; DEMO requiere `?data=demo` y nunca sustituye silenciosamente una carga fallida.

## Método y límites

Las detecciones se filtran y agrupan por celda, día local y sensor. Varias detecciones del mismo sensor en una celda-día cuentan una vez; después se agregan por región y mes.

**B0** es VIIRS sin factor. **B1** aplica un factor κ ajustado con entrenamiento y evaluado en períodos separados de validación y test. El agregado nacional suma las estimaciones departamentales publicadas. B1 es una estimación **región-mes**: no se aplica a las celdas del mapa.

Una detección térmica no equivale a un incendio confirmado ni a superficie quemada. Cero, dato faltante y período no publicado son estados distintos. Un κ fijo puede subestimar picos o sobreestimar períodos tranquilos; **WAPE no es un porcentaje de confianza para meses futuros**. Los resultados de My region son exploratorios.

Consulta el [método publicado](frontend/public/data/peru/method.json), la [evaluación](frontend/public/data/peru/validation.json), el [manifiesto](frontend/public/data/peru/manifest.json) y las [decisiones científicas](DECISIONS.md).

## Instalación y pruebas

La guía [REPRODUCIBILITY.md](REPRODUCIBILITY.md) explica los comandos, insumos, resultados esperados y límites de cada comprobación; no necesitas buscar informes internos.

Requiere **Node.js 24**. Desde `frontend/`:

```sh
npm ci
npm run dev
```

Comprobaciones: `npm run lint`, `npx tsc --noEmit -p tsconfig.app.json`, `npm test` y `npm run build`. En PowerShell se pueden usar `npm.cmd` y `npx.cmd`. La variable `ALLPANINA_LENTO=1` habilita la regresión lenta del frontend.

El procesamiento científico está en `allpanina/` y `scripts/`. Con Python 3.12 o posterior, instala `requirements.txt` en un entorno virtual y ejecuta `python -m pytest tests/ -q`. Con `ALLPANINA_LENTO=1` se incluyen las regresiones completas de Perú y Ucayali.

La web utiliza React, TypeScript, Vite, Tailwind CSS y MapLibre GL. El procesamiento Python usa pandas, NumPy, PyArrow, pyproj y Shapely. No requiere FastAPI ni una base de datos: los productos publicados son estáticos y My region procesa en un Worker local.

## Equipo

| Integrante | Responsabilidades acordadas |
|---|---|
| Aldo Fabricio Ruiz Collazos | Método científico, ámbito de estudio, contratos de datos y período de test reservado |
| Marco Antonio Arcila Santander | Adquisición FIRMS, normalización, días-celda, series y mapas observados |
| Karla Antonella Montes Matamoros | Calibración B0/B1, métricas, residuos, validación y test |
| Juan Matías Purihuaman Rivera | Mapa React/MapLibre, filtros, interacciones y pruebas de integración |
| Landry Gabriela Guadalupe Bardales | Arquitectura web, calendario, método, integración y despliegue |
| Adriana Bazan Liberato | Wireframes, sistema visual, accesibilidad, leyendas, video y presentación |

Las afiliaciones y biografías están pendientes de confirmación por cada integrante.

## Fuentes, IA y licencia

Reconocemos a **NASA FIRMS, MODIS, VIIRS, INEI, MINAM, NASA GIBS, Esri y geoBoundaries**, además de los datos de zonas horarias de IANA y las fuentes IBM Plex. Las licencias particulares de límites administrativos figuran en el [catálogo](frontend/public/cartography/world/index.json). Los términos de las imágenes, fuentes y datos siguen siendo los de sus proveedores.

El equipo utilizó **ChatGPT y Codex (OpenAI)** y **Claude (Anthropic)** para programación, documentación, revisión y asistencia técnica. Las decisiones científicas y la validación final corresponden al equipo humano. [Declaración de IA](AI_USE.md).

Código bajo [licencia MIT](LICENSE). Los datos no se relicencian mediante esa licencia.

## Despliegue previsto

La aplicación se publicará como sitio estático en Ubuntu, ISPConfig y Nginx. El dominio propuesto es `allpanina.astrodev.pe`; aún no se declara desplegado. El artefacto es `frontend/dist/`, generado con `npm ci` y `npm run build`.

El alojamiento debe ofrecer HTTPS, rutas SPA, 404 reales para archivos inexistentes y compresión JSON/GeoJSON. La configuración de AllpaNina debe permanecer aislada del sitio BugLab. No se necesitan credenciales para explorar los productos publicados; la MAP_KEY opcional de FIRMS la introduce el usuario y no debe formar parte del build.

[Guía de despliegue](DEPLOYMENT.md) · [Más detalles técnicos en inglés](README.md).
