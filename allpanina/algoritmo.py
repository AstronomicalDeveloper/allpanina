"""Algoritmo AllpaNina para todo el Perú, en una sola función (modo actualización).

Encadena los mismos pasos ya validados del pipeline (scripts 02, 03, 04, 05, 06 y 08) y
aplica los κ congelados en DECISIONS.md §12 (leídos de frontend/public/data/peru/method.json,
aprobado en P17). **Nunca recalibra**: con datos nuevos, solo agrega meses y los marca como
`split = sin_validar` en calibrated_series.csv.

Entradas que el algoritmo rechaza (los κ no valen para ellas):
- CSV NRT de FIRMS (sin columna `type`, o `version` con "NRT");
- MODIS de un satélite distinto de Terra/Aqua, o VIIRS distinto de Suomi NPP (`N`);
- CSV sin las columnas de FIRMS que usa el pipeline.

Salida (contrato v1.1 de docs/contrato_datos.md + `split = sin_validar` y actualizacion.json):
monthly_series.csv, calibrated_series.csv, validation.json, method.json,
cells_PE_<año>.geojson, actualizacion.json y manifest.json.
"""
from __future__ import annotations

import hashlib
import importlib
import json
import shutil
import sys
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

norm = importlib.import_module("scripts.02_normalize")
grid = importlib.import_module("scripts.03_grid_dedupe")
ms = importlib.import_module("scripts.04_monthly_series")
gj = importlib.import_module("scripts.05_geojson_export")
cp = importlib.import_module("scripts.06_calibrate_peru")
mf = importlib.import_module("scripts.08_manifest")
tp = importlib.import_module("scripts.09_test_peru")

VERSION = "1.0"
PUBLICADO = ROOT / "frontend" / "public" / "data" / "peru"          # entrega aprobada (P17-P19)
DEPARTAMENTOS = ROOT / "docs" / "region" / "departamentos_inei_2023.geojson"
DESDE = (2013, 1)
ULTIMO_MES_VALIDADO = "2026-07"                                        # fin del test (P14/P15)
SPLIT_NUEVO = "sin_validar"
COLUMNAS_FIRMS = ("latitude", "longitude", "acq_date", "acq_time", "satellite", "confidence", "version", "type")
SATELITES = {"MODIS": {"Terra", "Aqua"}, "VIIRS": {"SNPP", "N"}}  # SNPP en el archivo estándar; N = código antiguo de FIRMS


class ErrorDeEntrada(ValueError):
    """La entrada no sirve para este algoritmo. El mensaje dice por qué, en castellano."""


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _mes(texto: str) -> tuple[int, int]:
    y, m = texto.split("-")
    return int(y), int(m)


# ---------------------------------------------------------------------------
# 1. Validación de entradas
# ---------------------------------------------------------------------------
def validar_csv(path: Path, sensor: str) -> dict:
    """Comprueba que un CSV de FIRMS sirva para los κ congelados. Devuelve un resumen."""
    if not path.exists():
        raise ErrorDeEntrada(f"No existe el archivo {path}.")
    try:
        cab = pd.read_csv(path, dtype=str, nrows=0).columns
    except Exception as exc:  # CSV ilegible
        raise ErrorDeEntrada(f"{path.name}: no se pudo leer como CSV ({exc}).") from exc
    if "type" not in cab:
        raise ErrorDeEntrada(
            f"{path.name}: no tiene la columna 'type'. Parece un CSV NRT (casi tiempo real) de FIRMS; "
            "el algoritmo solo acepta el archivo estándar (fire_archive_*.csv).")
    faltan = [c for c in COLUMNAS_FIRMS if c not in cab]
    if faltan:
        raise ErrorDeEntrada(f"{path.name}: faltan columnas de FIRMS: {', '.join(faltan)}.")
    datos = pd.read_csv(path, dtype=str, usecols=["acq_date", "satellite", "version"])
    if datos.empty:
        raise ErrorDeEntrada(f"{path.name}: no tiene filas.")
    versiones = sorted(datos["version"].dropna().astype(str).unique())
    if any("NRT" in v.upper() for v in versiones):
        raise ErrorDeEntrada(f"{path.name}: trae datos NRT (versión {versiones}); solo se acepta el archivo estándar.")
    sats = set(datos["satellite"].dropna().astype(str).str.strip())
    otros = sats - SATELITES[sensor]
    if otros:
        esperado = "Terra o Aqua" if sensor == "MODIS" else "Suomi NPP ('SNPP' o 'N')"
        raise ErrorDeEntrada(
            f"{path.name}: satélite {sorted(otros)} no válido para {sensor}; se espera {esperado}. "
            "Los κ congelados solo valen para MODIS Terra/Aqua y VIIRS Suomi NPP. "
            "Para NOAA-20 o NOAA-21 hace falta una recalibración con el protocolo completo.")
    fechas = pd.to_datetime(datos["acq_date"], errors="coerce").dropna()
    return {"archivo": path.name, "sha256": _sha256(path), "sensor": sensor, "filas": int(len(datos)),
            "primera_fecha": fechas.min().strftime("%Y-%m-%d"), "ultima_fecha": fechas.max().strftime("%Y-%m-%d"),
            "versiones": versiones}


