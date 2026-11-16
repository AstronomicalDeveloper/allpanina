// Adapted from Juan Matias: docs/NASA SAC.zip, src/FireMapTest.tsx.
import type * as MapLibre from "maplibre-gl";
import type * as GeoJSON from "geojson";
export type BaseMapId =
  | 'blue-marble'
  | 'firefly'
  | 'streets'
  | 'topographic'
  | 'none';

export const BASEMAP_OPTIONS: {
  id: BaseMapId;
  label: string;
  description: string;
}[] = [
  { id: 'blue-marble', label: 'Satellite', description: 'Blue Marble · NASA GIBS' },
  { id: 'firefly', label: 'Dark satellite', description: 'Firefly · Esri' },
  { id: 'topographic', label: 'Topographic', description: 'Esri' },
  { id: 'none', label: 'None', description: 'Plain background' },
];

/**
 * If a base map provider fails, the map switches to the next one (C4):
 * Blue Marble -> Firefly -> Topographic -> none. Observations stay on screen.
 */
export const BASEMAP_FALLBACK: Record<BaseMapId, BaseMapId | null> = {
  'blue-marble': 'firefly',
  firefly: 'topographic',
  streets: 'topographic',
  topographic: 'none',
  none: null,
};

/** Light base maps need the light fire scale; dark ones (and none) the dark scale. */
export const LIGHT_BASEMAPS: ReadonlySet<BaseMapId> = new Set(['streets', 'topographic']);

const BASEMAP_LAYER_IDS: Record<Exclude<BaseMapId, 'none'>, string> = {
  'blue-marble': 'basemap-blue-marble-layer',
  firefly: 'basemap-firefly-layer',
  streets: 'basemap-streets-layer',
  topographic: 'basemap-topographic-layer',
};

/** Source id of each base map, as declared in the map style (used to detect provider errors). */
export const BASEMAP_SOURCE_IDS: Record<Exclude<BaseMapId, 'none'>, string> = {
  'blue-marble': 'basemap-blue-marble',
  firefly: 'basemap-firefly',
  streets: 'basemap-streets',
  topographic: 'basemap-topographic',
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

  // Meridians.
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

  // Parallels.
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
// 7. PERCENTILE CLASSES
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

/**
 * Four percentile classes with the fire scale of the visual system (A2). On dark base maps the scale is
 * inverted (intense = light, like embers); on light base maps intense = dark. Same breaks, same values.
 */
export const OBSERVATION_COLORS = {
  dark: ['#96350F', '#DE6216', '#FCA548', '#FFEBB8'],
  light: ['#FFC062', '#EF781E', '#B23A0E', '#5A1909'],
} as const;
export type ObservationPalette = keyof typeof OBSERVATION_COLORS;

export function paletteFor(baseMap: BaseMapId): ObservationPalette {
  return LIGHT_BASEMAPS.has(baseMap) ? 'light' : 'dark';
}

export function percentileColorExpression(
  q25: number,
  q50: number,
  q75: number,
  palette: ObservationPalette = 'dark',
): MapLibre.ExpressionSpecification {
  const [c1, c2, c3, c4] = OBSERVATION_COLORS[palette];
  return [
    'case',
    ['<=', ['get', 'cell_days'], q25],
    c1,
    ['<=', ['get', 'cell_days'], q50],
    c2,
    ['<=', ['get', 'cell_days'], q75],
    c3,
    c4,
  ];
}

// ============================================================================
// 8. LAYER VISIBILITY
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
    Object.keys(BASEMAP_LAYER_IDS) as Exclude<BaseMapId, 'none'>[]
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
