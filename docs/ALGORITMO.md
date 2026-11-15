# Algoritmo AllpaNina Perú — guía para integrarlo

El paquete `allpanina` (raíz del repositorio) toma los CSV crudos de NASA FIRMS y devuelve los archivos que la web ya sabe leer (contrato v1.1 de `docs/contrato_datos.md`, más la sección v1.2). Dónde y cómo lo ejecuta el usuario lo decide la web: el paquete solo es el algoritmo.

## Uso

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
- **Recalibrar no es automático.** Un κ nuevo, otro sensor u otra región se hacen con el protocolo de `DECISIONS.md` §11–12: decisiones previas, validación, test único y firmas.

## Comprobación

`python -m allpanina --verificar` reprocesa los zips oficiales de `docs/` y exige que `monthly_series.csv`, `calibrated_series.csv` y los 14 `cells_PE_<año>.geojson` sean **idénticos byte a byte** a los publicados en `frontend/public/data/peru/`. Las pruebas están en `tests/test_algoritmo.py`; la regresión completa corre con `ALLPANINA_LENTO=1 python -m pytest tests/test_algoritmo.py`.
