"""Paso 4 (T12/T19) - Suma celda-dias por region, mes y grupo-sensor -> monthly_series.csv.

Entrada : data/processed/cell_days.parquet
Salida  : data/processed/monthly_series.csv

Columnas (docs/contrato_datos.md): region_id, year, month, sensor_group, cell_days, status,
source_version, updated_at.
  * sensor_group: MODIS | VIIRS.
  * cell_days: pares (celda, dia) con deteccion en toda la region ese mes.
  * Un mes con sensor operativo y cero detecciones vale 0 y status `ok`.
  * Un mes sin datos vale VACIO (nunca 0) y status `missing`. Nunca se confunden
    (criterio de T19 en la matriz v1.4; DECISIONS.md, seccion 8).

Cuando un mes queda como `missing` (por sensor):
  1. Esta fuera de la ventana estandar del sensor: MODIS antes de 2003-01; VIIRS S-NPP antes
     de 2012-02 (FIRMS lo ofrece desde el 2012-01-20, asi que enero de 2012 es incompleto).
  2. Dentro de la ventana, el sensor no tiene NINGUNA deteccion en todo Peru ese mes: se
     trata como hueco de datos, no como ausencia de fuego (regla de este script; no esta
     escrita en DECISIONS.md, confirmar con Aldo).

Region: departamento de Ucayali (DECISIONS.md, seccion 1). Una celda cuenta si su CENTRO cae
dentro del poligono oficial del INEI (docs/region/ucayali_inei_2023.geojson, capa departamental
actualizada al 2023). La caja de coordenadas solo se usa como prefiltro rapido; el poligono es
el que decide.

Test reservado (DECISIONS.md, regla de oro): por defecto la serie termina en 2024-12
(train + validacion). La serie completa hasta 2026-07 requiere --include-test y solo se
corre con la autorizacion conjunta de Aldo y Antonella.

Extension Peru (DECISIONS.md seccion 11, contrato v1.1, paso P06): con --peru la serie sale
para 26 regiones, `PE` (nacional) y `PE-01` ... `PE-25` (departamentos, codigo INEI). Cada celda
de 1 km se asigna al departamento que contiene su centro (docs/region/departamentos_inei_2023.geojson).
Las celdas fuera de los 25 poligonos no cuentan. `PE` es la suma de los 25 departamentos. Las reglas
de `ok`/`missing` son las mismas del piloto. Sin --peru el script hace exactamente lo mismo que antes
(piloto Ucayali, `PE-UCA`).

Uso (sin preguntas interactivas):
    python scripts/04_monthly_series.py
    python scripts/04_monthly_series.py --first-month 2024-08 --last-month 2024-09   # muestra T12
    python scripts/04_monthly_series.py --peru                                       # P06, 26 regiones
"""

from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
REGION_ID = "PE-UCA"
REGION_BBOX = (-76.10, -11.55, -70.40, -7.15)  # lon_min, lat_min, lon_max, lat_max (DECISIONS.md, seccion 1)
REGION_POLYGON = ROOT / "tests" / "fixtures" / "region" / "ucayali_inei_2023.geojson"  # poligono oficial INEI 2023
FIRST_MONTH = (2013, 1)
DEFAULT_LAST_MONTH = (2024, 12)
TEST_LAST_MONTH = (2026, 7)
SENSOR_FIRST_COMPLETE_MONTH = {"MODIS": (2003, 1), "VIIRS": (2012, 2)}
SENSORS = tuple(SENSOR_FIRST_COMPLETE_MONTH)
STATUS_OK, STATUS_MISSING = "ok", "missing"
DEPARTMENTS_POLYGONS = ROOT / "tests" / "fixtures" / "region" / "departamentos_inei_2023.geojson"  # P05, 25 poligonos INEI 2023
NATIONAL_ID = "PE"
COLUMNS = ["region_id", "year", "month", "sensor_group", "cell_days", "status", "source_version", "updated_at"]


def _month_index(year_month: tuple[int, int]) -> int:
    return year_month[0] * 12 + (year_month[1] - 1)


def load_polygon(path: Path):
    """Lee un GeoJSON (WGS84) y devuelve la union de sus geometrias como objeto shapely."""
    import json

    import shapely
    from shapely.geometry import shape

    if not Path(path).exists():
        raise FileNotFoundError(f"Falta el poligono de la region: {path}")
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    features = data["features"] if data.get("type") == "FeatureCollection" else [data]
    geometry = shapely.union_all([shape(f["geometry"] if "geometry" in f else f) for f in features])
    shapely.prepare(geometry)
    return geometry


