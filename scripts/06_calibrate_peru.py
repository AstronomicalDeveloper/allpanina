"""P09/P10 — Calibracion B0/B1 por estrato para la extension Peru.

Reglas (DECISIONS.md §11.2 y §11.3, contrato v1.1 secciones D, E y F):
- kappa = suma(MODIS train) / suma(VIIRS train), SOLO con train 2013-01..2022-12.
- 17 departamentos con kappa propio; 8 en un estrato agrupado con un solo kappa
  (suma de los 8); PE con kappa nacional (suma de los 25).
- B0 = VIIRS. B1 = VIIRS * kappa del estrato de la region.
- B1 de PE = suma de los B1 de los 25 departamentos; B1 de PE-SIN-25 = suma de los B1 de los
  24 departamentos sin PE-25 (contrato v1.1 D). El kappa nacional solo es la alternativa (b)
  de §11.3 y la referencia en method.json; ya no se aplica a PE ni a PE-SIN-25.
- B0 de PE-SIN-25 = VIIRS(PE) - VIIRS(PE-25); MODIS(PE-SIN-25) = MODIS(PE) - MODIS(PE-25).
- Una region se reporta en un split si suma(MODIS) en ese split >= 50 celdas-dia.
- Este script no acepta meses de test (2025-01 en adelante): el test es P14 y
  necesita la autorizacion escrita de P12.

Uso:
    python scripts/06_calibrate_peru.py data/processed/peru/monthly_series.csv --out docs/peru/valid
    python scripts/06_calibrate_peru.py ... --solo-kappa      # P09: sin metricas de validacion
"""
from __future__ import annotations

import csv
import importlib.util
import json
import os

DEPARTAMENTOS = tuple(f"PE-{i:02d}" for i in range(1, 26))
NOMBRES = {
    "PE": "Perú", "PE-SIN-25": "Perú sin Ucayali",
    "PE-01": "Amazonas", "PE-02": "Áncash", "PE-03": "Apurímac", "PE-04": "Arequipa",
    "PE-05": "Ayacucho", "PE-06": "Cajamarca", "PE-07": "Callao", "PE-08": "Cusco",
    "PE-09": "Huancavelica", "PE-10": "Huánuco", "PE-11": "Ica", "PE-12": "Junín",
    "PE-13": "La Libertad", "PE-14": "Lambayeque", "PE-15": "Lima", "PE-16": "Loreto",
    "PE-17": "Madre de Dios", "PE-18": "Moquegua", "PE-19": "Pasco", "PE-20": "Piura",
    "PE-21": "Puno", "PE-22": "San Martín", "PE-23": "Tacna", "PE-24": "Tumbes",
    "PE-25": "Ucayali",
}
# Congelado en DECISIONS.md §11.2 (P02). No se recalcula con los datos.
ESTRATO_AGRUPADO = ("PE-04", "PE-07", "PE-09", "PE-11", "PE-15", "PE-18", "PE-23", "PE-24")
ESTRATO_PROPIO = tuple(d for d in DEPARTAMENTOS if d not in ESTRATO_AGRUPADO)
# Alternativa (c) de §11.3: kappa congelado del piloto (DECISIONS.md §10, method.json v1.0).
KAPPA_UCAYALI_PILOTO = 0.2936037257560573
MIN_MODIS_REPORTE = 50  # §11.3 regla 1
# Agregados cuya estimacion B1 es la suma de los B1 departamentales (contrato v1.1 D).
AGREGADOS = {"PE": DEPARTAMENTOS, "PE-SIN-25": tuple(d for d in DEPARTAMENTOS if d != "PE-25")}

TRAIN_END = "2022-12"
VALID_END = "2024-12"
PERIOD_START = "2013-01"


def _load(name, filename):
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_met = _load("allpanina_metrics_export", "07_metrics_export.py")


def _valid(x) -> bool:
    return x is not None and x == x


