# Auditoría de Mi región — 2026-11-15

## Inspección previa a correcciones

Estado recibido: commit `f1b7c17`, checkout `feat/peru-integration`, sin rama local
`feat/region-mundial`. Se creó esta última desde ese commit, sin merges. Se conservan
los cambios locales recibidos en `main.tsx` y `RegionPage.tsx` que trasladan el CSS
al punto de entrada. No se modifican los productos publicados ni el trabajo visual.

### Implementado y comprobado

- Pipeline TypeScript, Worker, carga CSV/ZIP, polígono personalizado, exportación ZIP,
  almacenamiento local y lectores `local:` para Calendario, Mapa y Método existen.
- Prueba inicial completa: 192 pruebas, 191 aprobadas, 1 omitida, 0 fallidas.
  El problema de importar CSS desde Node ya está resuelto por los cambios recibidos.
- El selector publicado contiene Perú y 25 departamentos. Los demás países requieren
  generar/publicar cartografía; el título mundial excede lo entregado por defecto.
- Se respetan confianza MODIS >=30, VIIRS n/h, filtro de tipo (incluido el tratamiento
  Python de tipo ausente), días locales, malla EPSG:6933, deduplicación celda-día,
  centro redondeado a 5 decimales y separación temporal de entrenamiento/evaluación.
- B0 conserva VIIRS; B1 calcula κ solo con meses emparejados de entrenamiento,
  con umbrales explícitos. Los mapas conservan observaciones. No se sustituyen los
  κ congelados ni los productos de Perú.

### Defectos comprobados y prioridad

1. P1: `descarga.ts` pide intervalos de 10 días; la documentación actual de NASA
   admite 1–5. Además `tramos(..., 0)` no avanza y las fechas normalizadas por JS
   pueden aceptar un día inexistente. Lint falla por asignación inicial inútil.
2. P1: los mapas no aplican el límite inferior `desde` dentro del primer año;
   pueden incluir meses que no aparecen en la serie ni en el manifiesto.
3. P1: importación comprueba hashes solo de los nombres que el propio manifiesto
   enumera; no exige el conjunto mínimo ni valida calibración, método, evaluación
   o mapas antes de reemplazar el resultado anterior. Los hashes no autentican datos.
4. P1: IndexedDB silencia errores y resuelve la escritura al éxito de la petición,
   antes del commit de la transacción. La interfaz puede anunciar persistencia falsa.
5. P2: GeoJSON propio no valida cierre, rangos ni coordenadas finitas; errores del
   Worker no siempre terminan el Worker. No hay pruebas directas de su protocolo.

### Parcial, pendiente y riesgos

- No existe `allpanina/region.py` ni una sección `1.0-region` en el contrato del
  checkout. No se puede demostrar paridad con ese módulo. Se comparan reglas con
  `allpanina/algoritmo.py`, scripts 02–06 y productos publicados de Ucayali.
- La paridad completa de Ucayali está omitida por defecto; se ejecutará explícitamente.
  Que pasen pruebas sintéticas no demuestra equivalencia general mundial.
- El Worker evita bloquear el hilo principal, pero retiene textos/bytes, claves
  celda-día, filas y GeoJSON simultáneamente, y clona la salida al enviarla. No hay
  streaming ni límite de memoria. No se ha medido un máximo mundial seguro.
- Cancelar termina el Worker; no reanuda trabajo. El progreso puede retroceder al
  pasar de descarga a procesamiento; es orientativo, no una estimación temporal.
- No hay proxy Nginx configurado en esta funcionalidad. CORS y descarga con clave
  real no están verificados; no se dispone de MAP_KEY. La ruta manual es necesaria.
- Cobertura inferida de detecciones del área descargada no prueba observación
  completa; un archivo parcial puede afectar κ. La evaluación automática conserva
  carácter exploratorio, sin firmas ni revisión. No se cambia esa metodología.
- Duplicados exactos con calidad contradictoria pueden diferir del orden de QC de
  Python (Python elimina antes de filtrar; web colapsa después). Requiere evidencia
  específica y decisión metodológica antes de alterar el procesamiento.
- El backend no contiene `backend/tests`; las pruebas científicas están en `tests/`.
  CI ya existe; su revisión general queda fuera del alcance de esta auditoría.

