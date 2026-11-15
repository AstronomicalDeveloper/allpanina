"""Paquete allpanina (algoritmo para Landry): validación de entradas, flujo completo y regresión.

La regresión contra lo publicado tarda varios minutos: se activa con ALLPANINA_LENTO=1.
"""
import csv
import json
import os

import pytest

from allpanina import ErrorDeEntrada, procesar_peru, verificar_contra_publicado
from allpanina.algoritmo import PUBLICADO, validar_csv

CAB = ["latitude", "longitude", "brightness", "scan", "track", "acq_date", "acq_time", "satellite",
       "instrument", "confidence", "version", "bright_t31", "frp", "daynight", "type"]
PUCALLPA = (-8.38, -74.55)   # Ucayali, PE-25
LIMA = (-12.05, -77.03)      # Lima, PE-15


def _csv(path, filas, sensor="MODIS", sin_type=False):
    cab = [c for c in CAB if not (sin_type and c == "type")]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cab)
        w.writeheader()
        for (lat, lon), fecha, extra in filas:
            fila = {"latitude": lat, "longitude": lon, "brightness": 320, "scan": 1, "track": 1,
                    "acq_date": fecha, "acq_time": "1530", "satellite": "Terra" if sensor == "MODIS" else "SNPP",
                    "instrument": sensor, "confidence": 80 if sensor == "MODIS" else "n",
                    "version": "61.03" if sensor == "MODIS" else "2", "bright_t31": 300, "frp": 10,
                    "daynight": "D", "type": 0}
            fila.update(extra)
            w.writerow({k: fila[k] for k in cab})
    return path


def test_rechaza_csv_nrt_sin_type(tmp_path):
    p = _csv(tmp_path / "m.csv", [(PUCALLPA, "2024-08-01", {})], sin_type=True)
    with pytest.raises(ErrorDeEntrada, match="NRT"):
        validar_csv(p, "MODIS")


def test_rechaza_version_nrt(tmp_path):
    p = _csv(tmp_path / "v.csv", [(PUCALLPA, "2024-08-01", {"version": "2.0NRT"})], sensor="VIIRS")
    with pytest.raises(ErrorDeEntrada, match="NRT"):
        validar_csv(p, "VIIRS")


@pytest.mark.parametrize("sat", ["N20", "1", "N21"])
def test_rechaza_noaa20_y_noaa21(tmp_path, sat):
    p = _csv(tmp_path / "v.csv", [(PUCALLPA, "2027-01-05", {"satellite": sat})], sensor="VIIRS")
    with pytest.raises(ErrorDeEntrada, match="Suomi NPP"):
        validar_csv(p, "VIIRS")


@pytest.mark.parametrize("sat", ["SNPP", "N"])
def test_acepta_suomi_npp(tmp_path, sat):
    p = _csv(tmp_path / "v.csv", [(PUCALLPA, "2024-08-01", {"satellite": sat})], sensor="VIIRS")
    assert validar_csv(p, "VIIRS")["filas"] == 1


def test_flujo_sintetico_con_mes_nuevo(tmp_path):
    fechas = ["2020-09-10", "2020-09-11", "2027-01-05"]          # 2027-01 es posterior al periodo validado
    m = _csv(tmp_path / "m.csv", [(PUCALLPA, d, {}) for d in fechas] + [(LIMA, "2020-09-10", {})])
    v = _csv(tmp_path / "v.csv", [(PUCALLPA, d, {}) for d in fechas] + [(LIMA, "2020-09-12", {})], sensor="VIIRS")
    out = tmp_path / "salida"
    res = procesar_peru(m, v, out, actualizado="2027-02-01")

    assert res["periodo"] == {"desde": "2013-01", "hasta": "2027-01"}
    assert "2027-01" in res["meses_sin_validar"]
    for n in ("monthly_series.csv", "calibrated_series.csv", "validation.json", "method.json",
              "actualizacion.json", "manifest.json", "cells_PE_2020.geojson", "cells_PE_2027.geojson"):
        assert (out / n).exists(), n

    serie = list(csv.DictReader(open(out / "monthly_series.csv", encoding="utf-8")))
    assert len({r["region_id"] for r in serie}) == 26
    mes = {(r["region_id"], r["sensor_group"]): r for r in serie if (r["year"], r["month"]) == ("2020", "9")}
    assert mes[("PE-25", "MODIS")]["cell_days"] == "2" and mes[("PE-15", "MODIS")]["cell_days"] == "1"
    assert mes[("PE", "MODIS")]["cell_days"] == "3"           # PE = suma de departamentos

    method = json.load(open(PUBLICADO / "method.json", encoding="utf-8"))
    k25 = next(r["kappa"] for r in method["regions"] if r["region_id"] == "PE-25")
    cal = list(csv.DictReader(open(out / "calibrated_series.csv", encoding="utf-8")))
    b1 = {(r["region_id"], r["year"], r["month"]): r for r in cal if r["method"] == "B1"}
    assert float(b1[("PE-25", "2020", "9")]["value"]) == pytest.approx(2 * k25)   # κ congelado, sin recalibrar
    nuevo = b1[("PE-25", "2027", "1")]
    assert nuevo["split"] == "sin_validar" and nuevo["residual"] == ""
    assert b1[("PE-25", "2020", "9")]["split"] == "train"

    for n in ("validation.json", "method.json"):              # resultados congelados, copiados tal cual
        assert (out / n).read_bytes() == (PUBLICADO / n).read_bytes()
    man = json.load(open(out / "manifest.json", encoding="utf-8"))
    assert "actualizacion.json" in man["files"] and man["contract_version"] == "1.1"
    act = json.load(open(out / "actualizacion.json", encoding="utf-8"))
    assert act["kappa"]["recalibrado"] is False and act["meses_sin_validar"] == res["meses_sin_validar"]


@pytest.mark.skipif(os.environ.get("ALLPANINA_LENTO") != "1", reason="regresión completa: ALLPANINA_LENTO=1")
def test_regresion_reproduce_lo_publicado(tmp_path):
    res = verificar_contra_publicado(tmp_path / "salida")
    assert res and all(res.values()), {k: v for k, v in res.items() if not v}
