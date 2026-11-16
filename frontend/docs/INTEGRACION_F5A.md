# Integración local de Mapa F5a

- Destino inicial: `refactor/frontend-redesign`, `d3b95e956c0d9bd8287a208254e3dc55fa9d1828`.
- Origen: `origin/refactor/frontend-map`, `5f86226b7a3b3b1faac2efbdc08d8c4df0a371f4`.
- Base común: `b12263634ae377b85f50bd9d7d4ba7519c9cca85`.
- El árbol local estaba limpio. Se actualizó origin antes de comparar y fusionar.
- Solo se incorporó el commit F5a; no se integraron F2, F3 ni F5b.

## Resoluciones

Hubo cinco bloques de conflicto en tres archivos de pruebas:
`department-navigation.test.ts`, `map-v2.test.ts` y `peru-stage2.test.ts`.
Se conservaron el selector `Area` y la comprobación de navegación activa de F1,
combinándolos con los textos y controles en inglés de F5a. No se descartaron
comprobaciones numéricas, geográficas ni de independencia entre sensores.

La rama F5a usaba una versión distinta de las utilidades de fecha de F0.
Se adaptó `AnnualCellDetail.tsx` a los nombres de meses del mapa y
`useJuanMap.ts` a `formatMonthLong`, sin cambiar la API compartida de F0.

La primera suite detectó otras expectativas antiguas de textos y rutas del mapa.
Se actualizaron sus traducciones y selectores en las pruebas de mapa, router,
texto científico y enlace Calendario → Mapa. No se eliminaron ni desactivaron
pruebas. El código de Home y Calendar permanece sin cambios.

## Verificaciones

- `npm run lint`: aprobado.
- `npx tsc --noEmit -p tsconfig.app.json`: aprobado.
- `npm test`: 237 aprobadas, 0 fallidas, 1 omitida de 238.
- `npm run build`: aprobado.
- `git diff --check`: sin errores.

La prueba omitida es la paridad lenta de Ucayali, desactivada por defecto; no se
presenta como aprobada en esta integración. Persisten los avisos preexistentes de
claves `IND` duplicadas del catálogo de países y tamaño del chunk MapLibre.

No se modificaron estilos globales de F0, shell/rutas F1, My region, productos
publicados, factores κ ni algoritmos científicos. `services/data/map.ts` cambia
los textos del popup y su formato de presentación. Los cambios de colores y fondos
afectan la representación, manteniendo los valores observados y los cortes.

Sin inspección visual mediante navegador ni Computer Use. Las pruebas de fondos
y capas simulan fallos de proveedores; no acreditan disponibilidad de sus servicios
reales. No se hizo push ni Pull Request. F5b continúa pendiente.
