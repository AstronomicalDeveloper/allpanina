"""Paso 5 (T20) - GeoJSON ligero de celdas observadas -> cells_<region>_<anio>.geojson.

Entrada : data/processed/cell_days.parquet
Salida  : data/processed/cells_<region_id>_<anio>.geojson   (uno por anio pedido)

Formato (docs/contrato_datos.md, seccion 5): FeatureCollection RFC 7946, WGS84, SIN miembro `crs`.
Una feature por (celda, mes, grupo-sensor) con `cell_id`, `year`, `month`, `sensor_group` y
`cell_days` (dias del mes con deteccion en esa celda). Son valores OBSERVADOS; nunca se aplica
calibracion regional a una celda.

Cada celda es un rectangulo exacto en longitud/latitud (EPSG:6933 es cilindrica). El anillo
exterior va en sentido antihorario (RFC 7946) y las coordenadas se redondean a 5 decimales.

Region: centro de celda dentro del poligono INEI de Ucayali (ver 04_monthly_series.py).

Tamano: un anio pesa varios MB sin comprimir. Por eso el valor por defecto es --years 2024;
acordar con Juan que anios y meses publicar antes de generar mas.

Test reservado: los anios 2025 y 2026 requieren --include-test (autorizacion de Aldo y Antonella).

Uso (sin preguntas interactivas):
    python scripts/05_geojson_export.py
    python scripts/05_geojson_export.py --years 2023 2024 --out-dir frontend/public/data
"""

from __future__ import annotations

import argparse
import importlib
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

grid = importlib.import_module("scripts.03_grid_dedupe")
series = importlib.import_module("scripts.04_monthly_series")

FIRST_TEST_YEAR = 2025
COORD_DECIMALS = 5


def monthly_cells(cell_days: pd.DataFrame, bbox, year: int, polygon=None) -> pd.DataFrame:
    """Dias con deteccion por (grupo-sensor, celda, mes) dentro de la region y el anio."""
    region = series.filter_region(cell_days, bbox, polygon)
    region = region[region["year"] == year]
    return (
        region.groupby(["sensor_group", "cell_id", "x_km", "y_km", "year", "month"], sort=True)
        .size()
        .rename("cell_days")
        .reset_index()
        .sort_values(["month", "sensor_group", "x_km", "y_km"], kind="stable")
        .reset_index(drop=True)
    )


def build_geojson(cells: pd.DataFrame) -> dict:
    """FeatureCollection RFC 7946 (sin `crs`) a partir de la salida de `monthly_cells`."""
    lon_min, lat_min, lon_max, lat_max = grid.cell_bounds(cells["x_km"].to_numpy(), cells["y_km"].to_numpy())
    features = []
    for i, row in enumerate(cells.itertuples(index=False)):
        w, s, e, n = (round(float(v[i]), COORD_DECIMALS) for v in (lon_min, lat_min, lon_max, lat_max))
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "cell_id": row.cell_id,
                    "year": int(row.year),
                    "month": int(row.month),
                    "sensor_group": row.sensor_group,
                    "cell_days": int(row.cell_days),
                },
                "geometry": {"type": "Polygon", "coordinates": [[[w, s], [e, s], [e, n], [w, n], [w, s]]]},
            }
        )
    return {"type": "FeatureCollection", "features": features}


def run(cell_days_path: Path, out_dir: Path, region_id: str, bbox, years: list[int], polygon_path=None) -> None:
    if not cell_days_path.exists():
        raise FileNotFoundError(f"Falta {cell_days_path}. Ejecuta antes scripts/03_grid_dedupe.py.")
    polygon = series.load_polygon(polygon_path) if polygon_path else None
    cell_days = pd.read_parquet(cell_days_path)
    out_dir.mkdir(parents=True, exist_ok=True)
    for year in years:
        collection = build_geojson(monthly_cells(cell_days, bbox, year, polygon))
        path = out_dir / f"cells_{region_id}_{year}.geojson"
        path.write_text(json.dumps(collection, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"{path}: {len(collection['features'])} features, {path.stat().st_size / 1e6:.2f} MB")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--cell-days", type=Path, default=ROOT / "data" / "processed" / "cell_days.parquet")
    parser.add_argument("--out-dir", type=Path, default=ROOT / "data" / "processed")
    parser.add_argument("--region-id", default=series.REGION_ID)
    parser.add_argument("--bbox", type=float, nargs=4, metavar=("LON_MIN", "LAT_MIN", "LON_MAX", "LAT_MAX"), default=series.REGION_BBOX)
    parser.add_argument("--polygon", type=Path, default=series.REGION_POLYGON, help="GeoJSON de la region (por defecto, poligono INEI de Ucayali)")
    parser.add_argument("--years", type=int, nargs="+", default=[2024])
    parser.add_argument("--include-test", action="store_true", help="Permite anios >= 2025 (test reservado).")
    args = parser.parse_args(argv)

    if not args.include_test and any(y >= FIRST_TEST_YEAR for y in args.years):
        print("ERROR: los anios 2025-2026 son el test reservado. Usa --include-test solo con autorizacion de Aldo y Antonella.", file=sys.stderr)
        return 1
    try:
        run(args.cell_days, args.out_dir, args.region_id, tuple(args.bbox), args.years, args.polygon)
    except FileNotFoundError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
