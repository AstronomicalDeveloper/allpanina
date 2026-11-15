// Official exchange format: docs/contrato_datos.md (Aldo).
export type Sensor = 'MODIS' | 'VIIRS'
export type QcStatus = 'ok' | 'missing'
export type DataStatus = 'ok' | 'missing'
export type Method = 'B0' | 'B1'
export type Split = 'train' | 'valid' | 'test'
export interface Period { region_id: string; year: number; month: number }
export interface MonthlyRecord extends Period {
  sensor_group: Sensor
  cell_days: number | null
  status: QcStatus
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
export interface Metrics { mae: number | null; wape: number | null; bias: number | null }
export interface MethodInfo {
  region_id?: string
  region?: string
  estado?: string
  kappa?: number
  resultados?: { valid?: { periodo: string; n_meses: number; B0: Metrics; B1: Metrics } }
  indicator: string
  sensors: string[]
  period_train: string
  period_valid: string
  period_test: string
  calibration: string
  limitations: string[]
}
export interface Manifest {
  region_id: string
  generated_at: string
  producto: string
  periodo: { desde: string; hasta: string }
  files: string[]
  hash: Record<string, string>
}
// RFC 7946, WGS84; observed cell-days only, no regional calibration.
type Position = [number, number]
export interface CellsData {
  type: 'FeatureCollection'
  features: {
    type: 'Feature'
    properties: { cell_id: string; year: number; month: number; sensor_group: Sensor; cell_days: number }
    geometry: { type: 'Polygon'; coordinates: Position[][] } | { type: 'MultiPolygon'; coordinates: Position[][][] }
  }[]
}
