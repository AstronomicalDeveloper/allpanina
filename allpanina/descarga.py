"""Descarga automática de NASA FIRMS (API de área, producto estándar) para una región.

Usa la API oficial `/api/area/csv/[MAP_KEY]/[SOURCE]/[AREA]/[DAY_RANGE]/[DATE]`:
- SOURCE: MODIS_SP y VIIRS_SNPP_SP (producto estándar; no NRT).
- AREA: oeste,sur,este,norte. DAY_RANGE: 1 a 10 días por pedido.
- MAP_KEY: gratuito, se pide en https://firms.modaps.eosdis.nasa.gov/api/map_key/

FIRMS limita las transacciones (cada día pedido cuenta como una; hay un tope por cada 10 minutos),
así que el descargador va pausado. Solo usa la biblioteca estándar de Python.
"""
from __future__ import annotations

import re
import time
import urllib.error
import urllib.request
from collections import deque
from datetime import date, timedelta
from pathlib import Path

API = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
FUENTES = {"MODIS": "MODIS_SP", "VIIRS": "VIIRS_SNPP_SP"}
MAX_DIAS = 10
VENTANA_S = 600                      # 10 minutos
MAX_TX_VENTANA = 4000                # por debajo del tope de FIRMS, con margen


class ErrorDeDescarga(RuntimeError):
    """FIRMS no entregó los datos. El mensaje dice por qué, en castellano."""


def _fecha(x) -> date:
    return x if isinstance(x, date) else date.fromisoformat(str(x))


def tramos(desde, hasta, dias: int = MAX_DIAS):
    """Divide [desde, hasta] en tramos de hasta `dias` días: [(fecha_inicio, n_dias), ...]."""
    d, h = _fecha(desde), _fecha(hasta)
    if h < d:
        raise ValueError("hasta es anterior a desde")
    if not 1 <= dias <= MAX_DIAS:
        raise ValueError(f"dias debe estar entre 1 y {MAX_DIAS}")
    out = []
    while d <= h:
        n = min(dias, (h - d).days + 1)
        out.append((d, n))
        d += timedelta(days=n)
    return out


def _area(bbox) -> str:
    w, s, e, n = (float(x) for x in bbox)
    if not (-180 <= w < e <= 180 and -90 <= s < n <= 90):
        raise ValueError(f"Caja inválida {bbox}: el orden es oeste, sur, este, norte.")
    return ",".join(f"{v:g}" for v in (w, s, e, n))


class _Limitador:
    """Mantiene las transacciones por debajo de `maximo` en cada ventana de `ventana` segundos."""

    def __init__(self, maximo, ventana, reloj=time.monotonic, dormir=time.sleep):
        self.maximo, self.ventana, self.reloj, self.dormir = maximo, ventana, reloj, dormir
        self.hist = deque()

    def esperar(self, tx):
        while True:
            ahora = self.reloj()
            while self.hist and ahora - self.hist[0][0] >= self.ventana:
                self.hist.popleft()
            usado = sum(t for _, t in self.hist)
            if usado + tx <= self.maximo:
                self.hist.append((ahora, tx))
                return
            self.dormir(self.ventana - (ahora - self.hist[0][0]) + 0.5)


def _pedir(url, abrir, dormir, reintentos):
    ultimo = None
    for intento in range(reintentos + 1):
        try:
            with abrir(url, timeout=120) as r:
                texto = r.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            ultimo = f"HTTP {e.code}"
            if e.code in (429, 500, 502, 503, 504):
                dormir(30 * (intento + 1))
                continue
            raise ErrorDeDescarga(f"FIRMS respondió {ultimo}. Revise el MAP_KEY y la región.") from e
        except urllib.error.URLError as e:
            ultimo = str(e.reason)
            dormir(10 * (intento + 1))
            continue
        cabeza = texto.lstrip()[:200].lower()
        if cabeza.startswith("latitude"):
            return texto
        if "limit" in cabeza:            # tope de transacciones: esperar la ventana y reintentar
            ultimo = texto.strip()[:120]
            dormir(VENTANA_S)
            continue
        raise ErrorDeDescarga(f"FIRMS no devolvió datos: {texto.strip()[:200]!r}")
    raise ErrorDeDescarga(f"FIRMS no respondió después de {reintentos + 1} intentos ({ultimo}).")


def descargar_firms(map_key: str, bbox, desde, hasta, carpeta, *, sensores=("MODIS", "VIIRS"),
                    dias: int = MAX_DIAS, max_tx: int = MAX_TX_VENTANA, reintentos: int = 3,
                    abrir=urllib.request.urlopen, dormir=time.sleep, reloj=time.monotonic,
                    progreso=None) -> dict:
    """Descarga MODIS_SP y VIIRS_SNPP_SP de FIRMS para la caja `bbox` (oeste, sur, este, norte).

    Escribe un CSV por sensor en `carpeta` (fire_archive_<FUENTE>_<desde>_<hasta>.csv) y devuelve
    {"MODIS": ruta, "VIIRS": ruta, "filas": {...}, "pedidos": n}.
    """
    if not re.fullmatch(r"[0-9A-Za-z]{32}", str(map_key or "")):
        raise ErrorDeDescarga("El MAP_KEY de FIRMS debe tener 32 caracteres. Se pide gratis en "
                              "https://firms.modaps.eosdis.nasa.gov/api/map_key/")
    area = _area(bbox)
    partes = tramos(desde, hasta, dias)
    carpeta = Path(carpeta)
    carpeta.mkdir(parents=True, exist_ok=True)
    lim = _Limitador(max_tx, VENTANA_S, reloj, dormir)
    out, filas, pedidos = {}, {}, 0
    for sensor in sensores:
        fuente = FUENTES[sensor]
        ruta = carpeta / f"fire_archive_{fuente}_{_fecha(desde).isoformat()}_{_fecha(hasta).isoformat()}.csv"
        cabecera, n = None, 0
        with open(ruta, "w", encoding="utf-8", newline="\n") as f:
            for i, (d, k) in enumerate(partes, 1):
                lim.esperar(k)
                texto = _pedir(f"{API}/{map_key}/{fuente}/{area}/{k}/{d.isoformat()}", abrir, dormir, reintentos)
                pedidos += 1
                lineas = [l for l in texto.splitlines() if l.strip()]
                if cabecera is None:
                    cabecera = lineas[0]
                    f.write(cabecera + "\n")
                elif lineas[0] != cabecera:
                    raise ErrorDeDescarga(f"{fuente}: FIRMS cambió las columnas entre pedidos.")
                for l in lineas[1:]:
                    f.write(l + "\n")
                n += len(lineas) - 1
                if progreso:
                    progreso(sensor, i, len(partes), n)
        out[sensor], filas[sensor] = ruta, n
    out["filas"], out["pedidos"] = filas, pedidos
    return out
