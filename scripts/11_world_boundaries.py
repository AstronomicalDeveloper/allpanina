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
ZONAS_ADM1 = ROOT / "scripts" / "data" / "zonas_adm1.tsv"      # países con varias zonas: zona por región
ISO_TAB = ROOT / "scripts" / "data" / "iso3166.tsv"          # ISO 3166-1 alfa-3 -> alfa-2
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


_MANUAL: dict[str, str] = {}


def _manual() -> dict[str, str]:
    if not _MANUAL and ZONAS_ADM1.exists():
        for l in ZONAS_ADM1.read_text(encoding="utf-8").splitlines():
            if l and not l.startswith("#"):
                k, v = l.split("\t")
                _MANUAL[k] = v
    return _MANUAL


def contiene(geom, x: float, y: float) -> bool:
    """Punto dentro del polígono (par/impar sobre todos los anillos)."""
    dentro = False
    for poli in ([geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]):
        for r in poli:
            for i in range(len(r) - 1):
                (x1, y1), (x2, y2) = r[i][:2], r[i + 1][:2]
                if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                    dentro = not dentro
    return dentro


def centro(geom) -> tuple[float, float]:
    """Centro del anillo exterior más grande (no de la caja: Alaska cruza el antimeridiano)."""
    polis = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    def area(r):
        return abs(sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1))) / 2
    anillo = max((p[0] for p in polis), key=area)
    return sum(q[0] for q in anillo) / len(anillo), sum(q[1] for q in anillo) / len(anillo)


def iso2_de() -> dict[str, str]:
    return dict(l.split("\t") for l in ISO_TAB.read_text(encoding="utf-8").split("\n") if l.strip())


def normalizar(iso3: str, feats: list, tz: dict, iso2: str | None) -> list:
    """id único con el código ISO del país correcto (shapeISO de geoBoundaries a veces trae otro país) y zona horaria."""
    usados, out = set(), []
    for i, f in enumerate(feats, 1):
        p = f["properties"]
        crudo = str(p.get("shapeISO") or p.get("id") or "")
        m = re.fullmatch(r"([A-Z]{2})-([A-Z0-9]{1,4})", crudo)
        rid = f"{iso2}-{m.group(2)}" if m and iso2 else f"{iso2 or iso3}-R{i:02d}"
        if rid in usados:
            rid = f"{iso2 or iso3}-R{i:02d}"
        usados.add(rid)
        pts = puntos(f["geometry"])
        lons, lats = [q[0] for q in pts], [q[1] for q in pts]
        bbox = [min(lons), min(lats), max(lons), max(lats)]
        clon, clat = centro(f["geometry"])
        candidatas = tz.get(iso2 or "", [])
        dentro = [z for z in candidatas if contiene(f["geometry"], z[1], z[0])]
        zona = _manual().get(rid) or (dentro[0][2] if dentro else zona_cercana(candidatas, clat, clon))
        out.append({"type": "Feature", "properties": {
            "id": rid, "nombre": texto(p.get("shapeName") or p.get("nombre") or rid),
            "zona_horaria": zona,
            "bbox": bbox}, "geometry": f["geometry"]})
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


_OFFSETS: dict[str, float | None] = {}


def _horas(tz: str) -> float | None:
    """Desfase estándar en horas (el menor entre enero y julio). None si no hay base tz (Windows sin tzdata)."""
    if tz not in _OFFSETS:
        try:
            from datetime import datetime
            from zoneinfo import ZoneInfo
            z = ZoneInfo(tz)
            _OFFSETS[tz] = min(datetime(2024, m, 15, 12, tzinfo=z).utcoffset().total_seconds() for m in (1, 7)) / 3600
        except Exception:
            _OFFSETS[tz] = None
    return _OFFSETS[tz]


def zona_cercana(lista, lat, lon):
    """Zona IANA del país para el centro de la región: cercanía a la ciudad de referencia (1 punto por 1000 km)
    más diferencia con la hora solar (medio punto por hora). Antes se prueba si la ciudad de referencia de una zona
    cae dentro de la región, y en países grandes con varias zonas manda scripts/data/zonas_adm1.tsv."""
    if not lista:
        h = round(lon / 15)
        return "UTC" if h == 0 else f"Etc/GMT{'+' if h < 0 else '-'}{abs(h)}"
    def puntaje(z):
        p1, p2, dl = math.radians(lat), math.radians(z[0]), math.radians(z[1] - lon)
        km = 6371 * math.acos(max(-1, min(1, math.sin(p1) * math.sin(p2) + math.cos(p1) * math.cos(p2) * math.cos(dl))))
        h = _horas(z[2])
        return km / 1000 + (0.5 * abs(h - lon / 15) if h is not None else 0)
    return min(lista, key=puntaje)[2]


