"""T06 — metricas y residuos. Convencion: signed_error = estimate - modis_observed.

Deben fallar (rojo) hasta implementar scripts/07_metrics_export.py (T13).
"""
import importlib

import pytest

met = importlib.import_module("scripts.07_metrics_export")


def test_metricas_b0_caso_manual():
    # |e| = 5, 10, 15 ; suma MODIS = 60 ; e = -5, -10, -15
    m = met.compute_metrics([10, 20, 30], [5, 10, 15])
    assert m["n_months_matched"] == 3
    assert m["MAE"] == pytest.approx(10.0)
    assert m["WAPE"] == pytest.approx(0.5)
    assert m["sesgo"] == pytest.approx(-10.0)


def test_metricas_b1_perfecto():
    m = met.compute_metrics([10, 20, 30], [10, 20, 30])
    assert m["MAE"] == 0 and m["WAPE"] == 0 and m["sesgo"] == 0


def test_wape_indefinido_si_modis_suma_cero():
    m = met.compute_metrics([0, 0], [3, 1])
    assert m["WAPE"] is None
    assert m["MAE"] == pytest.approx(2.0)


def test_nulos_se_excluyen_y_no_cuentan():
    m = met.compute_metrics([10, None, 30], [5, 7, None])
    assert m["n_months_matched"] == 1
    assert m["MAE"] == pytest.approx(5.0)


def test_sin_meses_emparejados_no_inventa_valores():
    m = met.compute_metrics([None], [None])
    assert m["n_months_matched"] == 0
    assert m["MAE"] is None and m["WAPE"] is None and m["sesgo"] is None


def test_residuos_campos_y_orden_descendente():
    res = met.monthly_residuals(
        ["2022-01", "2022-02", "2022-03"], [10, 20, 30], [12, 10, 29]
    )
    assert set(res[0]) == {
        "month", "modis_observed", "estimate", "signed_error", "absolute_error"
    }
    assert [r["month"] for r in res] == ["2022-02", "2022-01", "2022-03"]
    assert res[0]["signed_error"] == -10 and res[0]["absolute_error"] == 10


def test_residuos_omiten_meses_con_nulos():
    res = met.monthly_residuals(["2022-01", "2022-02"], [10, None], [12, 5])
    assert [r["month"] for r in res] == ["2022-01"]
