"""T06 — casos sinteticos de B0/B1. Resultados esperados calculados a mano.

Supuestos (a confirmar con Aldo en DECISIONS.md):
  - Factor B1 = suma(MODIS train) / suma(VIIRS train), solo meses con ambos valores.
  - B0 = VIIRS sin factor.  B1 = VIIRS * factor.
Estos tests deben fallar (rojo) hasta implementar scripts/06_calibrate.py (T13).
"""
import importlib

import pytest

cal = importlib.import_module("scripts.06_calibrate")


def test_factor_exacto():
    # MODIS = 2 x VIIRS en todos los meses -> factor 2
    assert cal.fit_factor([10, 20, 30], [5, 10, 15]) == pytest.approx(2.0)


def test_factor_viirs_cero_no_divide():
    assert cal.fit_factor([10, 20], [0, 0]) is None


def test_factor_ignora_meses_con_nulos():
    # el mes con None (en cualquiera de los dos) no entra al ajuste
    assert cal.fit_factor([10, None, 30], [5, 8, 15]) == pytest.approx(2.0)


def test_factor_sin_meses_validos():
    assert cal.fit_factor([None, None], [None, 3]) is None


def test_b0_es_viirs_sin_cambio():
    assert cal.apply_b0([5, 10, None]) == [5, 10, None]


def test_b1_aplica_factor_y_conserva_nulos():
    assert cal.apply_b1([5, 10, None], 2.0) == [10, 20, None]


def test_b1_sin_factor_falla_explicitamente():
    with pytest.raises(ValueError):
        cal.apply_b1([5, 10], None)


def test_factor_solo_usa_train():
    # T14: cambiar valid/test NO debe alterar el factor ajustado
    rows = [
        {"month": "2020-01", "modis": 10, "viirs": 5, "split": "train"},
        {"month": "2020-02", "modis": 20, "viirs": 10, "split": "train"},
        {"month": "2021-01", "modis": 12, "viirs": 6, "split": "valid"},
        {"month": "2022-01", "modis": 14, "viirs": 7, "split": "test"},
    ]
    base = cal.fit_factor_on_train(rows)
    alterado = [dict(r) for r in rows]
    alterado[-1]["modis"] = 9999
    alterado[-2]["viirs"] = 1
    assert cal.fit_factor_on_train(alterado) == pytest.approx(base) == pytest.approx(2.0)


def test_assign_split_con_cortes_de_decisions():
    f = cal.assign_split  # defaults: 2022-12 / 2024-12
    assert f("2022-12") == "train" and f("2023-01") == "valid"
    assert f("2024-12") == "valid" and f("2025-01") == "test"


def test_assign_split_fuera_del_periodo_es_none():
    # DECISIONS.md seccion 3: periodo 2013-01 a 2026-07
    f = cal.assign_split
    assert f("2012-12") is None and f("2013-01") == "train"
    assert f("2026-07") == "test" and f("2026-08") is None


def test_calibrated_series_contrato_y_residual_solo_en_test():
    rows = [
        {"year": 2020, "month": 1, "modis": 10, "viirs": 5, "split": "train"},
        {"year": 2025, "month": 8, "modis": 10, "viirs": 5, "split": "test"},
        {"year": 2025, "month": 9, "modis": 20, "viirs": None, "split": "test"},
    ]
    out = cal.build_calibrated_series(rows, 2.0, "X")
    assert set(out[0]) == {"region_id", "year", "month", "method", "value", "split", "status", "residual"}
    b1 = [r for r in out if r["method"] == "B1"]
    assert b1[0]["residual"] is None            # train: sin residual
    assert b1[1]["value"] == 10 and b1[1]["residual"] == 0
    assert b1[2]["value"] is None and b1[2]["status"] == "missing"
    assert all(r["value"] == r["value"] for r in out)  # ningun NaN


def test_calibrated_series_b1_no_estimable():
    out = cal.build_calibrated_series(
        [{"year": 2025, "month": 1, "modis": 10, "viirs": 5, "split": "test"}], None, "X")
    b1 = [r for r in out if r["method"] == "B1"][0]
    assert b1["value"] is None and b1["status"] == "missing"


