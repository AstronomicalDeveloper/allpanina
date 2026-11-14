"""T13/T14 — Calibracion B0/B1.

B0 = VIIRS sin factor.
B1 = VIIRS * factor, con factor = suma(MODIS train) / suma(VIIRS train),
usando solo meses donde ambos valores existen. El factor se ajusta SOLO con
filas split == "train" (sin fuga temporal hacia valid/test).
Valores faltantes se representan con None; nunca se rellenan con 0.
"""
from __future__ import annotations


def _valid(x) -> bool:
    return x is not None and x == x  # excluye None y NaN


def fit_factor(modis, viirs):
    """Factor MODIS/VIIRS. None si no hay meses validos o suma(VIIRS) == 0."""
    pairs = [(m, v) for m, v in zip(modis, viirs) if _valid(m) and _valid(v)]
    if not pairs:
        return None
    sum_viirs = sum(v for _, v in pairs)
    if sum_viirs == 0:
        return None
    return sum(m for m, _ in pairs) / sum_viirs


def fit_factor_on_train(rows):
    """Ajusta el factor solo con filas de train. rows: dicts con modis, viirs, split."""
    train = [r for r in rows if r.get("split") == "train"]
    return fit_factor([r["modis"] for r in train], [r["viirs"] for r in train])


def apply_b0(viirs):
    return list(viirs)


def apply_b1(viirs, factor):
    if factor is None:
        raise ValueError("B1 no estimable: factor indefinido (sin meses train validos o VIIRS=0)")
    return [v * factor if _valid(v) else v for v in viirs]


# Cortes congelados en DECISIONS.md (T04, secciones 3 y 4):
# periodo 2013-01:2026-07; train 2013-01:2022-12, valid 2023-01:2024-12, test 2025-01:2026-07
PERIOD_START = "2013-01"
TRAIN_END = "2022-12"
VALID_END = "2024-12"
PERIOD_END = "2026-07"


def assign_split(month: str, train_end: str = TRAIN_END, valid_end: str = VALID_END,
                 period_start: str = PERIOD_START, period_end: str = PERIOD_END):
    """T14: split por fecha ('YYYY-MM'). Sin fuga: train <= train_end < valid <= valid_end < test.

    Meses fuera del periodo de referencia (antes de 2013-01 o despues de 2026-07) devuelven
    None: no pertenecen a ningun split y no entran al ajuste ni a la serie calibrada.
    """
    if month < period_start or month > period_end:
        return None
    if month <= train_end:
        return "train"
    if month <= valid_end:
        return "valid"
    return "test"


def build_calibrated_series(rows, factor, region_id):
    """T22: filas para calibrated_series.csv segun docs/contrato_datos.md.

    rows: dicts con year, month (int), modis, viirs, split.
    Columnas: region_id, year, month, method, value, split, status, residual.
    value faltante = None (celda vacia), con status explicito; nunca NaN ni 0 inventado.
    residual (= value - modis) solo en filas de test; vacio (None) en las demas.
    """
    out = []
    for r in rows:
        for method in ("B0", "B1"):
            if not _valid(r["viirs"]):
                value, status = None, "sin_dato_viirs"
            elif method == "B1" and factor is None:
                value, status = None, "b1_no_estimable"
            else:
                value = r["viirs"] if method == "B0" else r["viirs"] * factor
                status = "ok"
            residual = None
            if r["split"] == "test" and value is not None and _valid(r["modis"]):
                residual = value - r["modis"]
            out.append({"region_id": region_id, "year": r["year"], "month": r["month"],
                        "method": method, "value": value, "split": r["split"],
                        "status": status, "residual": residual})
    return out


# ---------------------------------------------------------------------------
# Ejecucion de punta a punta (T21/T22): monthly_series.csv -> salidas del contrato
# ---------------------------------------------------------------------------
def load_monthly_series(path):
    """Lee monthly_series.csv (contrato) y devuelve (region_id, filas con modis/viirs/split).

    cell_days vacio o status != 'ok' se trata como faltante (None), nunca como 0.
    """
    import csv

    cells = {}
    region_id = None
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            region_id = region_id or r["region_id"]
            key = (int(r["year"]), int(r["month"]))
            ok = r.get("status") == "ok" and r["cell_days"] not in ("", None)
            val = float(r["cell_days"]) if ok else None
            sensor = "modis" if r["sensor_group"].upper() == "MODIS" else "viirs"
            cells.setdefault(key, {"modis": None, "viirs": None})[sensor] = val
    rows = []
    for (y, m), v in sorted(cells.items()):
        split = assign_split(f"{y:04d}-{m:02d}")
        if split is None:  # fuera de 2013-01:2026-07 (ej. 2012): no entra al metodo
            continue
        rows.append({"year": y, "month": m, "modis": v["modis"], "viirs": v["viirs"],
                     "split": split})
    return region_id, rows


def run(monthly_csv, out_dir, split="valid"):
    """Ajusta B1 en train, escribe calibrated_series.csv y validation.json (split valid por defecto)."""
    import csv
    import importlib
    import json
    import os

    met = importlib.import_module("scripts.07_metrics_export")
    region_id, rows = load_monthly_series(monthly_csv)
    if split != "test":
        # Test reservado (DECISIONS.md): sin autorizacion T29 no se escriben valores ni
        # residuos de test en ninguna salida, aunque la serie de entrada los traiga.
        rows = [r for r in rows if r["split"] != "test"]
    factor = fit_factor_on_train(rows)
    calibrated = build_calibrated_series(rows, factor, region_id)
    modis = {f"{r['year']:04d}-{r['month']:02d}": r["modis"] for r in rows}
    validation = met.build_validation(calibrated, modis, region_id, split=split)

    os.makedirs(out_dir, exist_ok=True)
    cols = ["region_id", "year", "month", "method", "value", "split", "status", "residual"]
    with open(os.path.join(out_dir, "calibrated_series.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in calibrated:
            w.writerow({k: ("" if r[k] is None else r[k]) for k in cols})
    with open(os.path.join(out_dir, "validation.json"), "w", encoding="utf-8") as f:
        json.dump(validation, f, ensure_ascii=False, indent=2)
    return factor, validation


def main(argv=None):
    import argparse

    p = argparse.ArgumentParser(description="Calibracion B0/B1 -> calibrated_series.csv + validation.json")
    p.add_argument("monthly_csv")
    p.add_argument("--out", default="data/processed")
    p.add_argument("--split", choices=["valid", "test"], default="valid")
    p.add_argument("--autorizado-aldo-antonella", action="store_true",
                   help="Requerido para --split test (T29, una sola vez).")
    a = p.parse_args(argv)
    if a.split == "test" and not a.autorizado_aldo_antonella:
        raise SystemExit("El test esta reservado: requiere autorizacion conjunta de Aldo y Antonella (T29).")
    factor, _ = run(a.monthly_csv, a.out, a.split)
    print(f"factor B1 = {factor}; salidas en {a.out} (split={a.split})")


if __name__ == "__main__":
    main()
