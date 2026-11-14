"""T12/T19 - Serie mensual: cero distinto de sin-dato, region, ventanas y test reservado (scripts/04)."""
import importlib

import pandas as pd
import pytest

ms = importlib.import_module("scripts.04_monthly_series")

INSIDE = (-8.4, -74.5)    # lat, lon dentro de la caja
OUTSIDE_LON = (-8.4, -77.0)  # misma latitud, fuera por longitud (la caja va de -76.10 a -70.40)
OUTSIDE = (-3.0, -73.0)   # fuera de la caja


def _cell_days(rows):
    out = []
    for r in rows:
        lat, lon = r.get("where", INSIDE)
        out.append(
            {
                "sensor_group": r.get("sensor", "MODIS"), "cell_id": r.get("cell", "c1"),
                "center_lat": lat, "center_lon": lon,
                "year": r.get("year", 2024), "month": r.get("month", 8), "version": r.get("version", "61.03"),
            }
        )
    return pd.DataFrame(out)


def _row(series, sensor, year, month):
    return series[(series["sensor_group"] == sensor) & (series["year"] == year) & (series["month"] == month)].iloc[0]


def _build(cell_days, first=(2024, 8), last=(2024, 10)):
    return ms.build_monthly_series(cell_days, first_month=first, last_month=last, updated_at="2026-11-14")


def test_columns_follow_the_contract():
    series = _build(_cell_days([{}]))
    assert list(series.columns) == ["region_id", "year", "month", "sensor_group", "cell_days", "status", "source_version", "updated_at"]
    assert set(series["sensor_group"]) == {"MODIS", "VIIRS"} and (series["region_id"] == "PE-UCA").all()


def test_zero_detections_in_region_is_zero_and_ok_not_missing():
    # El pais tiene datos MODIS en agosto, pero todos fuera de la region.
    series = _build(_cell_days([{"where": OUTSIDE}]))
    row = _row(series, "MODIS", 2024, 8)
    assert row["cell_days"] == 0 and row["status"] == "ok"


def test_month_without_national_data_is_missing_not_zero():
    series = _build(_cell_days([{"month": 8}]))
    row = _row(series, "MODIS", 2024, 9)
    assert pd.isna(row["cell_days"]) and row["status"] == "missing"


def test_counts_distinct_cell_days_inside_region_only():
    rows = [{"cell": "a"}, {"cell": "b"}, {"cell": "c", "where": OUTSIDE}, {"cell": "e", "where": OUTSIDE_LON},
            {"cell": "d", "sensor": "VIIRS", "version": "2"}]
    series = _build(_cell_days(rows))
    assert _row(series, "MODIS", 2024, 8)["cell_days"] == 2
    assert _row(series, "VIIRS", 2024, 8)["cell_days"] == 1


def test_viirs_before_its_first_complete_month_is_missing():
    cd = _cell_days([{"sensor": "VIIRS", "year": 2012, "month": 1, "version": "2"}, {"sensor": "VIIRS", "year": 2012, "month": 2, "version": "2"}])
    series = ms.build_monthly_series(cd, first_month=(2012, 1), last_month=(2012, 2), updated_at="2026-11-14")
    assert _row(series, "VIIRS", 2012, 1)["status"] == "missing"
    assert _row(series, "VIIRS", 2012, 2)["status"] == "ok"


def test_source_version_is_the_literal_version_value():
    cd = _cell_days([{"version": "61.03"}, {"sensor": "VIIRS", "version": "2"}])
    series = _build(cd)
    assert _row(series, "MODIS", 2024, 8)["source_version"] == "61.03"
    assert _row(series, "VIIRS", 2024, 8)["source_version"] == "2"
    assert _row(series, "MODIS", 2024, 9)["source_version"] == ""


def test_no_nan_outside_cell_days_and_cell_days_is_nullable_int():
    series = _build(_cell_days([{}]))
    assert not series.drop(columns="cell_days").isna().any().any()
    assert str(series["cell_days"].dtype) == "Int64"


def test_csv_leaves_missing_cell_days_empty(tmp_path):
    cd_path, out = tmp_path / "cd.parquet", tmp_path / "ms.csv"
    _cell_days([{}]).to_parquet(cd_path, index=False)
    ms.run(cd_path, out, "PE-UCA", ms.REGION_BBOX, (2024, 8), (2024, 9), "2026-11-14")
    text = out.read_text(encoding="utf-8").splitlines()
    assert any(line.startswith("PE-UCA,2024,9,MODIS,,missing") for line in text)


def test_test_period_is_reserved_by_default():
    assert ms.DEFAULT_LAST_MONTH == (2024, 12) and ms.TEST_LAST_MONTH == (2026, 7)
    assert ms.main(["--last-month", "2025-03"]) == 1


def test_missing_input_fails_clearly(tmp_path):
    with pytest.raises(FileNotFoundError, match="03_grid_dedupe"):
        ms.run(tmp_path / "no.parquet", tmp_path / "o.csv", "X", None, (2024, 1), (2024, 1), None)


# --- Poligono de la region (DECISIONS.md, seccion 1) ---------------------------------------

TINGO_MARIA = (-9.29, -75.99)  # Huanuco: dentro de la caja pero fuera de Ucayali
PUCALLPA = (-8.38, -74.55)


def _write_square(path, lon_min, lat_min, lon_max, lat_max):
    import json

    ring = [[lon_min, lat_min], [lon_max, lat_min], [lon_max, lat_max], [lon_min, lat_max], [lon_min, lat_min]]
    path.write_text(json.dumps({"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": [ring]}}]}), encoding="utf-8")


def test_polygon_excludes_cells_inside_box_but_outside_region(tmp_path):
    square = tmp_path / "region.geojson"
    _write_square(square, -75.0, -9.0, -74.0, -8.0)  # contiene INSIDE (-8.4, -74.5) pero no (-10.5, -71.0)
    polygon = ms.load_polygon(square)
    cd = _cell_days([{"cell": "a"}, {"cell": "b", "where": (-10.5, -71.0)}])
    without = _row(ms.build_monthly_series(cd, first_month=(2024, 8), last_month=(2024, 8), updated_at="x"), "MODIS", 2024, 8)
    with_poly = _row(ms.build_monthly_series(cd, first_month=(2024, 8), last_month=(2024, 8), updated_at="x", polygon=polygon), "MODIS", 2024, 8)
    assert without["cell_days"] == 2 and with_poly["cell_days"] == 1


def test_missing_polygon_file_fails_clearly(tmp_path):
    with pytest.raises(FileNotFoundError):
        ms.load_polygon(tmp_path / "no_existe.geojson")


def test_official_ucayali_polygon():
    import shapely

    polygon = ms.load_polygon(ms.REGION_POLYGON)
    lon_min, lat_min, lon_max, lat_max = polygon.bounds
    b_lon_min, b_lat_min, b_lon_max, b_lat_max = ms.REGION_BBOX
    assert b_lon_min <= lon_min and b_lat_min <= lat_min and lon_max <= b_lon_max and lat_max <= b_lat_max  # la caja lo contiene
    assert shapely.contains_xy(polygon, PUCALLPA[1], PUCALLPA[0])
    assert not shapely.contains_xy(polygon, TINGO_MARIA[1], TINGO_MARIA[0])
