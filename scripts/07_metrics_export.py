"""T13 — Metricas y residuos mensuales.

Convencion: signed_error = estimate - modis_observed.
WAPE = suma|error| / suma(MODIS); None si suma(MODIS) == 0.
Meses con algun valor faltante se excluyen y no cuentan en n_months_matched.
"""
from __future__ import annotations


def _valid(x) -> bool:
    return x is not None and x == x


def _pairs(modis, estimate):
    return [(m, e) for m, e in zip(modis, estimate) if _valid(m) and _valid(e)]


def compute_metrics(modis, estimate):
    pairs = _pairs(modis, estimate)
    n = len(pairs)
    if n == 0:
        return {"n_months_matched": 0, "mae": None, "wape": None, "bias": None}
    errors = [e - m for m, e in pairs]
    sum_modis = sum(m for m, _ in pairs)
    abs_sum = sum(abs(x) for x in errors)
    return {
        "n_months_matched": n,
        "mae": abs_sum / n,
        "wape": abs_sum / sum_modis if sum_modis != 0 else None,
        "bias": sum(errors) / n,
    }


def monthly_residuals(months, modis, estimate):
    """Residuos por mes, ordenados por error absoluto descendente."""
    out = []
    for month, m, e in zip(months, modis, estimate):
        if _valid(m) and _valid(e):
            out.append({
                "month": month,
                "modis_observed": m,
                "estimate": e,
                "signed_error": e - m,
                "absolute_error": abs(e - m),
            })
    return sorted(out, key=lambda r: r["absolute_error"], reverse=True)


def build_validation(calibrated_rows, modis_by_month, region_id, split="test"):
    """T22/T30: validation.json segun docs/contrato_datos.md.

    {"region_id", "methods": {"B0"|"B1": {"split", "metrics", "n_months_matched", "residuals"}}}
    calibrated_rows: salida de build_calibrated_series; modis_by_month: {"YYYY-MM": valor}.
    Residuos solo para split == "test", ordenados por error absoluto; si no hay,
    "detalle_mensual": "no disponible". No mezcla splits.
    ATENCION (DECISIONS.md): NO llamar con split="test" sobre datos reales hasta que
    Aldo y Antonella lo autoricen juntos (T29). Usar split="valid" mientras tanto.
    """
    methods = {}
    for method in ("B0", "B1"):
        rows = [r for r in calibrated_rows if r["method"] == method and r["split"] == split]
        months = [f"{r['year']:04d}-{r['month']:02d}" for r in rows]
        est = [r["value"] for r in rows]
        modis = [modis_by_month.get(m) for m in months]
        m = compute_metrics(modis, est)
        block = {"split": split,
                 "metrics": {"mae": m["mae"], "wape": m["wape"], "bias": m["bias"]},
                 "n_months_matched": m["n_months_matched"]}
        if split == "test":
            res = monthly_residuals(months, modis, est)
            if res:
                block["residuals"] = res
            else:
                block["detalle_mensual"] = "no disponible"
        methods[method] = block
    return {"region_id": region_id, "methods": methods}
