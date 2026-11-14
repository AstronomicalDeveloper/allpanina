"""Paso 4 (T12/T19) - Suma celda-dias por region, mes y grupo-sensor -> monthly_series.csv.

Entrada : data/processed/cell_days.parquet
Salida  : data/processed/monthly_series.csv

Columnas (docs/contrato_datos.md): region_id, year, month, sensor_group, cell_days, status,
source_version, updated_at.
  * sensor_group: MODIS | VIIRS.
  * cell_days: pares (celda, dia) con deteccion en toda la region ese mes.
  * Un mes con sensor operativo y cero detecciones vale 0 y status `ok`.
  * Un mes sin datos vale VACIO (nunca 0) y status `insufficient_data`. Nunca se confunden
    (criterio de T19 en la matriz v1.4).
  * `no_pass` del contrato no se emite: los CSV de FIRMS no traen informacion de pases.

Cuando un mes queda como `insufficient_data` (por sensor):
  1. Esta fuera de la ventana estandar del sensor: MODIS antes de 2003-01; VIIRS S-NPP antes
     de 2012-02 (FIRMS lo ofrece desde el 2012-01-20, asi que enero de 2012 es incompleto).
  2. Dentro de la ventana, el sensor no tiene NINGUNA deteccion en todo Peru ese mes: se
     interpreta como hueco de cobertura, no como ausencia de fuego.
  Propuesta pendiente de acordar con Aldo: DECISIONS.md (seccion 8) usa un status unico
  ambiguo (`sin_actividad_o_sin_cobertura`) que no distingue estos casos.

Region: caja de DECISIONS.md (seccion 1), PROVISIONAL hasta tener el poligono oficial de la
provincia. Se filtra por el centro de la celda.

Test reservado (DECISIONS.md, regla de oro): por defecto la serie termina en 2024-12
(train + validacion). La serie completa hasta 2026-07 requiere --include-test y solo se
corre con la autorizacion conjunta de Aldo y Antonella.

Uso (sin preguntas interactivas):
    python scripts/04_monthly_series.py
    python scripts/04_monthly_series.py --first-month 2024-08 --last-month 2024-09   # muestra T12
"""

from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
REGION_ID = "PE-UCA-CPO"
REGION_BBOX = (-75.60, -10.00, -73.30, -7.00)  # lon_min, lat_min, lon_max, lat_max (provisional)
FIRST_MONTH = (2013, 1)
DEFAULT_LAST_MONTH = (2024, 12)
TEST_LAST_MONTH = (2026, 7)
SENSOR_FIRST_COMPLETE_MONTH = {"MODIS": (2003, 1), "VIIRS": (2012, 2)}
SENSORS = tuple(SENSOR_FIRST_COMPLETE_MONTH)
COLUMNS = ["region_id", "year", "month", "sensor_group", "cell_days", "status", "source_version", "updated_at"]


def _month_index(year_month: tuple[int, int]) -> int:
    return year_month[0] * 12 + (year_month[1] - 1)


def filter_region(cell_days: pd.DataFrame, bbox: tuple[float, float, float, float] | None) -> pd.DataFrame:
    """Filtra celda-dias por caja (lon_min, lat_min, lon_max, lat_max) usando el centro de celda."""
    if bbox is None:
        return cell_days
    lon_min, lat_min, lon_max, lat_max = bbox
    inside = cell_days["center_lon"].between(lon_min, lon_max) & cell_days["center_lat"].between(lat_min, lat_max)
    return cell_days[inside]


def _versions(frame: pd.DataFrame) -> dict[tuple[str, int, int], str]:
    """source_version por (sensor, anio, mes): valores literales de `version`, unidos con '+'."""
    if "version" not in frame.columns:
        return {}
    pairs = frame.dropna(subset=["version"]).groupby(["sensor_group", "year", "month"])["version"].agg(
        lambda s: "+".join(sorted({str(v) for v in s}))
    )
    return pairs.to_dict()


