"""T05/T31 - Hashes de los zips, preparacion de crudos y manifest (scripts/01 y 08)."""
import hashlib
import importlib
import json
import zipfile
from pathlib import Path

import pytest

dl = importlib.import_module("scripts.01_download")
mf = importlib.import_module("scripts.08_manifest")

ROOT = Path(__file__).resolve().parent.parent


def test_hashes_match_docs_datos():
    text = (ROOT / "docs" / "datos.md").read_text(encoding="utf-8")
    for spec in dl.EXPECTED.values():
        assert spec["sha256"] in text and spec["zip"] in text


def _fake_zip(directory: Path, sensor: str, payload: bytes = b"a,b\n1,2\n") -> Path:
    spec = dl.EXPECTED[sensor]
    path = directory / spec["zip"]
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr(spec["archive_csv"], payload)
        archive.writestr(spec["archive_csv"].replace("archive", "nrt"), b"x\n")
    return path


def test_prepare_extracts_only_the_standard_archive(tmp_path):
    _fake_zip(tmp_path, "modis")
    target = dl.prepare_sensor("modis", tmp_path / "raw", skip_hash=True, search_dirs=[tmp_path])
    assert target.read_bytes() == b"a,b\n1,2\n"


def test_prepare_fails_on_hash_mismatch_unless_skipped(tmp_path):
    _fake_zip(tmp_path, "modis")
    with pytest.raises(ValueError, match="SHA-256"):
        dl.prepare_sensor("modis", tmp_path / "raw", skip_hash=False, search_dirs=[tmp_path])


def test_missing_zip_fails_clearly(tmp_path):
    with pytest.raises(FileNotFoundError, match="DL_FIRE_SV-C2_848371.zip"):
        dl.locate_zip("viirs_snpp", [tmp_path])


def test_manifest_lists_names_hashes_and_sources(tmp_path):
    (tmp_path / "monthly_series.csv").write_text("region_id,year,month\nX,2024,8\nX,2024,9\n", encoding="utf-8")
    (tmp_path / "cells_PE-UCA_2024.geojson").write_text('{"type":"FeatureCollection","features":[]}\n', encoding="utf-8")
    info = {"MODIS": {"csv": "m.csv", "rows_raw": 3, "first_date": "2003-01-02", "last_date": "2026-08-31", "versions": ["61.03"]}}
    (tmp_path / "source_info.json").write_text(json.dumps(info), encoding="utf-8")

    manifest = mf.build_manifest(tmp_path, tmp_path / "source_info.json", "PE-UCA", generated_at="2026-11-14T18:00:00Z")
    assert manifest["region_id"] == "PE-UCA" and manifest["generated_at"] == "2026-11-14T18:00:00Z"
    assert manifest["files"] == ["monthly_series.csv", "cells_PE-UCA_2024.geojson"]  # lista simple de nombres
    expected = hashlib.sha256((tmp_path / "monthly_series.csv").read_bytes()).hexdigest()
    assert manifest["hash"]["monthly_series.csv"] == "sha256:" + expected
    assert manifest["producto"] == "MCD14ML v6.1 / VNP14IMGML v2"
    assert manifest["sources"]["MODIS"]["zip_sha256"] == dl.EXPECTED["modis"]["sha256"]
    assert manifest["sources"]["MODIS"]["first_date"] == "2003-01-02"
    assert manifest["periodo"] == {"desde": "2024-08", "hasta": "2024-09"}


def test_missing_deliverables_are_reported_not_listed(tmp_path):
    (tmp_path / "monthly_series.csv").write_text("year,month\n2024,8\n", encoding="utf-8")
    present, missing = mf.list_deliverables(tmp_path, "PE-UCA")
    assert present == ["monthly_series.csv"]
    assert "validation.json" in missing and "cells_PE-UCA_<anio>.geojson" in missing
