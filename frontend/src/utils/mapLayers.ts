import type * as GeoJSON from 'geojson';
import type * as maplibregl from 'maplibre-gl';
import {
  BASEMAP_LAYER_IDS,
  buildGibsTileUrl,
  formatIsoDate,
  resolveGibsLayerName,
} from '../constants/mapConfig';
import type {
  BaseMapId,
  CellFeatureCollection,
  DynamicImageryId,
  OverlayState,
  PercentileBreaks,
  SensorGroup,
} from '../types/fireMap';
import { percentileColorExpression } from './geo';

export function applyOverlayVisibility(map: maplibregl.Map, overlays: OverlayState) {
  const visibility: Record<string, boolean> = {
    'graticule-grid-layer': overlays.graticule,
    'overlay-basic-reference-layer': overlays.basic,
    'overlay-basic-peru-layer': overlays.basic,
    'overlay-detailed-layer': overlays.detailed,
    'overlay-protected-layer': overlays.protectedAreas,
  };
  Object.entries(visibility).forEach(([id, visible]) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  });
}

export function applyBasemap(map: maplibregl.Map, selected: BaseMapId) {
  (Object.keys(BASEMAP_LAYER_IDS) as BaseMapId[]).forEach((id) => {
    const layerId = BASEMAP_LAYER_IDS[id];
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', id === selected ? 'visible' : 'none');
  });
}

export function updateDynamicImageryLayer(
  map: maplibregl.Map,
  mode: DynamicImageryId,
  sensor: SensorGroup,
  year: number,
  month: number,
  day: number,
) {
  const layerId = 'dynamic-gibs-layer';
  const sourceId = 'dynamic-gibs-source';

  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  const gibsLayer = resolveGibsLayerName(mode, sensor);
  if (!gibsLayer) return;

  const isoDate = formatIsoDate(year, month, day);
  map.addSource(sourceId, {
    type: 'raster',
    tiles: [buildGibsTileUrl(gibsLayer, isoDate)],
    tileSize: 256,
    minzoom: 0,
    maxzoom: 9,
    attribution: `NASA GIBS · ${gibsLayer} (${isoDate})`,
  });

  const beforeLayer = map.getLayer('graticule-grid-layer')
    ? 'graticule-grid-layer'
    : map.getLayer('celdas-fill')
      ? 'celdas-fill'
      : undefined;

  map.addLayer(
    {
      id: layerId,
      type: 'raster',
      source: sourceId,
      paint: { 'raster-opacity': 0.92 },
    },
    beforeLayer,
  );
}

export function buildMapStyle(
  filteredGeoJson: CellFeatureCollection,
  percentileBreaks: PercentileBreaks,
  opacity: number,
): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      'basemap-blue-marble': {
        type: 'raster',
        tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],
        tileSize: 256, minzoom: 0, maxzoom: 8,
        attribution: 'Imagery provided by NASA Global Imagery Browse Services (GIBS) / NASA Earthdata',
      },
      'basemap-firefly': {
        type: 'raster',
        tiles: ['https://fly.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Firefly/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256, minzoom: 0, maxzoom: 19,
        attribution: 'Tiles © Esri — Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      },
      'basemap-streets': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256, minzoom: 0, maxzoom: 19,
        attribution: 'Tiles © Esri — Sources: Esri, HERE, Garmin, USGS, Intermap, and the GIS User Community',
      },
      'basemap-topographic': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256, minzoom: 0, maxzoom: 19,
        attribution: 'Tiles © Esri — Sources: Esri, USGS, Garmin, HERE, and the GIS User Community',
      },
      'celdas-observadas': { type: 'geojson', data: filteredGeoJson as unknown as GeoJSON.FeatureCollection },
      'graticule-grid': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      'overlay-basic-reference': {
        type: 'raster',
        tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256, attribution: 'Reference overlay © Esri',
      },
      'overlay-basic-peru': {
        type: 'raster',
        tiles: ['https://geoservidorperu.minam.gob.pe/arcgis/rest/services/ServicioBase/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256%2C256&format=png32&transparent=true&layers=show%3A8%2C11%2C12%2C13%2C14&f=image'],
        tileSize: 256, attribution: 'Información cartográfica © MINAM Perú',
      },
      'overlay-detailed': {
        type: 'raster',
        tiles: ['https://geoservidorperu.minam.gob.pe/arcgis/rest/services/ServicioBase/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256%2C256&format=png32&transparent=true&layers=show%3A0%2C1%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14&f=image'],
        tileSize: 256, attribution: 'Cartografía detallada © MINAM Perú',
      },
      'overlay-protected': {
        type: 'raster',
        tiles: ['https://geoservidorperu.minam.gob.pe/arcgis/rest/services/ServicioANP/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256%2C256&format=png32&transparent=true&layers=show%3A0%2C1%2C2%2C3%2C4%2C5%2C6&f=image'],
        tileSize: 256, attribution: 'Áreas Naturales Protegidas © MINAM Perú — Nivel Nacional',
      },
    },
    layers: [
      { id: 'bg-fallback', type: 'background', paint: { 'background-color': '#14213D' } },
      { id: 'basemap-blue-marble-layer', type: 'raster', source: 'basemap-blue-marble', layout: { visibility: 'visible' } },
      { id: 'basemap-firefly-layer', type: 'raster', source: 'basemap-firefly', layout: { visibility: 'none' } },
      { id: 'basemap-streets-layer', type: 'raster', source: 'basemap-streets', layout: { visibility: 'none' } },
      { id: 'basemap-topographic-layer', type: 'raster', source: 'basemap-topographic', layout: { visibility: 'none' } },
      {
        id: 'graticule-grid-layer', type: 'line', source: 'graticule-grid', layout: { visibility: 'none' },
        paint: { 'line-color': '#FFFFFF', 'line-width': 1, 'line-opacity': 0.72, 'line-dasharray': [2, 2] },
      },
      { id: 'overlay-basic-reference-layer', type: 'raster', source: 'overlay-basic-reference', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.90 } },
      { id: 'overlay-basic-peru-layer', type: 'raster', source: 'overlay-basic-peru', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.90 } },
      { id: 'overlay-detailed-layer', type: 'raster', source: 'overlay-detailed', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.90 } },
      { id: 'overlay-protected-layer', type: 'raster', source: 'overlay-protected', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.72 } },
      {
        id: 'celdas-fill', type: 'fill', source: 'celdas-observadas',
        paint: { 'fill-color': percentileColorExpression(percentileBreaks.q25, percentileBreaks.q50, percentileBreaks.q75), 'fill-opacity': opacity },
      },
      { id: 'celdas-line', type: 'line', source: 'celdas-observadas', paint: { 'line-color': '#14213D', 'line-width': 1 } },
    ],
  };
}