def texto(s):
    """Arregla nombres mal codificados en la fuente ("RegiÃ³n" -> "Región")."""
    if isinstance(s, str) and ("Ã" in s or "Â" in s):
        try:
            return s.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            return s
    return s


def pais(meta: dict, tz: dict, iso2s: dict) -> dict | None:
    iso3 = meta["boundaryISO"]
    url = meta.get("simplifiedGeometryGeoJSON") or meta.get("gjDownloadURL")
    if not url:
        return None
    fc = json.loads(get(url))
    iso2 = iso2s.get(iso3)
    crudos = [{"properties": f["properties"], "geometry": redondear(f["geometry"])} for f in fc["features"]
              if f.get("geometry") and f["geometry"]["type"] in ("Polygon", "MultiPolygon")]
    feats = normalizar(iso3, crudos, tz, iso2)
    if not feats:
        return None
    (OUT / f"{iso3}.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return {"iso3": iso3, "iso2": iso2, "nombre": meta.get("boundaryName") or iso3, "archivo": f"{iso3}.geojson",
            "regiones": len(feats), "licencia": meta.get("boundaryLicense")}


def reparar(tz: dict, iso2s: dict) -> int:
    idx_path = OUT / "index.json"
    idx = json.loads(idx_path.read_text(encoding="utf-8"))
    idx["paises"] = unicos_por_codigo(idx["paises"], "iso3")
    for p in idx["paises"]:
        if p["iso3"] == "PER" and p.get("licencia") == "INEI":
            continue                          # semilla oficial del INEI: ya trae PE-01 ... PE-25 y America/Lima
        ruta = OUT / p["archivo"]
        fc = json.loads(ruta.read_text(encoding="utf-8"))
        p["iso2"] = iso2s.get(p["iso3"])
        fc["features"] = normalizar(p["iso3"], fc["features"], tz, p["iso2"])
        ruta.write_text(json.dumps(fc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(idx['paises'])} países reparados")
    return 0


def unicos_por_codigo(rows: list[dict], campo: str) -> list[dict]:
    """Keep exact duplicates once; conflicting metadata needs human review."""
    seen = {}
    for row in rows:
        code = row[campo]
        if code in seen and seen[code] != row:
            raise ValueError(f"Conflicting catalogue entries: {code}")
        seen.setdefault(code, row)
    return list(seen.values())


def main(argv=None) -> int:
    a = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    a.add_argument("--solo", nargs="*", help="códigos ISO3 (por defecto, todos)")
    a.add_argument("--reparar", action="store_true", help="sin internet: corrige códigos ISO, ids y zonas de lo ya descargado")
    args = a.parse_args(argv)
    OUT.mkdir(parents=True, exist_ok=True)
    tz, iso2s = zonas(), iso2_de()
    if args.reparar:
        return reparar(tz, iso2s)
    metas = json.loads(get(API.format(iso="ALL")))
    if args.solo:
        metas = [m for m in metas if m["boundaryISO"] in set(args.solo)]
    else:  # Perú se queda con los departamentos oficiales del INEI que ya trae el repositorio
        metas = [m for m in metas if m["boundaryISO"] != "PER"]
    metas = unicos_por_codigo(metas, "boundaryISO")
    indice = json.loads((OUT / "index.json").read_text(encoding="utf-8"))["paises"] if (OUT / "index.json").exists() else []
    indice = [p for p in indice if p["iso3"] not in {m["boundaryISO"] for m in metas}]
    for k, m in enumerate(sorted(metas, key=lambda m: m["boundaryISO"]), 1):
        try:
            r = pais(m, tz, iso2s)
            print(f"[{k}/{len(metas)}] {m['boundaryISO']}: {r['regiones'] if r else 0} regiones")
            if r:
                indice.append(r)
        except Exception as e:
            print(f"[{k}/{len(metas)}] {m['boundaryISO']}: ERROR {e}", file=sys.stderr)
    indice = unicos_por_codigo(indice, "iso3")
    indice.sort(key=lambda p: p["iso3"])
    (OUT / "index.json").write_text(json.dumps({
        "fuente": "geoBoundaries (gbOpen, ADM1, simplificado) - www.geoboundaries.org",
        "licencia": "CC BY 4.0 salvo indicación por país (campo licencia)",
        "paises": indice}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(indice)} países en {OUT / 'index.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
