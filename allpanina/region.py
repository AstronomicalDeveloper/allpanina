"""Modo región: AllpaNina para cualquier lugar del mundo (por ejemplo, la provincia de Mendoza).

Un usuario entrega los CSV estándar de FIRMS (o los descarga con allpanina.descarga) y el
polígono de su región. El algoritmo produce la serie mensual, el calendario, el mapa y la
calibración B0/B1 en el mismo formato de una región que el piloto de Ucayali (contrato v1.0
de docs/contrato_datos.md), que la web ya sabe leer.

Ciencia y honestidad:
- Mismas reglas que el piloto: filtros (type = 0, confianza), celdas de 1 km en EPSG:6933,
  una detección por celda-día y sensor, status ok/missing, κ = Σ MODIS / Σ VIIRS solo con
  train 2013-01 a 2022-12.
- El día es el de la **zona horaria local de la región** (IANA, p. ej. America/Argentina/Mendoza).
- κ local solo si en train hay Σ VIIRS ≥ 5,000 y Σ MODIS ≥ 1,000 celdas-día (la regla de
  DECISIONS.md §11.2). Si no, no se ofrece B1: solo los datos observados.
- La evaluación de B1 es **automática y fuera de muestra** (2023-2024 y 2025-2026-07); nadie
  elige nada mirando esos años. Aun así, el resultado es **exploratorio**: no tiene la revisión
  científica ni el test con firmas del piloto ni de Perú, y así lo dice method.json.
"""
from __future__ import annotations

import json
import math
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path

import pandas as pd

from .algoritmo import (ErrorDeEntrada, VERSION, _sha256, cp, gj, grid, mf, ms, norm, validar_csv)

cal = __import__("importlib").import_module("scripts.06_calibrate")
met = cal._load_metrics_module()

TRAIN_FIN, VALID_FIN, TEST_FIN = "2022-12", "2024-12", "2026-07"
INICIO = (2013, 1)
UMBRAL_VIIRS, UMBRAL_MODIS = 5000, 1000          # DECISIONS.md §11.2
MIN_MODIS_REPORTE = 50                            # DECISIONS.md §11.3
AREA_CELDA_1KM_MAX = 150_000                      # km²: hasta aquí el mapa va a 1 km; más grande, 10 km
MAPA_MB_AVISO = 8.0


def _split(mes: str):
    if mes <= TRAIN_FIN:
        return "train"
    if mes <= VALID_FIN:
        return "valid"
    if mes <= TEST_FIN:
        return "test"
    return "sin_validar"


def _mes_txt(y, m):
    return f"{int(y):04d}-{int(m):02d}"


# ---------------------------------------------------------------------------
# Región
# ---------------------------------------------------------------------------
def cargar_region(poligono=None, bbox=None):
    """Devuelve (geometría shapely o None, bbox (w, s, e, n), área en km²)."""
    import shapely
    from shapely.geometry import box
    from shapely.ops import transform

    if poligono is not None:
        geom = ms.load_polygon(Path(poligono))
        if geom.is_empty:
            raise ErrorDeEntrada("El polígono de la región está vacío.")
        w, s, e, n = geom.bounds
    elif bbox is not None:
        w, s, e, n = (float(x) for x in bbox)
        geom = None
    else:
        raise ErrorDeEntrada("Hace falta la región: un polígono GeoJSON o una caja (oeste, sur, este, norte).")
    if not (-180 <= w < e <= 180 and -90 <= s < n <= 90):
        raise ErrorDeEntrada(f"Caja inválida: {(w, s, e, n)}. Orden: oeste, sur, este, norte.")
    forma = geom if geom is not None else box(w, s, e, n)
    area = transform(lambda x, y, z=None: grid._TO_GRID.transform(x, y), forma).area / 1e6
    shapely.prepare(forma)
    return geom, (w, s, e, n), area


