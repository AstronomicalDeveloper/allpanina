"""T11 - Malla EPSG:6933, Terra/Aqua en la misma celda-dia y agregacion (scripts/03_grid_dedupe.py)."""
import importlib

import pandas as pd

grid = importlib.import_module("scripts.03_grid_dedupe")

PUCALLPA = (-8.38, -74.55)  # lat, lon


def _points(rows):
    base = {"sensor_group": "MODIS", "satellite": "Terra", "latitude": PUCALLPA[0], "longitude": PUCALLPA[1],
            "local_date": pd.Timestamp("2024-08-10"), "version": "61.03"}
    return pd.DataFrame([{**base, **row} for row in rows])


def test_terra_and_aqua_same_cell_same_day_count_once():
    out = grid.dedupe_cell_days(_points([{"satellite": "Terra"}, {"satellite": "Aqua", "latitude": PUCALLPA[0] + 0.0001}]))
    assert len(out) == 1
    assert out.iloc[0]["n_points"] == 2 and out.iloc[0]["n_satellites"] == 2


def test_same_cell_different_days_are_two_cell_days():
    out = grid.dedupe_cell_days(_points([{}, {"local_date": pd.Timestamp("2024-08-11")}]))
    assert len(out) == 2 and out["cell_id"].nunique() == 1


def test_sensor_groups_are_not_merged():
    out = grid.dedupe_cell_days(_points([{}, {"sensor_group": "VIIRS", "satellite": "N", "version": "2"}]))
    assert sorted(out["sensor_group"]) == ["MODIS", "VIIRS"]


def test_distant_points_fall_in_different_cells():
    out = grid.dedupe_cell_days(_points([{}, {"latitude": PUCALLPA[0] + 0.05}]))
    assert out["cell_id"].nunique() == 2


def test_same_utc_day_can_be_two_local_days():
    # 02:00 UTC (dia local anterior) y 06:00 UTC (mismo dia UTC, dia local siguiente)
    out = grid.dedupe_cell_days(_points([{"local_date": pd.Timestamp("2024-08-09")}, {"local_date": pd.Timestamp("2024-08-10")}]))
    assert len(out) == 2


def test_cell_contains_its_point_and_is_small():
    points = grid.assign_cells(_points([{}]))
    lon_min, lat_min, lon_max, lat_max = grid.cell_bounds(points["x_km"], points["y_km"])
    assert lon_min[0] <= PUCALLPA[1] <= lon_max[0] and lat_min[0] <= PUCALLPA[0] <= lat_max[0]
    assert 0 < lon_max[0] - lon_min[0] < 0.02 and 0 < lat_max[0] - lat_min[0] < 0.02


def test_cell_id_is_stable_and_centre_is_inside():
    out = grid.dedupe_cell_days(_points([{}]))
    again = grid.dedupe_cell_days(_points([{}]))
    assert out.iloc[0]["cell_id"] == again.iloc[0]["cell_id"]
    assert abs(out.iloc[0]["center_lon"] - PUCALLPA[1]) < 0.02 and abs(out.iloc[0]["center_lat"] - PUCALLPA[0]) < 0.02


def test_year_month_follow_the_local_day():
    out = grid.dedupe_cell_days(_points([{"local_date": pd.Timestamp("2023-12-31")}]))
    assert (out.iloc[0]["year"], out.iloc[0]["month"]) == (2023, 12)


def test_run_writes_parquet(tmp_path):
    points = _points([{}, {"satellite": "Aqua"}])
    points["utc_datetime"] = pd.Timestamp("2024-08-10 06:00")
    src, dst = tmp_path / "points_clean.parquet", tmp_path / "cell_days.parquet"
    points.to_parquet(src, index=False)
    grid.run(src, dst)
    assert len(pd.read_parquet(dst)) == 1