def estrato_de(region_id):
    if region_id in ("PE", "PE-SIN-25"):
        return "nacional"
    if region_id in ESTRATO_AGRUPADO:
        return "agrupado"
    if region_id in ESTRATO_PROPIO:
        return "propio"
    raise ValueError(f"region_id desconocido: {region_id}")


def split_de(month):
    if month < PERIOD_START:
        return None
    if month <= TRAIN_END:
        return "train"
    if month <= VALID_END:
        return "valid"
    return "test"


# ---------------------------------------------------------------------------
# Lectura
# ---------------------------------------------------------------------------
def load_series(path):
    """Lee peru/monthly_series.csv -> {region_id: {"YYYY-MM": {"modis", "viirs"}}}.

    status != ok o cell_days vacio -> None (nunca 0). Falla si trae meses de test.
    """
    out = {}
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            month = f"{int(r['year']):04d}-{int(r['month']):02d}"
            if split_de(month) == "test":
                raise ValueError(
                    f"La serie trae {month}, que es test. P09/P10 solo usan 2013-01 a 2024-12 "
                    "(DECISIONS.md §11, test reservado para P14).")
            if split_de(month) is None:
                continue
            ok = r.get("status") == "ok" and r["cell_days"] not in ("", None)
            sensor = "modis" if r["sensor_group"].upper() == "MODIS" else "viirs"
            cell = out.setdefault(r["region_id"], {}).setdefault(month, {"modis": None, "viirs": None})
            cell[sensor] = float(r["cell_days"]) if ok else None
    faltan = [rid for rid in ("PE",) + DEPARTAMENTOS if rid not in out]
    if faltan:
        raise ValueError(f"Faltan regiones en la serie: {faltan}")
    return out


def add_pe_sin_25(series):
    """PE-SIN-25 = PE - PE-25, mes a mes y por sensor (None si falta alguno)."""
    pe, uca = series["PE"], series["PE-25"]
    sin = {}
    for month, v in pe.items():
        u = uca.get(month, {"modis": None, "viirs": None})
        sin[month] = {s: (v[s] - u[s] if _valid(v[s]) and _valid(u[s]) else None)
                      for s in ("modis", "viirs")}
    series = dict(series)
    series["PE-SIN-25"] = sin
    return series


def b1_month(series, kappas_regions, rid, month):
    """Estimacion B1 de una region en un mes.

    Departamento: VIIRS * kappa de su estrato. PE y PE-SIN-25: suma de los B1 de sus
    departamentos; None si falta alguno (nunca se suma un faltante como 0).
    """
    if rid in AGREGADOS:
        parts = [b1_month(series, kappas_regions, d, month) for d in AGREGADOS[rid]]
        return None if any(p is None for p in parts) else sum(parts)
    v = series[rid].get(month, {}).get("viirs")
    k = kappas_regions[rid]["kappa"]
    return v * k if _valid(v) and k is not None else None


# ---------------------------------------------------------------------------
# P09: kappa por estrato, solo train
# ---------------------------------------------------------------------------
def train_sums(series, regions):
    """Suma MODIS y VIIRS de train sobre meses con los dos sensores validos."""
    sm = sv = 0.0
    meses = set()
    for rid in regions:
        for month, v in series[rid].items():
            if split_de(month) == "train" and _valid(v["modis"]) and _valid(v["viirs"]):
                sm += v["modis"]
                sv += v["viirs"]
                meses.add(month)
    return {"suma_modis_train": int(sm), "suma_viirs_train": int(sv), "meses_train": len(meses)}


def _kappa(sums):
    return sums["suma_modis_train"] / sums["suma_viirs_train"] if sums["suma_viirs_train"] else None


