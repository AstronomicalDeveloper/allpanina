export type SensorGroup = 'MODIS_TA' | 'VIIRS_SNPP';
export type BaseMapId = 'blue-marble' | 'firefly' | 'streets' | 'topographic';
export type DynamicImageryId =
  | 'none'
  | 'auto'
  | 'viirs-snpp'
  | 'viirs-noaa20'
  | 'modis-terra'
  | 'modis-aqua';
export type ToolPanel = 'capture' | 'share' | 'view' | null;
export type ViewMode = 'windowed' | 'full';
export type CaptureFormat = 'png' | 'jpeg' | 'gif' | 'tiff' | 'pdf';

export interface CellProperties {
  id: string;
  region_id: string;
  year: number;
  month: number;
  day?: number;
  sensor: SensorGroup;
  cell_days: number;
  status: 'ok' | 'missing';
}

export interface CellFeature {
  type: 'Feature';
  properties: CellProperties;
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] };
}

export interface CellFeatureCollection {
  type: 'FeatureCollection';
  features: CellFeature[];
}

export interface FireMapProps {
  year?: number;
  month?: number;
  day?: number;
  sensor?: SensorGroup;
  geojsonData?: unknown;
  onPeriodChange?: (year: number, month: number, sensor: SensorGroup, day?: number) => void;
}

export interface OverlayState {
  graticule: boolean;
  basic: boolean;
  detailed: boolean;
  protectedAreas: boolean;
}

export interface InitialMapView {
  baseMap?: BaseMapId;
  dynamicImagery?: DynamicImageryId;
  year?: number;
  month?: number;
  day?: number;
  sensor?: SensorGroup;
  latitude?: number;
  longitude?: number;
  zoom?: number;
}

export interface PercentileBreaks {
  q25: number;
  q50: number;
  q75: number;
}

export interface MapStats {
  count: number;
  totalCellDays: number;
  maxCell: number;
}
