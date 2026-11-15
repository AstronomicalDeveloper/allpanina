"""Uso por consola.

Perú (κ congelados y validados):
    python -m allpanina --modis m.csv --viirs v.csv --salida salida/
    python -m allpanina --verificar

Cualquier región (κ local exploratorio), con CSV propios o descarga automática:
    python -m allpanina region --region-id AR-M --nombre Mendoza --poligono mendoza.geojson \
        --zona-horaria America/Argentina/Mendoza --modis m.csv --viirs v.csv --salida salida/
    python -m allpanina region --region-id AR-M --poligono mendoza.geojson \
        --zona-horaria America/Argentina/Mendoza --map-key <MAP_KEY> --salida salida/

Solo descargar de FIRMS:
    python -m allpanina descargar --map-key <MAP_KEY> --bbox -70.6 -37.6 -66.5 -32.0 \
        --desde 2013-01-01 --hasta 2026-07-31 --salida crudos/
"""
import argparse
import json
import sys


def _peru(argv):
    from .algoritmo import ErrorDeEntrada, procesar_peru, verificar_contra_publicado
    p = argparse.ArgumentParser(prog="allpanina", description="AllpaNina Perú: MODIS/VIIRS -> series, B1 y mapas.")
    p.add_argument("--modis", nargs="+")
    p.add_argument("--viirs", nargs="+")
    p.add_argument("--salida")
    p.add_argument("--actualizado")
    p.add_argument("--hasta")
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


def _bbox_de(poligono):
    from .region import cargar_region
    return cargar_region(poligono)[1]


def _descargar(a, bbox, carpeta):
    from .descarga import descargar_firms
    prog = lambda s, i, n, filas: print(f"\r{s}: pedido {i}/{n}, {filas} filas", end="", file=sys.stderr)
    r = descargar_firms(a.map_key, bbox, a.desde, a.hasta, carpeta, progreso=prog)
    print(file=sys.stderr)
    return r


def _region(argv):
    from .algoritmo import ErrorDeEntrada
    from .descarga import ErrorDeDescarga
    from .region import procesar_region
    p = argparse.ArgumentParser(prog="allpanina region", description="AllpaNina para cualquier región (exploratorio).")
    p.add_argument("--region-id", required=True)
    p.add_argument("--nombre")
    p.add_argument("--poligono", help="GeoJSON WGS84 de la región")
    p.add_argument("--bbox", nargs=4, type=float, metavar=("OESTE", "SUR", "ESTE", "NORTE"))
    p.add_argument("--zona-horaria", help="IANA, p. ej. America/Argentina/Mendoza")
    p.add_argument("--modis", nargs="+")
    p.add_argument("--viirs", nargs="+")
    p.add_argument("--map-key", help="si se da (sin --modis/--viirs), descarga de FIRMS automáticamente")
    p.add_argument("--desde", default="2013-01-01", help="para la descarga: AAAA-MM-DD")
    p.add_argument("--hasta", default="2026-07-31", help="para la descarga: AAAA-MM-DD")
    p.add_argument("--celda-mapa-km", type=int)
    p.add_argument("--salida", required=True)
    a = p.parse_args(argv)
    try:
        modis, viirs = a.modis, a.viirs
        if not (modis and viirs):
            if not a.map_key:
                p.error("hacen falta --modis y --viirs, o --map-key para descargar")
            from pathlib import Path
            bbox = a.bbox or _bbox_de(a.poligono)
            r = _descargar(a, bbox, Path(a.salida) / "crudos")
            modis, viirs = [r["MODIS"]], [r["VIIRS"]]
        res = procesar_region(modis, viirs, a.salida, region_id=a.region_id, nombre=a.nombre, poligono=a.poligono,
                              bbox=a.bbox, zona_horaria=a.zona_horaria, celda_mapa_km=a.celda_mapa_km)
        print(json.dumps(res, ensure_ascii=False, indent=2, default=str))
        return 0
    except (ErrorDeEntrada, ErrorDeDescarga) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2


def _solo_descarga(argv):
    from .descarga import ErrorDeDescarga
    p = argparse.ArgumentParser(prog="allpanina descargar", description="Descarga MODIS_SP y VIIRS_SNPP_SP de FIRMS.")
    p.add_argument("--map-key", required=True)
    p.add_argument("--bbox", nargs=4, type=float, required=True, metavar=("OESTE", "SUR", "ESTE", "NORTE"))
    p.add_argument("--desde", required=True)
    p.add_argument("--hasta", required=True)
    p.add_argument("--salida", required=True)
    a = p.parse_args(argv)
    try:
        r = _descargar(a, a.bbox, a.salida)
        print(json.dumps(r, ensure_ascii=False, indent=2, default=str))
        return 0
    except (ErrorDeDescarga, ValueError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2


def main(argv=None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if argv and argv[0] == "region":
        return _region(argv[1:])
    if argv and argv[0] == "descargar":
        return _solo_descarga(argv[1:])
    return _peru(argv)


if __name__ == "__main__":
    sys.exit(main())
