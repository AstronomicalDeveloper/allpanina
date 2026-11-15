"""allpanina.procesar_region: cualquier región (caso Mendoza) y regresión con el piloto de Ucayali.

La regresión con Ucayali tarda varios minutos: se activa con ALLPANINA_LENTO=1.
"""
import csv
import json
import os
from pathlib import Path

import pytest

from allpanina import ErrorDeEntrada, procesar_region
from allpanina.region import zona_por_longitud

ROOT = Path(__file__).resolve().parent.parent
CAB = ["latitude", "longitude", "brightness", "scan", "track", "acq_date", "acq_time", "satellite",
       "instrument", "confidence", "version", "bright_t31", "frp", "daynight", "type"]
MENDOZA = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {},
           "geometry": {"type": "Polygon", "coordinates": [[[-69.5, -33.5], [-68.0, -33.5], [-68.0, -32.0],
                                                            [-69.5, -32.0], [-69.5, -33.5]]]}}]}
DENTRO, FUERA = (-32.9, -68.8), (-34.6, -58.4)               # Mendoza / Buenos Aires


def _csv(path, filas, sensor="MODIS"):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CAB)
        w.writeheader()
        for (lat, lon), fecha, hora in filas:
            w.writerow({"latitude": lat, "longitude": lon, "brightness": 320, "scan": 1, "track": 1,
                        "acq_date": fecha, "acq_time": hora, "satellite": "Aqua" if sensor == "MODIS" else "SNPP",
                        "instrument": sensor, "confidence": 80 if sensor == "MODIS" else "n",
                        "version": "61.03" if sensor == "MODIS" else "2", "bright_t31": 300, "frp": 10,
                        "daynight": "N", "type": 0})
    return path


def _entradas(tmp_path, filas_m, filas_v):
    pol = tmp_path / "mendoza.geojson"
    pol.write_text(json.dumps(MENDOZA), encoding="utf-8")
    return _csv(tmp_path / "m.csv", filas_m), _csv(tmp_path / "v.csv", filas_v, "VIIRS"), pol


def test_zona_por_longitud():
    assert zona_por_longitud(-68.8) == "Etc/GMT+5" and zona_por_longitud(-45) == "Etc/GMT+3"
    assert zona_por_longitud(0) == "UTC" and zona_por_longitud(120) == "Etc/GMT-8"


def test_mendoza_dia_local_y_solo_observados(tmp_path):
    # 2020-10-01 02:00 UTC es todavía 30 de setiembre en Mendoza (UTC-3): cuenta en setiembre.
    filas = [(DENTRO, "2015-09-10", "1500"), (DENTRO, "2020-10-01", "0200"), (FUERA, "2020-09-10", "1500")]
    m, v, pol = _entradas(tmp_path, filas, filas)
    out = tmp_path / "out"
    res = procesar_region(m, v, out, region_id="AR-M", nombre="Mendoza", poligono=pol,
                          zona_horaria="America/Argentina/Mendoza", actualizado="2026-11-15")
    assert res["periodo"] == {"desde": "2015-09", "hasta": "2020-09"}
    assert res["b1_disponible"] is False and res["celda_mapa_km"] == 1
    serie = {(r["year"], r["month"], r["sensor_group"]): r for r in
             csv.DictReader(open(out / "monthly_series.csv", encoding="utf-8"))}
    assert serie[("2020", "9", "MODIS")]["cell_days"] == "1"          # Buenos Aires no cuenta
    assert serie[("2015", "9", "VIIRS")]["cell_days"] == "1"
    cal = list(csv.DictReader(open(out / "calibrated_series.csv", encoding="utf-8")))
    assert all(r["status"] == "missing" for r in cal if r["method"] == "B1")   # sin κ: no hay B1
    method = json.load(open(out / "method.json", encoding="utf-8"))
    assert method["kappa"] is None and method["estado"].startswith("exploratorio")
    assert method["zona_horaria"] == "America/Argentina/Mendoza"
    man = json.load(open(out / "manifest.json", encoding="utf-8"))
    assert man["region_id"] == "AR-M" and "procedencia.json" in man["files"]
    assert "cells_AR-M_2020.geojson" in man["files"]
    assert any("No se ofrece B1" in a for a in res["advertencias"])


