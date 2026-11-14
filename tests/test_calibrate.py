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