def zona_por_longitud(lon: float) -> str:
    """Zona horaria aproximada (hora solar) para cuando el usuario no da una: Etc/GMT±N."""
    h = int(round(lon / 15.0))
    return "UTC" if h == 0 else f"Etc/GMT{'+' if h < 0 else '-'}{abs(h)}"   # Etc/GMT invierte el signo


# ---------------------------------------------------------------------------
# Pasos
# ---------------------------------------------------------------------------
def _puntos(modis, viirs, zona, tmp: Path) -> pd.DataFrame:
    frames = [norm.normalize_sensor(p, "MODIS") for p in modis] + [norm.normalize_sensor(p, "VIIRS") for p in viirs]
    data = pd.concat(frames, ignore_index=True)
    utc = data["utc_datetime"]
    # Día local de la región (el piloto usa Lima, UTC-5 fijo; aquí la zona IANA de la región).
    data["local_date"] = utc.dt.tz_localize("UTC").dt.tz_convert(zona).dt.tz_localize(None).dt.floor("D")
    data = norm.apply_qc(data)
    path = tmp / "points_clean.parquet"
    data.loc[~data["excluded"], norm.CLEAN_COLUMNS].reset_index(drop=True).to_parquet(path, index=False)
    return pd.read_parquet(path)


def _celda_dias(points, tmp: Path) -> pd.DataFrame:
    path = tmp / "cell_days.parquet"
    grid.dedupe_cell_days(points).to_parquet(path, index=False)
    return pd.read_parquet(path)


