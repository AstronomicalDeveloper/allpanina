# Algoritmo AllpaNina — guía para integrarlo

El paquete `allpanina` (raíz del repositorio) toma los CSV crudos de NASA FIRMS, o los descarga solo, y devuelve los archivos que la web ya sabe leer. Dónde y cómo lo ejecuta el usuario lo decide la web: el paquete solo es el algoritmo.

| Entrada | Para qué | κ | Estado |
|---|---|---|---|
| `procesar_peru` | Perú y sus 25 departamentos (contrato v1.1/v1.2) | congelados (`DECISIONS.md` §12) | validado, test con firmas |
| `procesar_region` | **cualquier región del mundo** (contrato v1.0, una región) | local, calculado solo con train 2013-2022 | **exploratorio** |
| `descargar_firms` | baja MODIS y VIIRS de FIRMS por la API | — | — |

## Perú: uso

```python
from allpanina import procesar_peru, ErrorDeEntrada

try:
    resumen = procesar_peru(
        modis=["fire_archive_M-C61_XXXX.csv"],   # uno o varios CSV estándar de MODIS
        viirs=["fire_archive_SV-C2_XXXX.csv"],   # uno o varios CSV estándar de VIIRS Suomi NPP
        salida="ruta/de/salida",
    )
except ErrorDeEntrada as e:
    mostrar_al_usuario(str(e))                   # el mensaje ya explica el problema en castellano
```

Por consola:

```bash
python -m allpanina --modis m.csv --viirs v.csv --salida salida/
python -m allpanina --verificar          # comprueba que el algoritmo reproduce lo publicado
```

Instalación: `pip install -r requirements.txt` (pandas, numpy, pyarrow, pyproj, shapely).

## Qué hace

1. **Valida la entrada** (sección siguiente).
2. **Normaliza y filtra:** `type = 0`, confianza (MODIS ≥ 30; VIIRS n/h) y día en hora de Lima.
3. **Arma la malla:** celdas de 1 km en EPSG:6933, deduplicadas por celda-día.
4. **Construye la serie mensual** de `PE` y de los 25 departamentos. Cada celda va al departamento que contiene su centro.
5. **Calcula B0 y B1** con los **κ congelados** de `DECISIONS.md` §12, leídos de `frontend/public/data/peru/method.json`. **Nunca recalibra.** `PE` y `PE-SIN-25` son la suma de los departamentos.
6. **Genera los mapas** nacionales a 10 km, `cells_PE_<año>.geojson`, solo con valores observados.
7. **Escribe** `actualizacion.json` y `manifest.json`.

`validation.json` y `method.json` se copian tal cual: las métricas validadas no cambian con datos nuevos.

## Entradas que rechaza (`ErrorDeEntrada`)

| Caso | Por qué |
|---|---|
| CSV NRT de FIRMS (sin columna `type`, o con versión "NRT") | El método se validó con el archivo estándar |
| VIIRS de NOAA-20 o NOAA-21, o MODIS de un satélite que no sea Terra ni Aqua | Los κ solo valen para Suomi NPP + Terra/Aqua. Otro sensor exige recalibrar con el protocolo completo |
| Faltan columnas, archivo vacío o ilegible | No se puede procesar |
| Datos que terminan antes de 2013-01 | Fuera del periodo de AllpaNina |

## Meses nuevos

Los meses posteriores a **2026-07** (fin del test validado) llevan `split = "sin_validar"` en `calibrated_series.csv` y aparecen en `actualizacion.json → meses_sin_validar`. Su B1 es una estimación con los κ congelados y **no tiene error validado**: en la web conviene mostrarlo distinto de los meses validados.

## Límites

- **Fin de Suomi NPP:** dejó de producir datos nuevos el 2 de noviembre de 2026. A partir de ahí, el VIIRS disponible es NOAA-20/21, que el algoritmo rechaza a propósito.
- **Fin de MODIS:** NASA planea terminar Terra MODIS en enero de 2027 y Aqua MODIS alrededor de septiembre de 2027. Después ya no habrá con qué comparar B1.
- **En Perú no se recalibra.** Un κ nuevo u otro sensor se hacen con el protocolo de `DECISIONS.md` §11–12: decisiones previas, validación, test único y firmas. El modo región (abajo) sí calcula un κ local, pero lo marca como exploratorio.

## Comprobación

