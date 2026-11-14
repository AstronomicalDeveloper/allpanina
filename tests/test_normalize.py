"""T10 - Fechas UTC/Lima, esquema y filas excluidas (scripts/02_normalize.py)."""
import importlib

import pandas as pd
import pytest

norm = importlib.import_module("scripts.02_normalize")


def _local_day(date: str, hhmm: str) -> str:
    utc, local = norm.to_utc_and_local_day(pd.Series([date]), pd.Series([hhmm]))
    return local.iloc[0].strftime("%Y-%m-%d"), utc.iloc[0].strftime("%Y-%m-%d %H:%M")


@pytest.mark.parametrize(
    "date, hhmm, expected_local",
    [
        ("2024-08-10", "0200", "2024-08-09"),  # 02:00 UTC = 21:00 del dia anterior en Lima
        ("2024-08-10", "0459", "2024-08-09"),  # 23:59 en Lima, todavia el dia anterior
        ("2024-08-10", "0500", "2024-08-10"),  # 00:00 en Lima: cambia el dia
        ("2024-08-10", "2359", "2024-08-10"),
        ("2024-08-10", "30", "2024-08-09"),    # '30' -> 00:30 UTC (se rellena con ceros)
        ("2024-01-01", "0100", "2023-12-31"),  # cruza el anio
        ("2024-03-01", "0300", "2024-02-29"),  # cruza el mes (anio bisiesto)
    ],
)
def test_midnight_examples(date, hhmm, expected_local):
    local, _ = _local_day(date, hhmm)
    assert local == expected_local


def test_utc_instant_is_preserved():
    _, utc = _local_day("2024-08-10", "0200")
    assert utc == "2024-08-10 02:00"


def test_invalid_datetime_is_nat():
    utc, local = norm.to_utc_and_local_day(pd.Series(["2024-13-40", "no-date"]), pd.Series(["0200", "9999"]))
    assert utc.isna().all() and local.isna().all()


def _frame(rows):
    base = {
        "sensor_group": "MODIS", "satellite": "Terra", "latitude": -8.4, "longitude": -74.5,
        "acq_date": "2024-08-10", "acq_hhmm": "0600", "confidence": "80", "version": "61.03", "type": "0",
    }
    df = pd.DataFrame([{**base, **row} for row in rows])
    df["utc_datetime"], df["local_date"] = norm.to_utc_and_local_day(df["acq_date"], df["acq_hhmm"])
    return df


def _reasons(df):
    return dict(zip(df.index, df["reasons"]))


def test_qc_keeps_good_rows_and_flags_the_rest():
    df = _frame(
        [
            {},                                                        # 0 ok
            {"type": "2", "latitude": -8.50},                          # 1 fuente estatica
            {"confidence": "29", "latitude": -8.51},                   # 2 MODIS baja
            {"confidence": "30", "latitude": -8.41},                   # 3 limite: se conserva
            {"sensor_group": "VIIRS", "confidence": "l"},              # 4 VIIRS baja
            {"sensor_group": "VIIRS", "confidence": "n", "latitude": -8.42},   # 5 ok
            {"sensor_group": "VIIRS", "confidence": "h", "latitude": -8.43},   # 6 ok
            {"sensor_group": "VIIRS", "confidence": "n", "type": "3", "latitude": -8.44},  # 7 offshore
            {"latitude": 123.0},                                       # 8 coordenadas
            {"acq_date": "2024-99-99", "latitude": -8.45},             # 9 fecha
            {},                                                        # 10 duplicado exacto de 0
        ]
    )
    out = norm.apply_qc(df)
    assert out["excluded"].tolist() == [False, True, True, False, True, False, False, True, True, True, True]
    reasons = _reasons(out)
    assert reasons[1] == "type_not_0"
    assert reasons[2] == "modis_confidence_below_30"
    assert reasons[4] == "viirs_confidence_not_n_h"
    assert reasons[7] == "type_not_0"
    assert "invalid_coords" in reasons[8]
    assert "invalid_datetime" in reasons[9]
    assert reasons[10] == "exact_duplicate"


def test_missing_type_column_values_are_not_excluded():
    out = norm.apply_qc(_frame([{"type": pd.NA}]))
    assert not out["excluded"].iloc[0]


def test_viirs_type_filter_can_be_switched_off(monkeypatch):
    monkeypatch.setattr(norm, "VIIRS_TYPE_FILTER", False)
    out = norm.apply_qc(_frame([{"sensor_group": "VIIRS", "confidence": "n", "type": "2"}]))
    assert not out["excluded"].iloc[0]


def _write_raw(path, rows):
    header = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight,type\n"
    path.write_text(header + "".join(rows), encoding="utf-8")


def test_run_writes_outputs_and_keeps_utc(tmp_path):
    raw, out = tmp_path / "raw", tmp_path / "out"
    raw.mkdir()
    _write_raw(
        raw / "firms_raw_modis.csv",
        [
            "-8.4,-74.5,330,1,1,2024-08-10,200,Terra,MODIS,80,61.03,300,10,N,0\n",   # ok, 02:00 UTC
            "-8.4,-74.5,330,1,1,2024-08-10,215,Aqua,MODIS,20,61.03,300,10,N,0\n",    # confianza baja
            "-8.5,-74.5,330,1,1,2024-08-10,215,Aqua,MODIS,90,61.03,300,10,N,2\n",    # type 2
        ],
    )
    _write_raw(
        raw / "firms_raw_viirs_snpp.csv",
        ["-8.4,-74.5,330,0.4,0.4,2024-08-10,615,N,VIIRS,n,2,300,5,D,0\n"],
    )
    norm.run(raw, out)
    clean = pd.read_parquet(out / "points_clean.parquet")
    assert sorted(clean["sensor_group"]) == ["MODIS", "VIIRS"]
    modis = clean[clean["sensor_group"] == "MODIS"].iloc[0]
    assert modis["utc_datetime"] == pd.Timestamp("2024-08-10 02:00")
    assert modis["local_date"] == pd.Timestamp("2024-08-09")
    excluded = pd.read_csv(out / "excluded_rows.csv")
    assert len(excluded) == 2 and set(excluded["reasons"]) == {"modis_confidence_below_30", "type_not_0"}
    counts = pd.read_csv(out / "qc_counts.csv").set_index("sensor_group")
    assert counts.loc["MODIS", ["rows_raw", "rows_excluded", "rows_kept"]].tolist() == [3, 2, 1]
    info = pd.read_json(out / "source_info.json")
    assert info.loc["rows_raw", "MODIS"] == 3 and info.loc["last_date", "VIIRS"] == "2024-08-10"


def test_run_without_raw_files_fails_clearly(tmp_path):
    with pytest.raises(FileNotFoundError, match="01_download"):
        norm.run(tmp_path / "raw", tmp_path / "out")
