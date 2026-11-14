// Adapted from Juan Matias: docs/NASA SAC.zip, src/FireMapTest.tsx.
import type * as MapLibre from "maplibre-gl";
import type * as GeoJSON from "geojson";
export type BaseMapId =
  | 'blue-marble'
  | 'firefly'
  | 'streets'
  | 'topographic';

export const BASEMAP_OPTIONS: {
  id: BaseMapId;
  label: string;
  description: string;
}[] = [
  {
    id: 'blue-marble',
    label: 'Blue Marble',
    description: 'Satélite natural',
  },
  {
    id: 'firefly',
    label: 'Firefly',
    description: 'Satélite desaturado',
  },
  {
    id: 'streets',
    label: 'Streets',
    description: 'Calles y carreteras',
  },
  {
    id: 'topographic',
    label: 'Topographic',
    description: 'Relieve y topografía',
  },
];

const BASEMAP_LAYER_IDS: Record<BaseMapId, string> = {
  'blue-marble': 'basemap-blue-marble-layer',
  firefly: 'basemap-firefly-layer',
  streets: 'basemap-streets-layer',
  topographic: 'basemap-topographic-layer',
};

export interface OverlayState {
  graticule: boolean;
  basic: boolean;
  detailed: boolean;
  protectedAreas: boolean;
}

export function getGraticuleInterval(zoom: number): number {
  if (zoom >= 11) return 0.25;
  if (zoom >= 9) return 0.5;
  if (zoom >= 7) return 1;
  if (zoom >= 5) return 2;
  if (zoom >= 4) return 5;
  if (zoom >= 3) return 10;
  return 30;
}

export function buildGraticuleGeoJSON(
  bounds: MapLibre.LngLatBounds,
  zoom: number,
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const step = getGraticuleInterval(zoom);

  const west = Math.max(-180, bounds.getWest());
  const east = Math.min(180, bounds.getEast());
  const south = Math.max(-85, bounds.getSouth());
  const north = Math.min(85, bounds.getNorth());

  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

  // Meridianos.
  for (
    let lon = Math.ceil(west / step) * step;
    lon <= east;
    lon += step
  ) {
    const coordinates: GeoJSON.Position[] = [];

    for (let i = 0; i <= 40; i++) {
      const lat = south + ((north - south) * i) / 40;
      coordinates.push([lon, lat]);
    }

    features.push({
      type: 'Feature',
      properties: {
        axis: 'longitude',
        coordinate: lon,
      },
      geometry: {
        type: 'LineString',
        coordinates,
      },
    });
  }

  // Paralelos.
  for (
    let lat = Math.ceil(south / step) * step;
    lat <= north;
    lat += step
  ) {
    const coordinates: GeoJSON.Position[] = [];

    for (let i = 0; i <= 60; i++) {
      const lon = west + ((east - west) * i) / 60;
      coordinates.push([lon, lat]);
    }

    features.push({
      type: 'Feature',
      properties: {
        axis: 'latitude',
        coordinate: lat,
      },
      geometry: {
        type: 'LineString',
        coordinates,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

// ============================================================================
// 7. CLASIFICACIÓN POR PERCENTILES
// ============================================================================

export function calculatePercentile(
  values: number[],
  percentile: number,
): number {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * percentile;

  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  if (lower === upper) return sorted[lower];

  const fraction = position - lower;

  return (
    sorted[lower] * (1 - fraction) +
    sorted[upper] * fraction
  );
}

export function percentileColorExpression(
  q25: number,
  q50: number,
  q75: number,
): MapLibre.ExpressionSpecification {
  return [
    'case',
    ['<=', ['get', 'n_detections'], q25],
    '#FEE2E2',
    ['<=', ['get', 'n_detections'], q50],
    '#FCA5A5',
    ['<=', ['get', 'n_detections'], q75],
    '#EF4444',
    '#991B1B',
  ];
}

// ============================================================================
// 8. CONTROL DE VISIBILIDAD DE CAPAS
// ============================================================================

export function applyOverlayVisibility(
  map: MapLibre.Map,
  overlays: OverlayState,
) {
  const visibility: Record<string, boolean> = {
    'graticule-grid-layer': overlays.graticule,
    'overlay-basic-reference-layer': overlays.basic,
    'overlay-basic-peru-layer': overlays.basic,
    'overlay-detailed-layer': overlays.detailed,
    'overlay-protected-layer': overlays.protectedAreas,
  };

  Object.entries(visibility).forEach(([id, visible]) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(
        id,
        'visibility',
        visible ? 'visible' : 'none',
      );
    }
  });
}

export function applyBasemap(
  map: MapLibre.Map,
  selected: BaseMapId,
) {
  (
    Object.keys(BASEMAP_LAYER_IDS) as BaseMapId[]
  ).forEach((id) => {
    const layerId = BASEMAP_LAYER_IDS[id];

    if (map.getLayer(layerId)) {
      map.setLayoutProperty(
        layerId,
        'visibility',
        id === selected ? 'visible' : 'none',
      );
    }
  });
}

