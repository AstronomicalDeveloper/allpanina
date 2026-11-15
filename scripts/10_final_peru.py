"""P17 — Archivos finales de Peru en frontend/public/data/peru/ (contrato v1.1, D, E y F).

- calibrated_series.csv y validation.json: copia byte a byte de docs/peru/test/ (P14), los
  mismos archivos que Aldo firmo en P15 (docs/peru/RESULTADO_TEST.md). Se comprueba su SHA-256.
- method.json: parte del method.json aprobado en P11 (docs/peru/valid/) y agrega:
  estado final, resultados de test por region, la referencia con kappa nacional en valid y en
  test, y las limitaciones de RESULTADO_TEST.md §4. Los kappa, estratos y resultados de
  validacion no se tocan.

No calcula ninguna metrica nueva: todo sale de validation.json (test) y del method.json de P11.

Uso:
    python scripts/10_final_peru.py
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil

# Firmados por Aldo en P15 (docs/peru/RESULTADO_TEST.md §7).
SHA_FIRMADOS = {
    "validation.json": "b2b259928bf830abfdcc53641693343c82699f0dc9738f8fe60644677c7f1d1e",
    "calibrated_series.csv": "5eb84f1675f826544dc978df6de210630443024aa9a16bf97eb535e0c4a67458",
}
# method.json aprobado en P11 (docs/peru/AUTORIZACION_TEST.md §3).
SHA_METHOD_P11 = "51045b2f36188c0393f391f9b5a13cbbf865befaa33de601ebb31875bbff2110"

ESTADO = "aprobado por Aldo (P11 y P15)"
PERIODO_TEST = "2025-01:2026-07"
EVALUACION = ("corrida única el 15-nov-2026 con los κ congelados (DECISIONS.md §12), autorizada en "
              "docs/peru/AUTORIZACION_TEST.md; resultado verificado y firmado por Aldo en docs/peru/RESULTADO_TEST.md")

# RESULTADO_TEST.md §4 (firmado en P15) y limitaciones que el test vuelve obsoletas.
LIMITACIONES_TEST = [
    "κ fijo con 2013-2022 no sigue un cambio de régimen de MODIS: la razón anual MODIS/VIIRS de PE fue 0.222 a 0.286 entre 2013 y 2024, 0.191 en 2025 y 0.176 en 2026 (ene-jul). En el test B1 quedó por encima de MODIS en los 19 meses, en PE y en PE-SIN-25. Los resultados de 2025-2026 no deben leerse como la precisión normal del método; para usar B1 hacia adelante hay que recalibrar y volver a validar.",
    "Hipótesis no probada: la deriva orbital de Terra y Aqua afecta el muestreo del ciclo diurno y el tamaño y espaciado de píxel de MODIS (L. Giglio, LANCE UWG, mayo de 2025); es compatible con la caída de la razón MODIS/VIIRS, pero no se probó que sea la causa.",
    "Hubo mucha menos actividad en el test: MODIS promedio mensual de PE bajó de 1,349 celdas-día en validación a 467 en test. El WAPE se infla por el denominador pequeño (WAPE B1 de PE-SIN-25: 0.122 en validación, 0.326 en test), aunque el MAE de PE bajó (164.0 a 143.8). Con MODIS bajo, departamentos de poca actividad (Pasco, Huánuco, Amazonas, Piura) dan WAPE altos aunque el MAE sea de pocas celdas-día.",
    "PE-25 (Ucayali) no es una evaluación ciega: su test ya se vio en T29. PE tampoco lo es del todo; la lectura principal de generalización es PE-SIN-25.",
    "4 departamentos no llegan al mínimo de Σ MODIS ≥ 50 en test y no tienen métricas de test (Callao, Moquegua, Tacna, Tumbes); sus meses sí cuentan dentro de PE y PE-SIN-25 (DECISIONS.md §11.3).",
    "VIIRS S-NPP: FIRMS dejó de producir datos nuevos el 2 de noviembre de 2026, a las 13:00 UTC (NASA Earthdata, «Transitioning from Suomi NPP VIIRS»). La serie hasta 2026-07 no se afecta; cualquier actualización necesita otro VIIRS.",
    "Un error retrospectivo de B1 no es un porcentaje de confianza para meses futuros.",
]
REEMPLAZADAS = ("VIIRS S-NPP: NOAA anunció",          # sustituida por la del cese ya ocurrido
                "El test de Ucayali (PE-25) ya se vio")  # sustituida por la de evaluación no ciega


def sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def _r3(x):
    return None if x is None else round(x, 3)


def resultados_test(validation):
    out, no = {}, {}
    for r in validation["regions"]:
        if not r["reportable"]:
            no[r["region_id"]] = r["motivo"]
            continue
        b1 = r["methods"]["B1"]
        entry = {"periodo": PERIODO_TEST, "n_meses": b1["n_months_matched"],
                 "suma_modis": int(round(sum(x["modis_observed"] for x in b1["residuals"])))}
        for m in ("B0", "B1"):
            entry[m] = {k: _r3(r["methods"][m]["metrics"][k]) for k in ("mae", "wape", "bias")}
        if "nota" in r:
            entry["nota"] = r["nota"]
        out[r["region_id"]] = entry
    return out, no


def build_method(method_p11, validation, resumen):
    m = json.loads(json.dumps(method_p11))  # copia
    m["estado"] = ESTADO
    test, no_rep = resultados_test(validation)
    ref_valid = method_p11["resultados"]["referencia_kappa_nacional"]["PE"]
    ref_test = resumen["referencia_kappa_nacional"]["PE"]
    m["resultados"] = {
        "valid": method_p11["resultados"]["valid"],
        "test": test,
        "test_no_reportables": no_rep,
        "test_evaluacion": EVALUACION,
        "resultado_limpio": "PE-SIN-25",
        "referencia_kappa_nacional": {
            "nota": "B1 de PE como VIIRS × κ nacional. Solo referencia: la estimación de PE es la suma de los B1 departamentales.",
            "valid": ref_valid,
            "test": {"periodo": PERIODO_TEST, "kappa": ref_test["kappa"],
                     **{k: _r3(ref_test[k]) for k in ("mae", "wape", "bias")}},
        },
        "metodo_elegido": "B1 estratificado (DECISIONS.md §11.2 y §12)",
    }
    base = [x for x in method_p11["limitations"] if not x.startswith(REEMPLAZADAS)]
    m["limitations"] = base + LIMITACIONES_TEST
    return m


def run(root, out_rel="frontend/public/data/peru"):
    test_dir = os.path.join(root, "docs", "peru", "test")
    for name, sha in SHA_FIRMADOS.items():
        got = sha256(os.path.join(test_dir, name))
        if got != sha:
            raise SystemExit(f"{name}: SHA-256 {got} no es el firmado en P15 ({sha}).")
    mp = os.path.join(root, "docs", "peru", "valid", "method.json")
    if sha256(mp) != SHA_METHOD_P11:
        raise SystemExit("docs/peru/valid/method.json no es el aprobado en P11.")
    with open(mp, encoding="utf-8") as f:
        method_p11 = json.load(f)
    with open(os.path.join(test_dir, "validation.json"), encoding="utf-8") as f:
        validation = json.load(f)
    with open(os.path.join(test_dir, "resumen_test.json"), encoding="utf-8") as f:
        resumen = json.load(f)
    out = os.path.join(root, out_rel)
    os.makedirs(out, exist_ok=True)
    for name in SHA_FIRMADOS:
        shutil.copyfile(os.path.join(test_dir, name), os.path.join(out, name))
    method = build_method(method_p11, validation, resumen)
    with open(os.path.join(out, "method.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(method, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return {n: sha256(os.path.join(out, n)) for n in ("calibrated_series.csv", "validation.json", "method.json")}


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for name, sha in run(root).items():
        print(f"frontend/public/data/peru/{name}  {sha}")


if __name__ == "__main__":
    main()
