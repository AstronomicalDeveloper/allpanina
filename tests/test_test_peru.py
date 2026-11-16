"""P14 — pruebas de scripts/09_test_peru.py con series sinteticas (DEMO, no reales)."""
import csv
import hashlib
import importlib.util
import json
import os

import pytest

_path = os.path.join(os.path.dirname(__file__), "..", "scripts", "09_test_peru.py")
_spec = importlib.util.spec_from_file_location("test_peru", _path)
tp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(tp)
cp = tp.cp

COLS = ["region_id", "year", "month", "sensor_group", "cell_days", "status", "source_version", "updated_at"]


def _valor(d, y, m, s):
    if s == "VIIRS":
        return 100
    i = int(d[-2:])
    return (10 + i) if y <= 2022 else (15 + i)


def _serie(path, fn=_valor, hasta=(2026, 7), updated="2026-11-15"):
    rows = []
    for y in range(2013, hasta[0] + 1):
        for m in range(1, 13):
            if (y, m) > hasta:
                break
            tot = {"MODIS": 0, "VIIRS": 0}
            for d in cp.DEPARTAMENTOS:
                for s in ("MODIS", "VIIRS"):
                    v = fn(d, y, m, s)
                    tot[s] += v
                    rows.append([d, y, m, s, v, "ok", "x", updated])
            for s in ("MODIS", "VIIRS"):
                rows.append(["PE", y, m, s, tot[s], "ok", "x", updated])
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(COLS)
        w.writerows(rows)
    return str(path)


def _sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


def _autorizacion(path, kappas, estado="**AUTORIZADO** el 15-nov-2026"):
    filas = "\n".join(f"| `{rid}` | x | y | `{k!r}` |" for rid, k in kappas.items())
    path.write_text(f"# P12\n\n- **Estado:** {estado}\n\n## 3. Insumos\n\n| a | b | c | d |\n| --- | --- | --- | --- |\n"
                    f"{filas}\n\n## 4. Ucayali\n", encoding="utf-8")
    return str(path)


def _kappas_de(full):
    s = tp.load_series_full(full)
    k = cp.fit_kappas(s)
    out = {"PE": k["estratos"]["nacional"]["kappa"]}
    out.update({d: k["regions"][d]["kappa"] for d in cp.DEPARTAMENTOS})
    return out


@pytest.fixture
def caso(tmp_path):
    full = _serie(tmp_path / "full.csv")
    p07 = _serie(tmp_path / "p07.csv", hasta=(2024, 12), updated="2026-11-14")
    aut = _autorizacion(tmp_path / "AUT.md", _kappas_de(full))
    return {"full": full, "p07": p07, "aut": aut, "out": str(tmp_path / "out"),
            "sha_full": _sha(full), "sha_p07": _sha(p07)}


def _run(c, **kw):
    args = dict(sha_full=c["sha_full"], sha_p07=c["sha_p07"], emit=lambda *_: None)
    args.update(kw)
    return tp.run(c["full"], c["out"], c["aut"], c["p07"], **args)


def test_corrida_completa_y_salidas(caso):
    v, r = _run(caso)
    for f in tp.SALIDAS:
        assert os.path.exists(os.path.join(caso["out"], f))
    assert v["split"] == "test" and r["resultado_limpio"] == "PE-SIN-25"
    by = {x["region_id"]: x for x in v["regions"]}
    assert set(by) == {"PE", "PE-SIN-25", *cp.DEPARTAMENTOS}
    assert "T29" in by["PE-25"]["nota"] and "T29" in by["PE"]["nota"]
    assert by["PE"]["methods"]["B1"]["n_months_matched"] == 19
    assert "referencia_kappa_nacional" in r


def test_no_corre_sin_autorizacion(caso, tmp_path):
    caso["aut"] = _autorizacion(tmp_path / "B.md", _kappas_de(caso["full"]), estado="BORRADOR")
    with pytest.raises(tp.Detener, match="AUTORIZADO"):
        _run(caso)
    assert not os.path.exists(caso["out"])


