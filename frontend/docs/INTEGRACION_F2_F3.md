# Integración de F2 y F3 sobre F0 + F1 + F5a

## Procedencia y estrategia

- Rama de trabajo: `refactor/frontend-redesign`.
- Inicio: `c76402be398c732a4c1cec9054b0ee6b200a7f93`; árbol limpio y F5a presente.
- Bundle: `D:/Software Projects/allpanina-F2-F3.bundle`.
- Entrega: `e8e8eaf84914a641c479d16e0da1c6b8f05589d8`, un único commit F2/F3.
- Base del bundle: `71d4ee31231acd09974ac34e5d3dabeeb1aaaca7` (F1 canónico).

El bundle incremental se verificó después de disponer de los objetos requeridos de
F0/F1 y se importó en `refs/codex/f2-f3`, nunca sobre la rama activa. Se aplicó
únicamente `e8e8eaf` mediante `git cherry-pick -x`. No se fusionó el historial
alternativo de F0/F1 ni se reemplazó nuestra rama. F5a continúa siendo antecesor.

## Resoluciones y alcance

- Único conflicto textual: `tests/router.test.ts`. Se conserva el título de
  Calendar F3 en inglés y el de Map F5a, sin modificar Método F4.
- `tsconfig.app.json` excluye `src/legacy`, archivo de referencia local ignorado
  por Git y sin importaciones desde producción. La ampliación de CalendarSeries
  para B1 hizo fallar su código antiguo. No se excluyó código activo ni pruebas.
- En `ui/Legend.tsx`, las clases usan su índice como clave estable: rangos con
  rótulos enteros iguales ya no producen claves React duplicadas. Se conservan
  cortes, colores, cantidades y cálculos.
- Home y Calendar pasan de `pages/` a `features/`, como indica el bundle; se retiran
  solo sus importaciones CSS heredadas. Los estilos de Map, Method y My region
  siguen en `styles/legacy.css`.
- Se preservan los campos Pending de About. No se inventan biografías.
- No se modificaron Map F5a, `services/data/map.ts`, My region, factores κ,
  algoritmos ni productos científicos publicados. F5b no está incluido.

## Verificación

- `npm run lint`: aprobado.
- `npx tsc --noEmit -p tsconfig.app.json`: aprobado.
- `npm test`: 242 pruebas; 241 aprobadas, 0 fallidas, 1 omitida.
- `npm run build`: aprobado.
- `git diff --check`: aprobado.

La omitida es la paridad lenta de Ucayali, desactivada por defecto. No se suman los
totales de las entregas: comparten pruebas y F3 reemplaza la antigua presentación
por año/comparación con la matriz completa. Permanecen comprobaciones de estados,
CSV, navegación, errores, reintentos, selección, historial y productos publicados.

`tests/f2-f3-integration.test.ts` añade:

1. Comparación exacta de WAPE, período, número de meses y no reportables de todos
   los ámbitos de `method.json`, incluido el resultado nacional sin Ucayali.
2. Recorrido Home → Calendar → Map con Cusco y septiembre de 2024: B1 se conserva
   como serie del calendario y el mapa mantiene MODIS observado; los valores se
   comparan con el CSV publicado. Se comprueba el enlace al archivo calibrado y
   el aviso de que WAPE resume todo el test, no el error mensual ni confianza.

Los porcentajes se leen de los productos existentes, sin recalcular métricas:
Perú 30.8%, Perú sin Ucayali 32.6%, Cusco 46.2%, piloto Ucayali 30.8%.

## Pendientes

No se pudo completar la revisión visual de `/`, `/about`, `/calendar` y `/map`:
el host de acceso a pestañas estaba indisponible y Computer Use detuvo el acceso
nativo al no poder determinar de forma segura la URL del navegador. No se
realizaron más acciones de navegador. Las rutas y el recorrido sí se verifican
mediante las pruebas DOM; esto no sustituye una inspección visual real.

Persisten avisos preexistentes de claves IND duplicadas en el catálogo de países
y del tamaño del chunk MapLibre. No se realizó push ni Pull Request.
