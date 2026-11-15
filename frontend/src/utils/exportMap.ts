import type * as GeoJSON from 'geojson';
import type * as maplibregl from 'maplibre-gl';
import { GIFEncoder, applyPalette, quantize } from 'gifenc/dist/gifenc.esm.js';
import { writeArrayBuffer as writeGeoTiffArrayBuffer } from 'geotiff';
import { jsPDF } from 'jspdf';
import { BASEMAP_OPTIONS, MONTH_NAMES } from '../constants/mapConfig';
import type { BaseMapId, CaptureFormat, CellFeatureCollection, PercentileBreaks, SensorGroup } from '../types/fireMap';
import { calculatePercentile, distanceMeters, niceDistance, percentileColorExpression } from './geo';

export interface CaptureOptions {
  format: CaptureFormat;
  baseMap: BaseMapId;
  year: number;
  month: number;
  sensor: SensorGroup;
  captureHeader: boolean;
  captureTimestamp: boolean;
  captureScalebar: boolean;
  validatedSource: { valid: boolean; data: CellFeatureCollection };
  filteredGeoJson: CellFeatureCollection;
  percentileBreaks: PercentileBreaks;
  onStatus: (msg: string) => void;
}

async function waitForMapCaptureFrame(mapInstance: maplibregl.Map): Promise<void> {
  if (!mapInstance.isStyleLoaded() || !mapInstance.areTilesLoaded()) {
    await new Promise<void>((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        mapInstance.off('idle', finish);
        window.clearTimeout(timeoutId);
        resolve();
      };
      const timeoutId = window.setTimeout(finish, 8000);
      mapInstance.on('idle', finish);
    });
  }
  await new Promise<void>((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      mapInstance.off('render', onRender);
      window.clearTimeout(timeoutId);
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    };
    const onRender = () => finish();
    const timeoutId = window.setTimeout(finish, 3000);
    mapInstance.on('render', onRender);
    mapInstance.triggerRepaint();
  });
  const canvas = mapInstance.getCanvas();
  const gl = (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ?? (canvas.getContext('webgl') as WebGLRenderingContext | null);
  const attributes = gl?.getContextAttributes();
  if (attributes && !attributes.preserveDrawingBuffer) {
    throw new Error('El mapa activo fue creado sin preserveDrawingBuffer. Detén Vite (Ctrl+C), ejecuta npm run dev y recarga con Ctrl+Shift+R.');
  }
}