def kappa_anual(series, rid):
    """kappa de cada anio de train para una region; None si suma(MODIS) = 0 en todo train."""
    anual = {}
    for month, v in series[rid].items():
        if split_de(month) == "train" and _valid(v["modis"]) and _valid(v["viirs"]):
            a = anual.setdefault(month[:4], [0.0, 0.0])
            a[0] += v["modis"]
            a[1] += v["viirs"]
    vals = {y: m / s for y, (m, s) in sorted(anual.items()) if s > 0}
    if not vals or all(x == 0 for x in vals.values()):
        return {"por_anio": vals, "rango": None}
    return {"por_anio": vals, "rango": [min(vals.values()), max(vals.values())]}


def fit_kappas(series):
    """Devuelve el kappa que usa cada region (26 + PE-SIN-25) y los de cada estrato."""
    agr = train_sums(series, ESTRATO_AGRUPADO)
    nac = train_sums(series, ("PE",))
    out = {"estratos": {
        "agrupado": {"miembros": list(ESTRATO_AGRUPADO), "kappa": _kappa(agr), "kappa_inputs": agr},
        "nacional": {"region_id": "PE", "kappa": _kappa(nac), "kappa_inputs": nac},
    }, "regions": {}}
    for rid in ("PE",) + DEPARTAMENTOS:
        propios = train_sums(series, (rid,))
        est = estrato_de(rid)
        if est == "propio":
            k, inputs = _kappa(propios), propios
        elif est == "agrupado":
            k, inputs = out["estratos"]["agrupado"]["kappa"], agr
        else:
            k, inputs = out["estratos"]["nacional"]["kappa"], nac
        out["regions"][rid] = {"estrato": est, "kappa": k, "kappa_inputs": inputs,
                               "sumas_propias_train": propios}
    # PE-SIN-25 no usa el kappa nacional: su B1 es la suma de 24 departamentos. Su kappa
    # (solo informativo) es el efectivo en train: suma(B1) / suma(VIIRS) sobre los mismos meses.
    sin = train_sums(series, ("PE-SIN-25",))
    sb = sv = 0.0
    for month, v in series["PE-SIN-25"].items():
        b1 = b1_month(series, out["regions"], "PE-SIN-25", month)
        if split_de(month) == "train" and _valid(v["viirs"]) and _valid(v["modis"]) and b1 is not None:
            sb += b1
            sv += v["viirs"]
    out["regions"]["PE-SIN-25"] = {"estrato": "nacional", "kappa": sb / sv if sv else None,
                                   "kappa_inputs": sin}
    return out


# ---------------------------------------------------------------------------
# Serie calibrada (contrato v1.1 D)
# ---------------------------------------------------------------------------
def build_calibrated(series, kappas):
    rows = []
    for rid in ("PE",) + DEPARTAMENTOS:
        for month in sorted(series[rid]):
            v = series[rid][month]["viirs"]
            b1 = b1_month(series, kappas["regions"], rid, month)
            for method in ("B0", "B1"):
                value = v if method == "B0" else b1
                status = "ok" if _valid(value) else "missing"
                value = value if status == "ok" else None
                rows.append({"region_id": rid, "year": int(month[:4]), "month": int(month[5:]),
                             "method": method, "value": value, "split": split_de(month),
                             "status": status, "residual": None})
    return rows


# ---------------------------------------------------------------------------
# P10: validacion (contrato v1.1 E) y comparacion de alternativas (§11.3 regla 4)
# ---------------------------------------------------------------------------
def _months(series, rid, split):
    return [m for m in sorted(series[rid]) if split_de(m) == split]


def region_metrics(series, rid, kappa, split="valid", kappas=None):
    """Metricas B0/B1 de una region en un split.

    Para un departamento, B1 = VIIRS * kappa. Para PE y PE-SIN-25 (rid en AGREGADOS), B1 es la
    suma de los B1 de sus departamentos y hay que pasar `kappas` (salida de fit_kappas).
    """
    months = _months(series, rid, split)
    modis = [series[rid][m]["modis"] for m in months]
    viirs = [series[rid][m]["viirs"] for m in months]
    if rid in AGREGADOS:
        b1 = [b1_month(series, kappas["regions"], rid, m) for m in months]
    else:
        b1 = [v * kappa if _valid(v) and kappa is not None else None for v in viirs]
    return {"months": months, "suma_modis": sum(x for x in modis if _valid(x)),
            "B0": _met.compute_metrics(modis, viirs), "B1": _met.compute_metrics(modis, b1)}


