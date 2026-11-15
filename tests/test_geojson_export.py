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


def test_run_with_polygon_filters_cells(tmp_path):
    src = tmp_path / "cell_days.parquet"
    _cell_days().to_parquet(src, index=False)
    region = tmp_path / "vacio.geojson"
    far = [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0]]
    region.write_text(json.dumps({"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": [far]}}]}), encoding="utf-8")
    gj.run(src, tmp_path, "PE-UCA", gj.series.REGION_BBOX, [2024], region)
    data = json.loads((tmp_path / "cells_PE-UCA_2024.geojson").read_text(encoding="utf-8"))
    assert data["features"] == []  # ninguna celda cae en un poligono lejano


def test_months_after_series_end_are_dropped():
    """Los datos crudos de MODIS llegan a 2026-08, pero el periodo de la serie termina en 2026-07."""
    pts = pd.DataFrame(
        {
            "sensor_group": ["MODIS", "MODIS"],
            "satellite": ["Terra"] * 2,
            "latitude": [-8.38, -8.38],
            "longitude": [-74.55, -74.55],
            "local_date": pd.to_datetime(["2026-07-31", "2026-08-01"]),
            "version": ["61.03"] * 2,
        }
    )
    cells = gj.monthly_cells(grid.dedupe_cell_days(pts), gj.series.REGION_BBOX, 2026)
    assert cells["month"].tolist() == [7]


# --- P08: mapa nacional a 10 km (extension Peru, contrato v1.1 seccion G) ----------------

def _peru_points():
    # Dos puntos en la misma celda de 10 km de Pucallpa (a ~1-2 km), uno en Lima, uno en Brasil (Manaos).
    return pd.DataFrame(
        {
            "sensor_group": ["MODIS", "MODIS", "MODIS", "MODIS", "VIIRS"],
            "satellite": ["Terra"] * 5,
            "latitude": [-8.380, -8.385, -12.05, -3.10, -8.380],
            "longitude": [-74.550, -74.535, -77.03, -60.02, -74.550],
            "local_date": pd.to_datetime(["2024-08-10"] * 5),
            "version": ["61.03", "61.03", "61.03", "61.03", "2"],
        }
    )


def test_peru_blocks_sum_1km_cells_and_drop_cells_outside_peru():
    departments = gj.series.load_departments(gj.series.DEPARTMENTS_POLYGONS)
    cells = gj.peru_cells(grid.dedupe_cell_days(_peru_points()), departments, 2024)
    modis = cells[cells["sensor_group"] == "MODIS"]
    assert modis["cell_days"].sum() == 3          # Pucallpa (2 celdas de 1 km) + Lima; Manaos no cuenta
    assert set(modis["cell_days"]) == {1, 2}      # las 2 celdas de Pucallpa caen en un solo bloque de 10 km
    assert all(x % 10 == 0 and y % 10 == 0 for x, y in zip(cells["x_km"], cells["y_km"]))
    assert all(cid == f"{x}_{y}" for cid, x, y in zip(cells["cell_id"], cells["x_km"], cells["y_km"]))


def test_peru_block_geometry_is_10_km_and_has_no_region_id():
    departments = gj.series.load_departments(gj.series.DEPARTMENTS_POLYGONS)
    collection = gj.build_block_geojson(gj.peru_cells(grid.dedupe_cell_days(_peru_points()), departments, 2024))
    assert "crs" not in collection
    for feature in collection["features"]:
        assert set(feature["properties"]) == {"cell_id", "year", "month", "sensor_group", "cell_days"}
        ring = feature["geometry"]["coordinates"][0]
        width = ring[1][0] - ring[0][0]
        assert 0.09 < width < 0.11               # 10 km en EPSG:6933 son ~0.104 grados de longitud
        assert ring[0] == ring[-1]


def test_peru_map_sum_matches_pe_in_the_series():
    departments = gj.series.load_departments(gj.series.DEPARTMENTS_POLYGONS)
    cell_days = grid.dedupe_cell_days(_peru_points())
    cells = gj.peru_cells(cell_days, departments, 2024)
    peru = gj.series.build_peru_series(cell_days, departments, first_month=(2024, 8), last_month=(2024, 8), updated_at="2026-11-14")
    for sensor in ("MODIS", "VIIRS"):
        pe = peru[(peru["region_id"] == "PE") & (peru["sensor_group"] == sensor)]["cell_days"].iloc[0]
        assert cells[cells["sensor_group"] == sensor]["cell_days"].sum() == pe


def test_peru_test_years_are_reserved_by_default():
    assert gj.main(["--peru", "--years", "2025"]) == 1