function createCaptureCanvas(
  mapInstance: maplibregl.Map,
  frameYear: number,
  frameMonth: number,
  opts: Pick<CaptureOptions, 'baseMap' | 'sensor' | 'captureHeader' | 'captureTimestamp' | 'captureScalebar'>,
): HTMLCanvasElement {
  const sourceCanvas = mapInstance.getCanvas();
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const headerHeight = opts.captureHeader ? Math.max(76, Math.round(width * 0.055)) : 0;
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height + headerHeight;
  const context = output.getContext('2d');
  if (!context) throw new Error('No se pudo preparar el lienzo de captura.');

  context.fillStyle = '#14213D';
  context.fillRect(0, 0, output.width, output.height);
  context.drawImage(sourceCanvas, 0, headerHeight);
  const scale = Math.max(1, width / 1200);

  if (opts.captureHeader) {
    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#14213D');
    gradient.addColorStop(1, '#16865B');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, headerHeight);
    context.fillStyle = '#FFFFFF';
    context.font = `800 ${Math.round(22 * scale)}px Arial, sans-serif`;
    context.fillText('ALLPANINA', 24 * scale, 32 * scale);
    context.font = `600 ${Math.round(14 * scale)}px Arial, sans-serif`;
    context.fillText('VISOR HISTÓRICO MODIS × VIIRS — PERÚ (PILOTO UCAYALI)', 24 * scale, 56 * scale);
    context.font = `${Math.round(11 * scale)}px Arial, sans-serif`;
    context.fillStyle = '#FFF3DF';
    context.fillText(
      `${BASEMAP_OPTIONS.find((item) => item.id === opts.baseMap)?.label ?? opts.baseMap} · ${MONTH_NAMES[frameMonth] ?? frameMonth} ${frameYear} · ${opts.sensor}`,
      24 * scale,
      72 * scale,
    );
  }
  if (opts.captureTimestamp) {
    const stamp = new Date().toLocaleString('es-PE');
    context.font = `600 ${Math.round(12 * scale)}px Arial, sans-serif`;
    const labelWidth = context.measureText(stamp).width;
    const x = width - labelWidth - 32 * scale;
    const y = headerHeight + 26 * scale;
    context.fillStyle = 'rgba(20,33,61,0.82)';
    context.fillRect(x - 10 * scale, y - 17 * scale, labelWidth + 20 * scale, 26 * scale);
    context.fillStyle = '#FFFFFF';
    context.fillText(stamp, x, y);
  }
  if (opts.captureScalebar) {
    const cssWidth = sourceCanvas.clientWidth || width;
    const cssHeight = sourceCanvas.clientHeight || height;
    const centerY = cssHeight / 2;
    const metersPerCssPixel = distanceMeters(mapInstance.unproject([0, centerY]), mapInstance.unproject([cssWidth, centerY])) / cssWidth;
    const metersPerPixel = metersPerCssPixel / (width / cssWidth);
    const targetMeters = niceDistance(metersPerPixel * Math.min(150 * scale, width * 0.22));
    const barWidth = Math.max(30 * scale, Math.min(width * 0.25, targetMeters / metersPerPixel));
    const x = 24 * scale;
    const y = height + headerHeight - 28 * scale;
    const label = targetMeters >= 1000 ? `${Number((targetMeters / 1000).toPrecision(3))} km` : `${Math.round(targetMeters)} m`;
    context.fillStyle = 'rgba(20,33,61,0.78)';
    context.fillRect(x - 10 * scale, y - 30 * scale, barWidth + 22 * scale, 45 * scale);
    context.strokeStyle = '#FFFFFF';
    context.lineWidth = Math.max(2, 2 * scale);
    context.beginPath();
    context.moveTo(x, y); context.lineTo(x + barWidth, y);
    context.moveTo(x, y - 5 * scale); context.lineTo(x, y + 5 * scale);
    context.moveTo(x + barWidth, y - 5 * scale); context.lineTo(x + barWidth, y + 5 * scale);
    context.stroke();
    context.fillStyle = '#FFFFFF';
    context.font = `600 ${Math.round(11 * scale)}px Arial, sans-serif`;
    context.fillText(label, x, y - 10 * scale);
  }
  return output;
}

