# React + TypeScript + Vite

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
enteros sin filas. No hay B0/B1, mapa ni pantalla Método. `n_detections` e
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
