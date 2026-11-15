"""P14 — Corrida unica del test nacional Peru (2025-01 a 2026-07).

Reglas (docs/peru/AUTORIZACION_TEST.md, DECISIONS.md §11.3 y §12):
1. Solo corre si AUTORIZACION_TEST.md dice "AUTORIZADO".
2. Comprueba la serie de P13 antes de usarla: su SHA-256, y que 2013-01..2024-12 sea identico
   a la serie aprobada en P07 en todas las columnas menos updated_at.
3. Recalcula los kappa con train 2013-2022, los IMPRIME y los compara con los congelados de
   AUTORIZACION_TEST.md §3. Si alguno no coincide, se detiene ANTES de calcular metricas.
4. Se corre una sola vez: si la carpeta de salida ya tiene resultados, se niega a correr.
5. Escribe las salidas en docs/peru/test/ sin edicion manual.

Los kappa y B1 son los de scripts/06_calibrate_peru.py (P09/P10, aprobados en P11): B1 de un
departamento = VIIRS x kappa de su estrato; B1 de PE y PE-SIN-25 = suma de los B1 de sus
departamentos. La version de PE con kappa nacional se reporta solo como referencia.

Uso:
    python scripts/09_test_peru.py docs/peru/test/monthly_series_full.csv
"""
from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load(name, filename):
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


cp = _load("allpanina_calibrate_peru", "06_calibrate_peru.py")
_met = cp._met

# Valores de P13 (docs/peru/P13.md) y P07 (docs/peru/REVISION_P07.md).
SHA_SERIE_FULL = "a633da77d258c832b929d9cc672b11a08a6d3651f620469dcb3d7233acf73ede"
SHA_SERIE_P07 = "b3ceeae6df820b19f7f132558cea08e51d27f6528f04b460c4c6c8b517893109"
TEST_START, TEST_END = "2025-01", "2026-07"
N_MESES_TEST = 19
SALIDAS = ("validation.json", "calibrated_series.csv", "resumen_test.json", "corrida.log")


class Detener(Exception):
    """Algo no cumple la autorizacion: no se calcula ninguna metrica."""


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


# ---------------------------------------------------------------------------
# 1. Autorizacion y kappa congelados
# ---------------------------------------------------------------------------
def leer_autorizacion(path):
    """Devuelve {region_id: kappa congelado} de la seccion 3. Falla si no esta AUTORIZADO."""
    with open(path, encoding="utf-8") as f:
        txt = f.read()
    estado = re.search(r"^- \*\*Estado:\*\*(.*)$", txt, re.M)
    if not estado or "AUTORIZADO" not in estado.group(1):
        raise Detener(f"{path}: el estado no es AUTORIZADO. P14 no corre sin la autorizacion de P12.")
    sec3 = txt.split("## 3.", 1)[1].split("## 4.", 1)[0] if "## 3." in txt else ""
    kappas = {rid: float(k) for rid, k in
              re.findall(r"^\| `(PE(?:-\d\d)?)` \|[^|]*\|[^|]*\| `([0-9.]+)`", sec3, re.M)}
    faltan = [r for r in ("PE",) + cp.DEPARTAMENTOS if r not in kappas]
    if faltan:
        raise Detener(f"{path} §3 no trae el kappa congelado de: {faltan}")
    return kappas


