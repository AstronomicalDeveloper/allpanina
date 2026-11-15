import type { CalibratedRecord, CellsData, Manifest, MethodInfo, MonthlyRecord, ValidationResult } from '../../types/data.ts'
import { readCsv } from './csv.ts'

function fail(path: string, message: string): never { throw new Error(`${path}: ${message}`) }
function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'se esperaba un objeto')
  return value as Record<string, unknown>
}
function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, 'se esperaba una lista')
  return value
}
function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(path, 'texto obligatorio')
  return value
}
function number(value: unknown, path: string, min = -Infinity, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || (integer && !Number.isInteger(value))) fail(path, 'número fuera de rango o formato inválido')
  return value
}
function choice<T extends string>(value: unknown, options: readonly T[], path: string): T {
  if (!options.includes(value as T)) fail(path, `valor permitido: ${options.join(', ')}`)
  return value as T
}
const sensors = ['MODIS', 'VIIRS'] as const
const methods = ['B0', 'B1'] as const
function period(row: Record<string, unknown>, path: string) {
  const year = number(row.year, `${path}.year`, 1, true)
  const month = number(row.month, `${path}.month`, 1, true)
  if (year > 9999 || month > 12) fail(path, 'year debe estar entre 1–9999 y month entre 1–12')
  return { year, month }
}
function unique(keys: string[], path: string) {
  if (new Set(keys).size !== keys.length) fail(path, 'clave lógica duplicada')
}
function csv(text: string, columns: string[]): Record<string, string>[] {
  const [headers, ...rows] = readCsv(text)
  unique(headers, 'CSV columnas')
  for (const name of columns) if (!headers.includes(name)) fail('CSV', `falta columna obligatoria ${name}`)
  return rows.map((row, index) => {
    if (row.length !== headers.length) fail(`CSV fila ${index + 2}`, 'cantidad de campos incorrecta')
    return Object.fromEntries(headers.map((header, i) => [header, row[i].trim()]))
  })
}
function numeric(text: string, path: string, min = 0): number | null {
  if (text === '') return null
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) fail(path, 'formato numérico inválido')
  return number(Number(text), path, min)
}
function base(row: Record<string, string>, path: string) {
  return { region_id: string(row.region_id, `${path}.region_id`), ...period({ year: numeric(row.year, `${path}.year`), month: numeric(row.month, `${path}.month`) }, path) }
}
export function parseMonthlySeries(text: string): MonthlyRecord[] {
  const records = csv(text, ['region_id', 'year', 'month', 'sensor_group', 'cell_days', 'status', 'source_version', 'updated_at']).map((row, i) => {
    const path = `monthly_series fila ${i + 2}`
    const cell_days = numeric(row.cell_days, `${path}.cell_days`)
    if (cell_days !== null) number(cell_days, `${path}.cell_days`, 0, true)
    const status = choice(row.status, ['ok', 'missing'] as const, `${path}.status`)
    if ((status === 'ok') !== (cell_days !== null)) fail(path, 'ok requiere cell_days; missing requiere vacío')
    dateOnly(row.updated_at, `${path}.updated_at`)
    return { ...base(row, path), sensor_group: choice(row.sensor_group, sensors, `${path}.sensor_group`), cell_days,
      status, source_version: string(row.source_version, `${path}.source_version`), updated_at: row.updated_at }
  })
  unique(records.map(r => JSON.stringify([r.region_id, r.year, r.month, r.sensor_group])), 'monthly_series')
  return records
}
export function parseCalibratedSeries(text: string): CalibratedRecord[] {
  const records = csv(text, ['region_id', 'year', 'month', 'method', 'value', 'split', 'status', 'residual']).map((row, i) => {
    const path = `calibrated_series fila ${i + 2}`, value = numeric(row.value, `${path}.value`)
    const status = choice(row.status, ['ok', 'missing'] as const, `${path}.status`)
    if ((status === 'ok') !== (value !== null)) fail(path, 'ok requiere value; missing requiere vacío')
    return { ...base(row, path), method: choice(row.method, methods, path), value,
      split: choice(row.split, ['train', 'valid', 'test'] as const, path), status,
      residual: numeric(row.residual, `${path}.residual`, -Infinity) }
  })
  unique(records.map(r => JSON.stringify([r.region_id, r.year, r.month, r.method])), 'calibrated_series')
  return records
}
function dateOnly(value: unknown, path: string) {
  const text = string(value, path)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString().slice(0, 10) !== text) fail(path, 'fecha YYYY-MM-DD inválida')
}
function yearMonth(value: unknown, path: string): string {
  const text = string(value, path)
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(text) || text.startsWith('0000')) fail(path, 'mes YYYY-MM inválido')
  return text
}
function strings(value: unknown, path: string) { return array(value, path).map((item, i) => string(item, `${path}[${i}]`)) }
export function validateManifest(value: unknown): Manifest {
  const row = object(value, 'manifest')
  string(row.region_id, 'region_id'); string(row.producto, 'producto')
  const date = string(row.generated_at, 'generated_at')
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(date) || !Number.isFinite(Date.parse(date))) fail('generated_at', 'timestamp con zona requerido')
  const range = object(row.periodo, 'periodo')
  if (yearMonth(range.desde, 'periodo.desde') > yearMonth(range.hasta, 'periodo.hasta')) fail('periodo', 'período invertido')
  const files = strings(row.files, 'files'); unique(files, 'files')
  if (!files.length) fail('files', 'lista vacía')
  const hashes = object(row.hash, 'hash')
  for (const file of files) {
    if (!/^[\w.-]+$/.test(file)) fail('files', 'nombre inseguro')
    if (!/^sha256:[a-f0-9]{64}$/.test(string(hashes[file], `hash.${file}`))) fail('hash', 'SHA-256 inválido')
  }
  return value as Manifest
}
export function validateMethod(value: unknown): MethodInfo {
  const row = object(value, 'method')
  string(row.indicator, 'indicator'); string(row.calibration, 'calibration')
  strings(row.sensors, 'sensors'); strings(row.limitations, 'limitations')
  for (const key of ['period_train', 'period_valid', 'period_test']) {
    const range = string(row[key], key).split(':')
    if (range.length !== 2) fail(key, 'período YYYY-MM:YYYY-MM requerido')
    const start = yearMonth(range[0], key), end = yearMonth(range[1], key)
    if (start > end) fail(key, 'período invertido')
  }
  if (row.region_id !== undefined) string(row.region_id, 'region_id')
  if (row.region !== undefined) string(row.region, 'region')
  if (row.estado !== undefined) string(row.estado, 'estado')
  if (row.kappa !== undefined) number(row.kappa, 'kappa', 0)
  if (row.resultados !== undefined) {
    const results = object(row.resultados, 'resultados')
    if (results.valid !== undefined) {
      const valid = object(results.valid, 'resultados.valid')
      string(valid.periodo, 'valid.periodo'); number(valid.n_meses, 'valid.n_meses', 0, true)
      for (const name of methods) {
        const metrics = object(valid[name], `valid.${name}`)
        for (const key of ['mae', 'wape', 'bias']) if (metrics[key] !== null) number(metrics[key], `valid.${name}.${key}`, key === 'bias' ? -Infinity : 0)
      }
    }
  }
  return value as MethodInfo
}
export function validateValidation(value: unknown): ValidationResult {
  const row = object(value, 'validation'); string(row.region_id, 'region_id')
  const entries = object(row.methods, 'methods')
  for (const [name, item] of Object.entries(entries)) {
    choice(name, methods, `methods.${name}`)
    const path = `methods.${name}`, method = object(item, path)
    const split = choice(method.split, ['train', 'valid', 'test'], `${path}.split`)
    const metrics = object(method.metrics, `${path}.metrics`)
    for (const key of ['mae', 'wape', 'bias']) {
      // Null encoding is unresolved scientifically; preserve it, never infer zero.
      if (metrics[key] !== null) number(metrics[key], `${path}.metrics.${key}`, key === 'bias' ? -Infinity : 0)
    }
    number(method.n_months_matched, `${path}.n_months_matched`, 0, true)
    const residuals = method.residuals === undefined ? [] : array(method.residuals, `${path}.residuals`)
    if (method.detalle_mensual !== undefined) choice(method.detalle_mensual, ['no disponible'], `${path}.detalle_mensual`)
    if (!residuals.length && method.detalle_mensual !== 'no disponible') fail(path, 'sin residuos: detalle_mensual debe ser no disponible')
    if (residuals.length && split !== 'test') fail(path, 'los residuos mensuales son exclusivamente de test')
    const months: string[] = []
    residuals.forEach((item, i) => {
      const p = `${path}.residuals[${i}]`, error = object(item, p)
      months.push(yearMonth(error.month, `${p}.month`))
      number(error.modis_observed, `${p}.modis_observed`, 0); number(error.estimate, `${p}.estimate`, 0)
      number(error.signed_error, `${p}.signed_error`)
      number(error.absolute_error, `${p}.absolute_error`, 0)
    })
    unique(months, `${path}.residuals`)
  }
  return value as ValidationResult
}
function ring(value: unknown, path: string) {
  const points = array(value, path)
  if (points.length < 4) fail(path, 'anillo requiere al menos 4 posiciones')
  points.forEach(point => {
    const coords = array(point, path)
    if (coords.length !== 2) fail(path, 'se requieren longitud y latitud WGS84')
    if (Math.abs(number(coords[0], path)) > 180 || Math.abs(number(coords[1], path)) > 90) fail(path, 'coordenadas fuera de WGS84')
  })
  if (JSON.stringify(points[0]) !== JSON.stringify(points.at(-1))) fail(path, 'anillo sin cerrar')
}
function polygon(value: unknown, path: string) {
  const rings = array(value, path)
  if (!rings.length) fail(path, 'polígono vacío')
  rings.forEach(r => ring(r, path))
}
export function validateCells(value: unknown): CellsData {
  const row = object(value, 'GeoJSON'); choice(row.type, ['FeatureCollection'], 'type')
  if (row.crs !== undefined) fail('crs', 'RFC 7946 requiere WGS84 sin miembro crs')
  const keys: string[] = []
  array(row.features, 'features').forEach((item, i) => {
    const path = `features[${i}]`, feature = object(item, path)
    choice(feature.type, ['Feature'], path)
    const props = object(feature.properties, `${path}.properties`)
    period(props, path); string(props.cell_id, `${path}.cell_id`)
    choice(props.sensor_group, sensors, `${path}.sensor`); number(props.cell_days, `${path}.cell_days`, 0, true)
    keys.push(JSON.stringify([props.cell_id, props.year, props.month, props.sensor_group]))
    const geometry = object(feature.geometry, `${path}.geometry`)
    const type = choice(geometry.type, ['Polygon', 'MultiPolygon'], path)
    if (type === 'Polygon') polygon(geometry.coordinates, path)
    else {
      const polygons = array(geometry.coordinates, path)
      if (!polygons.length) fail(path, 'MultiPolygon vacío')
      polygons.forEach(p => polygon(p, path))
    }
  })
  unique(keys, 'GeoJSON')
  return value as CellsData
}
