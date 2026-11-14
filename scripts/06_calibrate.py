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
