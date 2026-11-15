"""AllpaNina: algoritmo de armonización MODIS/VIIRS para todo el Perú, empaquetado.

Uso mínimo:

    from allpanina import procesar_peru
    resumen = procesar_peru(modis=["fire_archive_M-C61.csv"], viirs=["fire_archive_SV-C2.csv"],
                            salida="salida/")

Ver docs/ALGORITMO.md.
"""
from .algoritmo import ErrorDeEntrada, procesar_peru, verificar_contra_publicado, VERSION

__all__ = ["procesar_peru", "verificar_contra_publicado", "ErrorDeEntrada", "VERSION"]
