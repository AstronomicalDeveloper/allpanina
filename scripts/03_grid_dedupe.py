"""Paso 3 (T11) - Asigna cada punto a una celda de 1 km y deduplica por celda-dia.

Entrada : data/processed/points_clean.parquet
Salida  : data/processed/cell_days.parquet   (todo Peru; el filtro por region va en 04 y 05)

Definiciones (DECISIONS.md, secciones 5 y 6):
  * Malla de 1 km en EPSG:6933 (WGS84 / NSIDC EASE-Grid 2.0 Global, cilindrica de area
    igual, metros):  x_km = floor(x / 1000),  y_km = floor(y / 1000),  cell_id = "x_km_y_km".
    En esta proyeccion x depende solo de la longitud e y solo de la latitud, asi que cada
    celda es un rectangulo exacto en longitud/latitud.
  * Una fila = una celda-dia con al menos una deteccion de un grupo-sensor. Se deduplica por
    (sensor_group, celda, dia local de Lima): Terra y Aqua en la misma celda y el mismo dia
    cuentan UNA vez en el grupo MODIS.
  * `version` = valor literal de la columna `version` de FIRMS (el minimo del dia; las
    versiones no se mezclan dentro de un mismo dia).
  * center_lon / center_lat (WGS84) es el centro de la celda, para filtrar por region.

Uso (sin preguntas interactivas):
    python scripts/03_grid_dedupe.py
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from pyproj import Transformer

ROOT = Path(__file__).resolve().parent.parent
GRID_CRS = "EPSG:6933"
CELL_SIZE_M = 1000

_TO_GRID = Transformer.from_crs("EPSG:4326", GRID_CRS, always_xy=True)
_TO_WGS84 = Transformer.from_crs(GRID_CRS, "EPSG:4326", always_xy=True)


def assign_cells(points: pd.DataFrame) -> pd.DataFrame:
    """Agrega x_km, y_km y cell_id (EPSG:6933, 1 km) segun latitude/longitude."""
    out = points.copy()
    x, y = _TO_GRID.transform(out["longitude"].to_numpy(dtype="float64"), out["latitude"].to_numpy(dtype="float64"))
    out["x_km"] = np.floor(np.asarray(x) / CELL_SIZE_M).astype("int64")
    out["y_km"] = np.floor(np.asarray(y) / CELL_SIZE_M).astype("int64")
    out["cell_id"] = out["x_km"].astype(str) + "_" + out["y_km"].astype(str)
    return out


def cell_bounds(x_km, y_km) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Limites WGS84 (lon_min, lat_min, lon_max, lat_max) de las celdas dadas."""
    x0 = np.asarray(x_km, dtype="float64") * CELL_SIZE_M
    y0 = np.asarray(y_km, dtype="float64") * CELL_SIZE_M
    lon_min, lat_min = _TO_WGS84.transform(x0, y0)
    lon_max, lat_max = _TO_WGS84.transform(x0 + CELL_SIZE_M, y0 + CELL_SIZE_M)
    return np.asarray(lon_min), np.asarray(lat_min), np.asarray(lon_max), np.asarray(lat_max)


def dedupe_cell_days(points: pd.DataFrame) -> pd.DataFrame:
    """Colapsa puntos a celda-dias unicos por grupo-sensor.

    `points` necesita: sensor_group, satellite, latitude, longitude, local_date y, opcionalmente, version.
    """
    cells = assign_cells(points)
    if "version" not in cells.columns:
        cells["version"] = pd.NA
    cells["version"] = cells["version"].astype("string")
    grouped = (
        cells.groupby(["sensor_group", "cell_id", "x_km", "y_km", "local_date"], sort=True, observed=True)
        .agg(
            n_points=("satellite", "size"),
            n_satellites=("satellite", "nunique"),
            version=("version", "min"),
        )
        .reset_index()
    )
    lon_min, lat_min, lon_max, lat_max = cell_bounds(grouped["x_km"].to_numpy(), grouped["y_km"].to_numpy())
    grouped["center_lon"] = np.round((lon_min + lon_max) / 2, 5)
    grouped["center_lat"] = np.round((lat_min + lat_max) / 2, 5)
    grouped["year"] = grouped["local_date"].dt.year.astype("int64")
    grouped["month"] = grouped["local_date"].dt.month.astype("int64")
    return grouped[
        [
            "sensor_group", "cell_id", "x_km", "y_km", "center_lon", "center_lat",
            "local_date", "year", "month", "n_points", "n_satellites", "version",
        ]
    ]


def run(points_path: Path, out_path: Path) -> None:
    if not points_path.exists():
        raise FileNotFoundError(f"Falta {points_path}. Ejecuta antes scripts/02_normalize.py.")
    points = pd.read_parquet(points_path)
    cell_days = dedupe_cell_days(points)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cell_days.to_parquet(out_path, index=False)
    summary = cell_days.groupby("sensor_group").agg(celda_dias=("cell_id", "size"), celdas=("cell_id", "nunique"))
    print(summary.to_string())
    print(f"{len(points)} puntos -> {len(cell_days)} celda-dias en {out_path}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--points", type=Path, default=ROOT / "data" / "processed" / "points_clean.parquet")
    parser.add_argument("--out", type=Path, default=ROOT / "data" / "processed" / "cell_days.parquet")
    args = parser.parse_args(argv)
    try:
        run(args.points, args.out)
    except FileNotFoundError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
