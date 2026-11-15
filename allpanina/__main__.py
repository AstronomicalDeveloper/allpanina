"""Uso por consola:

    python -m allpanina --modis fire_archive_M.csv --viirs fire_archive_SV.csv --salida salida/
    python -m allpanina --verificar      # regresión con los zips oficiales de docs/
"""
import argparse
import json
import sys

from .algoritmo import ErrorDeEntrada, procesar_peru, verificar_contra_publicado


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="allpanina", description="AllpaNina Perú: MODIS/VIIRS -> series, B1 y mapas.")
    p.add_argument("--modis", nargs="+", help="CSV estándar de FIRMS de MODIS (fire_archive_*)")
    p.add_argument("--viirs", nargs="+", help="CSV estándar de FIRMS de VIIRS Suomi NPP (fire_archive_*)")
    p.add_argument("--salida", help="carpeta de salida")
    p.add_argument("--actualizado", help="AAAA-MM-DD para updated_at (por defecto, hoy)")
    p.add_argument("--hasta", help="último mes AAAA-MM (por defecto, último mes común a los dos sensores)")
    p.add_argument("--verificar", action="store_true", help="reprocesa los zips oficiales y compara con lo publicado")
    a = p.parse_args(argv)
    try:
        if a.verificar:
            res = verificar_contra_publicado(a.salida)
            for nombre, ok in res.items():
                print(("OK    " if ok else "DIFIERE ") + nombre)
            return 0 if all(res.values()) else 1
        if not (a.modis and a.viirs and a.salida):
            p.error("hacen falta --modis, --viirs y --salida (o --verificar)")
        print(json.dumps(procesar_peru(a.modis, a.viirs, a.salida, actualizado=a.actualizado, hasta=a.hasta),
                         ensure_ascii=False, indent=2))
        return 0
    except ErrorDeEntrada as e:
        print(f"ERROR DE ENTRADA: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