def build_validation(series, kappas, split="valid"):
    if split != "valid":
        raise ValueError("Este script solo valida (P10). El test es P14, con autorizacion.")
    regions = []
    for rid in ("PE", "PE-SIN-25") + DEPARTAMENTOS:
        info = kappas["regions"][rid]
        r = region_metrics(series, rid, info["kappa"], split, kappas)
        entry = {"region_id": rid, "estrato": info["estrato"]}
        if r["suma_modis"] < MIN_MODIS_REPORTE:
            entry["reportable"] = False
            entry["motivo"] = (f"Σ MODIS en {split} = {int(r['suma_modis'])}, por debajo del "
                               f"mínimo de {MIN_MODIS_REPORTE} (DECISIONS.md §11.3)")
        else:
            entry["reportable"] = True
            entry["methods"] = {
                m: {"split": split,
                    "metrics": {k: r[m][k] for k in ("mae", "wape", "bias")},
                    "n_months_matched": r[m]["n_months_matched"]}
                for m in ("B0", "B1")}
        regions.append(entry)
    return {"contract_version": "1.1", "split": split, "regions": regions}


def compare_alternatives(series, kappas, split="valid"):
    """§11.3 regla 4: WAPE agregado de los 25 departamentos = suma|error| / suma MODIS."""
    nac = kappas["estratos"]["nacional"]["kappa"]
    alts = {
        "a_estratificada": {d: kappas["regions"][d]["kappa"] for d in DEPARTAMENTOS},
        "b_kappa_nacional": {d: nac for d in DEPARTAMENTOS},
        "c_kappa_ucayali": {d: KAPPA_UCAYALI_PILOTO for d in DEPARTAMENTOS},
        "B0_sin_calibrar": {d: 1.0 for d in DEPARTAMENTOS},
    }
    out = {}
    for name, kmap in alts.items():
        abs_err = err = sm = 0.0
        n = 0
        for d in DEPARTAMENTOS:
            for m in _months(series, d, split):
                mo, vi = series[d][m]["modis"], series[d][m]["viirs"]
                if _valid(mo) and _valid(vi) and kmap[d] is not None:
                    e = vi * kmap[d] - mo
                    abs_err += abs(e)
                    err += e
                    sm += mo
                    n += 1
        # Informativo (§11.3 regla 4): PE con estimacion nacional = suma de los B1 departamentales.
        pe_mod, pe_est = [], []
        for m in _months(series, "PE", split):
            vals = [(series[d][m]["viirs"], kmap[d]) for d in DEPARTAMENTOS]
            ok = all(_valid(v) and k is not None for v, k in vals)
            pe_est.append(sum(v * k for v, k in vals) if ok else None)
            pe_mod.append(series["PE"][m]["modis"])
        pe_met = _met.compute_metrics(pe_mod, pe_est)
        out[name] = {"wape_agregado": abs_err / sm if sm else None, "suma_abs_error": abs_err,
                     "suma_error": err, "suma_modis": sm, "n_region_meses": n,
                     "informativo_PE_suma_departamentos": {k: pe_met[k] for k in ("mae", "wape", "bias")}}
    wa, wb, wc = (out[k]["wape_agregado"] for k in ("a_estratificada", "b_kappa_nacional", "c_kappa_ucayali"))
    gana = wa < wb and wa < wc
    elegida = min(("a_estratificada", "b_kappa_nacional", "c_kappa_ucayali"),
                  key=lambda k: out[k]["wape_agregado"])
    # Informativo (§11.3 regla 4), no decide: en cuantas regiones reportables (a) tiene menor WAPE que (b).
    mejora = []
    for d in DEPARTAMENTOS:
        r = region_metrics(series, d, None, split)
        if r["suma_modis"] < MIN_MODIS_REPORTE:
            continue
        wa_d = region_metrics(series, d, kappas["regions"][d]["kappa"], split)["B1"]["wape"]
        wb_d = region_metrics(series, d, nac, split)["B1"]["wape"]
        mejora.append({"region_id": d, "wape_estratificada": wa_d, "wape_nacional": wb_d,
                       "mejora": wa_d < wb_d})
    return {"split": split, "criterio": "DECISIONS.md §11.3 regla 4", "alternativas": out,
            "estratificada_gana_a_b_y_c": gana, "menor_wape_agregado": elegida,
            "informativo_por_region": mejora}


