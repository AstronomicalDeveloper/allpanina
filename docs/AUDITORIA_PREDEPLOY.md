# Auditoría previa al despliegue y conservación de ramas

**Nota de cierre:** las secciones 1-9 conservan la auditoría inicial. La sección 10 registra las correcciones y decisiones posteriores autorizadas para publicar e integrar esta rama.

## 1. Alcance, base y estado

Base: `main` y `origin/main` en `d6a16682b8454c1c72dad117859344bdc8e03508`, PR #11 integrado. [CI de esa base aprobada](https://github.com/AstronomicalDeveloper/allpanina/actions/runs/43786447566).

Trabajo en **`chore/predeploy-audit`**, creada desde `main`. Al empezar ya existían siete cambios locales de la retirada del backend solicitada por la usuaria: CI, AGENTS, README, contrato y tres archivos del backend. Se trasladaron conservándolos a esta rama. `main` no se modifica, no se publica esta auditoría, no se crean PR ni etiquetas y no se borran ramas.

La aplicación de producción es React estático. `allpanina/` y `scripts/` reproducen los resultados con Python; `tests/` valida ciencia; los CSV/JSON/GeoJSON de `frontend/public/` son productos publicados. Los informes, contratos, registros y ZIP de `docs/` son investigación y procedencia, no el artefacto desplegable. My region procesa en un Worker local, no en un backend HTTP.

## 2. Hallazgos por gravedad

| Gravedad/estado | Hallazgo | Acción o decisión |
|---|---|---|
| Alta, corregida en dependencias de desarrollo | npm audit señalaba `undici` 8.10.2, transitiva de jsdom | Lockfile actualizado a 8.12.4 dentro del rango admitido, sin cambiar dependencias directas. Nuevo npm ci y pruebas aprobados. |
| Media, pendiente de alojamiento | El preview local devuelve HTTP 200 + HTML para archivos inexistentes de `/data/`, `/cartography/` y `/assets/` | No usarlo como servidor de producción; exigir 404 reales antes del fallback SPA. No se configura un proveedor sin elegirlo. |
| Media, pendiente | Siete alertas moderadas npm del árbol `typescript-eslint`/`minimatch` de desarrollo | No se fuerza una versión mayor ni el downgrade que propone npm audit. Revisar una actualización compatible del tooling. No corresponden a código necesario en el servidor estático final. |
| Tooling Python, pendiente de decisión de versión | OSV señala pytest 8.4.2: GHSA-6w46-j5rx-g56g / PYSEC-2026-1845, manejo de temporales | Corrección publicada desde 9.0.3; exige cambiar la restricción `pytest~=8.0`. Se documenta para revisión en vez de migrar automáticamente de versión mayor. Usar temporales de pruebas dedicados. No es una API expuesta por la web. |
| Tooling local | OSV señaló pip 26.1.2: GHSA-qwm4-qh6w-59xr / PYSEC-2026-3721, URLs de índices doblemente codificadas | Corrección desde 26.2.0. La CI consolidada conserva la actualización de pip antes de instalar. No hay credenciales detectadas en la configuración versionada. |
| Media, catálogo conservado | `public/cartography/world/index.json` tiene 199 registros pero 198 ISO3 distintos: dos entradas idénticas de India (`IND`) | Explica los avisos de claves React duplicadas en My region. No se modifica el catálogo publicado ni se inventan países; requiere revisar la fuente/generador antes de corregirlo. El README evita afirmar 199 países únicos. |
| Media, rendimiento móvil | Artefacto estático de aproximadamente 175 MiB, dominado por productos y cartografía | Compresión HTTP y verificación de transferencia obligatorias; no simplificar geometrías ni cambiar productos congelados en esta limpieza. |
| Baja, corregida | Backend FastAPI de solo `/health`, sin consumidor frontend | Retirada autorizada y limpieza de sus referencias activas en CI, documentación e instrucciones. |
| Baja, corregida | Dos jobs Python ejecutaban la misma suite | Consolidación sin perder pruebas, sintaxis ni separación del frontend. |
| Baja, corregida | `PreviewSection.tsx` preliminar sin referencias | Retirado; no participa en rutas, imports ni pruebas. |
| Baja, corregida | README frontend acumulaba cientos de líneas de etapas incompatibles y plantilla Vite | Guía actual y archivo histórico íntegro enlazado. |
| Pendiente manual | Renderizado, tacto, accesibilidad y proveedores externos reales | Las pruebas JSDOM y el preview HTTP no son una validación visual. Comprobar escritorio y 390 px después de seleccionar alojamiento. |

