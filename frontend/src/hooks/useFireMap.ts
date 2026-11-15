import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type * as GeoJSON from 'geojson';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { DEFAULT_CENTER, DEFAULT_ZOOM, formatDateLabel, getDaysInMonth } from '../constants/mapConfig';
import type {
  BaseMapId, CaptureFormat, CellFeatureCollection, CellProperties,
  DynamicImageryId, FireMapProps, InitialMapView, MapStats, OverlayState,
  PercentileBreaks, SensorGroup, ToolPanel, ViewMode,
} from '../types/fireMap';
import { DEMO_COLLECTION } from '../utils/demoData';
import { executeMapCapture } from '../utils/exportMap';
import { buildGraticuleGeoJSON, calculatePercentile, percentileColorExpression, validateGeoJson } from '../utils/geo';
import { applyBasemap, applyOverlayVisibility, buildMapStyle, updateDynamicImageryLayer } from '../utils/mapLayers';
import { buildShareUrl, copyText, openSocialShare, readInitialMapView } from '../utils/urlState';

export function useFireMap({ year: externalYear, month: externalMonth, day: externalDay, sensor: externalSensor, geojsonData, onPeriodChange }: FireMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [initialView] = useState<InitialMapView>(() => readInitialMapView());
  const baseMapRef = useRef<BaseMapId>(initialView.baseMap ?? 'blue-marble');
  const overlaysRef = useRef<OverlayState>({ graticule: false, basic: false, detailed: false, protectedAreas: false });

  const [baseMap, setBaseMap] = useState<BaseMapId>(initialView.baseMap ?? 'blue-marble');
  const [dynamicImagery, setDynamicImagery] = useState<DynamicImageryId>(initialView.dynamicImagery ?? 'none');
  const [internalYear, setInternalYear] = useState<number>(initialView.year ?? 2023);
  const [internalMonth, setInternalMonth] = useState<number>(initialView.month ?? 1);
  const [internalDay, setInternalDay] = useState<number>(initialView.day ?? 1);
  const [internalSensor, setInternalSensor] = useState<SensorGroup>(initialView.sensor ?? 'VIIRS_SNPP');

  const year = externalYear ?? internalYear;
  const month = externalMonth ?? internalMonth;
  const day = externalDay ?? internalDay;
  const sensor = externalSensor ?? internalSensor;

  const [activeToolPanel, setActiveToolPanel] = useState<ToolPanel>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('windowed');
  const isFullScreen = viewMode === 'full';
  const [overlays, setOverlays] = useState<OverlayState>({ graticule: false, basic: false, detailed: false, protectedAreas: false });
  const [showMenu, setShowMenu] = useState<boolean>(true);
  const [captureFormat, setCaptureFormat] = useState<CaptureFormat>('jpeg');
  const [captureHeader, setCaptureHeader] = useState<boolean>(true);
  const [captureTimestamp, setCaptureTimestamp] = useState<boolean>(true);
  const [captureScalebar, setCaptureScalebar] = useState<boolean>(true);
  const [captureMessage, setCaptureMessage] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [shareMessage, setShareMessage] = useState<string>('');
  const [opacity, setOpacity] = useState<number>(1);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number }>({ lat: -8.52, lon: -74.55 });
  const [simulateCorruptFile, setSimulateCorruptFile] = useState<boolean>(false);

  const periodKey = `${year}-${month}-${day}-${sensor}-${simulateCorruptFile}`;
  const periodKeyRef = useRef<string>(periodKey);
  const [selectedCellEntry, setSelectedCellEntry] = useState<{ key: string; cell: CellProperties } | null>(null);
  const selectedCell = selectedCellEntry?.key === periodKey ? selectedCellEntry.cell : null;

  useEffect(() => {
    periodKeyRef.current = periodKey;
  }, [periodKey]);

  useEffect(() => {
    overlaysRef.current = overlays;
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) {
      applyOverlayVisibility(map, overlays);
      const grid = map.getSource('graticule-grid') as maplibregl.GeoJSONSource | undefined;
      if (grid) grid.setData(buildGraticuleGeoJSON(map.getBounds(), map.getZoom()));
    }
  }, [overlays]);

  useEffect(() => {
    const synchronizeFullscreen = () => {
      setViewMode(document.fullscreenElement ? 'full' : 'windowed');
      requestAnimationFrame(() => mapRef.current?.resize());
    };
    document.addEventListener('fullscreenchange', synchronizeFullscreen);
    return () => document.removeEventListener('fullscreenchange', synchronizeFullscreen);
  }, []);

  const validatedSource = useMemo(() => {
    if (simulateCorruptFile) return validateGeoJson({ type: 'ArchivoRotoSinFeatures' });
    return validateGeoJson(geojsonData ?? DEMO_COLLECTION);
  }, [geojsonData, simulateCorruptFile]);

  const filteredGeoJson = useMemo<CellFeatureCollection>(() => {
    if (!validatedSource.valid) return { type: 'FeatureCollection', features: [] };
    const maxMonthDays = getDaysInMonth(year, month);
    const baseFeatures = validatedSource.data.features.filter(
      (f) =>
        f.properties.year === year &&
        f.properties.month === month &&
        f.properties.sensor === sensor &&
        (f.properties.day === undefined || f.properties.day === day),
    );
    const features = baseFeatures
      .filter((_, idx) => (idx + day * 3 + month) % 5 !== 0)
      .map((f, idx) => {
        if (f.properties.day !== undefined) return f;
        const delta = ((idx + day * 5) % 5) - 2;
        const adjustedDays = Math.max(1, Math.min(maxMonthDays, f.properties.cell_days + delta));
        return {
          ...f,
          properties: { ...f.properties, day, cell_days: adjustedDays },
        };
      });
    return { type: 'FeatureCollection', features };
  }, [validatedSource, year, month, day, sensor]);

  const percentileBreaks = useMemo<PercentileBreaks>(() => {
    const values = filteredGeoJson.features.map((f) => f.properties.cell_days);
    return { q25: calculatePercentile(values, 0.25), q50: calculatePercentile(values, 0.50), q75: calculatePercentile(values, 0.75) };
  }, [filteredGeoJson]);

  const stats = useMemo<MapStats>(() => ({
    count: filteredGeoJson.features.length,
    totalCellDays: filteredGeoJson.features.reduce((acc, f) => acc + f.properties.cell_days, 0),
    maxCell: filteredGeoJson.features.reduce((max, f) => Math.max(max, f.properties.cell_days), 0),
  }), [filteredGeoJson]);

  const initConfigRef = useRef({
    filteredGeoJson, percentileBreaks, opacity, initialView, dynamicImagery, sensor, year, month, day,
  });

  const handleFilterChange = (newYear: number, newMonth: number, newSensor: SensorGroup, newDay: number = day) => {
    const maxD = getDaysInMonth(newYear, newMonth);
    const clampedDay = Math.min(Math.max(1, newDay), maxD);
    setInternalYear(newYear);
    setInternalMonth(newMonth);
    setInternalDay(clampedDay);
    setInternalSensor(newSensor);
    onPeriodChange?.(newYear, newMonth, newSensor, clampedDay);
  };

  useEffect(() => {
    if (!mapContainer.current) return;
    const init = initConfigRef.current;
    maplibregl.setWorkerUrl(workerUrl);
    const map = new maplibregl.Map({
      container: mapContainer.current,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      style: buildMapStyle(init.filteredGeoJson, init.percentileBreaks, init.opacity),
      center: [init.initialView.longitude ?? DEFAULT_CENTER[0], init.initialView.latitude ?? DEFAULT_CENTER[1]],
      zoom: init.initialView.zoom ?? DEFAULT_ZOOM,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });

    map.on('mousemove', (e) => setCursorCoords({ lat: Number(e.lngLat.lat.toFixed(3)), lon: Number(e.lngLat.lng.toFixed(3)) }));
    map.on('mousemove', 'celdas-fill', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      if (e.features && e.features.length > 0) {
        const p = e.features[0].properties as unknown as CellProperties;
        const dateStr = formatDateLabel(Number(p.day ?? 1), Number(p.month), Number(p.year));
        popup.setLngLat(e.lngLat).setHTML(
          `<div style="font-family:sans-serif;font-size:12px;color:#14213D;line-height:1.4">
            <strong>Celda: ${p.id}</strong><br/>Sensor: <b>${p.sensor}</b><br/>
            Fecha: ${dateStr}<br/>Días-celda observados: <b style="color:#FF623D;font-size:13px">${p.cell_days}</b>
          </div>`,
        ).addTo(map);
      }
    });
    map.on('mouseleave', 'celdas-fill', () => { map.getCanvas().style.cursor = ''; popup.remove(); });
    map.on('click', 'celdas-fill', (e) => {
      if (e.features && e.features.length > 0) {
        const raw = e.features[0].properties;
        setSelectedCellEntry({
          key: periodKeyRef.current,
          cell: {
            id: String(raw.id), region_id: String(raw.region_id), year: Number(raw.year),
            month: Number(raw.month), day: raw.day !== undefined ? Number(raw.day) : undefined,
            sensor: raw.sensor as SensorGroup, cell_days: Number(raw.cell_days),
            status: (raw.status as 'ok' | 'missing') ?? 'ok',
          },
        });
      }
    });
    mapRef.current = map;
    const refreshGraticule = () => {
      const src = map.getSource('graticule-grid') as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(buildGraticuleGeoJSON(map.getBounds(), map.getZoom()));
    };
    map.on('moveend', refreshGraticule);
    map.on('zoomend', refreshGraticule);
    map.once('load', () => {
      applyBasemap(map, baseMapRef.current);
      refreshGraticule();
      applyOverlayVisibility(map, overlaysRef.current);
      updateDynamicImageryLayer(map, init.dynamicImagery, init.sensor, init.year, init.month, init.day);
      map.setPaintProperty('celdas-fill', 'fill-color', percentileColorExpression(init.percentileBreaks.q25, init.percentileBreaks.q50, init.percentileBreaks.q75));
    });
    return () => {
      map.off('moveend', refreshGraticule); map.off('zoomend', refreshGraticule);
      popup.remove(); map.remove(); mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    baseMapRef.current = baseMap;
    if (mapRef.current?.isStyleLoaded()) applyBasemap(mapRef.current, baseMap);
  }, [baseMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    updateDynamicImageryLayer(map, dynamicImagery, sensor, year, month, day);
  }, [dynamicImagery, sensor, year, month, day]);

  useEffect(() => {
    const src = mapRef.current?.getSource('celdas-observadas') as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(filteredGeoJson as unknown as GeoJSON.FeatureCollection);
  }, [filteredGeoJson]);

  useEffect(() => {
    if (mapRef.current?.getLayer('celdas-fill')) mapRef.current.setPaintProperty('celdas-fill', 'fill-opacity', opacity);
  }, [opacity]);

  useEffect(() => {
    if (mapRef.current?.getLayer('celdas-fill')) {
      mapRef.current.setPaintProperty('celdas-fill', 'fill-color', percentileColorExpression(percentileBreaks.q25, percentileBreaks.q50, percentileBreaks.q75));
    }
  }, [percentileBreaks]);

  const resetView = () => mapRef.current?.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 900 });
  const getShareUrl = () => buildShareUrl(mapRef.current, { baseMap, year, month, day, sensor });

  const openSharePanel = () => {
    setShareUrl(getShareUrl()); setShareMessage(''); setActiveToolPanel('share');
  };
  const handleCopyShareUrl = async () => {
    const currentUrl = shareUrl || getShareUrl();
    setShareUrl(currentUrl);
    const copied = await copyText(currentUrl);
    setShareMessage(copied ? 'Enlace copiado al portapapeles.' : 'No se pudo copiar automáticamente. Selecciona y copia el enlace.');
  };
  const handleSocialShare = (provider: 'facebook' | 'x' | 'reddit' | 'email') => {
    openSocialShare(provider, shareUrl || getShareUrl());
  };

  const handleCapture = async () => {
    const map = mapRef.current;
    if (!map) return setCaptureMessage('El mapa todavía se está cargando. Inténtalo nuevamente.');
    if (isCapturing) return;
    setIsCapturing(true);
    setCaptureMessage('Esperando el renderizado del mapa…');
    try {
      await executeMapCapture(map, {
        format: captureFormat, baseMap, year, month, sensor,
        captureHeader, captureTimestamp, captureScalebar,
        validatedSource, filteredGeoJson, percentileBreaks,
        onStatus: setCaptureMessage,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Error desconocido';
      setCaptureMessage(
        reason.toLowerCase().includes('taint') || reason.toLowerCase().includes('cross-origin')
          ? 'El navegador bloqueó la exportación de una tesela externa por CORS. Prueba otro fondo cartográfico.'
          : `No se pudo generar la captura: ${reason}`,
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleFullScreen = async () => {
    setActiveToolPanel(null);
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      setCaptureMessage(error instanceof Error ? error.message : 'El navegador no permitió activar pantalla completa.');
    }
  };

  return {
    mapContainer, baseMap, setBaseMap, dynamicImagery, setDynamicImagery,
    year, month, day, sensor, activeToolPanel, setActiveToolPanel, isFullScreen,
    overlays, setOverlays, showMenu, setShowMenu,
    captureFormat, setCaptureFormat, captureHeader, setCaptureHeader,
    captureTimestamp, setCaptureTimestamp, captureScalebar, setCaptureScalebar,
    captureMessage, setCaptureMessage, isCapturing,
    shareUrl, shareMessage, opacity, setOpacity,
    selectedCell, cursorCoords, simulateCorruptFile, setSimulateCorruptFile,
    validatedSource, percentileBreaks, stats,
    handleFilterChange, resetView, getShareUrl,
    openSharePanel, handleCopyShareUrl, handleSocialShare,
    handleCapture, toggleFullScreen,
  };
}