def _rango_comun(cell_days):
    """(primer mes, último mes) comunes a los dos sensores."""
    ini, fin = [], []
    for s in ("MODIS", "VIIRS"):
        sub = cell_days[cell_days["sensor_group"] == s]
        if sub.empty:
            raise ErrorDeEntrada(f"Después de los filtros de calidad no queda ninguna detección {s}.")
        idx = sub["year"] * 12 + sub["month"] - 1
        ini.append(int(idx.min()))
        fin.append(int(idx.max()))
    a, b = max(ini), min(fin)
    if a > b:
        raise ErrorDeEntrada("Los periodos de MODIS y VIIRS no se superponen.")
    return (a // 12, a % 12 + 1), (b // 12, b % 12 + 1)


def _filas(serie: pd.DataFrame) -> list[dict]:
    cells = {}
    for r in serie.itertuples(index=False):
        ok = r.status == "ok" and not pd.isna(r.cell_days)
        s = "modis" if str(r.sensor_group).upper() == "MODIS" else "viirs"
        cells.setdefault((int(r.year), int(r.month)), {"modis": None, "viirs": None})[s] = float(r.cell_days) if ok else None
    return [{"year": y, "month": m, "modis": v["modis"], "viirs": v["viirs"], "split": _split(_mes_txt(y, m))}
            for (y, m), v in sorted(cells.items())]


def _kappa(filas, umbral_viirs, umbral_modis):
    """κ local solo con train y meses con los dos sensores. Devuelve (κ o None, insumos, motivo)."""
    pares = [(r["modis"], r["viirs"]) for r in filas if r["split"] == "train"
             and cal._valid(r["modis"]) and cal._valid(r["viirs"])]
    sm, sv = sum(m for m, _ in pares), sum(v for _, v in pares)
    insumos = {"suma_modis_train": sm, "suma_viirs_train": sv, "meses_train": len(pares)}
    if sv < umbral_viirs or sm < umbral_modis:
        return None, insumos, (f"pocos datos en train 2013-2022 (Σ VIIRS {sv:,.0f}, Σ MODIS {sm:,.0f}; "
                               f"mínimo {umbral_viirs:,} y {umbral_modis:,})")
    return cal.fit_factor_on_train(filas), insumos, None


def _kappa_anual(filas):
    out = {}
    for y in sorted({r["year"] for r in filas if r["split"] == "train"}):
        pares = [(r["modis"], r["viirs"]) for r in filas if r["year"] == y and cal._valid(r["modis"]) and cal._valid(r["viirs"])]
        sv = sum(v for _, v in pares)
        if sv > 0:
            out[y] = sum(m for m, _ in pares) / sv
    return [min(out.values()), max(out.values())] if out else None


def _evaluacion(calibrada, filas, region_id, split):
    modis = {_mes_txt(r["year"], r["month"]): r["modis"] for r in filas}
    suma = sum(r["modis"] for r in filas if r["split"] == split and cal._valid(r["modis"]))
    bloque = met.build_validation(calibrada, modis, region_id, split=split)
    n = sum(1 for r in filas if r["split"] == split)
    return bloque, suma, n


def _celdas(reg, year, fin, km):
    """reg: celda-días ya filtrados por la región (se filtra una sola vez, no por año)."""
    reg = reg[reg["year"] == year]
    reg = reg[(reg["year"] * 12 + reg["month"] - 1) <= (fin[0] * 12 + fin[1] - 1)]
    if km > 1:
        bx = (reg["x_km"] // km) * km
        by = (reg["y_km"] // km) * km
        reg = reg.assign(x_km=bx.astype("int64"), y_km=by.astype("int64"))
        reg = reg.assign(cell_id=reg["x_km"].astype(str) + "_" + reg["y_km"].astype(str))
    return (reg.groupby(["sensor_group", "cell_id", "x_km", "y_km", "year", "month"], sort=True).size()
            .rename("cell_days").reset_index()
            .sort_values(["month", "sensor_group", "x_km", "y_km"], kind="stable").reset_index(drop=True))


# ---------------------------------------------------------------------------
# Función principal
# ---------------------------------------------------------------------------
def procesar_region(modis, viirs, salida, *, region_id: str, nombre: str | None = None,
                    poligono=None, bbox=None, zona_horaria: str | None = None,
                    celda_mapa_km: int | None = None, desde: str | None = None, hasta: str | None = None,
                    actualizado: str | None = None, umbral_viirs: int = UMBRAL_VIIRS,
                    umbral_modis: int = UMBRAL_MODIS) -> dict:
    """AllpaNina para una región cualquiera.

    modis, viirs: ruta o lista de rutas a CSV estándar de FIRMS (MODIS Terra/Aqua, VIIRS Suomi NPP).
    salida: carpeta de salida. region_id: código corto (p. ej. "AR-M"), va en los archivos.
    poligono: GeoJSON WGS84 de la región (recomendado). bbox: (oeste, sur, este, norte) si no hay polígono.
    zona_horaria: IANA (p. ej. "America/Argentina/Mendoza"). Si falta, se aproxima por longitud y se avisa.
    celda_mapa_km: 1, 10, ...; por defecto 1 km hasta 150,000 km² y 10 km si la región es mayor.
    desde/hasta: AAAA-MM; por defecto, el periodo común a los dos sensores (desde 2013-01 como mínimo).
    Devuelve un resumen. Lanza ErrorDeEntrada si la entrada no sirve.
    """
    from zoneinfo import ZoneInfo

    if not region_id or any(c in region_id for c in "/\\ ") or len(region_id) > 40:
        raise ErrorDeEntrada("region_id debe ser un código corto sin espacios ni barras (p. ej. 'AR-M').")
    modis = [Path(p) for p in ([modis] if isinstance(modis, (str, Path)) else modis)]
    viirs = [Path(p) for p in ([viirs] if isinstance(viirs, (str, Path)) else viirs)]
    if not modis or not viirs:
        raise ErrorDeEntrada("Hacen falta CSV de los dos sensores: MODIS y VIIRS.")
    entradas = [validar_csv(p, "MODIS") for p in modis] + [validar_csv(p, "VIIRS") for p in viirs]
    geom, caja, area = cargar_region(poligono, bbox)
    advertencias = []
    if not zona_horaria:
        zona_horaria = zona_por_longitud((caja[0] + caja[2]) / 2)
        advertencias.append(f"No se indicó zona horaria: se usó {zona_horaria} (hora solar aproximada). "
                            "Para que el día del calendario sea el local, indique la zona IANA de la región.")
    try:
        ZoneInfo(zona_horaria)
    except Exception as exc:
        raise ErrorDeEntrada(f"Zona horaria desconocida: {zona_horaria!r} (use un nombre IANA).") from exc
    km = celda_mapa_km or (1 if area <= AREA_CELDA_1KM_MAX else 10)
    actualizado = actualizado or date.today().isoformat()
    salida = Path(salida)

    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        cell_days = _celda_dias(_puntos(modis, viirs, zona_horaria, tmp), tmp)
        ini, fin = _rango_comun(cell_days)
        ini = max(ini, INICIO)
        if desde:
            ini = max(ini, tuple(int(x) for x in desde.split("-")))
        if hasta:
            fin = min(fin, tuple(int(x) for x in hasta.split("-")))
        if ini > fin:
            raise ErrorDeEntrada("No hay meses comunes a MODIS y VIIRS desde 2013-01 en los datos entregados.")
        serie = ms.build_monthly_series(cell_days, region_id, caja, ini, fin, actualizado, geom)
        if (serie.loc[serie["status"] == "ok", "cell_days"].fillna(0) == 0).all():
            advertencias.append("Ninguna detección cae dentro de la región: revise el polígono y el área descargada.")

        filas = _filas(serie)
        kappa, insumos, motivo = _kappa(filas, umbral_viirs, umbral_modis)
        if motivo:
            advertencias.append(f"No se ofrece B1: {motivo}. Se muestran solo los datos observados.")
        calibrada = cal.build_calibrated_series(filas, kappa, region_id)

        salida.mkdir(parents=True, exist_ok=True)
        for viejo in salida.glob(f"cells_{region_id}_*.geojson"):
            viejo.unlink()
        serie.to_csv(salida / "monthly_series.csv", index=False)
        cp._write_calibrated(calibrada, salida / "calibrated_series.csv")

        resultados, evaluacion = {}, {}
        for split, periodo in (("valid", "2023-01:2024-12"), ("test", "2025-01:2026-07")):
            bloque, suma, n = _evaluacion(calibrada, filas, region_id, split)
            reportable = kappa is not None and n > 0 and suma >= MIN_MODIS_REPORTE
            evaluacion[split] = (bloque, reportable, suma, n)
            if n:
                resultados[split] = {"periodo": periodo, "n_meses": n, "suma_modis": suma, "reportable": reportable,
                                     **({"B0": bloque["methods"]["B0"]["metrics"], "B1": bloque["methods"]["B1"]["metrics"]}
                                        if reportable else {"motivo": motivo or f"Σ MODIS {suma:,.0f} < {MIN_MODIS_REPORTE}"})}
        bloque, reportable, suma, n = evaluacion["test"]
        validation = dict(bloque, evaluacion="automática fuera de muestra (modo región, exploratorio)",
                          reportable=reportable)
        (salida / "validation.json").write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        tamanos = {}
        en_region = ms.filter_region(cell_days, caja, geom)
        for year in range(ini[0], fin[0] + 1):
            cells = _celdas(en_region, year, fin, km)
            fc = gj.build_geojson(cells) if km == 1 else gj.build_block_geojson(cells, km)
            p = salida / f"cells_{region_id}_{year}.geojson"
            p.write_text(json.dumps(fc, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
            tamanos[year] = p.stat().st_size / 1e6
        grandes = [y for y, mb in tamanos.items() if mb > MAPA_MB_AVISO]
        if grandes:
            advertencias.append(f"Mapas de más de {MAPA_MB_AVISO:.0f} MB en {grandes}: use una celda más grande "
                                "(celda_mapa_km) o comprima la entrega (gzip).")

    periodo_txt = {"desde": _mes_txt(*ini), "hasta": _mes_txt(*fin)}
    method = {
        "contract_version": "1.0-region",
        "estado": ("exploratorio: κ local calculado automáticamente con train 2013-2022 y evaluado fuera de muestra; "
                   "sin la revisión científica ni el test con firmas del piloto (Ucayali) ni de la extensión Perú"),
        "region_id": region_id,
        "region": nombre or region_id,
        "indicator": "cell_days: pares (celda de 1 km, día local) con al menos una detección de fuego activo, por mes y sensor.",
        "sensors": ["MODIS Terra", "MODIS Aqua", "VIIRS S-NPP"],
        "products": "Producto estándar de NASA FIRMS (MODIS C6.1 y VIIRS S-NPP 375 m C2)",
        "filters": "type = 0; MODIS confianza ≥ 30; VIIRS confianza nominal o alta; duplicados exactos fuera.",
        "zona_horaria": zona_horaria,
        "celda_mapa_km": km,
        "area_km2": round(area, 1),
        "period_train": "2013-01:2022-12", "period_valid": "2023-01:2024-12", "period_test": "2025-01:2026-07",
        "error_convention": "signed_error = estimate - modis_observed; bias = media; MAE = media de |error|; WAPE = Σ|error| / Σ MODIS.",
        "status_rule": "ok = sensor operando; missing = fuera de la ventana del sensor o mes sin ninguna detección en toda el área descargada.",
        "calibration": ("B0 = VIIRS sin factor. B1 = B0 × κ local, con κ = Σ MODIS / Σ VIIRS en train 2013-2022 (meses con los dos "
                        f"sensores). Se ofrece solo si Σ VIIRS ≥ {umbral_viirs:,} y Σ MODIS ≥ {umbral_modis:,} en train."),
        "kappa": kappa, "kappa_inputs": insumos, "kappa_anual_rango": _kappa_anual(filas),
        "resultados": resultados,
        "limitations": [
            "Resultado exploratorio: el κ y la evaluación son automáticos, sin revisión científica del equipo.",
            "El κ cambia de una región a otra y de un año a otro; un κ fijo no sigue la intensidad de cada temporada "
            "(en el piloto y en Perú subestimó picos de años extremos y sobreestimó años de poca actividad).",
            "B1 se valida a escala región-mes. No debe aplicarse a celdas individuales del mapa; el mapa muestra solo observados.",
            "El indicador cuenta detecciones satelitales de anomalías térmicas, no incendios confirmados ni superficie quemada.",
            "FIRMS no entrega cobertura de nubes: un mes con 0 detecciones puede ser ausencia de fuego o falta de observación.",
            "Suomi NPP dejó de producir datos nuevos el 2-nov-2026 y NASA prevé terminar MODIS en 2027.",
            "Un error retrospectivo de B1 no es un porcentaje de confianza para meses futuros.",
        ] + ([f"La región no tiene datos suficientes para B1: {motivo}."] if motivo else []),
    }
    (salida / "method.json").write_text(json.dumps(method, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    procedencia = {
        "algoritmo": "allpanina.procesar_region", "version": VERSION,
        "generado": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "entradas": entradas,
        "region": {"region_id": region_id, "nombre": nombre, "bbox": list(caja), "area_km2": round(area, 1),
                   "poligono_sha256": _sha256(Path(poligono)) if poligono else None},
        "zona_horaria": zona_horaria, "celda_mapa_km": km, "periodo": periodo_txt,
        "kappa": {"valor": kappa, "recalibrado_automaticamente": True, "revisado_por_el_equipo": False},
        "advertencias": advertencias,
    }
    (salida / "procedencia.json").write_text(json.dumps(procedencia, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest = mf.build_manifest(salida, salida / "_sin_info.json", region_id)
    manifest["contract_version"] = "1.0-region"
    manifest["sources"] = entradas
    manifest["files"].append("procedencia.json")
    manifest["hash"]["procedencia.json"] = "sha256:" + _sha256(salida / "procedencia.json")
    (salida / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"salida": str(salida), "region_id": region_id, "periodo": periodo_txt, "kappa": kappa,
            "b1_disponible": kappa is not None, "celda_mapa_km": km, "zona_horaria": zona_horaria,
            "archivos": manifest["files"], "advertencias": advertencias}
