"""Paso 11 - Países y regiones de primer nivel para la página Mi región (archivos estáticos).

Descarga de geoBoundaries (gbOpen, ADM1, geometría simplificada; licencia CC BY 4.0 en su mayoría)
y escribe:
    frontend/public/cartography/world/index.json        lista de países
    frontend/public/cartography/world/<ISO3>.geojson    regiones del país: id, nombre, zona_horaria, bbox

La zona horaria sugerida de cada región es la zona IANA del mismo país más cercana a su centro
(scripts/data/zone1970.tab, base de datos tz, dominio público). El usuario puede cambiarla en la web.

Solo biblioteca estándar. Necesita internet (tarda unos minutos):
    python scripts/11_world_boundaries.py
    python scripts/11_world_boundaries.py --solo COL ARG         # algunos países
Perú no se descarga: usa los 25 departamentos del INEI ya incluidos (PER.geojson).
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "frontend" / "public" / "cartography" / "world"
API = "https://www.geoboundaries.org/api/current/gbOpen/{iso}/ADM1/"
ZONE_TAB = ROOT / "scripts" / "data" / "zone1970.tab"
UA = {"User-Agent": "AllpaNina/1.1 (NASA Space Apps; github.com/AstronomicalDeveloper/allpanina)"}
DEC = 4        # ~11 m: suficiente para decidir si el centro de una celda de 1 km cae dentro


def get(url: str, intentos: int = 4):
    for i in range(intentos):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return r.read()
        except Exception as e:  # red inestable: reintentar
            if i == intentos - 1:
                raise
            print(f"  reintento {i + 1}: {e}", file=sys.stderr)
            time.sleep(5 * (i + 1))


def _coord(t: str) -> float:
    s = -1 if t[0] == "-" else 1
    t = t[1:]
    g = 2 if len(t) in (4, 6) else 3
    d, m, sec = int(t[:g]), int(t[g:g + 2]), int(t[g + 2:] or 0)
    return s * (d + m / 60 + sec / 3600)


def zonas() -> dict[str, list[tuple[float, float, str]]]:
    out: dict[str, list] = {}
    for linea in ZONE_TAB.read_text(encoding="utf-8").splitlines():
        if not linea or linea.startswith("#"):
            continue
        cc, coords, tz = linea.split("\t")[:3]
        m = re.fullmatch(r"([+-]\d+)([+-]\d+)", coords)
        lat, lon = _coord(m.group(1)), _coord(m.group(2))
        for c in cc.split(","):
            out.setdefault(c, []).append((lat, lon, tz))
    return out


def redondear(geom):
    def r(c):
        return [round(c[0], DEC), round(c[1], DEC)] if isinstance(c[0], (int, float)) else [r(x) for x in c]
    return {"type": geom["type"], "coordinates": r(geom["coordinates"])}


def puntos(geom):
    def walk(c):
        if isinstance(c[0], (int, float)):
            yield c
        else:
            for x in c:
                yield from walk(x)
    return list(walk(geom["coordinates"]))


def zona_cercana(lista, lat, lon):
    if not lista:
        h = round(lon / 15)
        return "UTC" if h == 0 else f"Etc/GMT{'+' if h < 0 else '-'}{abs(h)}"
    def d(z):
        p1, p2, dl = math.radians(lat), math.radians(z[0]), math.radians(z[1] - lon)
        return math.acos(max(-1, min(1, math.sin(p1) * math.sin(p2) + math.cos(p1) * math.cos(p2) * math.cos(dl))))
    return min(lista, key=d)[2]


def pais(meta: dict, tz: dict) -> dict | None:
    iso3 = meta["boundaryISO"]
    url = meta.get("simplifiedGeometryGeoJSON") or meta.get("gjDownloadURL")
    if not url:
        return None
    fc = json.loads(get(url))
    prefijos = [str(f["properties"].get("shapeISO") or "")[:2] for f in fc["features"]]
    iso2 = max(set(prefijos), key=prefijos.count) if any(re.fullmatch(r"[A-Z]{2}", p) for p in prefijos) else None
    feats, usados = [], set()
    for i, f in enumerate(fc["features"], 1):
        p, g = f["properties"], f.get("geometry")
        if not g or g["type"] not in ("Polygon", "MultiPolygon"):
            continue
        rid = str(p.get("shapeISO") or "")
        if not re.fullmatch(r"[A-Z]{2}-[A-Z0-9]{1,4}", rid) or rid in usados:
            rid = f"{iso2 or iso3}-R{i:02d}"
        usados.add(rid)
        g = redondear(g)
        pts = puntos(g)
        lons, lats = [q[0] for q in pts], [q[1] for q in pts]
        bbox = [min(lons), min(lats), max(lons), max(lats)]
        clat, clon = (bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2
        feats.append({"type": "Feature", "properties": {
            "id": rid, "nombre": p.get("shapeName") or rid, "zona_horaria": zona_cercana(tz.get(iso2 or "", []), clat, clon),
            "bbox": bbox}, "geometry": g})
    if not feats:
        return None
    (OUT / f"{iso3}.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return {"iso3": iso3, "iso2": iso2, "nombre": meta.get("boundaryName") or iso3, "archivo": f"{iso3}.geojson",
            "regiones": len(feats), "licencia": meta.get("boundaryLicense")}


def main(argv=None) -> int:
    a = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    a.add_argument("--solo", nargs="*", help="códigos ISO3 (por defecto, todos)")
    args = a.parse_args(argv)
    OUT.mkdir(parents=True, exist_ok=True)
    tz = zonas()
    metas = json.loads(get(API.format(iso="ALL")))
    if args.solo:
        metas = [m for m in metas if m["boundaryISO"] in set(args.solo)]
    else:  # Perú se queda con los departamentos oficiales del INEI que ya trae el repositorio
        metas = [m for m in metas if m["boundaryISO"] != "PER"]
    indice = json.loads((OUT / "index.json").read_text(encoding="utf-8"))["paises"] if (OUT / "index.json").exists() else []
    indice = [p for p in indice if p["iso3"] not in {m["boundaryISO"] for m in metas}]
    for k, m in enumerate(sorted(metas, key=lambda m: m["boundaryISO"]), 1):
        try:
            r = pais(m, tz)
            print(f"[{k}/{len(metas)}] {m['boundaryISO']}: {r['regiones'] if r else 0} regiones")
            if r:
                indice.append(r)
        except Exception as e:
            print(f"[{k}/{len(metas)}] {m['boundaryISO']}: ERROR {e}", file=sys.stderr)
    indice.sort(key=lambda p: p["iso3"])
    (OUT / "index.json").write_text(json.dumps({
        "fuente": "geoBoundaries (gbOpen, ADM1, simplificado) - www.geoboundaries.org",
        "licencia": "CC BY 4.0 salvo indicación por país (campo licencia)",
        "paises": indice}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(indice)} países en {OUT / 'index.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