def build_monthly_series(
    cell_days: pd.DataFrame,
    region_id: str = REGION_ID,
    bbox: tuple[float, float, float, float] | None = REGION_BBOX,
    first_month: tuple[int, int] = FIRST_MONTH,
    last_month: tuple[int, int] = DEFAULT_LAST_MONTH,
    updated_at: str | None = None,
) -> pd.DataFrame:
    """Construye la serie mensual por region y grupo-sensor.

    `cell_days` es la tabla nacional de 03_grid_dedupe (sensor_group, year, month, center_lon,
    center_lat y, opcionalmente, version). La cobertura se evalua sobre todo el pais.
    """
    stamp = updated_at or date.today().isoformat()
    national = cell_days.groupby(["sensor_group", "year", "month"]).size()
    covered = set(national.index)
    versions = _versions(cell_days)
    counts = filter_region(cell_days, bbox).groupby(["sensor_group", "year", "month"]).size()

    rows = []
    for index in range(_month_index(first_month), _month_index(last_month) + 1):
        year, month = index // 12, index % 12 + 1
        for sensor in SENSORS:
            in_window = index >= _month_index(SENSOR_FIRST_COMPLETE_MONTH[sensor])
            key = (sensor, year, month)
            if in_window and key in covered:
                rows.append((region_id, year, month, sensor, int(counts.get(key, 0)), "ok", versions.get(key, ""), stamp))
            else:
                rows.append((region_id, year, month, sensor, None, "insufficient_data", "", stamp))

    series = pd.DataFrame(rows, columns=COLUMNS)
    series["cell_days"] = series["cell_days"].astype("Int64")
    return series


def run(cell_days_path: Path, out_path: Path, region_id: str, bbox, first_month, last_month, updated_at) -> None:
    if not cell_days_path.exists():
        raise FileNotFoundError(f"Falta {cell_days_path}. Ejecuta antes scripts/03_grid_dedupe.py.")
    cell_days = pd.read_parquet(cell_days_path)
    series = build_monthly_series(cell_days, region_id, bbox, first_month, last_month, updated_at)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    series.to_csv(out_path, index=False)

    summary = series.groupby(["sensor_group", "status"]).size().unstack(fill_value=0)
    print(summary.to_string())
    print(
        f"{len(series)} filas en {out_path} (region_id={region_id}, "
        f"{first_month[0]}-{first_month[1]:02d} a {last_month[0]}-{last_month[1]:02d})"
    )


def _parse_month(text: str) -> tuple[int, int]:
    year, month = text.split("-")
    return int(year), int(month)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--cell-days", type=Path, default=ROOT / "data" / "processed" / "cell_days.parquet")
    parser.add_argument("--out", type=Path, default=ROOT / "data" / "processed" / "monthly_series.csv")
    parser.add_argument("--region-id", default=REGION_ID)
    parser.add_argument("--bbox", type=float, nargs=4, metavar=("LON_MIN", "LAT_MIN", "LON_MAX", "LAT_MAX"), default=REGION_BBOX)
    parser.add_argument("--first-month", type=_parse_month, default=FIRST_MONTH, help="AAAA-MM")
    parser.add_argument("--last-month", type=_parse_month, default=DEFAULT_LAST_MONTH, help="AAAA-MM")
    parser.add_argument("--include-test", action="store_true", help="Llega hasta 2026-07 (periodo de test reservado).")
    parser.add_argument("--updated-at", default=None, help="AAAA-MM-DD (por defecto, hoy)")
    args = parser.parse_args(argv)

    last_month = TEST_LAST_MONTH if args.include_test else args.last_month
    if not args.include_test and _month_index(last_month) > _month_index(DEFAULT_LAST_MONTH):
        print("ERROR: --last-month pasa de 2024-12 (test reservado). Usa --include-test solo con autorizacion de Aldo y Antonella.", file=sys.stderr)
        return 1
    if args.include_test:
        print("AVISO: incluye el periodo de test reservado (2025-01 a 2026-07). No interpretes estos valores sin autorizacion.")
    try:
        run(args.cell_days, args.out, args.region_id, tuple(args.bbox), args.first_month, last_month, args.updated_at)
    except FileNotFoundError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