def verificar_sumas(series, kappas, rows):
    """Contrato v1.1 D: B1 de PE = suma de B1 de los 25 departamentos (mes a mes).

    Tambien comprueba que PE-SIN-25 = PE - PE-25 en B1. Falla si algun mes no coincide.
    """
    b1 = {(r["region_id"], r["year"], r["month"]): r["value"] for r in rows if r["method"] == "B1"}
    for month in series["PE"]:
        y, m = int(month[:4]), int(month[5:])
        parts = [b1[(d, y, m)] for d in DEPARTAMENTOS]
        pe = b1[("PE", y, m)]
        if any(p is None for p in parts):
            if pe is not None:
                raise AssertionError(f"PE B1 {month}: hay departamentos sin dato pero PE trae valor")
            continue
        if pe is None or abs(pe - sum(parts)) > 1e-6:
            raise AssertionError(f"PE B1 {month} = {pe} no es la suma de departamentos {sum(parts)}")
        sin = b1_month(series, kappas["regions"], "PE-SIN-25", month)
        if sin is None or abs(sin - (pe - b1[("PE-25", y, m)])) > 1e-6:
            raise AssertionError(f"PE-SIN-25 B1 {month} no es PE - PE-25")


# ---------------------------------------------------------------------------
# method.json (borrador, contrato v1.1 F)
# ---------------------------------------------------------------------------
def _limitaciones(validation, comp):
    """Limitaciones de method.json. Las cifras de validacion salen de los resultados, no se escriben a mano."""
    lim = [
        "El κ cambia de un departamento a otro (de 0.164 a 0.337 entre los de κ propio, en train).",
        "El κ también cambia de un año a otro dentro de cada región, y un κ fijo no sigue esos cambios; el rango anual de cada región está en regions[].kappa_anual_rango.",
    ]
    if validation is not None:
        by = {r["region_id"]: r for r in validation["regions"]}

        def w(rid):
            return by[rid]["methods"]["B1"]["metrics"]["wape"]

        def f(x):
            return f"{x:.2f}".replace(".", ",")
        lim.append(
            "El estrato agrupado (8 departamentos con poca actividad) tiene error alto en validación: "
            f"WAPE B1 de Arequipa {f(w('PE-04'))} y de Lima {f(w('PE-15'))}. Su κ propio es muy inestable año a año y se usa uno común para los 8.")
        if comp is not None:
            gana = [NOMBRES[x["region_id"]] for x in comp["informativo_por_region"] if not x["mejora"]]
            lim.append(
                f"El κ nacional único tiene menor WAPE que el κ estratificado en {len(gana)} departamentos en validación "
                f"({', '.join(gana)}); la estratificada gana en el agregado de los 25 y en los demás departamentos reportables.")
        sin = [NOMBRES[r["region_id"]] for r in validation["regions"] if not r["reportable"]]
        lim.append(
            f"{len(sin)} departamentos no llegan al mínimo de Σ MODIS ≥ 50 en validación y no tienen métricas propias "
            f"({', '.join(sin)}); sus meses sí cuentan dentro de PE y PE-SIN-25 (DECISIONS.md §11.3).")
    lim += [
        "Callao tiene Σ MODIS = 0 en train: no tiene κ propio y su κ anual no está definido.",
        "Las celdas cuyo centro cae fuera de los 25 polígonos INEI no cuentan (2,619 de 824,137 celdas-día entre 2013 y 2024, 0.3%).",
        "B1 se valida a escala región-mes. No debe aplicarse a celdas individuales del mapa.",
        "El indicador cuenta detecciones satelitales de anomalías térmicas, no incendios confirmados ni superficie quemada.",
        "VIIRS S-NPP: NOAA anunció el cese de entrega de todos los productos el 1 nov 2026; NASA indica cese de datos científicos nuevos el 2 nov 2026. El archivo histórico no se ve afectado.",
        "MODIS cambia de versión V6 a V6.1 en febrero de 2023, al inicio de validación.",
        "FIRMS no entrega cobertura de nubes: un mes con 0 detecciones puede reflejar ausencia de fuego o falta de observación.",
        "El test de Ucayali (PE-25) ya se vio en T29; el resultado nacional limpio es PE-SIN-25.",
    ]
    return lim


