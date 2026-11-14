"""Paso 1 - Verifica y prepara los archivos crudos de FIRMS.

La solicitud al Archive Download de FIRMS se hace a mano en la web y se confirma
por correo, por lo que este script NO descarga nada: comprueba que los zips que
llegaron esten en data/raw/, verifica su SHA-256 contra el registrado en
docs/datos.md y extrae solo el archivo estandar (fire_archive_*) a un nombre fijo:

    data/raw/firms_raw_modis.csv
    data/raw/firms_raw_viirs_snpp.csv

Los archivos NRT (fire_nrt_*) se ignoran a proposito: son otra version y no traen
la columna `type`, asi que el QC estricto no se podria aplicar igual.

Uso (sin preguntas interactivas):
    python scripts/01_download.py
    python scripts/01_download.py --raw-dir data/raw --skip-hash
"""

from __future__ import annotations

import argparse
import hashlib
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Procedencia: ver docs/datos.md (descarga del 2026-11-14, area Peru, formato CSV).
EXPECTED = {
    "modis": {
        "zip": "DL_FIRE_M-C61_848370.zip",
        "sha256": "26cf9ee849ee4736c9c321ad79445275d908cb9f3b50c959d26eecfda4d972a6",
        "archive_csv": "fire_archive_M-C61_848370.csv",
    },
    "viirs_snpp": {
        "zip": "DL_FIRE_SV-C2_848371.zip",
        "sha256": "f6b49a31341a195d5321caf061866ed5a7b1d285714a3e48b530596700f6a2f9",
        "archive_csv": "fire_archive_SV-C2_848371.csv",
    },
}


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def prepare_sensor(sensor: str, raw_dir: Path, skip_hash: bool) -> Path:
    spec = EXPECTED[sensor]
    zip_path = raw_dir / spec["zip"]
    if not zip_path.exists():
        raise FileNotFoundError(
            f"Falta {zip_path}. Descargalo de FIRMS (ver docs/datos.md) y guardalo en {raw_dir}."
        )

    actual = sha256_of(zip_path)
    if actual != spec["sha256"]:
        message = (
            f"SHA-256 distinto para {zip_path.name}:\n  esperado {spec['sha256']}\n  obtenido {actual}"
        )
        if not skip_hash:
            raise ValueError(message + "\nSi FIRMS regenero el archivo, usa --skip-hash y actualiza docs/datos.md.")
        print("AVISO:", message)

    target = raw_dir / f"firms_raw_{sensor}.csv"
    with zipfile.ZipFile(zip_path) as archive:
        if spec["archive_csv"] not in archive.namelist():
            raise ValueError(f"{zip_path.name} no contiene {spec['archive_csv']}.")
        with archive.open(spec["archive_csv"]) as source, target.open("wb") as out:
            shutil.copyfileobj(source, out)
    return target


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--raw-dir", type=Path, default=ROOT / "data" / "raw")
    parser.add_argument("--skip-hash", action="store_true", help="No fallar si el SHA-256 no coincide.")
    args = parser.parse_args(argv)

    try:
        for sensor in EXPECTED:
            target = prepare_sensor(sensor, args.raw_dir, args.skip_hash)
            print(f"OK {sensor}: {target} ({target.stat().st_size / 1e6:.1f} MB)")
    except (FileNotFoundError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
