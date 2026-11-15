"""P05/P06 - Extension Peru: poligonos departamentales, particion y serie de 26 regiones (scripts/04 --peru)."""
import importlib
import json

import pandas as pd
import pytest
from shapely.geometry import box

ms = importlib.import_module("scripts.04_monthly_series")

PUCALLPA = (-8.38, -74.55)      # lat, lon -> PE-25 Ucayali
IQUITOS = (-3.75, -73.25)       # PE-16 Loreto
LIMA = (-12.05, -77.03)         # PE-15 Lima
CALLAO = (-12.06, -77.14)       # PE-07 Callao
CUSCO = (-13.53, -71.97)        # PE-08 Cusco
MANAOS = (-3.10, -60.02)        # Brasil, fuera del Peru


def _cell_days(rows):
    out = []
    for r in rows:
        lat, lon = r.get("where", PUCALLPA)
        out.append(
            {
                "sensor_group": r.get("sensor", "MODIS"), "cell_id": r.get("cell", "c1"),
                "center_lat": lat, "center_lon": lon,
                "year": r.get("year", 2024), "month": r.get("month", 8), "version": r.get("version", "61.03"),
            }
        )
    return pd.DataFrame(out)


def _row(series, region_id, sensor, year, month):
    sel = series[(series["region_id"] == region_id) & (series["sensor_group"] == sensor)
                 & (series["year"] == year) & (series["month"] == month)]
    assert len(sel) == 1
    return sel.iloc[0]


@pytest.fixture(scope="module")
def departments():
    return ms.load_departments(ms.DEPARTMENTS_POLYGONS)


# --- P05: archivo de poligonos -------------------------------------------------------------

def test_departments_file_has_the_25_inei_departments():
    data = json.loads(ms.DEPARTMENTS_POLYGONS.read_text(encoding="utf-8"))
    props = [f["properties"] for f in data["features"]]
    assert [p["region_id"] for p in props] == [f"PE-{i:02d}" for i in range(1, 26)]
    assert all(p["region_id"] == f"PE-{p['ccdd']}" for p in props)
    assert all("INEI" in p["fuente"] for p in props)
    assert {p["nombdep"] for p in props} >= {"UCAYALI", "LORETO", "LIMA", "CALLAO", "MADRE DE DIOS"}


def test_known_points_fall_in_the_right_department(departments):
    where = [PUCALLPA, IQUITOS, LIMA, CALLAO, CUSCO, MANAOS]
    frame = pd.DataFrame({"center_lat": [p[0] for p in where], "center_lon": [p[1] for p in where]})
    assigned = ms.assign_departments(frame, departments).tolist()
    assert assigned[:5] == ["PE-25", "PE-16", "PE-15", "PE-07", "PE-08"]
    assert pd.isna(assigned[5])


def test_a_cell_in_two_departments_is_an_error():
    overlapping = [("PE-A", box(0, 0, 2, 2)), ("PE-B", box(1, 0, 3, 2))]
    frame = pd.DataFrame({"center_lat": [1.0], "center_lon": [1.5]})
    with pytest.raises(ValueError):
        ms.assign_departments(frame, overlapping)


def test_missing_departments_file_is_an_error(tmp_path):
    with pytest.raises(FileNotFoundError):
        ms.load_departments(tmp_path / "no_existe.geojson")


# --- P06: serie de 26 regiones -------------------------------------------------------------

def _peru(cell_days, departments, first=(2024, 8), last=(2024, 9)):
    return ms.build_peru_series(cell_days, departments, first_month=first, last_month=last, updated_at="2026-11-14")


def test_peru_series_has_26_regions_and_the_v1_columns(departments):
    series = _peru(_cell_days([{}]), departments)
    assert list(series.columns) == ms.COLUMNS
    regions = list(dict.fromkeys(series["region_id"]))
    assert regions == ["PE"] + [f"PE-{i:02d}" for i in range(1, 26)]
    assert len(series) == 26 * 2 * 2  # regiones x meses x sensores
    assert not series.duplicated(["region_id", "year", "month", "sensor_group"]).any()


def test_pe_is_the_sum_of_departments_and_cells_outside_peru_do_not_count(departments):
    rows = [{"cell": "a", "where": PUCALLPA}, {"cell": "b", "where": IQUITOS}, {"cell": "c", "where": LIMA},
            {"cell": "d", "where": MANAOS}, {"cell": "e", "where": CUSCO, "sensor": "VIIRS", "version": "2"}]
    series = _peru(_cell_days(rows), departments)
    assert _row(series, "PE", "MODIS", 2024, 8)["cell_days"] == 3      # Manaos no cuenta
    assert _row(series, "PE-25", "MODIS", 2024, 8)["cell_days"] == 1
    assert _row(series, "PE-08", "VIIRS", 2024, 8)["cell_days"] == 1
    month = series[(series["year"] == 2024) & (series["month"] == 8)]
    for sensor in ("MODIS", "VIIRS"):
        part = month[month["sensor_group"] == sensor]
        assert part[part["region_id"] != "PE"]["cell_days"].sum() == part[part["region_id"] == "PE"]["cell_days"].iloc[0]


def test_status_rules_are_the_same_as_the_pilot(departments):
    # Septiembre no tiene ninguna deteccion en el pais -> missing en las 26 regiones, nunca 0.
    series = _peru(_cell_days([{"month": 8}]), departments)
    sep = series[(series["month"] == 9) & (series["sensor_group"] == "MODIS")]
    assert (sep["status"] == "missing").all() and sep["cell_days"].isna().all()
    # Agosto con datos en el pais: un departamento sin fuego vale 0 y ok.
    assert _row(series, "PE-15", "MODIS", 2024, 8)["cell_days"] == 0
    assert _row(series, "PE-15", "MODIS", 2024, 8)["status"] == "ok"


def test_pe_25_matches_the_ucayali_pilot_except_region_id(departments):
    rows = [{"cell": "a", "where": PUCALLPA}, {"cell": "b", "where": LIMA}, {"cell": "c", "sensor": "VIIRS", "version": "2"},
            {"cell": "d", "where": MANAOS, "month": 9}]
    cell_days = _cell_days(rows)
    pilot = ms.build_monthly_series(cell_days, first_month=(2024, 8), last_month=(2024, 9), updated_at="2026-11-14",
                                    polygon=ms.load_polygon(ms.REGION_POLYGON))
    peru = _peru(cell_days, departments)
    pe25 = peru[peru["region_id"] == "PE-25"].drop(columns="region_id").reset_index(drop=True)
    assert pe25.equals(pilot.drop(columns="region_id").reset_index(drop=True))