def _write_monthly(path):
    lines = ["region_id,year,month,sensor_group,cell_days,status,source_version,updated_at"]
    for y, m, mod, vii in [(2020, 1, 20, 10), (2020, 2, 40, 20), (2023, 1, 30, 15), (2025, 1, 50, 25)]:
        lines.append(f"X,{y},{m},MODIS,{mod},ok,6.03,2026-11-14")
        lines.append(f"X,{y},{m},VIIRS,{vii},ok,2,2026-11-14")
    lines.append("X,2023,2,MODIS,,insufficient_data,61.03,2026-11-14")
    lines.append("X,2023,2,VIIRS,9,ok,2,2026-11-14")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def test_run_de_punta_a_punta_valid(tmp_path):
    import csv
    import json

    src = tmp_path / "monthly_series.csv"
    _write_monthly(src)
    factor, val = cal.run(str(src), str(tmp_path / "out"), split="valid")
    assert factor == pytest.approx(2.0)
    b1 = val["methods"]["B1"]
    assert b1["split"] == "valid" and b1["n_months_matched"] == 1  # 2023-02 sin MODIS se excluye
    assert b1["metrics"]["mae"] == 0
    rows = list(csv.DictReader(open(tmp_path / "out" / "calibrated_series.csv")))
    assert set(rows[0]) == {"region_id", "year", "month", "method", "value", "split", "status", "residual"}
    assert all(r["residual"] == "" for r in rows if r["split"] != "test")
    assert json.load(open(tmp_path / "out" / "validation.json"))["region_id"] == "X"


def test_cli_rechaza_test_sin_autorizacion(tmp_path):
    src = tmp_path / "m.csv"
    _write_monthly(src)
    with pytest.raises(SystemExit):
        cal.main([str(src), "--out", str(tmp_path / "o"), "--split", "test"])


def test_2012_no_entra_al_factor(tmp_path):
    # Error 1: meses anteriores a 2013-01 no deben ajustar kappa
    src = tmp_path / "m.csv"
    _write_monthly(src)
    with open(src, "a", encoding="utf-8") as f:
        f.write("X,2012,6,MODIS,1000,ok,6.03,2026-11-14\n")
        f.write("X,2012,6,VIIRS,1,ok,2,2026-11-14\n")
    _, rows = cal.load_monthly_series(str(src))
    assert all(r["year"] >= 2013 for r in rows)
    factor, _ = cal.run(str(src), str(tmp_path / "out"), split="valid")
    assert factor == pytest.approx(2.0)


def test_run_valid_no_escribe_filas_de_test(tmp_path):
    # Error 2: con split=valid, calibrated_series.csv no puede exponer valores ni residuos de test
    import csv

    src = tmp_path / "m.csv"
    _write_monthly(src)  # incluye 2025-01 (test)
    cal.run(str(src), str(tmp_path / "out"), split="valid")
    rows = list(csv.DictReader(open(tmp_path / "out" / "calibrated_series.csv")))
    assert rows and all(r["split"] != "test" for r in rows)
    assert all(r["residual"] == "" for r in rows)


def test_status_solo_ok_o_missing():
    # DECISIONS.md seccion 8: no existe un tercer estado
    rows = [
        {"year": 2020, "month": 1, "modis": 10, "viirs": 5, "split": "train"},
        {"year": 2020, "month": 2, "modis": 10, "viirs": None, "split": "train"},
    ]
    for factor in (2.0, None):
        out = cal.build_calibrated_series(rows, factor, "X")
        assert {r["status"] for r in out} <= {"ok", "missing"}
        assert all((r["value"] is None) == (r["status"] == "missing") for r in out)


def test_cli_funciona_sin_pythonpath(tmp_path):
    # Error 3: `python scripts/06_calibrate.py` no debe necesitar PYTHONPATH=.
    import os
    import subprocess
    import sys

    src = tmp_path / "m.csv"
    _write_monthly(src)
    script = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                          "scripts", "06_calibrate.py")
    env = {k: v for k, v in os.environ.items() if k != "PYTHONPATH"}
    res = subprocess.run([sys.executable, script, str(src), "--out", str(tmp_path / "out")],
                         cwd=str(tmp_path), env=env, capture_output=True, text=True)
    assert res.returncode == 0, res.stderr
    assert (tmp_path / "out" / "validation.json").exists()