function downloadBlob(blob: Blob, extension: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateTag = new Date().toISOString().replace(/[:.]/g, '-');
  link.href = downloadUrl;
  link.download = `allpanina-mapa-${dateTag}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
}

async function updateMapSourceAndWait(mapInstance: maplibregl.Map, collection: CellFeatureCollection) {
  const source = mapInstance.getSource('celdas-observadas') as maplibregl.GeoJSONSource | undefined;
  if (!source) throw new Error('No se encontró la fuente de datos de las celdas.');
  await new Promise<void>((resolve, reject) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      mapInstance.off('idle', onIdle);
      window.clearTimeout(timeoutId);
      resolve();
    };
    const onIdle = () => { if (mapInstance.isSourceLoaded('celdas-observadas')) finish(); };
    const timeoutId = window.setTimeout(() => {
      if (finished) return;
      finished = true;
      mapInstance.off('idle', onIdle);
      reject(new Error('El mapa tardó demasiado en actualizar las celdas para la exportación.'));
    }, 10000);
    mapInstance.on('idle', onIdle);
    source.setData(collection as unknown as GeoJSON.FeatureCollection);
    mapInstance.triggerRepaint();
  });
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

async function captureGif(mapInstance: maplibregl.Map, opts: CaptureOptions) {
  if (!opts.validatedSource.valid) throw new Error('No se puede animar: primero restaura o carga un GeoJSON válido.');
  const periodMap = new Map<string, { year: number; month: number }>();
  opts.validatedSource.data.features
    .filter((f) => f.properties.sensor === opts.sensor)
    .forEach((f) => {
      periodMap.set(`${f.properties.year}-${String(f.properties.month).padStart(2, '0')}`, { year: f.properties.year, month: f.properties.month });
    });
  const availablePeriods = Array.from(periodMap.values()).sort((a, b) => a.year - b.year || a.month - b.month);
  if (availablePeriods.length < 2) {
    throw new Error('El sensor seleccionado solo tiene un periodo. Para crear un GIF se necesitan al menos dos meses con datos.');
  }
  const maxFrames = 10;
  const periods = availablePeriods.length <= maxFrames
    ? availablePeriods
    : Array.from({ length: maxFrames }, (_, i) => availablePeriods[Math.round((i * (availablePeriods.length - 1)) / (maxFrames - 1))]);

  const mapCanvas = mapInstance.getCanvas();
  const gifWidth = Math.min(1000, mapCanvas.width);
  const gifScale = gifWidth / mapCanvas.width;
  const gif = GIFEncoder();

  try {
    for (let index = 0; index < periods.length; index++) {
      const period = periods[index];
      const periodData: CellFeatureCollection = {
        type: 'FeatureCollection',
        features: opts.validatedSource.data.features.filter(
          (f) => f.properties.sensor === opts.sensor && f.properties.year === period.year && f.properties.month === period.month,
        ),
      };
      const frameValues = periodData.features.map((f) => f.properties.cell_days);
      await updateMapSourceAndWait(mapInstance, periodData);
      if (mapInstance.getLayer('celdas-fill')) {
        mapInstance.setPaintProperty('celdas-fill', 'fill-color', percentileColorExpression(
          calculatePercentile(frameValues, 0.25),
          calculatePercentile(frameValues, 0.50),
          calculatePercentile(frameValues, 0.75),
        ));
      }
      await waitForMapCaptureFrame(mapInstance);
      const fullFrame = createCaptureCanvas(mapInstance, period.year, period.month, opts);
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = gifWidth;
      frameCanvas.height = Math.max(1, Math.round(fullFrame.height * gifScale));
      const frameContext = frameCanvas.getContext('2d', { willReadFrequently: true });
      if (!frameContext) throw new Error('No se pudo preparar un fotograma GIF.');
      frameContext.drawImage(fullFrame, 0, 0, frameCanvas.width, frameCanvas.height);
      const pixels = frameContext.getImageData(0, 0, frameCanvas.width, frameCanvas.height).data;
      const palette = quantize(pixels, 256, { format: 'rgb565' });
      gif.writeFrame(applyPalette(pixels, palette, 'rgb565'), frameCanvas.width, frameCanvas.height, { palette, delay: 850, repeat: 0 });
      opts.onStatus(`Preparando GIF: fotograma ${index + 1} de ${periods.length} (${MONTH_NAMES[period.month] ?? period.month} ${period.year}).`);
    }
    gif.finish();
    const bytes = gif.bytes();
    const gifBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    downloadBlob(new Blob([gifBuffer], { type: 'image/gif' }), 'gif');
    opts.onStatus(`GIF descargado: ${periods.length} fotogramas del sensor ${opts.sensor}.`);
  } finally {
    await updateMapSourceAndWait(mapInstance, opts.filteredGeoJson);
    if (mapInstance.getLayer('celdas-fill')) {
      mapInstance.setPaintProperty('celdas-fill', 'fill-color', percentileColorExpression(
        opts.percentileBreaks.q25, opts.percentileBreaks.q50, opts.percentileBreaks.q75,
      ));
    }
  }
}

async function captureGeoTiff(mapInstance: maplibregl.Map, onStatus: (msg: string) => void) {
  if (mapInstance.getPitch() > 0.1) throw new Error('Para conservar la georreferenciación, coloca el mapa en vista cenital (sin inclinación).');
  if (mapInstance.getProjection().type !== 'mercator') throw new Error('La exportación GeoTIFF de esta versión requiere la proyección Mercator.');
  const sourceCanvas = mapInstance.getCanvas();
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const rasterCanvas = document.createElement('canvas');
  rasterCanvas.width = width;
  rasterCanvas.height = height;
  const rasterContext = rasterCanvas.getContext('2d', { willReadFrequently: true });
  if (!rasterContext) throw new Error('No se pudo preparar el raster GeoTIFF.');
  rasterContext.drawImage(sourceCanvas, 0, 0);
  const rgba = rasterContext.getImageData(0, 0, width, height).data;
  const cssWidth = sourceCanvas.clientWidth || width;
  const cssHeight = sourceCanvas.clientHeight || height;
  const toWebMercator = (point: maplibregl.LngLat) => {
    const radius = 6378137;
    const lat = (Math.max(-85.05112878, Math.min(85.05112878, point.lat)) * Math.PI) / 180;
    return { x: radius * ((point.lng * Math.PI) / 180), y: radius * Math.log(Math.tan(Math.PI / 4 + lat / 2)) };
  };
  const topLeft = toWebMercator(mapInstance.unproject([0, 0]));
  const topRight = toWebMercator(mapInstance.unproject([cssWidth, 0]));
  const bottomLeft = toWebMercator(mapInstance.unproject([0, cssHeight]));
  const modelTransformation = [
    (topRight.x - topLeft.x) / width, (bottomLeft.x - topLeft.x) / height, 0, topLeft.x,
    (topRight.y - topLeft.y) / width, (bottomLeft.y - topLeft.y) / height, 0, topLeft.y,
    0, 0, 1, 0, 0, 0, 0, 1,
  ];
  const rgb = new Uint8Array(width * height * 3);
  for (let s = 0, t = 0; s < rgba.length; s += 4) {
    rgb[t++] = rgba[s]; rgb[t++] = rgba[s + 1]; rgb[t++] = rgba[s + 2];
  }
  const tiffBuffer = await writeGeoTiffArrayBuffer(rgb, {
    width, height, SamplesPerPixel: 3, BitsPerSample: [8, 8, 8], PhotometricInterpretation: 2,
    PlanarConfiguration: 1, RowsPerStrip: height, StripByteCounts: [rgb.byteLength],
    ModelTransformation: modelTransformation, GTModelTypeGeoKey: 1, ProjectedCSTypeGeoKey: 3857,
    ProjLinearUnitsGeoKey: 9001, GTRasterTypeGeoKey: 1,
  } as Parameters<typeof writeGeoTiffArrayBuffer>[1]);
  downloadBlob(new Blob([tiffBuffer], { type: 'image/tiff' }), 'tif');
  onStatus('GeoTIFF descargado en EPSG:3857. Se exportó solo el lienzo del mapa para conservar la georreferenciación.');
}

export async function executeMapCapture(map: maplibregl.Map, opts: CaptureOptions) {
  await waitForMapCaptureFrame(map);
  opts.onStatus('Preparando exportación…');
  if (opts.format === 'gif') return captureGif(map, opts);
  if (opts.format === 'tiff') return captureGeoTiff(map, opts.onStatus);

  const output = createCaptureCanvas(map, opts.year, opts.month, opts);
  if (opts.format === 'pdf') {
    const pageWidth = output.width * 0.75;
    const pageHeight = output.height * 0.75;
    const pdf = new jsPDF({ orientation: pageWidth >= pageHeight ? 'landscape' : 'portrait', unit: 'pt', format: [pageWidth, pageHeight], compress: true });
    pdf.addImage(output.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.save(`allpanina-mapa-${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`);
    opts.onStatus('Documento PDF descargado correctamente.');
    return;
  }
  const mimeType = opts.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise<Blob>((resolve, reject) => {
    output.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('El navegador no pudo generar la imagen.'))),
      mimeType,
      opts.format === 'jpeg' ? 0.94 : undefined,
    );
  });
  downloadBlob(blob, opts.format === 'jpeg' ? 'jpg' : 'png');
  opts.onStatus('Captura descargada correctamente.');
}
