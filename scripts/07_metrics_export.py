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
        return {"n_months_matched": 0, "MAE": None, "WAPE": None, "sesgo": None}
    errors = [e - m for m, e in pairs]
    sum_modis = sum(m for m, _ in pairs)
    abs_sum = sum(abs(x) for x in errors)
    return {
        "n_months_matched": n,
        "MAE": abs_sum / n,
        "WAPE": abs_sum / sum_modis if sum_modis != 0 else None,
        "sesgo": sum(errors) / n,
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
