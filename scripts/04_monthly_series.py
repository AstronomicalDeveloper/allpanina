"""Paso 4 - Suma celda-dias por region, mes y grupo-sensor -> monthly_series.csv.

Entrada : data/processed/cell_days.parquet
Salida  : data/processed/monthly_series.csv

Columnas (contrato v0): region_id, year, month, sensor_group, cell_days, status, qc
  * sensor_group: modis | viirs_snpp          * qc: strict | none
  * status: ok | sin_datos
  * Un mes con cero detecciones vale 0 y status ok.
  * Un mes sin cobertura vale vacio (nulo) y status sin_datos. Nunca se confunden.

Regla de `sin_datos` (pendiente de confirmar en DECISIONS.md), por grupo-sensor:
  1. Meses fuera de la ventana estandar del sensor: VIIRS S-NPP antes de 2012-02
     (FIRMS lo ofrece desde el 2012-01-20, asi que enero 2012 queda incompleto).
  2. Meses dentro de la ventana en los que no hay NINGUNA deteccion en todo Peru
     para ese sensor (el pais completo, no la region): se interpreta como hueco de cobertura.

Serie: de 2003-01 al ultimo mes estandar comun (por defecto 2026-07). Los datos NRT
no se usan.

Region: aun no esta definida por el equipo. Por defecto `peru` usa todo el pais.
Para una region rectangular: --region-id <id> --bbox lon_min lat_min lon_max lat_max
(se filtra por el centro de la celda).

Uso (sin preguntas interactivas):
    python scripts/04_monthly_series.py
    python scripts/04_monthly_series.py --region-id <id> --bbox -77 -12 -75 -10
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
FIRST_MONTH = (2003, 1)
LAST_STANDARD_MONTH = (2026, 7)
VIIRS_FIRST_COMPLETE_MONTH = (2012, 2)
SENSORS = ("modis", "viirs_snpp")
QC_LEVELS = ("strict", "none")
COLUMNS = ["region_id", "year", "month", "sensor_group", "cell_days", "status", "qc"]


def _month_index(year_month: tuple[int, int]) -> int:
    return year_month[0] * 12 + (year_month[1] - 1)


def filter_region(cell_days: pd.DataFrame, bbox: tuple[float, float, float, float] | None) -> pd.DataFrame:
    """Filtra celda-dias por caja (lon_min, lat_min, lon_max, lat_max) usando el centro de celda."""
    if bbox is None:
        return cell_days
    lon_min, lat_min, lon_max, lat_max = bbox
    inside = cell_days["center_lon"].between(lon_min, lon_max) & cell_days["center_lat"].between(lat_min, lat_max)
    return cell_days[inside]


def build_monthly_series(
    cell_days: pd.DataFrame,
    region_id: str = "peru",
    bbox: tuple[float, float, float, float] | None = None,
    first_month: tuple[int, int] = FIRST_MONTH,
    last_month: tuple[int, int] = LAST_STANDARD_MONTH,
) -> pd.DataFrame:
    """Construye la serie mensual por region, grupo-sensor y nivel de QC.

    `cell_days` es la tabla nacional de 03_grid_dedupe (sensor_group, year, month,
    center_lon, center_lat, qc_strict). La cobertura se evalua sobre todo el pais.
    """
    national = cell_days.groupby(["sensor_group", "year", "month"]).size()
    covered = set(national.index)

    region = filter_region(cell_days, bbox)
    counts = {
        "none": region.groupby(["sensor_group", "year", "month"]).size(),
        "strict": region[region["qc_strict"]].groupby(["sensor_group", "year", "month"]).size(),
    }

    months = [
        (index // 12, index % 12 + 1)
        for index in range(_month_index(first_month), _month_index(last_month) + 1)
    ]
    rows = []
    for year, month in months:
        for sensor in SENSORS:
            in_window = sensor != "viirs_snpp" or _month_index((year, month)) >= _month_index(VIIRS_FIRST_COMPLETE_MONTH)
            has_data = in_window and (sensor, year, month) in covered
            for qc in QC_LEVELS:
                if has_data:
                    value = int(counts[qc].get((sensor, year, month), 0))
                    rows.append((region_id, year, month, sensor, value, "ok", qc))
                else:
                    rows.append((region_id, year, month, sensor, None, "sin_datos", qc))

    series = pd.DataFrame(rows, columns=COLUMNS)
    series["cell_days"] = series["cell_days"].astype("Int64")
    return series


def run(cell_days_path: Path, out_path: Path, region_id: str, bbox, last_month: tuple[int, int]) -> None:
    if not cell_days_path.exists():
        raise FileNotFoundError(f"Falta {cell_days_path}. Ejecuta antes scripts/03_grid_dedupe.py.")
    cell_days = pd.read_parquet(cell_days_path)
    series = build_monthly_series(cell_days, region_id=region_id, bbox=bbox, last_month=last_month)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    series.to_csv(out_path, index=False)

    summary = series.groupby(["sensor_group", "qc", "status"]).size().unstack(fill_value=0)
    print(summary.to_string())
    print(f"{len(series)} filas en {out_path} (region_id={region_id}, hasta {last_month[0]}-{last_month[1]:02d})")


def _parse_month(text: str) -> tuple[int, int]:
    year, month = text.split("-")
    return int(year), int(month)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--cell-days", type=Path, default=ROOT / "data" / "processed" / "cell_days.parquet")
    parser.add_argument("--out", type=Path, default=ROOT / "data" / "processed" / "monthly_series.csv")
    parser.add_argument("--region-id", default="peru")
    parser.add_argument("--bbox", type=float, nargs=4, metavar=("LON_MIN", "LAT_MIN", "LON_MAX", "LAT_MAX"))
    parser.add_argument("--last-month", type=_parse_month, default=LAST_STANDARD_MONTH, help="AAAA-MM")
    args = parser.parse_args(argv)
    try:
        run(args.cell_days, args.out, args.region_id, tuple(args.bbox) if args.bbox else None, args.last_month)
    except FileNotFoundError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
