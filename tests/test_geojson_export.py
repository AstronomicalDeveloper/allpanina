"""T20 - GeoJSON ligero de celdas observadas (scripts/05_geojson_export.py)."""
import importlib
import json

import pandas as pd

gj = importlib.import_module("scripts.05_geojson_export")
grid = importlib.import_module("scripts.03_grid_dedupe")


def _cell_days():
    pts = pd.DataFrame(
        {
            "sensor_group": ["MODIS", "MODIS", "MODIS", "VIIRS", "MODIS"],
            "satellite": ["Terra"] * 5,
            "latitude": [-8.38, -8.38, -8.38, -8.38, -3.0],  # el ultimo cae fuera de la caja
            "longitude": [-74.55, -74.55, -74.55, -74.55, -73.0],
            "local_date": pd.to_datetime(["2024-08-10", "2024-08-11", "2024-09-01", "2024-08-10", "2024-08-10"]),
            "version": ["61.03", "61.03", "61.03", "2", "61.03"],
        }
    )
    return grid.dedupe_cell_days(pts)


def test_geojson_structure_and_no_crs():
    cells = gj.monthly_cells(_cell_days(), gj.series.REGION_BBOX, 2024)
    collection = gj.build_geojson(cells)
    assert collection["type"] == "FeatureCollection" and "crs" not in collection
    assert len(collection["features"]) == 3  # MODIS ago, MODIS sep, VIIRS ago (el punto fuera de la caja no entra)
    for feature in collection["features"]:
        assert set(feature["properties"]) == {"cell_id", "year", "month", "sensor_group", "cell_days"}
        assert feature["geometry"]["type"] == "Polygon"


def test_cell_days_counts_days_in_month():
    cells = gj.monthly_cells(_cell_days(), gj.series.REGION_BBOX, 2024)
    modis_aug = cells[(cells["sensor_group"] == "MODIS") & (cells["month"] == 8)].iloc[0]
    assert modis_aug["cell_days"] == 2


def test_ring_is_closed_counterclockwise_and_in_peru():
    collection = gj.build_geojson(gj.monthly_cells(_cell_days(), gj.series.REGION_BBOX, 2024))
    ring = collection["features"][0]["geometry"]["coordinates"][0]
    assert ring[0] == ring[-1] and len(ring) == 5
    area2 = sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring[:-1], ring[1:]))
    assert area2 > 0  # RFC 7946: anillo exterior antihorario
    assert all(-82 < lon < -68 and -19 < lat < 1 for lon, lat in ring)


def test_run_writes_one_file_per_year(tmp_path):
    src = tmp_path / "cd.parquet"
    _cell_days().to_parquet(src, index=False)
    gj.run(src, tmp_path, "PE-UCA", gj.series.REGION_BBOX, [2024])
    data = json.loads((tmp_path / "cells_PE-UCA_2024.geojson").read_text(encoding="utf-8"))
    assert len(data["features"]) == 3 and all(f["properties"]["year"] == 2024 for f in data["features"])


def test_test_years_are_reserved_by_default():
    assert gj.main(["--years", "2025"]) == 1