# ---------------------------------------------------------------------------
# 2. Pasos del pipeline (mismas funciones, mismos formatos intermedios)
# ---------------------------------------------------------------------------
def _puntos_limpios(modis: list[Path], viirs: list[Path], tmp: Path) -> pd.DataFrame:
    frames = [norm.normalize_sensor(p, "MODIS") for p in modis] + [norm.normalize_sensor(p, "VIIRS") for p in viirs]
    data = norm.apply_qc(pd.concat(frames, ignore_index=True))
    path = tmp / "points_clean.parquet"
    data.loc[~data["excluded"], norm.CLEAN_COLUMNS].reset_index(drop=True).to_parquet(path, index=False)
    return pd.read_parquet(path)


def _celda_dias(points: pd.DataFrame, tmp: Path) -> pd.DataFrame:
    path = tmp / "cell_days.parquet"
    grid.dedupe_cell_days(points).to_parquet(path, index=False)
    return pd.read_parquet(path)


def _ultimo_mes_comun(cell_days: pd.DataFrame) -> tuple[int, int]:
    """Último mes común a los dos sensores (regla de docs/datos.md §4.2)."""
    ultimos = []
    for sensor in ("MODIS", "VIIRS"):
        sub = cell_days[cell_days["sensor_group"] == sensor]
        if sub.empty:
            raise ErrorDeEntrada(f"Después de los filtros de calidad no queda ninguna detección {sensor}.")
        idx = int((sub["year"] * 12 + sub["month"] - 1).max())
        ultimos.append(idx)
    i = min(ultimos)
    return i // 12, i % 12 + 1


