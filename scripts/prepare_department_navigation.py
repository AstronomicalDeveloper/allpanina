"""Derive lightweight navigation boundaries; never process observation values.
Run from repository root with the scientific requirements already installed.
"""
import hashlib
import json
from pathlib import Path
from pyproj import Transformer
from shapely.geometry import shape, mapping
from shapely.geometry.polygon import orient
from shapely import transform
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tests/fixtures/region/departamentos_inei_2023.geojson"
TARGET = ROOT / "frontend/public/cartography/departamentos_inei_2023.navigation.geojson"
TOLERANCE_METRES = 100

def main():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    forward = Transformer.from_crs("EPSG:4326", "EPSG:6933", always_xy=True).transform
    backward = Transformer.from_crs("EPSG:6933", "EPSG:4326", always_xy=True).transform
    def project(geometry, converter):
        return transform(geometry, lambda coords: np.column_stack(converter(coords[:, 0], coords[:, 1])))
    features = []
    for feature in source["features"]:
        props = feature["properties"]
        geometry = shape(feature["geometry"])
        if not geometry.is_valid:
            raise ValueError(f"Invalid original boundary: {props['region_id']}")
        simplified = project(project(geometry, forward).simplify(TOLERANCE_METRES, preserve_topology=True), backward)
        # Normalize exterior CCW and interior CW for the client-side visual mask.
        if simplified.geom_type == "MultiPolygon":
            from shapely.geometry import MultiPolygon
            simplified = MultiPolygon([orient(p, sign=1) for p in simplified.geoms])
        else:
            simplified = orient(simplified, sign=1)
        if not simplified.is_valid or simplified.is_empty:
            raise ValueError(f"Invalid derived boundary: {props['region_id']}")
        features.append({"type": "Feature", "properties": {
            "region_id": props["region_id"], "nombre": props["nombdep"],
            "bounds": list(geometry.bounds),
        }, "geometry": mapping(simplified)})
    ids = {f["properties"]["region_id"] for f in features}
    if ids != {f"PE-{n:02d}" for n in range(1, 26)}:
        raise ValueError("Expected exactly 25 departments")
    result = {"type": "FeatureCollection", "source": "INEI Departamental 2023",
        "source_sha256": hashlib.sha256(raw).hexdigest(), "tolerance_metres": TOLERANCE_METRES,
        "purpose": "navigation_only", "features": features}
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(features)} departments: {len(raw)} -> {TARGET.stat().st_size} bytes")

if __name__ == "__main__":
    main()