def build_method(kappas, series, pilot_method, validation=None, estado="borrador P09", comp=None):
    regions = []
    for rid in ("PE",) + DEPARTAMENTOS:
        info = kappas["regions"][rid]
        ka = kappa_anual(series, rid)["rango"]
        regions.append({"region_id": rid, "nombre": NOMBRES[rid], "estrato": info["estrato"],
                        "kappa": info["kappa"], "kappa_inputs": info["kappa_inputs"],
                        "kappa_anual_rango": ka})
    keep = ("indicator", "sensors", "products", "filters", "period_train", "period_valid",
            "period_test", "error_convention", "status_rule")
    m = {"contract_version": "1.1", "estado": estado, "region_id": "PE",
         "region": ("Perú (PE) = suma de los 25 departamentos INEI 2023. Cada celda de 1 km pertenece "
                    "al departamento que contiene su centro (docs/region/departamentos_inei_2023.geojson); "
                    "las celdas fuera de los 25 polígonos no cuentan.")}
    m.update({k: pilot_method[k] for k in keep if k in pilot_method})
    m["calibration"] = (
        "B0 = VIIRS sin factor. B1 = B0 × κ del estrato de la región, con κ = suma(cell_days MODIS "
        "en train) / suma(cell_days VIIRS en train), calculado una sola vez con train 2013-01:2022-12. "
        "17 departamentos usan su propio κ; 8 (PE-04, PE-07, PE-09, PE-11, PE-15, PE-18, PE-23, PE-24) "
        "usan el κ del estrato agrupado (suma de los 8). B1 de PE es la suma de los B1 de los 25 "
        "departamentos y B1 de PE-SIN-25 la suma de los 24 sin PE-25 (contrato v1.1 D); el κ nacional "
        "solo es la alternativa (b) de DECISIONS.md §11.3 y una referencia en resultados.")
    m["regions"] = regions
    m["estratos"] = {k: {kk: vv for kk, vv in v.items()} for k, v in kappas["estratos"].items()}
    if validation is not None:
        res = {}
        for r in validation["regions"]:
            if not r["reportable"]:
                continue
            rm = region_metrics(series, r["region_id"], kappas["regions"][r["region_id"]]["kappa"],
                                "valid", kappas)
            res[r["region_id"]] = {
                "periodo": "2023-01:2024-12", "n_meses": r["methods"]["B1"]["n_months_matched"],
                "suma_modis": int(rm["suma_modis"]),
                **{meth: {k: (None if r["methods"][meth]["metrics"][k] is None
                              else round(r["methods"][meth]["metrics"][k], 3))
                          for k in ("mae", "wape", "bias")} for meth in ("B0", "B1")}}
        m["resultados"] = {"valid": res, "test": "pendiente (P14, con autorización P12)"}
        # Referencia (contrato v1.1 D): PE con kappa nacional x VIIRS, solo informativa.
        nac = kappas["estratos"]["nacional"]["kappa"]
        months = _months(series, "PE", "valid")
        ref = _met.compute_metrics([series["PE"][x]["modis"] for x in months],
                                   [series["PE"][x]["viirs"] * nac if _valid(series["PE"][x]["viirs"]) else None
                                    for x in months])
        m["resultados"]["referencia_kappa_nacional"] = {
            "nota": "B1 de PE calculado como VIIRS × κ nacional. Solo referencia: la estimación de PE es la suma de los B1 departamentales.",
            "PE": {"periodo": "2023-01:2024-12", "kappa": nac,
                   **{k: (None if ref[k] is None else round(ref[k], 3)) for k in ("mae", "wape", "bias")}}}
    else:
        m["resultados"] = {"valid": "pendiente (P10)", "test": "pendiente (P14, con autorización P12)"}
    m["limitations"] = _limitaciones(validation, comp)
    return m