def test_kappa_distinto_detiene_antes_de_metricas(caso, tmp_path, monkeypatch):
    k = _kappas_de(caso["full"])
    k["PE-17"] += 1e-9
    caso["aut"] = _autorizacion(tmp_path / "C.md", k)
    llamado = []
    monkeypatch.setattr(tp, "build_validation_test", lambda *a: llamado.append(1))
    impreso = []
    with pytest.raises(tp.Detener, match="PE-17"):
        _run(caso, emit=impreso.append)
    assert not llamado and not os.path.exists(caso["out"])
    assert any("PE-17" in x and "DISTINTO" in x for x in impreso)   # se imprimen antes de parar


def test_se_corre_una_sola_vez(caso):
    _run(caso)
    with pytest.raises(tp.Detener, match="una sola vez"):
        _run(caso)


def test_hash_de_la_serie(caso):
    with pytest.raises(tp.Detener, match="SHA-256"):
        _run(caso, sha_full="0" * 64)


def test_regresion_2013_2024_ignora_updated_at(caso, tmp_path):
    # updated_at distinto (14 vs 15 nov) no importa ...
    _run(caso)
    # ... pero un cambio de cell_days en 2013-2024 si.
    def fn(d, y, m, s):
        return _valor(d, y, m, s) + (1 if (d, y, m, s) == ("PE-03", 2020, 5, "MODIS") else 0)
    otra = _serie(tmp_path / "otra.csv", fn)
    with pytest.raises(tp.Detener, match="no es identico"):
        tp.verificar_serie(otra, caso["p07"], _sha(otra), caso["sha_p07"])


def test_residuos_y_csv(caso):
    v, _ = _run(caso)
    pe = next(x for x in v["regions"] if x["region_id"] == "PE")
    res = pe["methods"]["B1"]["residuals"]
    assert len(res) == 19
    assert [x["absolute_error"] for x in res] == sorted((x["absolute_error"] for x in res), reverse=True)
    for x in res:
        assert x["signed_error"] == pytest.approx(x["estimate"] - x["modis_observed"])
    with open(os.path.join(caso["out"], "calibrated_series.csv"), encoding="utf-8") as f:
        filas = list(csv.DictReader(f))
    assert len(filas) == 26 * 163 * 2
    for r in filas:
        assert (r["residual"] != "") == (r["split"] == "test")


def test_pe_b1_es_suma_y_minimo_de_reporte(tmp_path):
    def fn(d, y, m, s):
        if d == "PE-23" and s == "MODIS" and y >= 2025:
            return 2  # 38 en test < 50
        return _valor(d, y, m, s)
    full = _serie(tmp_path / "f.csv", fn)
    s = tp.load_series_full(full)
    k = cp.fit_kappas(s)
    v = tp.build_validation_test(s, k)
    by = {x["region_id"]: x for x in v["regions"]}
    assert by["PE-23"]["reportable"] is False and "methods" not in by["PE-23"]
    pe = by["PE"]["methods"]["B1"]["residuals"]
    for x in pe:
        suma = sum(cp.b1_month(s, k["regions"], d, x["month"]) for d in cp.DEPARTAMENTOS)
        assert x["estimate"] == pytest.approx(suma)


def test_salidas_reproducibles(caso, tmp_path):
    _run(caso)
    caso2 = dict(caso, out=str(tmp_path / "out2"))
    _run(caso2)
    for f in tp.SALIDAS:
        assert open(os.path.join(caso["out"], f), "rb").read() == open(os.path.join(caso2["out"], f), "rb").read()


def test_lee_la_autorizacion_real_del_repo():
    aut = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures", "peru", "AUTORIZACION_TEST.md")
    if not os.path.exists(aut):
        pytest.skip("sin AUTORIZACION_TEST.md")
    k = tp.leer_autorizacion(aut)
    assert len(k) == 26 and k["PE-25"] == 0.2936037257560573
