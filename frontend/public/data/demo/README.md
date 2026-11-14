# DATOS DEMO — NO SON OBSERVACIONES REALES

Los seis intercambios siguen docs/contrato_datos.md, el contrato oficial de Aldo.
Son ejemplos sintéticos de PE-DEMO, agosto–octubre 2024. La celda y coordenadas son
ficticias; generated_at, updated_at y source_version no acreditan descargas NASA.

Agosto: valores positivos (MODIS 12 detecciones / indicator 3; VIIRS 20 / 5).
Septiembre: ceros válidos con qc_status=ok. Octubre: campos vacíos con
insufficient_data (MODIS) y no_pass (VIIRS). No se convierten vacíos en cero ni
se publican features espaciales de octubre. Los n_detections GeoJSON suman los
conteos mensuales; no se equiparan con indicator ni se calculan días-celda.

B0 copia indicator VIIRS sintético; B1 permanece vacío. Los splits train/valid/test
y sus períodos son solo ejemplos estructurales: no se entrenó ni evaluó ningún
modelo. En validation.json, mae/wape/bias son null, n_months_matched es 0 y
residuals está vacío; detalle_mensual dice no disponible. La causa se explica en
method.json: no hubo evaluación ni meses comparables en test.

Los cinco archivos de datos figuran en manifest.files con version DEMO-v0; el
manifiesto es el sexto intercambio. README es documentación auxiliar. Cada CSV
se identifica mediante PE-DEMO; el GeoJSON mediante cell_id DEMO y su nombre.
Los formatos, límites y dudas pendientes están en docs/l3-demo.md.

No son incendios confirmados, superficie quemada ni evidencia de rendimiento B1.
No se descargaron observaciones reales ni se modificó metodología científica.
Retirar esta carpeta y la vista temporal antes de la entrega científica final.