def filter_region(
    cell_days: pd.DataFrame,
    bbox: tuple[float, float, float, float] | None,
    polygon=None,
) -> pd.DataFrame:
    """Filtra celda-dias por el centro de celda: caja (lon_min, lat_min, lon_max, lat_max) y, si se da, poligono."""
    region = cell_days
    if bbox is not None:
        lon_min, lat_min, lon_max, lat_max = bbox
        inside = region["center_lon"].between(lon_min, lon_max) & region["center_lat"].between(lat_min, lat_max)
        region = region[inside]
    if polygon is not None and len(region):
        import shapely

        region = region[shapely.contains_xy(polygon, region["center_lon"].to_numpy(), region["center_lat"].to_numpy())]
    return region


def load_departments(path: Path) -> list[tuple[str, object]]:
    """Lee los 25 poligonos departamentales y devuelve [(region_id, geometria preparada)] ordenado por region_id."""
    import json

    import shapely
    from shapely.geometry import shape

    if not Path(path).exists():
        raise FileNotFoundError(f"Falta el archivo de departamentos: {path}")
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    departments = []
    for feature in data["features"]:
        geometry = shape(feature["geometry"])
        shapely.prepare(geometry)
        departments.append((feature["properties"]["region_id"], geometry))
    ids = [region_id for region_id, _ in departments]
    if len(set(ids)) != len(ids):
        raise ValueError("region_id repetido en el archivo de departamentos")
    return sorted(departments)


def assign_departments(cell_days: pd.DataFrame, departments: list[tuple[str, object]]) -> pd.Series:
    """region_id del departamento que contiene el centro de cada celda (NA si no cae en ninguno).

    Falla si un centro cae en dos departamentos: la particion tiene que ser exacta (P05).
    """
    import numpy as np
    import shapely

    lon = cell_days["center_lon"].to_numpy()
    lat = cell_days["center_lat"].to_numpy()
    assigned = np.full(len(cell_days), None, dtype=object)
    for region_id, geometry in departments:
        inside = shapely.contains_xy(geometry, lon, lat)
        if (inside & (assigned != None)).any():  # noqa: E711 (comparacion elemento a elemento)
            raise ValueError(f"Hay celdas que caen en {region_id} y en otro departamento a la vez")
        assigned[inside] = region_id
    return pd.Series(assigned, index=cell_days.index, dtype="object")


def build_peru_series(
    cell_days: pd.DataFrame,
    departments: list[tuple[str, object]],
    first_month: tuple[int, int] = FIRST_MONTH,
    last_month: tuple[int, int] = DEFAULT_LAST_MONTH,
    updated_at: str | None = None,
) -> pd.DataFrame:
    """Serie de las 26 regiones de la extension Peru: `PE` y luego `PE-01` ... `PE-25`.

    Mismas columnas y mismas reglas de status que el piloto. `PE` = suma de los departamentos.
    """
    stamp = updated_at or date.today().isoformat()
    national = cell_days.groupby(["sensor_group", "year", "month"]).size()
    covered = set(national.index)
    versions = _versions(cell_days)
    frame = cell_days.assign(region_id=assign_departments(cell_days, departments)).dropna(subset=["region_id"])
    counts = frame.groupby(["region_id", "sensor_group", "year", "month"]).size()
    totals = frame.groupby(["sensor_group", "year", "month"]).size()

    rows = []
    for region_id in [NATIONAL_ID] + [region_id for region_id, _ in departments]:
        for index in range(_month_index(first_month), _month_index(last_month) + 1):
            year, month = index // 12, index % 12 + 1
            for sensor in SENSORS:
                in_window = index >= _month_index(SENSOR_FIRST_COMPLETE_MONTH[sensor])
                key = (sensor, year, month)
                if in_window and key in covered:
                    value = totals.get(key, 0) if region_id == NATIONAL_ID else counts.get((region_id,) + key, 0)
                    rows.append((region_id, year, month, sensor, int(value), STATUS_OK, versions.get(key, ""), stamp))
                else:
                    rows.append((region_id, year, month, sensor, None, STATUS_MISSING, "", stamp))

    series = pd.DataFrame(rows, columns=COLUMNS)
    series["cell_days"] = series["cell_days"].astype("Int64")
    return series


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
    polygon=None,
) -> pd.DataFrame:
    """Construye la serie mensual por region y grupo-sensor.

    `cell_days` es la tabla nacional de 03_grid_dedupe (sensor_group, year, month, center_lon,
    center_lat y, opcionalmente, version). La cobertura se evalua sobre todo el pais.
    """
    stamp = updated_at or date.today().isoformat()
    national = cell_days.groupby(["sensor_group", "year", "month"]).size()
    covered = set(national.index)
    versions = _versions(cell_days)
    counts = filter_region(cell_days, bbox, polygon).groupby(["sensor_group", "year", "month"]).size()

    rows = []
    for index in range(_month_index(first_month), _month_index(last_month) + 1):
        year, month = index // 12, index % 12 + 1
        for sensor in SENSORS:
            in_window = index >= _month_index(SENSOR_FIRST_COMPLETE_MONTH[sensor])
            key = (sensor, year, month)
            if in_window and key in covered:
                rows.append((region_id, year, month, sensor, int(counts.get(key, 0)), STATUS_OK, versions.get(key, ""), stamp))
            else:
                rows.append((region_id, year, month, sensor, None, STATUS_MISSING, "", stamp))

    series = pd.DataFrame(rows, columns=COLUMNS)
    series["cell_days"] = series["cell_days"].astype("Int64")
    return series


