import type { BaseMapId, DynamicImageryId, SensorGroup } from '../types/fireMap';

export const DEFAULT_CENTER: [number, number] = [-75.0, -9.2];
export const DEFAULT_ZOOM = 5.2;

export const MONTH_NAMES: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatDateLabel(day: number, month: number, year: number): string {
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  return `${dd}/${mm}/${year}`;
}

export function formatIsoDate(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export const BASEMAP_OPTIONS: {
  id: BaseMapId;
  label: string;
  description: string;
}[] = [
  { id: 'blue-marble', label: 'Blue Marble', description: 'Satélite natural' },
  { id: 'firefly', label: 'Firefly', description: 'Satélite desaturado' },
  { id: 'streets', label: 'Streets', description: 'Calles y carreteras' },
  { id: 'topographic', label: 'Topographic', description: 'Relieve y topografía' },
];

export const BASEMAP_LAYER_IDS: Record<BaseMapId, string> = {
  'blue-marble': 'basemap-blue-marble-layer',
  firefly: 'basemap-firefly-layer',
  streets: 'basemap-streets-layer',
  topographic: 'basemap-topographic-layer',
};

export const DYNAMIC_IMAGERY_OPTIONS: {
  id: DynamicImageryId;
  label: string;
  subtitle: string;
  gibsLayer?: string;
}[] = [
  {
    id: 'none',
    label: 'Desactivado',
    subtitle: 'Solo fondo cartográfico estático',
  },
  {
    id: 'auto',
    label: 'Sincronizado con Sensor',
    subtitle: 'Alterna S-NPP / Terra automáticamente',
  },
  {
    id: 'viirs-snpp',
    label: 'VIIRS S-NPP (True Color)',
    subtitle: 'Suomi NPP · Barrido diario 375m',
    gibsLayer: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
  },
  {
    id: 'viirs-noaa20',
    label: 'VIIRS NOAA-20 (True Color)',
    subtitle: 'JPSS-1 / NOAA-20 · Barrido diario',
    gibsLayer: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor',
  },
  {
    id: 'modis-terra',
    label: 'MODIS Terra (True Color)',
    subtitle: 'Órbita matutina · Reflectancia corregida',
    gibsLayer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
  },
  {
    id: 'modis-aqua',
    label: 'MODIS Aqua (True Color)',
    subtitle: 'Órbita vespertina · Reflectancia corregida',
    gibsLayer: 'MODIS_Aqua_CorrectedReflectance_TrueColor',
  },
];

export function resolveGibsLayerName(
  mode: DynamicImageryId,
  sensor: SensorGroup,
): string | null {
  if (mode === 'none') return null;
  if (mode === 'auto') {
    return sensor === 'VIIRS_SNPP'
      ? 'VIIRS_SNPP_CorrectedReflectance_TrueColor'
      : 'MODIS_Terra_CorrectedReflectance_TrueColor';
  }
  return DYNAMIC_IMAGERY_OPTIONS.find((item) => item.id === mode)?.gibsLayer ?? null;
}

export function buildGibsTileUrl(layerName: string, isoDate: string): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layerName}/default/${isoDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
}
