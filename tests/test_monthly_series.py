"""Pruebas de scripts/04_monthly_series.py (cero detecciones vs. sin datos)."""

from __future__ import annotations

import pandas as pd
import pytest


@pytest.fixture(scope="module")
def monthly(load_script):
    return load_script("04_monthly_series.py")


def _cell_days(rows):
    base = {"sensor_group": "modis", "year": 2020, "month": 1, "center_lon": -75.0, "center_lat": -10.0, "qc_strict": True}
    return pd.DataFrame([{**base, **row} for row in rows])


def _get(series, sensor, year, month, qc="strict"):
    row = series[(series.sensor_group == sensor) & (series.year == year) & (series.month == month) & (series.qc == qc)]
    assert len(row) == 1
    return row.iloc[0]


def test_mes_con_cero_detecciones_vale_0_y_mes_sin_cobertura_vale_nulo(monthly):
    # Hay datos nacionales en enero y marzo de 2020, pero ninguno en febrero.
    data = _cell_days([{"month": 1}, {"month": 3}])
    series = monthly.build_monthly_series(data, last_month=(2020, 3), first_month=(2020, 1))

    enero = _get(series, "modis", 2020, 1)
    assert enero["cell_days"] == 1 and enero["status"] == "ok"

    febrero = _get(series, "modis", 2020, 2)
    assert pd.isna(febrero["cell_days"]) and febrero["status"] == "sin_datos"


def test_cero_detecciones_en_la_region_pero_con_cobertura_nacional_vale_0(monthly):
    # Region pequena sin detecciones, aunque el pais si tuvo datos ese mes.
    data = _cell_days([{"month": 1, "center_lon": -70.0, "center_lat": -15.0}])
    series = monthly.build_monthly_series(
        data, region_id="r1", bbox=(-77, -12, -75, -10), first_month=(2020, 1), last_month=(2020, 1)
    )
    row = _get(series, "modis", 2020, 1)
    assert row["cell_days"] == 0 and row["status"] == "ok"
    assert row["region_id"] == "r1"


def test_viirs_antes_de_2012_02_es_sin_datos(monthly):
    data = _cell_days([
        {"sensor_group": "viirs_snpp", "year": 2012, "month": 1},   # mes incompleto
        {"sensor_group": "viirs_snpp", "year": 2012, "month": 2},
        {"sensor_group": "modis", "year": 2011, "month": 12},
    ])
    series = monthly.build_monthly_series(data, first_month=(2011, 12), last_month=(2012, 2))
    assert _get(series, "viirs_snpp", 2011, 12)["status"] == "sin_datos"
    assert _get(series, "viirs_snpp", 2012, 1)["status"] == "sin_datos"
    assert _get(series, "viirs_snpp", 2012, 2)["status"] == "ok"


def test_conteo_strict_y_none_son_distintos(monthly):
    data = _cell_days([{"qc_strict": True}, {"qc_strict": False, "center_lat": -10.5}])
    series = monthly.build_monthly_series(data, first_month=(2020, 1), last_month=(2020, 1))
    assert _get(series, "modis", 2020, 1, "strict")["cell_days"] == 1
    assert _get(series, "modis", 2020, 1, "none")["cell_days"] == 2


def test_la_serie_termina_en_el_ultimo_mes_estandar_y_tiene_las_columnas_del_contrato(monthly):
    data = _cell_days([{"year": 2026, "month": 8}])  # agosto 2026 existe en los datos pero no se usa
    series = monthly.build_monthly_series(data, first_month=(2026, 6), last_month=(2026, 7))
    assert list(series.columns) == ["region_id", "year", "month", "sensor_group", "cell_days", "status", "qc"]
    assert (series.year.astype(int) * 12 + series.month).max() == 2026 * 12 + 7
