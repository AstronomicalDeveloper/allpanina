# React + TypeScript + Vite

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