Fuente externa consultada: [NASA FIRMS Area API](https://firms.modaps.eosdis.nasa.gov/api/area),
2026-11-15: intervalos 1–5 días y límite de 5000 transacciones por 10 minutos.
El límite conservador de 4000 del cliente no constituye por sí solo un defecto.

## Correcciones y verificación final

### Cambios realizados

- FIRMS: bloques de hasta 5 días, validación de fechas reales y de longitud del
  bloque; se elimina la asignación que hacía fallar lint. Se conserva el presupuesto
  conservador y la elección de productos estándar.
- Pipeline: los mapas aplican ambos extremos del período. Se rechazan códigos que
  no pueden representarse con seguridad en nombres de archivo/CSV y tamaños de
  celda o meses inválidos. No se cambia la fórmula de B0/B1 ni sus splits.
- GeoJSON propio: se rechazan anillos abiertos, coordenadas no finitas o fuera de
  WGS84, anillos demasiado cortos y superficie nula. Esto no sustituye una validación
  topológica completa (intersecciones, anillos superpuestos, antimeridiano).
- ZIP: comprobación de tamaño/CRC, entradas duplicadas, truncamiento y cifrado.
  Importación separada de la página: exige los archivos consumidos por las vistas
  y los mapas anuales, verifica hashes, valida las series/documentos/mapas y rechaza
  ámbitos o períodos contradictorios antes de sustituir el conjunto anterior.
  No verifica autoría ni acredita autenticidad científica de un paquete importado.
- IndexedDB: espera el commit de la transacción, cierra conexiones y comunica el
  fallback de sesión. Si falla borrar, conserva el estado y muestra un aviso.
- Worker/UI: captura el fallo de construcción y termina el Worker ante un error
  de ejecución. Se aclaran países disponibles, CORS y tránsito de clave por proxy.
- Método: oculta métricas y residuos cuando la evaluación declara `reportable=false`.
  El tipo compartido conserva explícitamente ese indicador opcional.
- Se corrige el parámetro sin tipo detectado por TypeScript en `detectarSensor`.
- Se conserva la corrección CSS que ya estaba en el árbol recibido.

### Evidencia de pruebas

| Comprobación | Resultado |
|---|---|
| `npm.cmd test`, antes | 191 aprobadas, 1 omitida, 0 fallidas |
| Paridad Ucayali activada, antes | 7 aprobadas, ninguna omitida; incluye ambas series y 14 mapas byte a byte |
| `$env:ALLPANINA_LENTO='1'; npm.cmd test`, después de correcciones principales | 200 aprobadas, ninguna omitida ni fallida |
| Verificación final `tsx --tsconfig tsconfig.app.json --test tests/region-*.test.ts`, con `ALLPANINA_LENTO=1` | 16 aprobadas, ninguna omitida ni fallida (incluye nueva prueba de commit/aborto de IndexedDB) |
| `npm.cmd run lint`, final | Aprobado |
| `tsc --noEmit -p tsconfig.app.json`, final | Aprobado; no se ejecutó build |
| `.venv/Scripts/python.exe -m pytest tests/ -q --basetemp=.cache/region-audit-pytest` | 133 aprobadas, 1 omitida, 1 aviso de deprecación NumPy |
| `git diff --check` | Sin errores de whitespace |

Los grupos de frontend se solapan; no se suman sus cantidades. El Python global
carece de pytest; se utilizó el entorno `.venv` existente. La primera ejecución con
ese entorno dio 132 aprobadas, 1 fallida y 1 omitida porque `os.path.relpath` no puede
relacionar el temporal en C: con el repo en D:. El comando documentado arriba evita
ese problema del entorno sin modificar pruebas ni productos.

La prueba Python omitida es la regresión lenta de Perú, desactivada por defecto;
no se presenta como aprobada. La paridad TypeScript de Ucayali sí fue ejecutada,
incluyendo nuevamente después de las correcciones. En ejecuciones locales aisladas
el caso Ucayali tardó aproximadamente 6–15 segundos; no es una medición del navegador
ni una garantía de tiempo o memoria. No se modificaron datos publicados para lograrlo.

Pruebas nuevas: rangos FIRMS/fechas y red simulada; validación de polígonos;
mapa con inicio a mitad de año; ZIP dañado/manifiesto incompleto/CSV malformado aun
con hash válido; commit y aborto de almacenamiento simulado; selector con cartografía
real; lecturas locales de Calendario, análisis histórico, Mapa y Método; evaluación
no reportable; protocolo del Worker con `self` simulado en Node y File/ZIP reales.
No se prueba aquí la carga del bundle Worker en un navegador, WebGL real, CORS
real ni IndexedDB de un navegador: no se utilizó navegador ni Computer Use.

### Pendientes y siguiente integración

1. El equipo debe formalizar el sobre `1.0-region` y aportar/identificar el módulo
   Python regional si desea exigir paridad con él. No se inventó ese contrato.
2. Publicar cartografía mundial si se requiere el selector completo. La alternativa
   GeoJSON está disponible, con las limitaciones geométricas y horarias documentadas.
3. Verificar descarga real con una MAP_KEY, disponibilidad temporal y CORS en el
   despliegue elegido. La descarga simulada no acredita funcionamiento de NASA.
4. Medir memoria y respuesta en navegadores con tamaños de entrada representativos.
   La viabilidad demostrada queda limitada al caso Ucayali y a los fixtures.
5. Resolver explícitamente la política para duplicados con atributos de calidad
   contradictorios y documentar datos parciales/cobertura. No se afirma equivalencia
   científica universal ni validación formal de las regiones generadas.

### Archivos modificados

- `.gitignore`: excepción para que este informe sea visible a Git.
- `frontend/MI_REGION.md`: alcance real, ejecución reproducible, configuración y límites.
- `frontend/src/main.tsx`: cambio local recibido (CSS regional en punto de entrada).
- `frontend/src/pages/region/RegionPage.tsx`: conserva extracción CSS, usa importador,
  avisa fallos de persistencia, gestiona errores Worker y aclara alcance de la UI.
- `frontend/src/services/region/importar.ts`: nuevo importador verificable.
- `frontend/src/services/region/{descarga,firms,pipeline,polygon,store,zip}.ts`.
- `frontend/src/pages/method/sections/EvaluationSection.tsx` y `frontend/src/types/data.ts`.
- `frontend/tests/region-pipeline.test.ts` y nuevas pruebas `region-ui.test.ts`,
  `region-worker.test.ts`, `region-store.test.ts`.
- `docs/AUDITORIA_MI_REGION.md`: diagnóstico previo y resultados finales.

Trabajo exclusivamente en `feat/region-mundial`; sin commits, pushes, PR, merges,
rediseño, nuevas dependencias ni cambios en los productos científicos publicados.
