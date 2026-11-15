import type * as GeoJSON from 'geojson';
import type * as maplibregl from 'maplibre-gl';
import type { CellFeature, CellFeatureCollection } from '../types/fireMap';

export function validateGeoJson(input: unknown): {
  valid: boolean;
  data: CellFeatureCollection;
  error: string | null;
} {
  const empty: CellFeatureCollection = { type: 'FeatureCollection', features: [] };
  if (!input || typeof input !== 'object') {
    return { valid: false, data: empty, error: 'Archivo GeoJSON vacío o no es un objeto válido.' };
  }
  const candidate = input as Record<string, unknown>;
  if (candidate.type !== 'FeatureCollection' || !Array.isArray(candidate.features)) {
    return { valid: false, data: empty, error: 'Formato inválido: se esperaba un FeatureCollection con arreglo features.' };
  }
  const validFeatures: CellFeature[] = [];
  for (const item of candidate.features) {
    if (!item || typeof item !== 'object') continue;
    const feature = item as Record<string, unknown>;
    const properties = feature.properties as Record<string, unknown> | undefined;
    const geometry = feature.geometry as Record<string, unknown> | undefined;
    if (
      feature.type === 'Feature' &&
      properties &&
      typeof properties.id === 'string' &&
      typeof properties.year === 'number' &&
      typeof properties.month === 'number' &&
      (properties.sensor === 'MODIS_TA' || properties.sensor === 'VIIRS_SNPP') &&
      typeof properties.cell_days === 'number' &&
      Number.isFinite(properties.cell_days) &&
      geometry &&
      (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') &&
      Array.isArray(geometry.coordinates)
    ) {
      validFeatures.push(item as CellFeature);
    }
  }
  return { valid: true, data: { type: 'FeatureCollection', features: validFeatures }, error: null };
}

export function distanceMeters(a: maplibregl.LngLat, b: maplibregl.LngLat): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function niceDistance(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1000;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const fraction = value / magnitude;
  const nice = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10;
  return nice * magnitude;
}

function getGraticuleInterval(zoom: number): number {
  if (zoom >= 11) return 0.25;
  if (zoom >= 9) return 0.5;
  if (zoom >= 7) return 1;
  if (zoom >= 5) return 2;
  if (zoom >= 4) return 5;
  if (zoom >= 3) return 10;
  return 30;
}

export function buildGraticuleGeoJSON(
  bounds: maplibregl.LngLatBounds,
  zoom: number,
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const step = getGraticuleInterval(zoom);
  const west = Math.max(-180, bounds.getWest());
  const east = Math.min(180, bounds.getEast());
  const south = Math.max(-85, bounds.getSouth());
  const north = Math.min(85, bounds.getNorth());
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

  for (let lon = Math.ceil(west / step) * step; lon <= east; lon += step) {
    const coordinates: GeoJSON.Position[] = [];
    for (let i = 0; i <= 40; i++) coordinates.push([lon, south + ((north - south) * i) / 40]);
    features.push({ type: 'Feature', properties: { axis: 'longitude', coordinate: lon }, geometry: { type: 'LineString', coordinates } });
  }
  for (let lat = Math.ceil(south / step) * step; lat <= north; lat += step) {
    const coordinates: GeoJSON.Position[] = [];
    for (let i = 0; i <= 60; i++) coordinates.push([west + ((east - west) * i) / 60, lat]);
    features.push({ type: 'Feature', properties: { axis: 'latitude', coordinate: lat }, geometry: { type: 'LineString', coordinates } });
  }
  return { type: 'FeatureCollection', features };
}

export function calculatePercentile(values: number[], percentile: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * percentile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const fraction = position - lower;
  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

export function percentileColorExpression(q25: number, q50: number, q75: number): any {
  return ['case', ['<=', ['get', 'cell_days'], q25], '#FEE2E2', ['<=', ['get', 'cell_days'], q50], '#FCA5A5', ['<=', ['get', 'cell_days'], q75], '#EF4444', '#991B1B'];
}
