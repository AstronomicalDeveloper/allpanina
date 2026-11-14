"""Paso 2 - Normaliza fechas y esquema, y aplica el QC.

Entrada : data/raw/firms_raw_modis.csv, data/raw/firms_raw_viirs_snpp.csv
Salidas : data/processed/points_clean.parquet   (filas que pasan qc_none, con bandera qc_strict)
          data/processed/excluded_rows.csv      (cada fila fuera de qc_strict, con su motivo)
          data/processed/qc_counts.csv          (conteos por sensor: crudo / qc_none / qc_strict)

Decisiones (pendientes de confirmar en DECISIONS.md):
  * El dia del calendario es el dia LOCAL de Lima (UTC-5, sin horario de verano).
    Un foco a las 02:00 UTC pertenece al dia anterior en Peru.
  * qc_none   = coordenadas validas, fecha/hora valida y sin duplicados exactos.
  * qc_strict = qc_none y ademas: VIIRS confianza distinta de 'l' (baja), MODIS
    confianza >= 30, y type == 0 cuando el campo existe.
  * La serie principal usa qc_strict; se guardan ambos conteos.

Uso (sin preguntas interactivas):
    python scripts/02_normalize.py
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SENSORS = ("modis", "viirs_snpp")
LIMA_OFFSET = pd.Timedelta(hours=5)  # Lima = UTC-5 todo el periodo 2003-2026
MODIS_MIN_CONFIDENCE = 30
DUPLICATE_KEY = ["sensor_group", "satellite", "latitude", "longitude", "acq_date", "acq_hhmm"]


def to_utc_and_local_day(acq_date: pd.Series, acq_time: pd.Series) -> tuple[pd.Series, pd.Series]:
    """Combina acq_date + acq_time (HHMM, UTC) y devuelve (instante UTC, dia local de Lima).

    acq_time se rellena con ceros a la izquierda ('30' -> '0030'). Si fecha u hora
    son invalidas, ambos valores son NaT.
    """
    hhmm = acq_time.astype("string").str.strip().str.zfill(4)
    stamp = acq_date.astype("string").str.strip() + " " + hhmm
    utc = pd.to_datetime(stamp, format="%Y-%m-%d %H%M", errors="coerce")
    local_day = (utc - LIMA_OFFSET).dt.floor("D")
    return utc, local_day


def apply_qc(df: pd.DataFrame) -> pd.DataFrame:
    """Agrega qc_none, qc_strict y reasons (motivos separados por ';') a un DataFrame normalizado.

    Requiere: sensor_group, satellite, latitude, longitude, acq_date, acq_hhmm,
    utc_datetime, confidence y, opcionalmente, type.
    """
    out = df.copy()
    lat = pd.to_numeric(out["latitude"], errors="coerce")
    lon = pd.to_numeric(out["longitude"], errors="coerce")

    masks: dict[str, pd.Series] = {
        "invalid_coords": ~(lat.between(-90, 90) & lon.between(-180, 180)),
        "invalid_datetime": out["utc_datetime"].isna(),
        "exact_duplicate": out.duplicated(subset=DUPLICATE_KEY, keep="first"),
    }
    none_fail = masks["invalid_coords"] | masks["invalid_datetime"] | masks["exact_duplicate"]

    confidence = out["confidence"].astype("string").str.strip().str.lower()
    modis_conf = pd.to_numeric(confidence, errors="coerce")
    is_modis = out["sensor_group"] == "modis"
    is_viirs = out["sensor_group"] == "viirs_snpp"
    strict_masks: dict[str, pd.Series] = {
        "viirs_low_confidence": is_viirs & (confidence == "l"),
        f"modis_confidence_lt_{MODIS_MIN_CONFIDENCE}": is_modis & (modis_conf < MODIS_MIN_CONFIDENCE),
    }
    if "type" in out.columns:
        type_num = pd.to_numeric(out["type"], errors="coerce")
        strict_masks["type_not_0"] = type_num.notna() & (type_num != 0)

    strict_fail = none_fail.copy()
    for mask in strict_masks.values():
        strict_fail |= mask.fillna(False).astype(bool)

    reasons = pd.Series("", index=out.index, dtype="string")
    for name, mask in {**masks, **strict_masks}.items():
        mask = mask.fillna(False).astype(bool)
        reasons = reasons.mask(mask, (reasons + ";" + name).str.lstrip(";"))

    out["qc_none"] = ~none_fail.astype(bool)
    out["qc_strict"] = ~strict_fail.astype(bool)
    out["reasons"] = reasons
    return out


def normalize_sensor(csv_path: Path, sensor_group: str) -> pd.DataFrame:
    """Lee un CSV crudo de FIRMS y devuelve el esquema unificado (sin QC aplicado)."""
    raw = pd.read_csv(csv_path, dtype={"acq_time": "string", "acq_date": "string", "confidence": "string"})
    out = pd.DataFrame(
        {
            "sensor_group": sensor_group,
            "satellite": raw["satellite"].astype("string"),
            "latitude": raw["latitude"],
            "longitude": raw["longitude"],
            "acq_date": raw["acq_date"],
            "acq_hhmm": raw["acq_time"].astype("string").str.strip().str.zfill(4),
            "confidence": raw["confidence"],
        }
    )
    out["type"] = raw["type"] if "type" in raw.columns else pd.NA
    out["utc_datetime"], out["local_date"] = to_utc_and_local_day(raw["acq_date"], raw["acq_time"])
    return out


def run(raw_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    frames = []
    for sensor in SENSORS:
        csv_path = raw_dir / f"firms_raw_{sensor}.csv"
        if not csv_path.exists():
            raise FileNotFoundError(f"Falta {csv_path}. Ejecuta antes scripts/01_download.py.")
        frames.append(normalize_sensor(csv_path, sensor))
    data = apply_qc(pd.concat(frames, ignore_index=True))

    counts = (
        data.groupby("sensor_group")
        .agg(rows_raw=("qc_none", "size"), rows_qc_none=("qc_none", "sum"), rows_qc_strict=("qc_strict", "sum"))
        .reset_index()
    )
    counts.to_csv(out_dir / "qc_counts.csv", index=False)

    excluded = data.loc[~data["qc_strict"], ["sensor_group", "satellite", "latitude", "longitude", "acq_date", "acq_hhmm", "confidence", "type", "reasons"]]
    excluded.to_csv(out_dir / "excluded_rows.csv", index=False)

    keep = data.loc[data["qc_none"], ["sensor_group", "satellite", "latitude", "longitude", "utc_datetime", "local_date", "confidence", "type", "qc_strict"]]
    keep.reset_index(drop=True).to_parquet(out_dir / "points_clean.parquet", index=False)

    print(counts.to_string(index=False))
    print(f"Filas excluidas por qc_strict (con motivo): {len(excluded)} -> {out_dir / 'excluded_rows.csv'}")
    print(f"points_clean.parquet: {len(keep)} filas")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--raw-dir", type=Path, default=ROOT / "data" / "raw")
    parser.add_argument("--out-dir", type=Path, default=ROOT / "data" / "processed")
    args = parser.parse_args(argv)
    try:
        run(args.raw_dir, args.out_dir)
    except FileNotFoundError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
