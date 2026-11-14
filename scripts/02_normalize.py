"""Paso 2 (T10) - Normaliza fechas y esquema, aplica el QC y registra las filas excluidas.

Entrada : data/raw/firms_raw_modis.csv, data/raw/firms_raw_viirs_snpp.csv
Salidas : data/processed/points_clean.parquet   (filas que pasan todo el QC; conserva el UTC original)
          data/processed/excluded_rows.csv      (cada fila excluida, con su motivo)
          data/processed/qc_counts.csv          (conteos por sensor: crudo / excluidas / conservadas)
          data/processed/qc_reasons.csv         (filas excluidas por sensor y motivo)
          data/processed/source_info.json       (filas, fechas y versiones por sensor; lo usa 08_manifest.py)

Reglas (DECISIONS.md, secciones 6 y 7):
  * Dia del calendario = dia LOCAL de Lima (UTC-5, sin horario de verano). Un foco a las
    02:00 UTC pertenece al dia anterior en Peru. El instante UTC original se conserva.
  * Se excluyen: coordenadas invalidas, fecha/hora invalida, duplicados exactos,
    `type != 0` (0 = fuego de vegetacion presunto), MODIS con confianza < 30 y VIIRS con
    confianza fuera de {n, h}.
  * VIIRS_TYPE_FILTER: DECISIONS.md dice que VIIRS no trae `type`, pero el archivo estandar
    de FIRMS si lo trae (valores 0-3, mismo significado). Se aplica a ambos sensores.
    Limitacion: en la version 2 de VIIRS algunos puntos de tipo 2 quedaron como tipo 0
    (corregido en la version 3), asi que el filtro puede dejar fuentes estaticas.
    Para volver a la regla escrita, poner VIIRS_TYPE_FILTER = False (requiere OK de Aldo).

Uso (sin preguntas interactivas):
    python scripts/02_normalize.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SENSORS = {"modis": "MODIS", "viirs_snpp": "VIIRS"}  # clave de archivo -> sensor_group del contrato
LIMA_OFFSET = pd.Timedelta("5h")  # Lima = UTC-5 todo el periodo
MODIS_MIN_CONFIDENCE = 30
VIIRS_ALLOWED_CONFIDENCE = ("n", "h")
VIIRS_TYPE_FILTER = True
DUPLICATE_KEY = ["sensor_group", "satellite", "latitude", "longitude", "acq_date", "acq_hhmm"]
CLEAN_COLUMNS = [
    "sensor_group", "satellite", "latitude", "longitude", "utc_datetime", "local_date",
    "confidence", "version", "type",
]


def to_utc_and_local_day(acq_date: pd.Series, acq_time: pd.Series) -> tuple[pd.Series, pd.Series]:
    """Combina acq_date + acq_time (HHMM, UTC) y devuelve (instante UTC, dia local de Lima).

    acq_time se rellena con ceros a la izquierda ('30' -> '0030'). Si fecha u hora son
    invalidas, ambos valores son NaT.
    """
    hhmm = acq_time.astype("string").str.strip().str.zfill(4)
    stamp = acq_date.astype("string").str.strip() + " " + hhmm
    utc = pd.to_datetime(stamp, format="%Y-%m-%d %H%M", errors="coerce")
    local_day = (utc - LIMA_OFFSET).dt.floor("D")
    return utc, local_day


def apply_qc(df: pd.DataFrame) -> pd.DataFrame:
    """Agrega `excluded` (bool) y `reasons` (motivos separados por ';') a un DataFrame normalizado.

    Requiere: sensor_group, satellite, latitude, longitude, acq_date, acq_hhmm,
    utc_datetime, confidence y type.
    """
    out = df.copy()
    lat = pd.to_numeric(out["latitude"], errors="coerce")
    lon = pd.to_numeric(out["longitude"], errors="coerce")
    group = out["sensor_group"].astype("string")
    is_modis = (group == "MODIS").fillna(False).to_numpy(dtype=bool)
    is_viirs = (group == "VIIRS").fillna(False).to_numpy(dtype=bool)

    confidence = out["confidence"].astype("string").str.strip().str.lower()
    modis_conf = pd.to_numeric(confidence, errors="coerce")
    type_num = pd.to_numeric(out["type"], errors="coerce")
    type_applies = is_modis | (is_viirs if VIIRS_TYPE_FILTER else np.zeros(len(out), dtype=bool))

    def flag(mask: pd.Series) -> np.ndarray:
        """Mascara booleana sin NA (los valores faltantes cuentan como 'no cumple')."""
        return mask.fillna(False).to_numpy(dtype=bool)

    masks: dict[str, np.ndarray] = {
        "invalid_coords": flag(~(lat.between(-90, 90) & lon.between(-180, 180))),
        "invalid_datetime": flag(out["utc_datetime"].isna()),
        "exact_duplicate": flag(out.duplicated(subset=DUPLICATE_KEY, keep="first")),
        "type_not_0": flag(type_num.notna() & (type_num != 0)) & type_applies,
        f"modis_confidence_below_{MODIS_MIN_CONFIDENCE}": is_modis & flag(~(modis_conf >= MODIS_MIN_CONFIDENCE)),
        "viirs_confidence_not_n_h": is_viirs & flag(~confidence.isin(VIIRS_ALLOWED_CONFIDENCE)),
    }

    reasons = np.full(len(out), "", dtype=object)
    excluded = np.zeros(len(out), dtype=bool)
    for name, mask in masks.items():
        excluded |= mask
        reasons[mask] = [f"{old};{name}" if old else name for old in reasons[mask]]

    out["excluded"] = excluded
    out["reasons"] = reasons
    return out


def normalize_sensor(csv_path: Path, sensor_group: str) -> pd.DataFrame:
    """Lee un CSV crudo de FIRMS y devuelve el esquema unificado (sin QC aplicado)."""
    raw = pd.read_csv(csv_path, dtype=str)
    utc, local_day = to_utc_and_local_day(raw["acq_date"], raw["acq_time"])
    out = pd.DataFrame(
        {
            "sensor_group": sensor_group,
            "satellite": raw["satellite"],
            "latitude": pd.to_numeric(raw["latitude"], errors="coerce"),
            "longitude": pd.to_numeric(raw["longitude"], errors="coerce"),
            "acq_date": raw["acq_date"],
            "acq_hhmm": raw["acq_time"].astype("string").str.strip().str.zfill(4),
            "confidence": raw["confidence"],
            "version": raw["version"] if "version" in raw.columns else pd.NA,
            "type": raw["type"] if "type" in raw.columns else pd.NA,
            "utc_datetime": utc,
            "local_date": local_day,
        }
    )
    return out


def source_info(frame: pd.DataFrame, csv_name: str) -> dict:
    """Resumen de un sensor (antes del QC) para el manifest."""
    dates = frame["utc_datetime"].dropna()
    return {
        "csv": csv_name,
        "rows_raw": int(len(frame)),
        "first_date": dates.min().strftime("%Y-%m-%d") if len(dates) else None,
        "last_date": dates.max().strftime("%Y-%m-%d") if len(dates) else None,
        "versions": sorted(str(v) for v in frame["version"].dropna().unique()),
    }


def run(raw_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    frames, info = [], {}
    for sensor, group in SENSORS.items():
        csv_path = raw_dir / f"firms_raw_{sensor}.csv"
        if not csv_path.exists():
            raise FileNotFoundError(f"Falta {csv_path}. Ejecuta antes scripts/01_download.py.")
        frame = normalize_sensor(csv_path, group)
        info[group] = source_info(frame, csv_path.name)
        frames.append(frame)
    data = apply_qc(pd.concat(frames, ignore_index=True))

    counts = (
        data.groupby("sensor_group")
        .agg(rows_raw=("excluded", "size"), rows_excluded=("excluded", "sum"))
        .reset_index()
    )
    counts["rows_kept"] = counts["rows_raw"] - counts["rows_excluded"]
    counts.to_csv(out_dir / "qc_counts.csv", index=False)

    dropped = data.loc[data["excluded"]]
    exploded = dropped[["sensor_group", "reasons"]].assign(reason=dropped["reasons"].str.split(";")).explode("reason")
    reason_counts = exploded.groupby(["sensor_group", "reason"]).size().rename("rows").reset_index()
    reason_counts.to_csv(out_dir / "qc_reasons.csv", index=False)

    dropped[["sensor_group", "satellite", "latitude", "longitude", "acq_date", "acq_hhmm", "confidence", "type", "reasons"]].to_csv(
        out_dir / "excluded_rows.csv", index=False
    )
    data.loc[~data["excluded"], CLEAN_COLUMNS].reset_index(drop=True).to_parquet(out_dir / "points_clean.parquet", index=False)
    (out_dir / "source_info.json").write_text(json.dumps(info, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(counts.to_string(index=False))
    print(reason_counts.to_string(index=False))
    print(f"Filas excluidas (con motivo): {len(dropped)} -> {out_dir / 'excluded_rows.csv'}")
    print(f"points_clean.parquet: {int((~data['excluded']).sum())} filas")


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
