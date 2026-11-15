# Mi región (cualquier lugar del mundo)

Página `/mi-region`. El usuario elige **País → Región** (primer nivel: departamento, provincia, estado…), trae los CSV estándar de NASA FIRMS (MODIS C6.1 y VIIRS S-NPP) y la web arma el calendario y el mapa con el mismo método del piloto. El resultado queda marcado como **exploratorio**.

## Dónde se procesa

**En la computadora del usuario**, dentro de un Web Worker (`frontend/src/services/region/`). El servidor solo entrega archivos estáticos. Es el mismo algoritmo de `allpanina/region.py` reescrito en TypeScript, y `tests/region-pipeline.test.ts` exige que con los datos de Ucayali reproduzca **byte a byte** la serie, B0/B1 y los 14 mapas publicados, con κ = 0.2936037257560573. Tarda ~40 s y necesita unos cientos de MB de RAM para una región como Ucayali.

## Flujo

1. **Región:** `public/cartography/world/index.json` y `<ISO3>.geojson`. También se puede subir un polígono GeoJSON propio. La zona horaria se sugiere sola y se puede cambiar.
2. **Datos:** subir los CSV o el .zip de FIRMS (los NRT se ignoran), o descargarlos con el MAP_KEY del usuario.
3. **Procesar:** el resultado se guarda en el navegador (IndexedDB) y se abre en Calendario/Mapa/Método con `?data=local`.
4. **Descargar / subir** el resultado como `.zip`. Al subirlo se verifican los hashes del `manifest.json`.

## Archivos de países

`python scripts/11_world_boundaries.py` (necesita internet, solo una vez) descarga geoBoundaries (ADM1 simplificado, CC BY 4.0) y escribe `frontend/public/cartography/world/`. Perú ya viene con los 25 departamentos del INEI.

## Cambios en lo existente

Los validadores aceptan `contract_version = "1.0-region"`, `split = "sin_validar"`, `kappa = null`, métricas ausentes cuando la región no es reportable y `source_version` vacío en meses `missing`, tal como pide el contrato. La navegación suma "Mi región".
