"""Paso 8 (T12/T31) - Escribe manifest.json con archivos, hashes, fuentes y fechas.

Entradas: los archivos entregables en --dir (por defecto data/processed) y
          data/processed/source_info.json (lo escribe 02_normalize.py).
Salida  : manifest.json en --dir.

Campos del contrato (docs/contrato_datos.md, seccion 6): region_id, files (lista de nombres)
y generated_at. Se AGREGAN, para T31 ("hash, producto y fechas"), `sha256` (nombre -> hash),
`period` (primer y ultimo mes de monthly_series.csv) y `sources` (producto, version, fechas,
filas y SHA-256 del zip original por sensor). Pendiente: que Aldo y Landry agreguen estos
campos al contrato.

Solo se listan los archivos que existen; los que faltan se avisan por pantalla.

Uso (sin preguntas interactivas):
    python scripts/08_manifest.py
    python scripts/08_manifest.py --dir frontend/public/data --info data/processed/source_info.json
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
        "first_month": f"{int(first.year)}-{int(first.month):02d}",
        "last_month": f"{int(last.year)}-{int(last.month):02d}",
    }


def build_manifest(directory: Path, info_path: Path, region_id: str, generated_at: str | None = None) -> dict:
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
        "files": files,
        "sha256": {name: sha256_file(directory / name) for name in files},
        "sources": sources,
    }
    period = period_of(directory)
    if period:
        manifest["period"] = period
    return manifest


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dir", type=Path, default=ROOT / "data" / "processed")
    parser.add_argument("--info", type=Path, default=ROOT / "data" / "processed" / "source_info.json")
    parser.add_argument("--region-id", default=series.REGION_ID)
    args = parser.parse_args(argv)

    if not args.dir.exists():
        print(f"ERROR: no existe {args.dir}.", file=sys.stderr)
        return 1
    _, missing = list_deliverables(args.dir, args.region_id)
    if missing:
        print("AVISO: faltan entregables (no se listan en el manifest): " + ", ".join(missing))
    manifest = build_manifest(args.dir, args.info, args.region_id)
    out = args.dir / "manifest.json"
    out.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{out}: {len(manifest['files'])} archivos")
    return 0


if __name__ == "__main__":
    sys.exit(main())
