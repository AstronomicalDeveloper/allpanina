"""allpanina.descarga: descarga de FIRMS por la API de área, sin red (FIRMS simulado)."""
import io
import urllib.error
from datetime import date

import pytest

from allpanina.descarga import API, ErrorDeDescarga, _Limitador, descargar_firms, tramos

KEY = "0123456789abcdef0123456789abcdef"
CAB = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight,type"


class _Resp(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def _firms(respuestas=None):
    """Simula FIRMS: devuelve una fila por pedido con la fecha del pedido, y registra las URL."""
    urls = []

    def abrir(url, timeout=None):
        urls.append(url)
        if respuestas:
            r = respuestas.pop(0)
            if isinstance(r, Exception):
                raise r
            return _Resp(r.encode())
        d = url.rsplit("/", 1)[1]
        return _Resp(f"{CAB}\n-32.9,-68.8,320,1,1,{d},1530,Terra,MODIS,80,61.03,300,10,D,0\n".encode())
    return abrir, urls


def test_tramos_de_10_dias_como_maximo():
    t = tramos("2020-01-01", "2020-01-25")
    assert t == [(date(2020, 1, 1), 10), (date(2020, 1, 11), 10), (date(2020, 1, 21), 5)]
    with pytest.raises(ValueError):
        tramos("2020-01-01", "2020-01-02", dias=11)


def test_descarga_arma_urls_y_une_csv(tmp_path):
    abrir, urls = _firms()
    r = descargar_firms(KEY, (-70.6, -37.6, -66.5, -32.0), "2020-01-01", "2020-01-25", tmp_path,
                        abrir=abrir, dormir=lambda s: None)
    assert urls[0] == f"{API}/{KEY}/MODIS_SP/-70.6,-37.6,-66.5,-32/10/2020-01-01"
    assert urls[3] == f"{API}/{KEY}/VIIRS_SNPP_SP/-70.6,-37.6,-66.5,-32/10/2020-01-01"
    assert r["pedidos"] == 6 and r["filas"] == {"MODIS": 3, "VIIRS": 3}
    lineas = r["MODIS"].read_text(encoding="utf-8").splitlines()
    assert lineas[0] == CAB and len(lineas) == 4          # una sola cabecera
    assert r["MODIS"].name == "fire_archive_MODIS_SP_2020-01-01_2020-01-25.csv"


def test_map_key_invalido_y_respuesta_de_error(tmp_path):
    with pytest.raises(ErrorDeDescarga, match="32 caracteres"):
        descargar_firms("corta", (-70, -37, -66, -32), "2020-01-01", "2020-01-02", tmp_path)
    abrir, _ = _firms(["Invalid MAP_KEY."])
    with pytest.raises(ErrorDeDescarga, match="Invalid MAP_KEY"):
        descargar_firms(KEY, (-70, -37, -66, -32), "2020-01-01", "2020-01-02", tmp_path,
                        abrir=abrir, dormir=lambda s: None)


def test_reintenta_ante_error_temporal(tmp_path):
    err = urllib.error.HTTPError("u", 503, "busy", {}, None)
    abrir, urls = _firms([err, f"{CAB}\n", f"{CAB}\n"])
    pausas = []
    r = descargar_firms(KEY, (-70, -37, -66, -32), "2020-01-01", "2020-01-02", tmp_path,
                        abrir=abrir, dormir=pausas.append)
    assert len(urls) == 3 and pausas and r["filas"] == {"MODIS": 0, "VIIRS": 0}


def test_caja_invalida(tmp_path):
    with pytest.raises(ValueError, match="oeste, sur, este, norte"):
        descargar_firms(KEY, (-66, -37, -70, -32), "2020-01-01", "2020-01-02", tmp_path)


def test_limitador_respeta_el_tope():
    t = [0.0]
    pausas = []

    def dormir(s):
        pausas.append(s)
        t[0] += s
    lim = _Limitador(20, 600, reloj=lambda: t[0], dormir=dormir)
    lim.esperar(10)
    lim.esperar(10)
    assert not pausas
    lim.esperar(10)                                         # pasaría de 20: espera la ventana
    assert pausas and t[0] >= 600