No se detectaron secretos reales en los análisis descritos abajo. Eso no equivale a una certificación de ausencia absoluta de secretos ni de vulnerabilidades.

## 3. Limpieza y archivos

**Eliminados:** `backend/README.md`, `backend/app/main.py`, `backend/requirements.txt` y el entorno local de ese backend (retirada ya autorizada antes de la auditoría); `frontend/src/components/ui/PreviewSection.tsx`, sin imports ni consumidores tras búsqueda en producción y pruebas.

**Modificados:** `.github/workflows/ci.yml`, `.gitignore`, `AGENTS.md`, `README.md`, `AI_USE.md`, `docs/contrato_datos.md`, `frontend/README.md`, `frontend/package-lock.json`.

**Añadidos:** este informe, `docs/DESPLIEGUE_ESTATICO.md` y `docs/frontend/HISTORIAL_README_FRONTEND.md`. El último conserva el README anterior completo y advierte que sus instrucciones son históricas. No se eliminan contratos ni evidencia científica. Las referencias al backend en informes históricos se conservan como registro de lo comprobado entonces.

La declaración de IA reconoce **ChatGPT y Codex — OpenAI; Claude — Anthropic**, coherente con About. Mantiene las decisiones y validaciones científicas en el equipo humano sin atribuir auditorías nuevas a las herramientas. Los nombres, roles y campos Pending de About no se rellenan con información inventada.

Se conserva `map-worker.d.ts`: es una declaración ambiental requerida por el import del Worker de MapLibre, aunque no tenga un import TypeScript dirigido a ese `.d.ts`. El inventario de archivos sin referencias fue una lista de candidatos, no una orden de borrado automático.

## 4. Dependencias y reproducibilidad

Único cambio de dependencias versionadas: resolución transitiva **undici 8.10.2 → 8.12.4** en `package-lock.json`. Sigue siendo desarrollo y no se añade a `package.json`. Todas las dependencias directas del frontend se conservan por su uso real; no se retiran librerías científicas.

