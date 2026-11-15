"""P18 - Manifest nacional (scripts/08_manifest.py --peru, contrato v1.1 seccion H). Solo datos DEMO."""

from __future__ import annotations

import hashlib
import importlib
import json

import pytest

mf = importlib.import_module("scripts.08_manifest")


def _series(path, regions, months=(("2013", "1"), ("2026", "7"))):
    lines = ["region_id,year,month,sensor_group,cell_days,status,source_version,updated_at"]
    for region in regions:
        for year, month in months:
            lines.append(f"{region},{year},{month},MODIS,1,ok,6.03,2026-11-15")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")


def _deliver(tmp_path, regions=None):
    _series(tmp_path / "monthly_series.csv", regions or mf.PERU_REGIONS)
    for year in (2013, 2026):
        (tmp_path / f"cells_PE_{year}.geojson").write_text('{"type":"FeatureCollection","features":[]}\n', encoding="utf-8", newline="\n")
    (tmp_path / "cells_PE-UCA_2024.geojson").write_text("{}\n", encoding="utf-8", newline="\n")  # del piloto: no debe entrar


def test_peru_manifest_has_v11_fields(tmp_path):
    _deliver(tmp_path)
    manifest = mf.build_manifest(tmp_path, tmp_path / "no_info.json", "PE", generated_at="2026-11-15T15:00:00Z", peru=True)
    assert manifest["region_id"] == "PE"
    assert manifest["contract_version"] == "1.1"
    assert manifest["regions"] == ["PE"] + [f"PE-{i:02d}" for i in range(1, 26)] and len(manifest["regions"]) == 26
    assert manifest["periodo"] == {"desde": "2013-01", "hasta": "2026-07"}


def test_peru_manifest_lists_only_national_maps_with_hashes(tmp_path):
    _deliver(tmp_path)
    manifest = mf.build_manifest(tmp_path, tmp_path / "no_info.json", "PE", peru=True)
    assert manifest["files"] == ["monthly_series.csv", "cells_PE_2013.geojson", "cells_PE_2026.geojson"]
    expected = hashlib.sha256((tmp_path / "cells_PE_2026.geojson").read_bytes()).hexdigest()
    assert manifest["hash"]["cells_PE_2026.geojson"] == "sha256:" + expected


def test_peru_manifest_rejects_missing_regions(tmp_path):
    _deliver(tmp_path, regions=mf.PERU_REGIONS[:-1])
    with pytest.raises(ValueError, match="PE-25"):
        mf.build_manifest(tmp_path, tmp_path / "no_info.json", "PE", peru=True)


def test_peru_manifest_rejects_extra_regions(tmp_path):
    _deliver(tmp_path, regions=mf.PERU_REGIONS + ["PE-SIN-25"])
    with pytest.raises(ValueError, match="PE-SIN-25"):
        mf.build_manifest(tmp_path, tmp_path / "no_info.json", "PE", peru=True)


def test_pilot_manifest_is_unchanged(tmp_path):
    (tmp_path / "monthly_series.csv").write_text("region_id,year,month\nX,2024,8\n", encoding="utf-8")
    manifest = mf.build_manifest(tmp_path, tmp_path / "no_info.json", "PE-UCA")
    assert "contract_version" not in manifest and "regions" not in manifest


def test_main_peru_writes_lf_and_stops_on_wrong_regions(tmp_path, capsys):
    _deliver(tmp_path)
    assert mf.main(["--peru", "--dir", str(tmp_path), "--info", str(tmp_path / "no_info.json")]) == 0
    raw = (tmp_path / "manifest.json").read_bytes()
    assert b"\r" not in raw and json.loads(raw)["region_id"] == "PE"
    _deliver(tmp_path, regions=mf.PERU_REGIONS[:5])
    assert mf.main(["--peru", "--dir", str(tmp_path), "--info", str(tmp_path / "no_info.json")]) == 1
    assert "ERROR" in capsys.readouterr().err