def _celdas_10km(cell_days, departamentos, year, hasta, block_km=gj.PERU_BLOCK_KM):
    """Como scripts/05 peru_cells, pero con el último mes como parámetro (no fijo en 2026-07)."""
    frame = cell_days[cell_days["year"] == year]
    tope = hasta[0] * 12 + hasta[1] - 1
    frame = frame[(frame["year"] * 12 + frame["month"] - 1) <= tope]
    frame = frame[ms.assign_departments(frame, departamentos).notna().to_numpy()]
    bx = (frame["x_km"] // block_km) * block_km
    by = (frame["y_km"] // block_km) * block_km
    frame = frame.assign(x_km=bx.astype("int64"), y_km=by.astype("int64"))
    frame = frame.assign(cell_id=frame["x_km"].astype(str) + "_" + frame["y_km"].astype(str))
    return (
        frame.groupby(["sensor_group", "cell_id", "x_km", "y_km", "year", "month"], sort=True)
        .size().rename("cell_days").reset_index()
        .sort_values(["month", "sensor_group", "x_km", "y_km"], kind="stable").reset_index(drop=True)
    )


def _kappas_congelados(method_path: Path) -> dict:
    method = json.loads(method_path.read_text(encoding="utf-8"))
    regiones = {r["region_id"]: {"kappa": r["kappa"]} for r in method["regions"]}
    faltan = [r for r in ("PE",) + cp.DEPARTAMENTOS if r not in regiones]
    if faltan:
        raise RuntimeError(f"{method_path}: faltan κ congelados para {faltan}.")
    return {"regions": regiones}


def _calibrada(serie_csv: Path, kappas: dict) -> list[dict]:
    """B0/B1 con κ congelados; residuos solo en test; meses nuevos con split sin_validar."""
    series = tp.load_series_full(serie_csv)
    rows = cp.build_calibrated(series, kappas)
    cp.verificar_sumas(series, kappas, rows)
    for r in rows:
        mes = f"{r['year']:04d}-{r['month']:02d}"
        if mes > ULTIMO_MES_VALIDADO:
            r["split"], r["residual"] = SPLIT_NUEVO, None
        elif r["split"] == "test" and r["status"] == "ok":
            mo = series[r["region_id"]][mes]["modis"]
            r["residual"] = r["value"] - mo if cp._valid(mo) else None
    return rows


def _verificar_particion(serie: pd.DataFrame) -> None:
    ok = serie[serie["status"] == "ok"]
    pe = ok[ok["region_id"] == "PE"].set_index(["year", "month", "sensor_group"])["cell_days"]
    dptos = ok[ok["region_id"] != "PE"].groupby(["year", "month", "sensor_group"])["cell_days"].sum()
    dif = (pe - dptos.reindex(pe.index).fillna(0)).abs()
    if (dif > 0).any():
        raise AssertionError(f"La suma de los 25 departamentos no da PE en {int((dif > 0).sum())} mes(es)-sensor.")


# ---------------------------------------------------------------------------
# 3. Función principal
# ---------------------------------------------------------------------------
def procesar_peru(modis, viirs, salida, *, actualizado: str | None = None, hasta: str | None = None,
                  publicado: Path | str = PUBLICADO, departamentos: Path | str = DEPARTAMENTOS) -> dict:
    """Procesa CSV estándar de FIRMS (MODIS Terra/Aqua y VIIRS Suomi NPP) para Perú y sus 25 departamentos.

    modis, viirs: ruta o lista de rutas a CSV `fire_archive_*` de FIRMS.
    salida: carpeta donde se escriben los archivos del contrato (se crea si no existe).
    actualizado: fecha AAAA-MM-DD para la columna updated_at (por defecto, hoy).
    hasta: último mes AAAA-MM (por defecto, el último mes común a los dos sensores).
    Devuelve un resumen (dict) con el periodo, los archivos y las advertencias.
    Lanza ErrorDeEntrada si los archivos no sirven para los κ congelados.
    """
    modis = [Path(p) for p in ([modis] if isinstance(modis, (str, Path)) else modis)]
    viirs = [Path(p) for p in ([viirs] if isinstance(viirs, (str, Path)) else viirs)]
    if not modis or not viirs:
        raise ErrorDeEntrada("Hacen falta CSV de los dos sensores: MODIS y VIIRS.")
    publicado, departamentos, salida = Path(publicado), Path(departamentos), Path(salida)
    entradas = [validar_csv(p, "MODIS") for p in modis] + [validar_csv(p, "VIIRS") for p in viirs]
    actualizado = actualizado or date.today().isoformat()
    advertencias = []

    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        cell_days = _celda_dias(_puntos_limpios(modis, viirs, tmp), tmp)
        fin = _mes(hasta) if hasta else _ultimo_mes_comun(cell_days)
        if fin < DESDE:
            raise ErrorDeEntrada("Los datos terminan antes de 2013-01, el inicio del periodo de AllpaNina.")
        for e in entradas:
            if e["ultima_fecha"][:7] == f"{fin[0]:04d}-{fin[1]:02d}" and e["ultima_fecha"][8:] < "28":
                advertencias.append(f"{e['archivo']}: el último mes ({e['ultima_fecha'][:7]}) parece incompleto "
                                    f"(termina el {e['ultima_fecha']}).")
        dptos = ms.load_departments(departamentos)
        serie = ms.build_peru_series(cell_days, dptos, DESDE, fin, actualizado)
        _verificar_particion(serie)

        salida.mkdir(parents=True, exist_ok=True)
        serie_csv = salida / "monthly_series.csv"
        serie.to_csv(serie_csv, index=False)
        cp._write_calibrated(_calibrada(serie_csv, _kappas_congelados(publicado / "method.json")),
                             salida / "calibrated_series.csv")
        for nombre in ("validation.json", "method.json"):      # resultados congelados: no se recalculan
            shutil.copyfile(publicado / nombre, salida / nombre)
        for viejo in salida.glob("cells_PE_*.geojson"):
            viejo.unlink()
        for year in range(DESDE[0], fin[0] + 1):
            fc = gj.build_block_geojson(_celdas_10km(cell_days, dptos, year, fin))
            (salida / f"cells_PE_{year}.geojson").write_text(
                json.dumps(fc, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")

    hasta_txt = f"{fin[0]:04d}-{fin[1]:02d}"
    nuevos = sorted({f"{int(r.year):04d}-{int(r.month):02d}" for r in serie.itertuples()
                     if f"{int(r.year):04d}-{int(r.month):02d}" > ULTIMO_MES_VALIDADO})
    if nuevos:
        advertencias.append(f"{len(nuevos)} mes(es) posteriores a {ULTIMO_MES_VALIDADO} llevan split "
                            f"'{SPLIT_NUEVO}': B1 es una estimación con κ congelados, sin validar.")
    actualizacion = {
        "algoritmo": "allpanina.procesar_peru", "version": VERSION,
        "generado": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "entradas": entradas,
        "periodo": {"desde": f"{DESDE[0]:04d}-{DESDE[1]:02d}", "hasta": hasta_txt},
        "kappa": {"fuente": "method.json (κ congelados, DECISIONS.md §12)", "recalibrado": False},
        "periodo_validado": f"2013-01:{ULTIMO_MES_VALIDADO}",
        "meses_sin_validar": nuevos,
        "advertencias": advertencias,
    }
    (salida / "actualizacion.json").write_text(json.dumps(actualizacion, ensure_ascii=False, indent=2) + "\n",
                                               encoding="utf-8")
    manifest = mf.build_manifest(salida, salida / "_sin_info.json", mf.PERU_REGION_ID, peru=True)
    manifest["files"].append("actualizacion.json")
    manifest["hash"]["actualizacion.json"] = "sha256:" + _sha256(salida / "actualizacion.json")
    (salida / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"salida": str(salida), "periodo": actualizacion["periodo"], "meses_sin_validar": nuevos,
            "archivos": manifest["files"], "advertencias": advertencias}


# ---------------------------------------------------------------------------
# 4. Regresión: con los zips oficiales debe salir lo publicado, byte a byte
# ---------------------------------------------------------------------------
def verificar_contra_publicado(salida: Path | str | None = None, publicado: Path | str = PUBLICADO) -> dict:
    """Reprocesa los zips oficiales de docs/ y compara con frontend/public/data/peru/.

    Devuelve {archivo: True/False}. Todos deben ser True.
    """
    import zipfile
    publicado = Path(publicado)
    stamp = pd.read_csv(publicado / "monthly_series.csv", usecols=["updated_at"])["updated_at"].iloc[0]
    with tempfile.TemporaryDirectory() as t:
        raw = Path(t)
        csvs = {}
        for sensor, zname in (("MODIS", "DL_FIRE_M-C61_848370.zip"), ("VIIRS", "DL_FIRE_SV-C2_848371.zip")):
            with zipfile.ZipFile(ROOT / "docs" / zname) as z:
                nombre = next(n for n in z.namelist() if n.startswith("fire_archive_"))
                z.extract(nombre, raw)
                csvs[sensor] = raw / nombre
        out = Path(salida) if salida else raw / "salida"
        procesar_peru(csvs["MODIS"], csvs["VIIRS"], out, actualizado=stamp, publicado=publicado)
        nombres = ["monthly_series.csv", "calibrated_series.csv"] + sorted(p.name for p in publicado.glob("cells_PE_*.geojson"))
        return {n: (out / n).exists() and _sha256(out / n) == _sha256(publicado / n) for n in nombres}
