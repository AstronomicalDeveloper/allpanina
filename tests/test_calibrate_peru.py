"""P09/P10 — pruebas de scripts/06_calibrate_peru.py con una serie sintetica (DEMO, no real)."""
import csv
import importlib.util
import json
import os

import pytest

_path = os.path.join(os.path.dirname(__file__), "..", "scripts", "06_calibrate_peru.py")
_spec = importlib.util.spec_from_file_location("calibrate_peru", _path)
cp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cp)


def _write_series(path, value_fn, years=range(2013, 2025)):
    """Serie DEMO: value_fn(region_id, year, month, sensor) -> cell_days. PE = suma de los 25."""
    rows = []
    for y in years:
        for m in range(1, 13):
            tot = {"MODIS": 0, "VIIRS": 0}
            for d in cp.DEPARTAMENTOS:
                for s in ("MODIS", "VIIRS"):
                    v = value_fn(d, y, m, s)
                    tot[s] += v
                    rows.append([d, y, m, s, v, "ok", "x", "2026-11-14"])
            for s in ("MODIS", "VIIRS"):
                rows.append(["PE", y, m, s, tot[s], "ok", "x", "2026-11-14"])
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["region_id", "year", "month", "sensor_group", "cell_days", "status",
                    "source_version", "updated_at"])
        w.writerows(rows)
    return path


def _base(d, y, m, s):
    # VIIRS = 100 en cada departamento; MODIS = 20 en train (kappa 0.2) y 30 en valid.
    if s == "VIIRS":
        return 100
    return 20 if y <= 2022 else 30


def test_estratos_congelados():
    assert len(cp.ESTRATO_PROPIO) == 17 and len(cp.ESTRATO_AGRUPADO) == 8
    assert set(cp.ESTRATO_PROPIO) | set(cp.ESTRATO_AGRUPADO) == set(cp.DEPARTAMENTOS)
    assert not set(cp.ESTRATO_PROPIO) & set(cp.ESTRATO_AGRUPADO)
    assert cp.estrato_de("PE") == cp.estrato_de("PE-SIN-25") == "nacional"
    assert cp.estrato_de("PE-07") == "agrupado" and cp.estrato_de("PE-25") == "propio"


def test_kappa_solo_con_train(tmp_path):
    s1 = cp.add_pe_sin_25(cp.load_series(_write_series(tmp_path / "a.csv", _base)))
    # Cambiar solo la validacion no puede mover ningun kappa.
    s2 = cp.add_pe_sin_25(cp.load_series(_write_series(
        tmp_path / "b.csv", lambda d, y, m, s: _base(d, y, m, s) * (5 if y > 2022 else 1))))
    k1, k2 = cp.fit_kappas(s1), cp.fit_kappas(s2)
    for rid in k1["regions"]:
        assert k1["regions"][rid]["kappa"] == k2["regions"][rid]["kappa"]
    assert k1["regions"]["PE-22"]["kappa"] == pytest.approx(0.2)


def test_agrupado_usa_la_suma_de_los_8(tmp_path):
    def fn(d, y, m, s):
        if d == "PE-11" and s == "MODIS":
            return 10  # kappa propio 0.1, pero entra al estrato
        return _base(d, y, m, s)
    k = cp.fit_kappas(cp.add_pe_sin_25(cp.load_series(_write_series(tmp_path / "s.csv", fn))))
    esperado = (7 * 20 * 120 + 10 * 120) / (8 * 100 * 120)
    assert k["estratos"]["agrupado"]["kappa"] == pytest.approx(esperado)
    for d in cp.ESTRATO_AGRUPADO:
        assert k["regions"][d]["kappa"] == pytest.approx(esperado)
    assert k["regions"]["PE"]["kappa"] == k["estratos"]["nacional"]["kappa"]


def test_b1_es_viirs_por_kappa_del_estrato(tmp_path):
    s = cp.add_pe_sin_25(cp.load_series(_write_series(tmp_path / "s.csv", _base)))
    k = cp.fit_kappas(s)
    rows = cp.build_calibrated(s, k)
    for r in rows:
        if r["method"] == "B1":
            assert r["value"] == pytest.approx(100 * k["regions"][r["region_id"]]["kappa"]) or r["region_id"] == "PE"
        assert r["residual"] is None and r["split"] in ("train", "valid")
    assert len(rows) == 26 * 144 * 2


def test_rechaza_meses_de_test(tmp_path):
    p = _write_series(tmp_path / "t.csv", _base, years=range(2013, 2026))
    with pytest.raises(ValueError, match="test"):
        cp.load_series(p)
    s = cp.add_pe_sin_25(cp.load_series(_write_series(tmp_path / "s.csv", _base)))
    with pytest.raises(ValueError):
        cp.build_validation(s, cp.fit_kappas(s), split="test")


def test_minimo_para_reportar_y_wape_nulo(tmp_path):
    def fn(d, y, m, s):
        if d == "PE-07" and s == "MODIS":
            return 0
        if d == "PE-23" and s == "MODIS" and y > 2022:
            return 2  # 48 en valid < 50
        return _base(d, y, m, s)
    s = cp.add_pe_sin_25(cp.load_series(_write_series(tmp_path / "s.csv", fn)))
    v = cp.build_validation(s, cp.fit_kappas(s))
    by = {r["region_id"]: r for r in v["regions"]}
    for rid in ("PE-07", "PE-23"):
        assert by[rid]["reportable"] is False and "methods" not in by[rid] and "motivo" in by[rid]
    assert by["PE-22"]["reportable"] is True
    assert cp._met.compute_metrics([0, 0], [1, 2])["wape"] is None


def test_pe_sin_25_es_pe_menos_ucayali(tmp_path):
    s = cp.add_pe_sin_25(cp.load_series(_write_series(tmp_path / "s.csv", _base)))
    for month in s["PE"]:
        for sen in ("modis", "viirs"):
            assert s["PE-SIN-25"][month][sen] == s["PE"][month][sen] - s["PE-25"][month][sen]


def test_comparacion_de_alternativas(tmp_path):
    s = cp.add_pe_sin_25(cp.load_series(_write_series(tmp_path / "s.csv", _base)))
    c = cp.compare_alternatives(s, cp.fit_kappas(s))
    a = c["alternativas"]["a_estratificada"]
    # kappa 0.2 -> estimado 20 frente a MODIS 30 en valid: WAPE = 10/30
    assert a["wape_agregado"] == pytest.approx(1 / 3)
    assert a["n_region_meses"] == 25 * 24
    # PE informativo: suma de B1 departamentales = 25 * 20 frente a MODIS 25 * 30
    assert a["informativo_PE_suma_departamentos"]["wape"] == pytest.approx(1 / 3)
    assert set(c["alternativas"]) == {"a_estratificada", "b_kappa_nacional", "c_kappa_ucayali", "B0_sin_calibrar"}


def test_run_escribe_salidas(tmp_path):
    pilot = tmp_path / "pilot.json"
    pilot.write_text(json.dumps({"indicator": "x", "period_train": "2013-01:2022-12"}), encoding="utf-8")
    serie = _write_series(tmp_path / "s.csv", _base)
    cp.run(serie, tmp_path / "out", pilot)
    for f in ("calibrated_series.csv", "validation.json", "method.json", "comparacion_alternativas.json"):
        assert (tmp_path / "out" / f).exists()
    m = json.loads((tmp_path / "out" / "method.json").read_text(encoding="utf-8"))
    assert m["contract_version"] == "1.1" and len(m["regions"]) == 26
    assert m["resultados"]["test"].startswith("pendiente")
