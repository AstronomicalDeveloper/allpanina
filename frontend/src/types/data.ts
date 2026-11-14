// Official exchange format: docs/contrato_datos.md (Aldo).
export type Sensor = 'MODIS' | 'VIIRS'
export type QcStatus = 'ok' | 'insufficient_data' | 'no_pass'
export type DataStatus = 'ok' | 'insufficient_data'
export type Method = 'B0' | 'B1'
export type Split = 'train' | 'valid' | 'test'
export interface Period { region_id: string; year: number; month: number }
export interface MonthlyRecord extends Period {
  sensor: Sensor
  n_detections: number | null
  indicator: number | null
  qc_status: QcStatus
  source_version: string
  updated_at: string
}
export interface CalibratedRecord extends Period {
  method: Method
  value: number | null
  split: Split
  status: DataStatus
  residual: number | null
}
export interface ValidationResult {
  region_id: string
  methods: Partial<Record<Method, {
    split: Split
    metrics: { mae: number | null; wape: number | null; bias: number | null }
    n_months_matched: number
    residuals?: {
      month: string; modis_observed: number; estimate: number
      signed_error: number; absolute_error: number
    }[]
    detalle_mensual?: 'no disponible'
  }>>
}
export interface MethodInfo {
  indicator: string
  sensors: string[]
  period_train: string
  period_valid: string
  period_test: string
  calibration: string
  limitations: string[]
}
export interface Manifest {
  region: string
  generated_at: string
  files: { name: string; version: string; rows?: number }[]
}
// L3 boundary only; no map component or replacement of Juan's types.
type Position = [number, number]
export interface CellsData {
  type: 'FeatureCollection'
  crs?: { type: 'name'; properties: { name: 'EPSG:4326' } }
  features: {
    type: 'Feature'
    properties: { cell_id: string; year: number; month: number; sensor: Sensor; n_detections: number }
    geometry: { type: 'Polygon'; coordinates: Position[][] } | { type: 'MultiPolygon'; coordinates: Position[][][] }
  }[]
}
