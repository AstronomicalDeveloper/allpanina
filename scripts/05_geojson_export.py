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

Extension Peru (paso P08, contrato v1.1 seccion G): con --peru sale un mapa NACIONAL a 10 km,
`cells_PE_<anio>.geojson`, uno por anio.
  * Solo celdas de Peru: antes de agregar se descartan las celdas de 1 km cuyo centro no cae en
    ninguno de los 25 departamentos (docs/region/departamentos_inei_2023.geojson).
  * Celda de 10 km en EPSG:6933: bloque de 10 x 10 celdas de 1 km (x10 = floor(x_km / 10)).
    `cell_id` = "x_km_y_km" de su esquina suroeste (multiplos de 10). Sin `region_id`.
  * `cell_days` = suma de los `cell_days` de las celdas de 1 km del bloque (no se deduplica otra vez).
  * En cada mes y sensor, la suma del archivo = `PE` en la serie de 04_monthly_series.py --peru.
  * Si un anio pasa de 6 MB se avisa (contrato v1.1, seccion G).

Uso (sin preguntas interactivas):
    python scripts/05_geojson_export.py
    python scripts/05_geojson_export.py --years 2023 2024 --out-dir frontend/public/data
    python scripts/05_geojson_export.py --peru --years 2013 ... 2024                 # P08, mapa a 10 km
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
PERU_BLOCK_KM = 10            # celda del mapa nacional (contrato v1.1, seccion G)
PERU_MAX_MB = 6.0             # aviso si un anio pasa de este tamano


def _within_period(frame: pd.DataFrame) -> pd.DataFrame:
    last = series.TEST_LAST_MONTH[0] * 12 + series.TEST_LAST_MONTH[1] - 1
    return frame[(frame["year"] * 12 + frame["month"] - 1) <= last]


def monthly_cells(cell_days: pd.DataFrame, bbox, year: int, polygon=None) -> pd.DataFrame:
    """Dias con deteccion por (grupo-sensor, celda, mes) dentro de la region y el anio."""
    region = series.filter_region(cell_days, bbox, polygon)
    region = region[region["year"] == year]
    # Mismo limite que la serie mensual: los datos crudos de MODIS llegan a 2026-08, pero el periodo termina en 2026-07.
    region = region[(region["year"] * 12 + region["month"] - 1) <= (series.TEST_LAST_MONTH[0] * 12 + series.TEST_LAST_MONTH[1] - 1)]
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


def peru_cells(cell_days: pd.DataFrame, departments, year: int, block_km: int = PERU_BLOCK_KM) -> pd.DataFrame:
    """Celda-dias por (grupo-sensor, bloque de 10 km, mes) con SOLO celdas de 1 km asignadas a un departamento."""
    frame = cell_days[cell_days["year"] == year]
    frame = _within_period(frame)
    frame = frame[series.assign_departments(frame, departments).notna().to_numpy()]
    bx = (frame["x_km"] // block_km) * block_km
    by = (frame["y_km"] // block_km) * block_km
    frame = frame.assign(x_km=bx.astype("int64"), y_km=by.astype("int64"))
    frame = frame.assign(cell_id=frame["x_km"].astype(str) + "_" + frame["y_km"].astype(str))
    return (
        frame.groupby(["sensor_group", "cell_id", "x_km", "y_km", "year", "month"], sort=True)
        .size()
        .rename("cell_days")
        .reset_index()
        .sort_values(["month", "sensor_group", "x_km", "y_km"], kind="stable")
        .reset_index(drop=True)
    )


def build_block_geojson(cells: pd.DataFrame, block_km: int = PERU_BLOCK_KM) -> dict:
    """Como build_geojson, pero cada feature es un bloque de block_km x block_km celdas de 1 km."""
    x = cells["x_km"].to_numpy()
    y = cells["y_km"].to_numpy()
    lon_min, lat_min, _, _ = grid.cell_bounds(x, y)
    _, _, lon_max, lat_max = grid.cell_bounds(x + block_km - 1, y + block_km - 1)
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


def run_peru(cell_days_path: Path, out_dir: Path, years: list[int], departments_path: Path) -> None:
    if not cell_days_path.exists():
        raise FileNotFoundError(f"Falta {cell_days_path}. Ejecuta antes scripts/03_grid_dedupe.py.")
    departments = series.load_departments(departments_path)
    cell_days = pd.read_parquet(cell_days_path)
    out_dir.mkdir(parents=True, exist_ok=True)
    for year in years:
        collection = build_block_geojson(peru_cells(cell_days, departments, year))
        path = out_dir / f"cells_{series.NATIONAL_ID}_{year}.geojson"
        path.write_text(json.dumps(collection, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
        size_mb = path.stat().st_size / 1e6
        warning = f"  AVISO: pasa de {PERU_MAX_MB:.0f} MB" if size_mb > PERU_MAX_MB else ""
        print(f"{path}: {len(collection['features'])} features, {size_mb:.2f} MB{warning}")


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
    parser.add_argument("--peru", action="store_true", help="Mapa nacional a 10 km, cells_PE_<anio>.geojson (P08).")
    parser.add_argument("--departments", type=Path, default=series.DEPARTMENTS_POLYGONS, help="GeoJSON de los 25 departamentos (solo con --peru)")
    args = parser.parse_args(argv)

    if not args.include_test and any(y >= FIRST_TEST_YEAR for y in args.years):
        print("ERROR: los anios 2025-2026 son el test reservado. Usa --include-test solo con autorizacion de Aldo y Antonella.", file=sys.stderr)
        return 1
    try:
        if args.peru:
            out_dir = args.out_dir if args.out_dir != parser.get_default("out_dir") else ROOT / "data" / "processed" / "peru"
            run_peru(args.cell_days, out_dir, args.years, args.departments)
            return 0
        run(args.cell_days, args.out_dir, args.region_id, tuple(args.bbox), args.years, args.polygon)
    except (FileNotFoundError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