# ---------------------------------------------------------------------------
# 2. Serie de P13
# ---------------------------------------------------------------------------
def _filas(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def verificar_serie(full_path, p07_path, sha_full=SHA_SERIE_FULL, sha_p07=SHA_SERIE_P07):
    """Hashes y regresion 2013-2024 (ignorando updated_at). Devuelve un registro de lo comprobado."""
    log = []
    h = sha256(full_path)
    if h != sha_full:
        raise Detener(f"SHA-256 de la serie P13 = {h}, se esperaba {sha_full}")
    log.append(f"serie P13 SHA-256 = {h} (coincide con P13.md)")
    h7 = sha256(p07_path)
    if h7 != sha_p07:
        raise Detener(f"SHA-256 de la serie P07 = {h7}, se esperaba {sha_p07}")
    log.append(f"serie P07 SHA-256 = {h7} (coincide con REVISION_P07.md)")

    def clave(r):
        return (r["region_id"], int(r["year"]), int(r["month"]), r["sensor_group"])

    def sin_fecha(r):
        return {k: v for k, v in r.items() if k != "updated_at"}

    full = _filas(full_path)
    pre = {clave(r): sin_fecha(r) for r in full if f"{int(r['year']):04d}-{int(r['month']):02d}" <= cp.VALID_END}
    p07 = {clave(r): sin_fecha(r) for r in _filas(p07_path)}
    if pre != p07:
        dif = sorted(k for k in set(pre) | set(p07) if pre.get(k) != p07.get(k))
        raise Detener(f"2013-2024 de P13 no es identico a P07 (sin updated_at): {len(dif)} filas, p. ej. {dif[:3]}")
    log.append(f"2013-01..2024-12: {len(pre)} filas identicas a P07 en todas las columnas menos updated_at")
    meses_test = sorted({f"{int(r['year']):04d}-{int(r['month']):02d}" for r in full} - {k for k in
                        {f"{a[1]:04d}-{a[2]:02d}" for a in pre}})
    if len(meses_test) != N_MESES_TEST or meses_test[0] != TEST_START or meses_test[-1] != TEST_END:
        raise Detener(f"Meses de test inesperados: {meses_test[:2]}...{meses_test[-1:]} ({len(meses_test)})")
    log.append(f"meses de test: {TEST_START} a {TEST_END} ({len(meses_test)})")
    return log


def load_series_full(path):
    """Como cp.load_series pero acepta test. status != ok o vacio -> None (nunca 0)."""
    out = {}
    for r in _filas(path):
        month = f"{int(r['year']):04d}-{int(r['month']):02d}"
        if cp.split_de(month) is None:
            continue
        ok = r.get("status") == "ok" and r["cell_days"] not in ("", None)
        sensor = "modis" if r["sensor_group"].upper() == "MODIS" else "viirs"
        cell = out.setdefault(r["region_id"], {}).setdefault(month, {"modis": None, "viirs": None})
        cell[sensor] = float(r["cell_days"]) if ok else None
    faltan = [rid for rid in ("PE",) + cp.DEPARTAMENTOS if rid not in out]
    if faltan:
        raise Detener(f"Faltan regiones en la serie: {faltan}")
    return cp.add_pe_sin_25(out)


# ---------------------------------------------------------------------------
# 3. Kappa: imprimir y comparar ANTES de cualquier metrica
# ---------------------------------------------------------------------------
def comprobar_kappas(kappas, congelados, emit):
    emit("kappa recalculados con train 2013-01..2022-12 frente a los congelados (AUTORIZACION_TEST.md §3):")
    malos = []
    calc = {rid: kappas["regions"][rid]["kappa"] for rid in cp.DEPARTAMENTOS}
    calc["PE"] = kappas["estratos"]["nacional"]["kappa"]
    for rid in ("PE",) + cp.DEPARTAMENTOS:
        ok = calc[rid] == congelados[rid]
        emit(f"  {rid:6s} {cp.NOMBRES[rid]:14s} calculado {calc[rid]!r:22s} congelado {congelados[rid]!r:22s} "
             f"{'OK' if ok else 'DISTINTO'}")
        if not ok:
            malos.append(rid)
    if malos:
        raise Detener(f"kappa distintos de los congelados en {malos}. Se detiene todo y se revisa con Aldo.")
    emit("  26 de 26 kappa iguales a los congelados")


# ---------------------------------------------------------------------------
# 4. Metricas de test
# ---------------------------------------------------------------------------
def build_validation_test(series, kappas):
    regions = []
    for rid in ("PE", "PE-SIN-25") + cp.DEPARTAMENTOS:
        info = kappas["regions"][rid]
        months = cp._months(series, rid, "test")
        modis = [series[rid][m]["modis"] for m in months]
        est = {"B0": [series[rid][m]["viirs"] for m in months],
               "B1": [cp.b1_month(series, kappas["regions"], rid, m) for m in months]}
        suma = sum(x for x in modis if cp._valid(x))
        entry = {"region_id": rid, "estrato": info["estrato"]}
        if rid == "PE-25":
            entry["nota"] = "test ya visto en T29 (piloto Ucayali); no es una evaluación ciega"
        elif rid == "PE":
            entry["nota"] = "incluye a Ucayali (PE-25), cuyo test ya se vio en T29; el resultado limpio es PE-SIN-25"
        if suma < cp.MIN_MODIS_REPORTE:
            entry["reportable"] = False
            entry["motivo"] = (f"Σ MODIS en test = {int(suma)}, por debajo del mínimo de "
                               f"{cp.MIN_MODIS_REPORTE} (DECISIONS.md §11.3)")
        else:
            entry["reportable"] = True
            entry["methods"] = {}
            for meth in ("B0", "B1"):
                mt = _met.compute_metrics(modis, est[meth])
                block = {"split": "test", "metrics": {k: mt[k] for k in ("mae", "wape", "bias")},
                         "n_months_matched": mt["n_months_matched"]}
                res = _met.monthly_residuals(months, modis, est[meth])
                if res:
                    block["residuals"] = res
                else:
                    block["detalle_mensual"] = "no disponible"
                entry["methods"][meth] = block
        regions.append(entry)
    return {"contract_version": "1.1", "split": "test", "regions": regions}


def referencia_kappa_nacional(series, kappas):
    """§11.3 / P11: PE con VIIRS x kappa nacional, solo como referencia."""
    nac = kappas["estratos"]["nacional"]["kappa"]
    months = cp._months(series, "PE", "test")
    modis = [series["PE"][m]["modis"] for m in months]
    est = [series["PE"][m]["viirs"] * nac if cp._valid(series["PE"][m]["viirs"]) else None for m in months]
    mt = _met.compute_metrics(modis, est)
    return {"nota": "B1 de PE como VIIRS × κ nacional. Solo referencia: la estimación de PE es la suma de los B1 departamentales.",
            "kappa": nac, "n_months_matched": mt["n_months_matched"],
            **{k: mt[k] for k in ("mae", "wape", "bias")}}


def calibrated_with_residuals(series, kappas):
    rows = cp.build_calibrated(series, kappas)
    cp.verificar_sumas(series, kappas, rows)
    for r in rows:
        if r["split"] == "test" and r["status"] == "ok":
            mo = series[r["region_id"]][f"{r['year']:04d}-{r['month']:02d}"]["modis"]
            r["residual"] = r["value"] - mo if cp._valid(mo) else None
    return rows


# ---------------------------------------------------------------------------
def run(full_csv, out_dir, autorizacion, p07_csv, sha_full=SHA_SERIE_FULL, sha_p07=SHA_SERIE_P07,
        emit=print):
    log = []

    def say(msg):
        log.append(msg)
        emit(msg)

    hechas = [f for f in SALIDAS if os.path.exists(os.path.join(out_dir, f))]
    if hechas:
        raise Detener(f"{out_dir} ya tiene resultados ({hechas}). El test se corre una sola vez.")
    congelados = leer_autorizacion(autorizacion)
    say("autorizacion P12: AUTORIZADO")
    for line in verificar_serie(full_csv, p07_csv, sha_full, sha_p07):
        say(line)
    series = load_series_full(full_csv)
    kappas = cp.fit_kappas(series)
    comprobar_kappas(kappas, congelados, say)          # antes de cualquier metrica
    say("calculando metricas de test...")
    validation = build_validation_test(series, kappas)
    rows = calibrated_with_residuals(series, kappas)
    resumen = {
        "periodo_test": f"{TEST_START}:{TEST_END}",
        "serie_entrada_sha256": sha_full,
        "referencia_kappa_nacional": {"PE": referencia_kappa_nacional(series, kappas)},
        "reportables": [r["region_id"] for r in validation["regions"] if r["reportable"]],
        "no_reportables": {r["region_id"]: r["motivo"] for r in validation["regions"] if not r["reportable"]},
        "resultado_limpio": "PE-SIN-25",
        "advertencia": "El test de PE-25 (Ucayali) ya se vio en T29; PE lo incluye.",
    }
    os.makedirs(out_dir, exist_ok=True)
    cp._dump(validation, os.path.join(out_dir, "validation.json"))
    cp._write_calibrated(rows, os.path.join(out_dir, "calibrated_series.csv"))
    cp._dump(resumen, os.path.join(out_dir, "resumen_test.json"))
    say("salidas: validation.json, calibrated_series.csv, resumen_test.json, corrida.log")
    with open(os.path.join(out_dir, "corrida.log"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(log) + "\n")
    return validation, resumen


def main(argv=None):
    import argparse

    p = argparse.ArgumentParser(description="P14: corrida unica del test nacional Peru")
    p.add_argument("full_csv", help="docs/peru/test/monthly_series_full.csv (P13)")
    p.add_argument("--out", default="docs/peru/test")
    p.add_argument("--autorizacion", default="docs/peru/AUTORIZACION_TEST.md")
    p.add_argument("--p07", default="docs/peru/ejemplo/monthly_series.csv")
    a = p.parse_args(argv)
    try:
        run(a.full_csv, a.out, a.autorizacion, a.p07)
    except Detener as e:
        print(f"DETENIDO: {e}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