`python -m allpanina --verificar` reprocesa los zips oficiales de `docs/` y exige que `monthly_series.csv`, `calibrated_series.csv` y los 14 `cells_PE_<año>.geojson` sean **idénticos byte a byte** a los publicados en `frontend/public/data/peru/`. Las pruebas están en `tests/test_algoritmo.py`; la regresión completa corre con `ALLPANINA_LENTO=1 python -m pytest tests/test_algoritmo.py`.

## Cualquier región: el caso Mendoza

Un usuario de Mendoza (Argentina) quiere ver los focos de calor y el calendario de incendios de su provincia.

**1. Obtiene dos cosas gratis:** un `MAP_KEY` de FIRMS (https://firms.modaps.eosdis.nasa.gov/api/map_key/, solo pide un correo) y el polígono de su provincia en GeoJSON (en Argentina, la capa de provincias del Instituto Geográfico Nacional).

**2. Un solo comando** descarga, homogeneiza y deja todo listo para la web:

```bash
python -m allpanina region --region-id AR-M --nombre Mendoza \
    --poligono mendoza.geojson --zona-horaria America/Argentina/Mendoza \
    --map-key <MAP_KEY> --salida salida_mendoza/
```

Si ya bajó los CSV a mano desde FIRMS (*Archive Download*, producto estándar), los pasa en lugar del `MAP_KEY`: `--modis m.csv --viirs v.csv`. Desde Python:

```python
from allpanina import descargar_firms, procesar_region, ErrorDeEntrada, ErrorDeDescarga

crudos = descargar_firms(map_key, (-70.6, -37.6, -66.5, -32.0), "2013-01-01", "2026-07-31", "crudos/")
resumen = procesar_region(crudos["MODIS"], crudos["VIIRS"], "salida_mendoza/",
                          region_id="AR-M", nombre="Mendoza", poligono="mendoza.geojson",
                          zona_horaria="America/Argentina/Mendoza")
# resumen["advertencias"]: lo que la web debe mostrar al usuario (p. ej. "No se ofrece B1: ...")
```

**3. La salida** tiene el mismo formato de una región que el piloto de Ucayali (`frontend/public/data/`), así que la web la muestra igual: `monthly_series.csv` (calendario), `cells_AR-M_<año>.geojson` (mapa), `calibrated_series.csv` (B0/B1), `validation.json`, `method.json`, `procedencia.json` y `manifest.json`.

### Qué hace distinto del modo Perú

- **Día local de la región:** el calendario usa la zona horaria IANA que se le da (sin ella, aproxima por la longitud y lo avisa).
- **κ local automático:** κ = Σ MODIS / Σ VIIRS **solo con train 2013-2022**. Se ofrece B1 solo si en train hay Σ VIIRS ≥ 5,000 y Σ MODIS ≥ 1,000 celda-días (la regla de `DECISIONS.md` §11.2); si no, la web muestra solo los datos observados.
- **Evaluación automática fuera de muestra:** métricas B0 y B1 en 2023-2024 y 2025-2026-07, que no participan del ajuste; se reportan si Σ MODIS ≥ 50 (regla §11.3). Quedan en `method.json → resultados`.
- **Siempre exploratorio:** `method.json → estado` lo dice. No tiene la revisión del equipo ni el test con firmas de Ucayali y Perú. En la web conviene mostrarlo con una etiqueta (“estimación exploratoria”).
- **Mapa adaptativo:** celdas de 1 km hasta 150,000 km² (Mendoza mide ~149,000) y bloques de 10 km si la región es más grande; se puede fijar con `--celda-mapa-km`.

### Descarga

`descargar_firms` usa la API de área de FIRMS con `MODIS_SP` y `VIIRS_SNPP_SP` (producto estándar), en pedidos de 10 días, con pausas para quedarse bajo el tope de transacciones de FIRMS y reintentos si el servidor falla. 2013-2026 son ~500 pedidos por sensor y FIRMS cuenta cada día pedido como una transacción, así que la descarga completa tarda del orden de 20 a 30 minutos; para actualizar solo los meses nuevos basta un rango corto. El `MAP_KEY` es del usuario; no se guarda en ningún archivo de salida.

### Pruebas

`tests/test_region.py` (Mendoza sintético: día local, polígono, sin κ con pocos datos, κ local y evaluación) y `tests/test_descarga.py` (FIRMS simulado, sin red). La regresión `ALLPANINA_LENTO=1 python -m pytest tests/test_region.py` corre el modo región sobre Ucayali con hora de Lima y exige reproducir el piloto publicado: la misma serie mensual y los mismos mapas, byte a byte, y el mismo κ = 0.29360.