# ---------------------------------------------------------------------------
def _write_calibrated(rows, path):
    cols = ["region_id", "year", "month", "method", "value", "split", "status", "residual"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, lineterminator="\n")
        w.writeheader()
        for r in rows:
            w.writerow({k: ("" if r[k] is None else r[k]) for k in cols})


def _dump(obj, path):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def run(monthly_csv, out_dir, pilot_method_path, solo_kappa=False,
        estado="borrador P10, pendiente de revisión P11"):
    series = add_pe_sin_25(load_series(monthly_csv))
    kappas = fit_kappas(series)
    with open(pilot_method_path, encoding="utf-8") as f:
        pilot = json.load(f)
    os.makedirs(out_dir, exist_ok=True)
    if solo_kappa:
        _dump(build_method(kappas, series, pilot), os.path.join(out_dir, "method.json"))
        return kappas, None, None
    validation = build_validation(series, kappas, "valid")
    comp = compare_alternatives(series, kappas, "valid")
    rows = build_calibrated(series, kappas)
    verificar_sumas(series, kappas, rows)
    _write_calibrated(rows, os.path.join(out_dir, "calibrated_series.csv"))
    _dump(validation, os.path.join(out_dir, "validation.json"))
    _dump(comp, os.path.join(out_dir, "comparacion_alternativas.json"))
    _dump(build_method(kappas, series, pilot, validation, estado=estado, comp=comp),
          os.path.join(out_dir, "method.json"))
    return kappas, validation, comp


def main(argv=None):
    import argparse

    p = argparse.ArgumentParser(description="P09/P10 Peru: kappa por estrato y validacion 2023-2024")
    p.add_argument("monthly_csv")
    p.add_argument("--out", default="data/processed/peru/valid")
    p.add_argument("--pilot-method", default="frontend/public/data/method.json")
    p.add_argument("--solo-kappa", action="store_true", help="P09: solo kappa y method.json borrador")
    p.add_argument("--estado", default="borrador P10, pendiente de revisión P11",
                   help='campo "estado" de method.json (p. ej. "aprobado en P11" tras la firma de Aldo)')
    a = p.parse_args(argv)
    kappas, _, comp = run(a.monthly_csv, a.out, a.pilot_method, a.solo_kappa, a.estado)
    for rid in ("PE",) + DEPARTAMENTOS:
        r = kappas["regions"][rid]
        print(f"{rid:6s} {NOMBRES[rid]:14s} {r['estrato']:9s} kappa = {r['kappa']:.5f}")
    print(f"estrato agrupado kappa = {kappas['estratos']['agrupado']['kappa']:.5f}")
    if comp:
        for k, v in comp["alternativas"].items():
            print(f"{k:18s} WAPE agregado valid = {v['wape_agregado']:.4f}")
        print(f"estratificada gana a (b) y (c): {comp['estratificada_gana_a_b_y_c']}")
    print(f"salidas en {a.out}")


if __name__ == "__main__":
    main()
