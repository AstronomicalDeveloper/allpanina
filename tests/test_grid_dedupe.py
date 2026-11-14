"""Pruebas de scripts/03_grid_dedupe.py (malla de 1 km y deduplicacion celda-dia)."""

from __future__ import annotations

import pandas as pd
import pytest


@pytest.fixture(scope="module")
def grid(load_script):
    return load_script("03_grid_dedupe.py")


def _points(rows):
    base = {
        "sensor_group": "modis", "satellite": "Terra", "latitude": -10.0, "longitude": -75.0,
        "local_date": pd.Timestamp("2020-01-01"), "qc_strict": True,
    }
    return pd.DataFrame([{**base, **row} for row in rows])


def test_terra_y_aqua_en_la_misma_celda_y_dia_cuentan_una_vez(grid):
    out = grid.dedupe_cell_days(_points([{"satellite": "Terra"}, {"satellite": "Aqua"}]))
    assert len(out) == 1
    assert out["n_points"].iloc[0] == 2
    assert out["n_satellites"].iloc[0] == 2


def test_mismo_lugar_en_dias_distintos_son_dos_celda_dias(grid):
    out = grid.dedupe_cell_days(_points([{}, {"local_date": pd.Timestamp("2020-01-02")}]))
    assert len(out) == 2


def test_grupos_sensor_distintos_no_se_mezclan(grid):
    out = grid.dedupe_cell_days(_points([{}, {"sensor_group": "viirs_snpp", "satellite": "SNPP"}]))
    assert sorted(out["sensor_group"]) == ["modis", "viirs_snpp"]


def test_celda_dia_es_strict_si_algun_punto_pasa_el_qc_estricto(grid):
    out = grid.dedupe_cell_days(_points([{"qc_strict": False}, {"qc_strict": True, "satellite": "Aqua"}]))
    assert len(out) == 1 and bool(out["qc_strict"].iloc[0]) is True
    out = grid.dedupe_cell_days(_points([{"qc_strict": False}]))
    assert bool(out["qc_strict"].iloc[0]) is False


def test_dos_puntos_de_la_misma_celda_de_1_km_se_unen_y_uno_lejano_no(grid):
    # ~110 m de separacion (0.001 grados): misma celda; 0.1 grados (~11 km): otra celda.
    out = grid.dedupe_cell_days(
        _points([{}, {"latitude": -10.001, "satellite": "Aqua"}, {"latitude": -10.1}])
    )
    assert out["cell_id"].nunique() == 2
    assert sorted(out["n_points"]) == [1, 2]


def test_centro_de_celda_cae_cerca_del_punto_original(grid):
    out = grid.dedupe_cell_days(_points([{}]))
    assert abs(out["center_lat"].iloc[0] - (-10.0)) < 0.02
    assert abs(out["center_lon"].iloc[0] - (-75.0)) < 0.02
