"""Pruebas de scripts/02_normalize.py (fechas a hora de Lima y QC)."""

from __future__ import annotations

import pandas as pd
import pytest


@pytest.fixture(scope="module")
def norm(load_script):
    return load_script("02_normalize.py")


def _local_day(norm, acq_date: str, acq_time: str) -> str:
    _, local = norm.to_utc_and_local_day(pd.Series([acq_date]), pd.Series([acq_time]))
    return str(local.iloc[0].date())


def test_foco_cerca_de_medianoche_utc_cae_en_el_dia_local_correcto(norm):
    # Lima = UTC-5: 02:00 UTC es 21:00 del dia anterior.
    assert _local_day(norm, "2026-01-02", "0200") == "2026-01-01"
    assert _local_day(norm, "2026-01-02", "0459") == "2026-01-01"
    # 05:00 UTC es exactamente la medianoche local: ya es el dia siguiente.
    assert _local_day(norm, "2026-01-02", "0500") == "2026-01-02"
    assert _local_day(norm, "2026-01-02", "2359") == "2026-01-02"


def test_fin_de_mes_no_se_desplaza(norm):
    # 03:00 UTC del 1 de febrero todavia es 31 de enero en Lima.
    assert _local_day(norm, "2026-02-01", "0300") == "2026-01-31"
    assert _local_day(norm, "2026-02-01", "0500") == "2026-02-01"
    # Ultimo dia del mes por la tarde UTC se queda en el mismo mes local.
    assert _local_day(norm, "2026-01-31", "2300") == "2026-01-31"


def test_acq_time_sin_ceros_a_la_izquierda(norm):
    # '30' significa 00:30 UTC; en Lima es 19:30 del dia anterior.
    assert _local_day(norm, "2026-03-10", "30") == "2026-03-09"
    assert _local_day(norm, "2026-03-10", "5") == "2026-03-09"  # 00:05 UTC


def test_hora_invalida_da_nat(norm):
    utc, local = norm.to_utc_and_local_day(pd.Series(["2026-03-10"]), pd.Series(["2575"]))
    assert utc.isna().iloc[0] and local.isna().iloc[0]


def _frame(rows):
    base = {
        "sensor_group": "modis", "satellite": "Terra", "latitude": -10.0, "longitude": -75.0,
        "acq_date": "2020-01-01", "acq_hhmm": "1500", "confidence": "80", "type": 0,
    }
    df = pd.DataFrame([{**base, **row} for row in rows])
    df["utc_datetime"] = pd.to_datetime(df["acq_date"] + " " + df["acq_hhmm"], format="%Y-%m-%d %H%M", errors="coerce")
    return df


def test_qc_strict_modis_confianza_umbral_30(norm):
    out = norm.apply_qc(
        _frame([
            {"confidence": "29", "latitude": -10.0},
            {"confidence": "30", "latitude": -10.1},
            {"confidence": "100", "latitude": -10.2},
        ])
    )
    assert out["qc_strict"].tolist() == [False, True, True]
    assert out["qc_none"].tolist() == [True, True, True]  # qc_none no mira la confianza
    assert "modis_confidence_lt_30" in out["reasons"].iloc[0]


def test_qc_strict_viirs_excluye_confianza_baja(norm):
    rows = [{"sensor_group": "viirs_snpp", "satellite": "SNPP", "confidence": c, "latitude": -10.0 - i * 0.01}
            for i, c in enumerate(["l", "n", "h"])]
    out = norm.apply_qc(_frame(rows))
    assert out["qc_strict"].tolist() == [False, True, True]
    assert out["reasons"].iloc[0] == "viirs_low_confidence"


def test_qc_strict_excluye_type_distinto_de_0(norm):
    out = norm.apply_qc(_frame([{"type": 0, "latitude": -10.0}, {"type": 2, "latitude": -10.1}, {"type": 3, "latitude": -10.2}]))
    assert out["qc_strict"].tolist() == [True, False, False]


def test_qc_none_excluye_coordenadas_invalidas_y_duplicados_exactos(norm):
    out = norm.apply_qc(
        _frame([
            {},                              # original
            {},                              # duplicado exacto del anterior
            {"satellite": "Aqua"},           # mismo lugar y hora, otro satelite: NO es duplicado
            {"latitude": 95.0},              # coordenada fuera de rango
            {"longitude": None},             # coordenada nula
        ])
    )
    assert out["qc_none"].tolist() == [True, False, True, False, False]
    assert out["reasons"].iloc[1] == "exact_duplicate"
    assert "invalid_coords" in out["reasons"].iloc[3]
    # lo que no pasa qc_none tampoco pasa qc_strict
    assert not out.loc[~out["qc_none"], "qc_strict"].any()
