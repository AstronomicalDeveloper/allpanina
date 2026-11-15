"""AllpaNina: algoritmo de armonización MODIS/VIIRS (detecciones de fuego de NASA FIRMS).

Tres entradas (ver docs/ALGORITMO.md):

    from allpanina import procesar_peru      # Perú + 25 departamentos, κ congelados y validados
    from allpanina import procesar_region    # cualquier región del mundo, κ local exploratorio
    from allpanina import descargar_firms    # descarga automática de FIRMS (API, producto estándar)

Las importaciones son diferidas: descargar_firms funciona sin pandas, pyproj ni shapely.
"""
VERSION = "1.1"

_DE = {
    "procesar_peru": "algoritmo", "verificar_contra_publicado": "algoritmo", "ErrorDeEntrada": "algoritmo",
    "procesar_region": "region",
    "descargar_firms": "descarga", "ErrorDeDescarga": "descarga",
}

__all__ = sorted(_DE) + ["VERSION"]


def __getattr__(name):
    if name in _DE:
        import importlib
        return getattr(importlib.import_module(f".{_DE[name]}", __name__), name)
    raise AttributeError(name)
