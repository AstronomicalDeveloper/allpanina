# Integración final F0–F5b y C12

## Historial y alcance

- Destino: `refactor/frontend-redesign`, inicio `2448554687b89a128f796e30ad72c470573a2b00`, árbol limpio.
- Origen: `origin/refactor/frontend-map`, `ad14545a12b659f129f1d99e06b7c888df2fa71a`, confirmado en GitHub. No fue necesario publicar otra vez esa rama.
- Base común: `5f86226` (F5a). Se fusionó el historial mediante `git merge --no-commit --no-ff`, sin volver a aplicar F5a ni reemplazar F0/F1.
- Commits nuevos: `4f5f74e` (F5b), `b874e39` (F4b), `5938341` (F4) y `ad14545` (C12).

Se conservan Home/About F2, Calendar F3 y la navegación F1. No se modifican `main`, los productos de `public/data`, los scripts científicos, κ ni contratos de datos. En los servicios de My region, los cambios son mensajes de error y progreso en inglés; las advertencias originales siguen en la procedencia descargada.

## Conflictos y ajustes de integración

Los únicos conflictos textuales fueron `tests/peru-stage2.test.ts` y `tests/scientific-copy.test.ts`: se conservaron los selectores actuales de F1, los textos nuevos de F4 y las comprobaciones de interpretación trasladadas al panel Information de F5b. Se mantiene la comprobación de cuatro clases de la leyenda cartográfica.

La entrega utilizaba otra variante de la API F0. Se adaptaron `MapWorkspace.tsx` al contrato `Tabs` vigente (incluidos los vínculos ARIA entre pestañas y paneles), `TimeBar.tsx` al formateador de meses existente y `RegionPage.tsx` a `ButtonLink` y `PageHeader`. El ayudante interno de la línea de tiempo deja de exportarse para respetar Fast Refresh.

`styles/tokens.css` enlaza los nombres CSS utilizados por F4/F4b/F5b con la paleta canónica de `app.css`. Se comprobó que las variables requeridas están presentes también en el CSS de producción. No se cambia la paleta científica ni los cortes de clasificación.

Las pruebas de Method, navegación y evaluación usan los rótulos ingleses entregados. La prueba de la hoja móvil verifica el estado inicial minimizado, la expansión al cambiar de pestaña y las tres alturas, manteniendo sus comprobaciones de estado y selección. No se eliminan pruebas ni aserciones científicas.

Archivos afectados: páginas y estilos de Map, Method y My region; mensajes de `services/region`; alias de estilos; pruebas de esos módulos y navegación; este informe. Home/About, Calendar y `services/data/map.ts` permanecen intactos.

## Validación

- `npm ci --offline --no-audit --no-fund`: aprobado, sin cambios de dependencias ni lockfile.
- `npm run lint`: aprobado.
- `npx tsc --noEmit -p tsconfig.app.json`: aprobado.
- `ALLPANINA_LENTO=1 npm test`: **249 aprobadas, 0 fallidas, 0 omitidas**.
- Incluye paridad byte a byte de la serie, B0/B1 y los 14 mapas de Ucayali.
- `npm run build`: aprobado; conserva el aviso de tamaño de chunks de Vite.
- `git diff --check`: aprobado.

Las pruebas cubren Home → Calendar → Map, región/mes/sensores independientes, rutas antiguas `/metodo` y `/mapa`, valores y WAPE publicados, cinco pasos de My region, conjuntos locales, pestañas con teclado, línea de tiempo, hojas móviles, fondos de respaldo y registro/reintento del icono SDF C12.

## Pendientes para F6

- Revisión visual en navegador: escritorio y móvil, tamaños reales de la hoja del mapa, teclado y lectura de leyendas. Las comprobaciones de interfaz aquí son automatizadas con JSDOM y runtime cartográfico simulado.
- Comprobación real de proveedores cartográficos, acceso FIRMS/CORS y descargas de límites en el entorno de despliegue; no se configura Nginx ni se despliega.
- Revisar el aviso existente de claves React duplicadas `IND` en el catálogo mundial; no impide las pruebas, pero requiere revisar el catálogo antes de modificar datos.
- Evaluar el tamaño del bundle de producción si F6 exige optimización. No se añade una refactorización a esta integración.
