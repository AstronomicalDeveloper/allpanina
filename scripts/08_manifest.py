"""Paso 8 (T12/T31) - Escribe manifest.json con archivos, hashes, fuentes y fechas.

Entradas: los archivos entregables en --dir (por defecto data/processed) y
          data/processed/source_info.json (lo escribe 02_normalize.py).
Salida  : manifest.json en --dir.

Campos del contrato (docs/contrato_datos.md, seccion 6, T31): generated_at, region_id, producto,
periodo {desde, hasta}, files (lista de nombres) y hash (nombre -> "sha256:<hex>").
Ademas se agrega `sources` (extra, no esta en el contrato): por sensor, el valor literal de
`version`, fechas, filas y SHA-256 del zip original de FIRMS.

Solo se listan los archivos que existen; los que faltan se avisan por pantalla.

Extension Peru (P18, contrato v1.1 seccion H): con --peru, region_id = "PE" y se agregan
`contract_version` = "1.1" y `regions` (los 26 region_id presentes en monthly_series.csv). El script
se detiene si no hay exactamente 26 regiones, PE y PE-01 ... PE-25.

Uso (sin preguntas interactivas):
    python scripts/08_manifest.py
    python scripts/08_manifest.py --dir frontend/public/data --info data/processed/source_info.json
    python scripts/08_manifest.py --peru --dir frontend/public/data/peru --info data/processed/source_info.json
"""

from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

download = importlib.import_module("scripts.01_download")
series = importlib.import_module("scripts.04_monthly_series")

FIXED_FILES = ("monthly_series.csv", "calibrated_series.csv", "validation.json", "method.json")
PRODUCT = {
    "MODIS": "MODIS Terra+Aqua, Coleccion 6.1, archivo estandar FIRMS",
    "VIIRS": "VIIRS S-NPP 375 m, Coleccion 2, archivo estandar FIRMS",
}
ZIP_OF = {"MODIS": "modis", "VIIRS": "viirs_snpp"}
PRODUCTO = "MCD14ML v6.1 / VNP14IMGML v2"  # texto del ejemplo del contrato (docs/contrato_datos.md)
PERU_REGION_ID = "PE"
PERU_CONTRACT_VERSION = "1.1"
PERU_REGIONS = ["PE"] + [f"PE-{i:02d}" for i in range(1, 26)]


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def list_deliverables(directory: Path, region_id: str) -> tuple[list[str], list[str]]:
    """Devuelve (presentes, faltantes) entre los entregables esperados del contrato."""
    geojson = sorted(p.name for p in directory.glob(f"cells_{region_id}_*.geojson"))
    present = [n for n in FIXED_FILES if (directory / n).exists()] + geojson
    missing = [n for n in FIXED_FILES if not (directory / n).exists()]
    if not geojson:
        missing.append(f"cells_{region_id}_<anio>.geojson")
    return present, missing


def period_of(directory: Path) -> dict | None:
    path = directory / "monthly_series.csv"
    if not path.exists():
        return None
    frame = pd.read_csv(path, usecols=["year", "month"])
    if frame.empty:
        return None
    first = frame.sort_values(["year", "month"]).iloc[0]
    last = frame.sort_values(["year", "month"]).iloc[-1]
    return {
        "desde": f"{int(first.year)}-{int(first.month):02d}",
        "hasta": f"{int(last.year)}-{int(last.month):02d}",
    }


def peru_regions(directory: Path) -> list[str]:
    """Los region_id de monthly_series.csv, en el orden del contrato (PE, PE-01 ... PE-25).

    Lanza ValueError si no son exactamente los 26 esperados.
    """
    path = directory / "monthly_series.csv"
    if not path.exists():
        raise ValueError(f"falta {path}: no se pueden listar las regiones")
    found = set(pd.read_csv(path, usecols=["region_id"])["region_id"].astype(str))
    if found != set(PERU_REGIONS):
        extra = sorted(found - set(PERU_REGIONS))
        missing = [r for r in PERU_REGIONS if r not in found]
        raise ValueError(f"regiones distintas de las 26 esperadas; sobran {extra}, faltan {missing}")
    return list(PERU_REGIONS)


def build_manifest(
    directory: Path, info_path: Path, region_id: str, generated_at: str | None = None, peru: bool = False
) -> dict:
    files, _ = list_deliverables(directory, region_id)
    sources = {}
    if info_path.exists():
        info = json.loads(info_path.read_text(encoding="utf-8"))
        for group, details in info.items():
            spec = download.EXPECTED[ZIP_OF[group]]
            sources[group] = {
                "product": PRODUCT[group],
                "zip": spec["zip"],
                "zip_sha256": spec["sha256"],
                **details,
            }
    manifest = {
        "generated_at": generated_at or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "region_id": region_id,
        "producto": PRODUCTO,
        "files": files,
        "hash": {name: "sha256:" + sha256_file(directory / name) for name in files},
        "sources": sources,
    }
    periodo = period_of(directory)
    if periodo:
        manifest["periodo"] = periodo
    if peru:
        manifest["contract_version"] = PERU_CONTRACT_VERSION
        manifest["regions"] = peru_regions(directory)
    return manifest


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dir", type=Path, default=ROOT / "data" / "processed")
    parser.add_argument("--info", type=Path, default=ROOT / "data" / "processed" / "source_info.json")
    parser.add_argument("--region-id", default=series.REGION_ID)
    parser.add_argument("--peru", action="store_true", help="Extension Peru (P18): region_id PE, contract_version 1.1 y regions.")
    args = parser.parse_args(argv)
    if args.peru:
        args.region_id = PERU_REGION_ID

    if not args.dir.exists():
        print(f"ERROR: no existe {args.dir}.", file=sys.stderr)
        return 1
    _, missing = list_deliverables(args.dir, args.region_id)
    if missing:
        print("AVISO: faltan entregables (no se listan en el manifest): " + ", ".join(missing))
    try:
        manifest = build_manifest(args.dir, args.info, args.region_id, peru=args.peru)
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    out = args.dir / "manifest.json"
    with out.open("w", encoding="utf-8", newline="\n") as handle:  # LF siempre, tambien en Windows
        handle.write(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"{out}: {len(manifest['files'])} archivos")
    return 0


if __name__ == "__main__":
    sys.exit(main())
