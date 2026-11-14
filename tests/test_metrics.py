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
    assert m["mae"] == pytest.approx(10.0)
    assert m["wape"] == pytest.approx(0.5)
    assert m["bias"] == pytest.approx(-10.0)


def test_metricas_b1_perfecto():
    m = met.compute_metrics([10, 20, 30], [10, 20, 30])
    assert m["mae"] == 0 and m["wape"] == 0 and m["bias"] == 0


def test_wape_indefinido_si_modis_suma_cero():
    m = met.compute_metrics([0, 0], [3, 1])
    assert m["wape"] is None
    assert m["mae"] == pytest.approx(2.0)


def test_nulos_se_excluyen_y_no_cuentan():
    m = met.compute_metrics([10, None, 30], [5, 7, None])
    assert m["n_months_matched"] == 1
    assert m["mae"] == pytest.approx(5.0)


def test_sin_meses_emparejados_no_inventa_valores():
    m = met.compute_metrics([None], [None])
    assert m["n_months_matched"] == 0
    assert m["mae"] is None and m["wape"] is None and m["bias"] is None


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


def _rows():
    return [
        {"year": 2020, "month": 1, "modis": 10, "viirs": 5, "split": "train"},
        {"year": 2025, "month": 1, "modis": 10, "viirs": 5, "split": "test"},
        {"year": 2025, "month": 2, "modis": 20, "viirs": 5, "split": "test"},
    ]


def test_validation_test_forma_contrato_y_orden():
    cal = importlib.import_module("scripts.06_calibrate")
    modis = {"2020-01": 10, "2025-01": 10, "2025-02": 20}
    v = met.build_validation(cal.build_calibrated_series(_rows(), 2.0, "X"), modis, "X")
    assert v["region_id"] == "X" and set(v["methods"]) == {"B0", "B1"}
    b0 = v["methods"]["B0"]
    assert b0["split"] == "test" and b0["n_months_matched"] == 2
    assert set(b0["metrics"]) == {"mae", "wape", "bias"}
    assert [r["month"] for r in b0["residuals"]] == ["2025-02", "2025-01"]


def test_validation_valid_no_incluye_residuos_ni_mezcla_train():
    cal = importlib.import_module("scripts.06_calibrate")
    rows = _rows() + [{"year": 2023, "month": 1, "modis": 10, "viirs": 5, "split": "valid"}]
    modis = {"2023-01": 10}
    v = met.build_validation(cal.build_calibrated_series(rows, 2.0, "X"), modis, "X", split="valid")
    b1 = v["methods"]["B1"]
    assert b1["split"] == "valid" and b1["n_months_matched"] == 1
    assert "residuals" not in b1 and b1["metrics"]["mae"] == 0


def test_validation_sin_test_marca_detalle_no_disponible():
    cal = importlib.import_module("scripts.06_calibrate")
    rows = [{"year": 2020, "month": 1, "modis": 10, "viirs": 5, "split": "train"}]
    v = met.build_validation(cal.build_calibrated_series(rows, 2.0, "X"), {"2020-01": 10}, "X")
    b1 = v["methods"]["B1"]
    assert b1["detalle_mensual"] == "no disponible" and b1["n_months_matched"] == 0
