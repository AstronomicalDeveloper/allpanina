// Map style and layers retained from Juan Matias.
import type * as GeoJSON from "geojson";
import type { MapRuntime } from "./mapRuntime.ts";
import { percentileColorExpression } from "./juanLayers.ts";
import type { CellsData } from "../../types/data.ts";
export function createJuanMap(runtime: MapRuntime, container: HTMLDivElement, filteredGeoJson: CellsData, percentileBreaks: {q25:number;q50:number;q75:number}, opacity: number) {
    const map = new runtime.Map({
      container: container,

      style: {
        version: 8,

        sources: {
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
          // CELDAS OBSERVADAS
          // --------------------------------------------------------------
          'celdas-observadas': {
            type: 'geojson',
            data: filteredGeoJson as unknown as GeoJSON.FeatureCollection,
          },

          // --------------------------------------------------------------
          // OVERLAY: CUADRÍCULA
          // --------------------------------------------------------------
          'graticule-grid': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          },

          // --------------------------------------------------------------
          // OVERLAY: REFERENCIAS GLOBALES BÁSICAS
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
          // OVERLAY: CARTOGRAFÍA BÁSICA PERÚ
          // --------------------------------------------------------------
          'overlay-basic-peru': {
            type: 'raster',
            tiles: [
              'https://geoservidorperu.minam.gob.pe/arcgis/rest/services/ServicioBase/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256%2C256&format=png32&transparent=true&layers=show%3A8%2C11%2C12%2C13%2C14&f=image',
            ],
            tileSize: 256,
            attribution: 'Información cartográfica © MINAM Perú',
          },

          // --------------------------------------------------------------
          // OVERLAY: CARTOGRAFÍA DETALLADA PERÚ
          // --------------------------------------------------------------
          'overlay-detailed': {
            type: 'raster',
            tiles: [
              'https://geoservidorperu.minam.gob.pe/arcgis/rest/services/ServicioBase/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256%2C256&format=png32&transparent=true&layers=show%3A0%2C1%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14&f=image',
            ],
            tileSize: 256,
            attribution: 'Cartografía detallada © MINAM Perú',
          },

          // --------------------------------------------------------------
          // OVERLAY: ÁREAS NATURALES PROTEGIDAS UCAYALI
          // --------------------------------------------------------------
          'overlay-protected': {
            type: 'raster',
            tiles: [
              'https://geoservidorperu.minam.gob.pe/arcgis/rest/services/ServicioANP/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256%2C256&format=png32&transparent=true&layers=show%3A6&layerDefs=%7B%226%22%3A%22UBICA_POLI%20LIKE%20%27%25UCAYALI%25%27%22%7D&f=image',
            ],
            tileSize: 256,
            attribution:
              'Áreas Naturales Protegidas © MINAM Perú — filtro de ubicación Ucayali',
          },
        },

        layers: [
          {
            id: 'bg-fallback',
            type: 'background',
            paint: {
              'background-color': '#14213D',
            },
          },

          // Fondos base.
          {
            id: 'basemap-blue-marble-layer',
            type: 'raster',
            source: 'basemap-blue-marble',
            layout: { visibility: 'visible' },
          },
          {
            id: 'basemap-firefly-layer',
            type: 'raster',
            source: 'basemap-firefly',
            layout: { visibility: 'none' },
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

          // Cuadrícula geográfica.
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

          // Capas de referencia.
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

          // Celdas de observación.
          {
            id: 'celdas-fill',
            type: 'fill',
            source: 'celdas-observadas',
            paint: {
              'fill-color': percentileColorExpression(
                percentileBreaks.q25,
                percentileBreaks.q50,
                percentileBreaks.q75,
              ),
              'fill-opacity': opacity,
            },
          },
          {
            id: 'celdas-line',
            type: 'line',
            source: 'celdas-observadas',
            paint: {
              'line-color': '#14213D',
              'line-width': 1,
            },
          },
        ],
      },

      center: [
        -74.55,
        -8.65,
      ],
      zoom: 7.4,
    });

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
