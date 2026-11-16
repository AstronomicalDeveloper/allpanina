import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("world_catalogue", ROOT / "scripts/11_world_boundaries.py")
world = importlib.util.module_from_spec(spec)
spec.loader.exec_module(world)


def test_published_country_codes_are_unique_and_regions_retained():
    folder = ROOT / "frontend/public/cartography/world"
    rows = json.loads((folder / "index.json").read_text(encoding="utf-8"))["paises"]
    codes = [row["iso3"] for row in rows]
    assert len(codes) == len(set(codes))
    assert codes.count("IND") == 1
    for row in rows:
        features = json.loads((folder / row["archivo"]).read_text(encoding="utf-8"))["features"]
        assert len(features) == row["regiones"]


def test_generator_coalesces_exact_duplicates_only():
    india = {"boundaryISO": "IND", "boundaryName": "India"}
    assert world.unicos_por_codigo([india, dict(india)], "boundaryISO") == [india]
    with pytest.raises(ValueError, match="IND"):
        world.unicos_por_codigo([india, {**india, "boundaryName": "different"}], "boundaryISO")