def run(cell_days_path: Path, out_path: Path, region_id: str, bbox, first_month, last_month, updated_at, polygon_path=None) -> None:
    if not cell_days_path.exists():
        raise FileNotFoundError(f"Falta {cell_days_path}. Ejecuta antes scripts/03_grid_dedupe.py.")
    polygon = load_polygon(polygon_path) if polygon_path else None
    cell_days = pd.read_parquet(cell_days_path)
    series = build_monthly_series(cell_days, region_id, bbox, first_month, last_month, updated_at, polygon)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    series.to_csv(out_path, index=False, lineterminator="\n")

    summary = series.groupby(["sensor_group", "status"]).size().unstack(fill_value=0)
    print(summary.to_string())
    print(
        f"{len(series)} filas en {out_path} (region_id={region_id}, "
        f"{first_month[0]}-{first_month[1]:02d} a {last_month[0]}-{last_month[1]:02d})"
    )


def run_peru(cell_days_path: Path, out_path: Path, departments_path: Path, first_month, last_month, updated_at) -> None:
    if not cell_days_path.exists():
        raise FileNotFoundError(f"Falta {cell_days_path}. Ejecuta antes scripts/03_grid_dedupe.py.")
    departments = load_departments(departments_path)
    cell_days = pd.read_parquet(cell_days_path)
    series = build_peru_series(cell_days, departments, first_month, last_month, updated_at)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    series.to_csv(out_path, index=False, lineterminator="\n")
    print(series.groupby(["sensor_group", "status"]).size().unstack(fill_value=0).to_string())
    print(
        f"{len(series)} filas en {out_path} ({series['region_id'].nunique()} regiones, "
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
    parser.add_argument("--polygon", type=Path, default=REGION_POLYGON, help="GeoJSON de la region (por defecto, poligono INEI de Ucayali)")
    parser.add_argument("--first-month", type=_parse_month, default=FIRST_MONTH, help="AAAA-MM")
    parser.add_argument("--last-month", type=_parse_month, default=DEFAULT_LAST_MONTH, help="AAAA-MM")
    parser.add_argument("--include-test", action="store_true", help="Llega hasta 2026-07 (periodo de test reservado).")
    parser.add_argument("--peru", action="store_true", help="Extension Peru (P06): 26 regiones, PE y PE-01 ... PE-25.")
    parser.add_argument("--departments", type=Path, default=DEPARTMENTS_POLYGONS, help="GeoJSON con los 25 departamentos (solo con --peru)")
    parser.add_argument("--updated-at", default=None, help="AAAA-MM-DD (por defecto, hoy)")
    args = parser.parse_args(argv)

    last_month = TEST_LAST_MONTH if args.include_test else args.last_month
    if not args.include_test and _month_index(last_month) > _month_index(DEFAULT_LAST_MONTH):
        print("ERROR: --last-month pasa de 2024-12 (test reservado). Usa --include-test solo con autorizacion de Aldo y Antonella.", file=sys.stderr)
        return 1
    if args.include_test:
        print("AVISO: incluye el periodo de test reservado (2025-01 a 2026-07). No interpretes estos valores sin autorizacion.")
    try:
        if args.peru:
            out = args.out if args.out != parser.get_default("out") else ROOT / "data" / "processed" / "peru" / "monthly_series.csv"
            run_peru(args.cell_days, out, args.departments, args.first_month, last_month, args.updated_at)
            return 0
        run(args.cell_days, args.out, args.region_id, tuple(args.bbox), args.first_month, last_month, args.updated_at, args.polygon)
    except (FileNotFoundError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
