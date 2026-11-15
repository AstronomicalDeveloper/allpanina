"""P17 — pruebas de scripts/10_final_peru.py (estructura de method.json final; datos DEMO)."""
import importlib.util
import json
import os

import pytest

_path = os.path.join(os.path.dirname(__file__), "..", "scripts", "10_final_peru.py")
_spec = importlib.util.spec_from_file_location("final_peru", _path)
fp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fp)

ROOT = os.path.join(os.path.dirname(__file__), "..")


def _demo():
    method_p11 = {
        "contract_version": "1.1", "estado": "aprobado en P11", "regions": [{"region_id": "PE", "kappa": 0.25}],
        "estratos": {"agrupado": {"kappa": 0.2}},
        "resultados": {"valid": {"PE": {"n_meses": 24}},
                       "test": "pendiente (P14, con autorización P12)",
                       "referencia_kappa_nacional": {"nota": "x", "PE": {"periodo": "2023-01:2024-12", "wape": 0.143}}},
        "limitations": ["A", "VIIRS S-NPP: NOAA anunció el cese...", "El test de Ucayali (PE-25) ya se vio en T29; ...", "B"],
    }
    res = [{"month": "2025-01", "modis_observed": 10.0, "estimate": 12.0, "signed_error": 2.0, "absolute_error": 2.0},
           {"month": "2025-02", "modis_observed": 50.0, "estimate": 45.0, "signed_error": -5.0, "absolute_error": 5.0}]
    met = {"split": "test", "metrics": {"mae": 3.5, "wape": 0.11666, "bias": -1.5}, "n_months_matched": 2, "residuals": res}
    validation = {"split": "test", "regions": [
        {"region_id": "PE", "estrato": "nacional", "reportable": True, "nota": "incluye a Ucayali", "methods": {"B0": met, "B1": met}},
        {"region_id": "PE-07", "estrato": "agrupado", "reportable": False, "motivo": "Σ MODIS en test = 0"}]}
    resumen = {"referencia_kappa_nacional": {"PE": {"kappa": 0.25, "mae": 1.0, "wape": 0.31912, "bias": 1.0}}}
    return method_p11, validation, resumen


def test_method_final_no_toca_kappa_ni_validacion():
    p11, v, r = _demo()
    m = fp.build_method(p11, v, r)
    assert m["regions"] == p11["regions"] and m["estratos"] == p11["estratos"]
    assert m["resultados"]["valid"] == p11["resultados"]["valid"]
    assert m["estado"] == fp.ESTADO and p11["estado"] == "aprobado en P11"   # no muta la entrada


def test_resultados_de_test():
    p11, v, r = _demo()
    res = fp.build_method(p11, v, r)["resultados"]
    pe = res["test"]["PE"]
    assert pe["n_meses"] == 2 and pe["suma_modis"] == 60 and pe["B1"]["wape"] == 0.117
    assert pe["nota"] == "incluye a Ucayali"
    assert "PE-07" not in res["test"] and "PE-07" in res["test_no_reportables"]
    assert res["referencia_kappa_nacional"]["valid"]["wape"] == 0.143
    assert res["referencia_kappa_nacional"]["test"]["wape"] == 0.319
    assert res["resultado_limpio"] == "PE-SIN-25"


def test_limitaciones():
    p11, v, r = _demo()
    lim = fp.build_method(p11, v, r)["limitations"]
    assert lim[:2] == ["A", "B"]                     # se conservan las de P11
    assert not any("NOAA anunció" in x for x in lim)  # reemplazada por el cese ya ocurrido
    assert sum("ya se vio en T29" in x for x in lim) == 1
    texto = " ".join(lim)
    for clave in ("cambio de régimen", "19 meses", "PE-SIN-25", "Tumbes", "2 de noviembre de 2026", "Hipótesis no probada"):
        assert clave in texto


def test_rechaza_archivos_no_firmados(tmp_path):
    t = tmp_path / "docs" / "peru" / "test"
    t.mkdir(parents=True)
    (t / "validation.json").write_text("{}", encoding="utf-8")
    (t / "calibrated_series.csv").write_text("x\n", encoding="utf-8")
    with pytest.raises(SystemExit, match="firmado en P15"):
        fp.run(str(tmp_path))


def test_salidas_reales_reproducibles(tmp_path):
    if not os.path.exists(os.path.join(ROOT, "docs", "peru", "test", "resumen_test.json")):
        pytest.skip("sin salidas de P14")
    a = fp.run(ROOT, out_rel=os.path.relpath(tmp_path / "a", ROOT))
    b = fp.run(ROOT, out_rel=os.path.relpath(tmp_path / "b", ROOT))
    assert a == b
    assert a["validation.json"] == fp.SHA_FIRMADOS["validation.json"]
    assert a["calibrated_series.csv"] == fp.SHA_FIRMADOS["calibrated_series.csv"]
