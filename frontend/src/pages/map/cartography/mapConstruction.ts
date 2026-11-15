import { DEPARTMENT_SOURCE, DEPARTMENT_SQUARE_SOURCE, departmentLayers } from './departmentLayers'
// Map style and layers retained from Juan Matias.
import type * as GeoJSON from "geojson";
import type { MapRuntime } from "./mapRuntime.ts";
import { percentileColorExpression } from "./juanLayers.ts";
import type { MapCells } from "../../../services/data/mapExploration.ts";
import { localOpacity, outlineWidth, outlineOpacity, summarySource, summaryLayers, SUMMARY_SOURCE, LOCAL_ZOOM, SQUARE_IMAGE, squareImage } from './multiscaleLayers'
import type { SummaryPoints } from '../../../services/data/mapSymbols'
export function createJuanMap(runtime: MapRuntime, container: HTMLDivElement, filteredGeoJson: MapCells, percentileBreaks: {q25:number;q50:number;q75:number}, opacity: number, points: SummaryPoints) {
    const map = new runtime.Map({
      container: container,

      style: {
        version: 8,

        sources: {
          [DEPARTMENT_SOURCE]: {type:'geojson',data:{type:'FeatureCollection',features:[]}},
          [DEPARTMENT_SQUARE_SOURCE]: {type:'geojson',data:{type:'FeatureCollection',features:[]}},
          [SUMMARY_SOURCE]: summarySource(points),
          // --------------------------------------------------------------
          // BLUE MARBLE
          // --------------------------------------------------------------
          'basemap-blue-marble': {
            type: 'raster',
            tiles: [
              'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg',
            ],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 8,
            attribution:
              'Imagery provided by NASA Global Imagery Browse Services (GIBS) / NASA Earthdata',
          },

          // --------------------------------------------------------------
          // FIREFLY
          // --------------------------------------------------------------
          'basemap-firefly': {
            type: 'raster',
            tiles: [
              'https://fly.maptiles.arcgis.com/arcgis/rest/services/World_Imagery_Firefly/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 19,
            attribution:
              'Tiles © Esri — Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
          },

          // --------------------------------------------------------------
          // STREETS
          // --------------------------------------------------------------
          'basemap-streets': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 19,
            attribution:
              'Tiles © Esri — Sources: Esri, HERE, Garmin, USGS, Intermap, and the GIS User Community',
          },

          // --------------------------------------------------------------
          // TOPOGRAPHIC
          // --------------------------------------------------------------
          'basemap-topographic': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 19,
            attribution:
              'Tiles © Esri — Sources: Esri, USGS, Garmin, HERE, and the GIS User Community',
          },

          // --------------------------------------------------------------
          // OBSERVED CELLS
          // --------------------------------------------------------------
          'celdas-observadas': {
            type: 'geojson',
            data: filteredGeoJson as unknown as GeoJSON.FeatureCollection,
          },

          // --------------------------------------------------------------
          // OVERLAY: GRATICULE
          // --------------------------------------------------------------
          'graticule-grid': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          },

          // --------------------------------------------------------------
          // OVERLAY: BASIC WORLD REFERENCES
          // --------------------------------------------------------------
          'overlay-basic-reference': {
            type: 'raster',
            tiles: [
              'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Reference overlay © Esri',
          },

          // --------------------------------------------------------------
          // OVERLAY: BASIC CARTOGRAPHY, PERU
          // --------------------------------------------------------------
          'overlay-basic-peru': {
            type: 'raster',
            tiles: [
              'https://geoservidorperu.minam.gob.pe/arcgis/rest/services/ServicioBase/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256%2C256&format=png32&transparent=true&layers=show%3A8%2C11%2C12%2C13%2C14&f=image',
            ],
            tileSize: 256,
            attribution: 'Base cartography © MINAM Peru',
          },

          // --------------------------------------------------------------
          // OVERLAY: DETAILED CARTOGRAPHY, PERU
          // --------------------------------------------------------------
          'overlay-detailed': {
            type: 'raster',
            tiles: [
              'https://geoservidorperu.minam.gob.pe/arcgis/rest/services/ServicioBase/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256%2C256&format=png32&transparent=true&layers=show%3A0%2C1%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14&f=image',
            ],
            tileSize: 256,
            attribution: 'Detailed cartography © MINAM Peru',
          },

          // --------------------------------------------------------------
          // OVERLAY: PROTECTED NATURAL AREAS, ALL OF PERU (C7)
          // --------------------------------------------------------------
          'overlay-protected': {
            type: 'raster',
            tiles: [
              'https://geoservidorperu.minam.gob.pe/arcgis/rest/services/ServicioANP/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256%2C256&format=png32&transparent=true&layers=show%3A6&f=image',
            ],
            tileSize: 256,
            attribution: 'Protected natural areas © MINAM Peru',
          },
        },

        layers: [
          {
            id: 'bg-fallback',
            type: 'background',
            paint: {
              'background-color': '#0B1736',
            },
          },

          // Base maps.
          {
            id: 'basemap-blue-marble-layer',
            type: 'raster',
            source: 'basemap-blue-marble',
            layout: { visibility: 'visible' },
            // Darkened satellite: the observations are the only bright element (A4).
            paint: { 'raster-brightness-max': 0.72, 'raster-saturation': -0.25 },
          },
          {
            id: 'basemap-firefly-layer',
            type: 'raster',
            source: 'basemap-firefly',
            layout: { visibility: 'none' },
            paint: { 'raster-brightness-max': 0.8 },
          },
          {
            id: 'basemap-streets-layer',
            type: 'raster',
            source: 'basemap-streets',
            layout: { visibility: 'none' },
          },
          {
            id: 'basemap-topographic-layer',
            type: 'raster',
            source: 'basemap-topographic',
            layout: { visibility: 'none' },
          },

          // Graticule.
          {
            id: 'graticule-grid-layer',
            type: 'line',
            source: 'graticule-grid',
            layout: { visibility: 'none' },
            paint: {
              'line-color': '#FFFFFF',
              'line-width': 1,
              'line-opacity': 0.72,
              'line-dasharray': [2, 2],
            },
          },

          // Reference layers.
          {
            id: 'overlay-basic-reference-layer',
            type: 'raster',
            source: 'overlay-basic-reference',
            layout: { visibility: 'none' },
            paint: { 'raster-opacity': 0.90 },
          },
          {
            id: 'overlay-basic-peru-layer',
            type: 'raster',
            source: 'overlay-basic-peru',
            layout: { visibility: 'none' },
            paint: { 'raster-opacity': 0.90 },
          },
          {
            id: 'overlay-detailed-layer',
            type: 'raster',
            source: 'overlay-detailed',
            layout: { visibility: 'none' },
            paint: { 'raster-opacity': 0.90 },
          },
          {
            id: 'overlay-protected-layer',
            type: 'raster',
            source: 'overlay-protected',
            layout: { visibility: 'none' },
            paint: { 'raster-opacity': 0.72 },
          },

          // Observed cells.
          {
            id: 'celdas-fill',
            type: 'fill',
            source: 'celdas-observadas',
            minzoom: LOCAL_ZOOM,
            paint: {
              'fill-color': percentileColorExpression(
                percentileBreaks.q25,
                percentileBreaks.q50,
                percentileBreaks.q75,
              ),
              'fill-opacity': localOpacity(opacity),
              'fill-antialias': false,
            },
          },
          {
            id: 'celdas-line',
            type: 'line',
            source: 'celdas-observadas',
            minzoom: LOCAL_ZOOM,
            paint: {
              'line-color': '#FFEBB8',
              'line-width': outlineWidth,
              'line-opacity': outlineOpacity,
            },
          },
          ...summaryLayers(opacity, percentileBreaks),
          ...departmentLayers(),
        ],
      },

      center: [
        0,
        0,
      ],
      zoom: 1,
    });

    const installSquare = () => { if (!map.hasImage(SQUARE_IMAGE)) map.addImage(SQUARE_IMAGE, squareImage(), {sdf:true}) }
    map.on('styleimagemissing', event => { if (event.id === SQUARE_IMAGE) installSquare() })
    map.once('load', installSquare)
    map.addControl(
      new runtime.NavigationControl({
        showCompass: true,
      }),
      'top-left',
    );

    map.addControl(
      new runtime.ScaleControl({
        maxWidth: 120,
        unit: 'metric',
      }),
      'bottom-left',
    );


return map;
}