`npm audit` inicial: 1 alta, 7 moderadas, 0 críticas. Tras la corrección: **0 altas, 0 críticas, 7 moderadas**. Avisos principales: [undici](https://github.com/advisories/GHSA-xjj6-f33q-929c), [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249). No se ejecutó `npm audit fix --force`.

Se instalaron/verificaron los requisitos Python declarados de raíz. `pip check` aprobó. OSV consultó las 16 distribuciones del entorno: señaló únicamente pip y pytest (los identificadores GHSA/PYSEC son alias, no cuatro problemas independientes). [Aviso pip](https://github.com/advisories/GHSA-qwm4-qh6w-59xr), [aviso pytest](https://github.com/advisories/GHSA-6w46-j5rx-g56g). Las restricciones científicas no son un lockfile exacto de Python: la reproducibilidad se apoya además en las regresiones byte a byte; para congelar herramientas completas haría falta una decisión posterior.

## 5. Seguridad, privados y archivos conservados

- Escaneo del árbol versionado y de 766 blobs de texto de las ramas alcanzables: sin candidatos a claves privadas, tokens GitHub/AWS ni literales largos de claves/contraseñas según los patrones usados. No se muestran valores sensibles. El análisis por patrones tiene límites: no analiza semánticamente todos los tipos binarios ni garantiza detectar formatos arbitrarios de secretos.
- La inspección de nombres históricos no encontró `.env`, claves privadas o bundles versionados. No se reescribió el historial.
- `.gitignore` cubre `.env*`, claves `.pem`/`.key`, virtualenv, node_modules, builds, cachés y archivos locales de agentes. Se añade `*.bundle`; el `FETCH_HEAD` de raíz ya estaba excluido de la publicación final. Se habilitan únicamente los nuevos documentos de auditoría y el archivo histórico.
- Se conserva `docs/peru/test/corrida.log`: tiene una excepción explícita por su valor de evidencia. No es un log de depuración abandonado.
- Se conservan los dos ZIP FIRMS de `docs/`: son entradas de las regresiones de Perú/Ucayali. También se conserva el polígono INEI original y las imágenes de propuesta de diseño como documentación. No se copian a `dist/`.
- La descarga de archivos de My region y sus errores no requiere secretos incluidos en código. La MAP_KEY se aporta en uso; `VITE_FIRMS_BASE` es configuración pública de build. No se configura un proxy ni se comprueba CORS mediante una petición de terminal.

## 6. Integridad científica y comprobaciones

| Comprobación | Resultado |
|---|---|
| npm ci con lockfile original y con lockfile corregido | Aprobados; Vite detenido temporalmente para evitar bloqueo de binarios |
| npm run lint | Aprobado |
| npx tsc --noEmit -p tsconfig.app.json | Aprobado |
| ALLPANINA_LENTO=1 npm test | **250 aprobadas, 0 fallidas, 0 omitidas**, incluida paridad de Ucayali |
| npm run build | Aprobado; aviso de chunks grandes de MapLibre conservado |
| pip install -r requirements.txt y pip check | Aprobados |
| pytest tests/ -q con basetemp en la unidad del proyecto | **143 aprobadas**, 2 regresiones lentas omitidas por defecto |
| ALLPANINA_LENTO=1 pytest tests/test_algoritmo.py tests/test_region.py -k regresion -q | **2 aprobadas**, 12 casos ajenos a esa selección deseleccionados; no se debilitaron ni editaron pruebas |
| Productos de frontend/public/data frente a main | **47 archivos idénticos byte a byte** |
| Sintaxis Python y estructura de jobs CI | Revisadas; las suites permanecen y no se genera ni recalibra un producto publicado |

Las dos regresiones lentas reproducen Perú y el piloto Ucayali con los ZIP originales, escribiendo resultados en directorios de pruebas, no encima de los productos congelados. En conjunto se comprobaron los **145 casos Python**, con sus dos regresiones completas. Persiste una advertencia NumPy de deprecación en `scripts/02_normalize.py`; no se cambia el cálculo en esta auditoría.

La CI de main en `d6a1668` ya estaba aprobada. Para esta rama no se ejecutó GitHub Actions porque no se autorizó un push. La consolidación conserva Node 24, Python 3.12, requisitos y la suite `tests/`; `scientific` incorpora la sintaxis de `allpanina`, `scripts` y `tests` y la actualización de pip que antes estaba en `data`. El job duplicado `data` y el backend sin pruebas se retiran. El frontend permanece independiente. Las regresiones lentas siguen siendo opt-in; se ejecutaron expresamente en esta auditoría local.

## 7. Build, HTTP y despliegue

Mediciones del artefacto local final:

| Grupo | Archivos | Bytes sin compresión |
|---|---:|---:|
| assets | 24 | 2 488 087 |
| data | 47 | 109 108 225 |
| cartography | 200 | 71 838 507 |

El chunk MapLibre mide 1 105 113 bytes (296 281 gzip local) y su Worker 519 184 bytes (147 722 gzip). Las rutas se cargan de forma diferida. Canadá ocupa 12 688 109 bytes (3 636 531 gzip); `cells_PE_2020.geojson`, 7 155 358 (501 587 gzip). Estas mediciones **no prueban compresión HTTP del proveedor**.

Se inició temporalmente un preview en `127.0.0.1:5175` del build: las seis páginas y `/metodo`, `/mapa` respondieron HTML; los manifiestos y el catálogo presentes respondieron JSON. Los tres recursos deliberadamente inexistentes en `/data/`, `/cartography/` y `/assets/` devolvieron **200 + text/html**, confirmando que ese preview no certifica un hosting correcto para los datos. No se desplegó ni se configuró un proveedor.

Las pruebas de rutas validan las redirecciones compatibles, consultas, anclas, filtros y navegación. Las de mapa conservan MODIS/VIIRS, fallbacks, leyenda y registro C12; My region conserva su Worker, validaciones y carácter exploratorio. B1 permanece a escala región-mes y WAPE no se presenta como confianza futura.

## 8. Checklist y siguientes decisiones

- [x] Rama de auditoría separada; cambios locales anteriores conservados.
- [x] Pruebas frontend, científicas y regresiones lentas aprobadas.
- [x] Productos, κ, métricas, contratos de formatos y evidencia sin modificación científica.
- [x] Alerta npm alta corregida; riesgos del tooling restantes identificados.
- [x] Backend no utilizado retirado; CI consolidada sin pérdida de cobertura.
- [x] Documentación actual y archivo histórico conservado; IA coherente con About.
- [ ] Revisión humana de esta rama y de las recomendaciones de ramas de la sección 9.
- [ ] Elegir alojamiento; verificar HTTPS, rutas directas, 404 de archivos, tipos y compresión según [la guía](DESPLIEGUE_ESTATICO.md).
- [ ] Revisar versiones del tooling con alertas moderadas; decidir la migración pytest 9 sin cambiar resultados científicos.
- [ ] Resolver en la fuente la duplicación exacta de India; no se altera aquí el catálogo.
- [ ] Pruebas visuales en escritorio y 390 px, teclado, táctil, popup y panel móvil con un navegador real.
- [ ] Verificar GIBS, FIRMS/CORS y límites desde el entorno real; no hay garantía de disponibilidad externa por aprobar pruebas simuladas.
- [ ] Completar solo con información real los Pending de About y revisar redacción científica pública.
- [ ] Después de aprobación, integrar por PR y verificar despliegue antes de etiquetar o eliminar ramas.

Esta entrega es una auditoría y preparación conservadora. No afirma que el despliegue, las revisiones visuales o la eliminación de ramas ya se hayan realizado.

## 9. Auditoria de ramas Git

`main` de referencia: `d6a1668`. Se ejecuto `git fetch --prune origin`. No se elimino ninguna rama local ni remota. `origin/HEAD` es un alias simbolico de main, no una rama independiente.

| Rama | Ultimo commit | Integracion | Recomendacion tras aprobacion y despliegue |
|---|---|---|---|
| `chore/predeploy-audit` | `d6a1668` | Desde main; cambios de esta auditoria sin commit | Conservar hasta revisar e integrar |
| `feat/frontend-calendar` | `26a7a77` | Antecesor de main; 0 commits exclusivos (221 detras) | Eliminar solo despues de aprobar, etiquetar y verificar despliegue |
| `feat/peru-integration` | `f1b7c17` | Antecesor de main; 0 commits exclusivos (33 detras) | Eliminar solo despues de aprobar, etiquetar y verificar despliegue |
| `feat/region-mundial` | `34d00a9` | Antecesor de main; 0 commits exclusivos (29 detras) | Eliminar solo despues de aprobar, etiquetar y verificar despliegue |
| `integration/t32-scientific-data` | `9fc41ae` | Antecesor de main; 0 commits exclusivos (222 detras) | Eliminar solo despues de aprobar, etiquetar y verificar despliegue |
| `main` | `d6a1668` | Principal estable | Conservar |
| `refactor/frontend-redesign` | `ff5bf75` | Antecesor de main; 0 commits exclusivos (1 detras) | Eliminar solo despues de aprobar, etiquetar y verificar despliegue |
| `refactor/frontend-v2` | `0526391` | Antecesor de main; 0 commits exclusivos (220 detras) | Eliminar solo despues de aprobar, etiquetar y verificar despliegue |
| `origin/docs/entrega` | `6d7a750` | Antecesor de main; 0 commits exclusivos (28 detras) | Eliminar solo despues de aprobar, etiquetar y verificar despliegue |
| `origin/feat/frontend-calendar` | `9fc41ae` | Antecesor de main; 0 commits exclusivos (222 detras) | Eliminar solo despues de aprobar, etiquetar y verificar despliegue |
| `origin/feat/peru-integration` | `30c5f3e` | Antecesor de main; 0 commits exclusivos (34 detras) | Eliminar solo despues de aprobar, etiquetar y verificar despliegue |
| `origin/feat/region-mundial` | `34d00a9` | Antecesor de main; 0 commits exclusivos (29 detras) | Eliminar solo despues de aprobar, etiquetar y verificar despliegue |
| `origin/feature/calibracion` | `abc2c4e` | Antecesor de main; 0 commits exclusivos (47 detras) | Eliminar solo despues de aprobar, etiquetar y verificar despliegue |
| `origin/feature/mapa-peru-gibs` | `59d6cdd` | 4 commits exclusivos; patch-id no equivalente; 18 rutas diferentes | Conservar: trabajo de mapas/exportacion por decidir |
| `origin/main` | `d6a1668` | Principal estable | Conservar |
| `origin/refactor/frontend-fase2` | `b0ea292` | Antecesor de main; 0 commits exclusivos (24 detras) | Eliminar solo despues de aprobar, etiquetar y verificar despliegue |
| `origin/refactor/frontend-map` | `ad14545` | Antecesor de main; 0 commits exclusivos (11 detras) | Eliminar solo despues de aprobar, etiquetar y verificar despliegue |
| `origin/refactor/frontend-redesign` | `ff5bf75` | Antecesor de main; 0 commits exclusivos (1 detras) | Eliminar solo despues de aprobar, etiquetar y verificar despliegue |
| `origin/refactor/frontend-v2` | `6555baf` | 6555baf no antecesor; contenido antiguo sustituido por F0-F6 | Eliminar condicionada a cierre del cotejo de contenido y etiqueta |

### Evidencia y precauciones

- Todas las ramas cientificas y de documentacion presentes (`origin/feature/calibracion`, `integration/t32-scientific-data`, `origin/docs/entrega`, `feat/peru-integration` y su remota) son antecesores de main. Sus commits siguen recuperables desde main; no se propone borrar archivos de investigacion.
- Las ramas local y remota frontend-calendar, peru-integration y frontend-v2 tienen puntas distintas. Se comprobaron por separado: la punta local extra de las dos primeras tambien esta en main. No basta comparar sus nombres o asumir que estaban publicadas.
- `origin/feature/mapa-peru-gibs`: `de1df25`, `9bc3add`, `d289818`, `59d6cdd` siguen siendo exclusivos segun `git cherry main`. Su contenido incluye exportacion de capturas, formatos GIF/GeoTIFF/PDF, imagery diaria y utilidades ausentes en main. El mapa actual comparte funcionalidades basicas, pero no reproduce todo ese trabajo. Conservar y consultar al responsable; no fusionarlo automaticamente al producto final.
- `origin/refactor/frontend-v2`: `git cherry` conserva `6555baf` como exclusivo. Se compararon las 16 rutas cambiadas: `AUDITORIA_C1.md` es identico, `PLAN_C2.md` fue ampliado y actualizado, y el titulo, favicon, landing, rutas, errores y pruebas tienen sucesores en F0-F6. Tres archivos de presentacion antiguos ya fueron reemplazados por `features/landing` y `shell/TopBar`. Es contenido superado, no un commit literalmente fusionado. La recomendacion de eliminar queda condicionada a la revision humana de este cotejo.
- F2/F3: la entrega original `e8e8eaf` se incorporo como `2448554`. Sus patch-id estables son distintos por adaptaciones de integracion: de las 40 rutas de la entrega, 35 coinciden en contenido o ausencia en ese commit y 5 son pruebas adaptadas (`calendar-v2`, `legend-format`, `map-v2`, `router`, `scientific-copy`). La auditoria no confunde falta de ascendencia con funcionalidad pendiente. `2448554` si es antecesor de main y los recorridos F2/F3 permanecen verificados.
- `fetch --prune` retiro solamente dos referencias remotas locales que GitHub ya no anunciaba: `origin/Lafer231141-patch-1` y `origin/docs/firms-datos`. No se envio ninguna orden de borrado al remoto ni se borro una rama local.

### Etiqueta propuesta

Proponer una etiqueta **anotada** `hackathon-2026-final` sobre el commit que finalmente apruebe el equipo y cuyo despliegue se verifique. La base auditada es `d6a1668`, pero la limpieza aun no esta integrada: no etiquetar esos cambios sin revisar. No hay etiquetas existentes y no se creo ninguna. Conservar las ramas hasta aprobar la auditoria, preservar la version elegida con la etiqueta y comprobar el despliegue. No mover etiquetas existentes ni usar force push.

## 10. Authorised public-repository closure

The final README is an English project landing page, with method, architecture, setup, reproduction, six real team roles, sources, limits, licence and deployment links. Historical implementation details stay in their technical documents. AI_USE and About recognise ChatGPT/Codex (OpenAI) and Claude (Anthropic); scientific responsibility remains human. No current screenshots, affiliations, awards or live deployment are invented.

The duplicate India records were compared in full: identical metadata, same IND.geojson and the same 36 regions. Only one redundant index row was removed (198 unique countries remain). No polygon was rewritten and all 47 scientific products remain byte-identical to the audited main. The generator previously appended each upstream metadata row without uniqueness checks; it now coalesces exact duplicates and refuses conflicting metadata. The original upstream response was not retained, so its precise historical duplication cause is not asserted. New tests verify ISO3 uniqueness, the region count of every country and generator conflict handling.

The existing undici 8.12.4 correction is retained. The registry still reports typescript-eslint 8.72.2 as latest, with minimatch ^10.2.2, while the advertised minimatch correction changes its major range. No forced override or tooling downgrade was applied: seven moderate development alerts remain, zero high/critical npm alerts. pytest remains in its declared 8.x range: changing the test runner's major is deferred rather than altering scientific dependencies to silence an advisory. Its known local temporary-directory issue is documented above. Dedicated test directories are used; CI upgrades pip before installation.

Deployment documentation now targets Ubuntu, ISPConfig and Nginx with an isolated AllpaNina site, root-specific static locations, real missing-resource 404s, compression, cache rules, HTTPS, Worker/MIME checks and final-origin FIRMS access. The proposed domain is not a deployed URL. No server, DNS, certificate or BugLab setting was changed. The deployment tag remains deferred.

Git closure is authorised through a normal PR, with CI required before merge. The branch inventory is rechecked against the merged main and open PRs before any removal. PR #5 (feature/mapa-peru-gibs) is still open and its branch has exclusive work: keep it. Keep refactor/frontend-v2 pending a conservative final decision because its remote commit is not an ancestor, even though its presentation was superseded. Only fully merged branches with no open PR are deletion candidates. Keep chore/predeploy-audit as the delivery reference until closure is confirmed. No force push or history rewriting is used.

Closure checks: npm ci, lint, explicit TypeScript check, all 250 frontend tests with slow parity, and production build passed. All 147 Python tests passed in one ALLPANINA_LENTO=1 run, including the new catalogue tests and both complete regressions. Warnings: existing NumPy timedelta deprecation and a local pytest cache write permission warning; neither changed a result. All 47 published scientific files and every country polygon match the original main.