def test_kappa_local_y_evaluacion_fuera_de_muestra(tmp_path):
    # MODIS ve 1 de cada 2 celda-días de VIIRS en train -> κ = 0.5; con umbrales bajos para el test.
    fm, fv = [], []
    for y in range(2013, 2025):
        for d in range(1, 5):
            lat = -32.5 - 0.05 * d
            fv.append(((lat, -68.8), f"{y}-08-{d:02d}", "1500"))
            if d <= 2:
                fm.append(((lat, -68.8), f"{y}-08-{d:02d}", "1500"))
    m, v, pol = _entradas(tmp_path, fm, fv)
    res = procesar_region(m, v, tmp_path / "out", region_id="AR-M", poligono=pol,
                          zona_horaria="America/Argentina/Mendoza", umbral_viirs=1, umbral_modis=1)
    assert res["kappa"] == pytest.approx(0.5)
    method = json.load(open(tmp_path / "out" / "method.json", encoding="utf-8"))
    assert "valid" in method["resultados"] and method["kappa_inputs"]["meses_train"] == 10
    b1 = [r for r in csv.DictReader(open(tmp_path / "out" / "calibrated_series.csv", encoding="utf-8"))
          if r["method"] == "B1" and r["month"] == "8" and r["year"] == "2023"]
    assert float(b1[0]["value"]) == pytest.approx(2.0) and b1[0]["split"] == "valid"


def test_errores_de_entrada(tmp_path):
    m, v, pol = _entradas(tmp_path, [(DENTRO, "2020-09-10", "1500")], [(DENTRO, "2020-09-10", "1500")])
    with pytest.raises(ErrorDeEntrada, match="región"):
        procesar_region(m, v, tmp_path / "o", region_id="AR-M")
    with pytest.raises(ErrorDeEntrada, match="Zona horaria"):
        procesar_region(m, v, tmp_path / "o", region_id="AR-M", poligono=pol, zona_horaria="Marte/Olympus")
    with pytest.raises(ErrorDeEntrada, match="region_id"):
        procesar_region(m, v, tmp_path / "o", region_id="mal id", poligono=pol)


@pytest.mark.skipif(os.environ.get("ALLPANINA_LENTO") != "1", reason="regresión completa: ALLPANINA_LENTO=1")
def test_regresion_ucayali_reproduce_el_piloto(tmp_path):
    """Modo región con el polígono de Ucayali y hora de Lima = piloto publicado (serie, κ, mapas)."""
    import zipfile
    raw = tmp_path / "raw"
    csvs = {}
    for s, z in (("MODIS", "DL_FIRE_M-C61_848370.zip"), ("VIIRS", "DL_FIRE_SV-C2_848371.zip")):
        with zipfile.ZipFile(ROOT / "docs" / z) as f:
            n = next(x for x in f.namelist() if x.startswith("fire_archive_"))
            f.extract(n, raw)
            csvs[s] = raw / n
    pub = ROOT / "frontend" / "public" / "data"
    stamp = next(csv.DictReader(open(pub / "monthly_series.csv", encoding="utf-8")))["updated_at"]
    out = tmp_path / "out"
    res = procesar_region(csvs["MODIS"], csvs["VIIRS"], out, region_id="PE-UCA",
                          poligono=ROOT / "docs" / "region" / "ucayali_inei_2023.geojson",
                          zona_horaria="America/Lima", celda_mapa_km=1, hasta="2026-07", actualizado=stamp)
    assert res["kappa"] == 0.2936037257560573                        # κ del piloto (DECISIONS.md §10)
    assert (out / "monthly_series.csv").read_bytes() == (pub / "monthly_series.csv").read_bytes()
    for y in range(2013, 2027):
        n = f"cells_PE-UCA_{y}.geojson"
        assert (out / n).read_bytes() == (pub / n).read_bytes(), n
    def b1(path):
        return {(r["year"], r["month"]): float(r["value"]) for r in csv.DictReader(open(path, encoding="utf-8"))
                if r["method"] == "B1" and r["value"]}
    assert b1(out / "calibrated_series.csv") == pytest.approx(b1(pub / "calibrated_series.csv"))
