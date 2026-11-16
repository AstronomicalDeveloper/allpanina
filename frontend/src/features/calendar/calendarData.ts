/**
 * Datos de presentación del Calendario: qué celda pinta cada mes, sus clases de color y los resúmenes
 * de texto. Solo lee los registros publicados ya validados; no recalcula ni corrige ningún valor.
 */
import { buildCalendar } from '../../services/data/calendar'
import { quantileBreaks } from '../../ui/fireScale'
import { formatCount, formatMonthLong, monthShort } from '../../ui/format'
import type { CalibratedRecord, MethodInfo, Metrics, MonthlyRecord, NationalMethod, Split } from '../../types/data'
import type { CalendarSeries } from '../../types/selection'

export type CellState = 'value' | 'zero' | 'missing' | 'absent'
export interface SeriesCell {
  year: number
  month: number
  /** Valor publicado: observado (MODIS/VIIRS) o estimado (B1). `null` si no hay valor utilizable. */
  value: number | null
  state: CellState
  split?: Split | 'sin_validar'
}
export interface SeriesYear { year: number; cells: SeriesCell[]; available: number }

export const SERIES_LABEL: Record<CalendarSeries, string> = { MODIS: 'MODIS', VIIRS: 'VIIRS', B1: 'B1 estimate' }
export const STATE_LABEL: Record<CellState, string> = {
  value: 'Observed',
  zero: 'Observed zero',
  missing: 'No usable data',
  absent: 'Not published',
}
export const SPLIT_LABEL: Record<Split | 'sin_validar', string> = {
  train: 'training period',
  valid: 'validation period',
  test: 'test period',
  sin_validar: 'outside the evaluated periods',
}

function state(value: number | null, ok: boolean): CellState {
  if (!ok || value === null) return 'missing'
  return value === 0 ? 'zero' : 'value'
}

/** Doce meses por año para la serie elegida. Los años son los de la región, igual para las tres series. */
export function seriesYears(monthly: MonthlyRecord[], calibrated: CalibratedRecord[], region: string, series: CalendarSeries): SeriesYear[] {
  if (series !== 'B1') {
    return buildCalendar(monthly, region, series).map(({ year, cells }) => {
      const mapped = cells.map(cell => ({ year, month: cell.month, value: cell.record?.cell_days ?? null, state: cell.status }))
      return { year, cells: mapped, available: mapped.filter(c => c.state === 'value' || c.state === 'zero').length }
    })
  }
  const rows = calibrated.filter(r => r.region_id === region && r.method === 'B1')
  const lookup = new Map(rows.map(r => [`${r.year}-${r.month}`, r]))
  const years = [...new Set([...monthly.filter(r => r.region_id === region).map(r => r.year), ...rows.map(r => r.year)])].sort((a, b) => a - b)
  return years.map(year => {
    const cells = Array.from({ length: 12 }, (_, i): SeriesCell => {
      const row = lookup.get(`${year}-${i + 1}`)
      return row ? { year, month: i + 1, value: row.value, state: state(row.value, row.status === 'ok'), split: row.split } : { year, month: i + 1, value: null, state: 'absent' }
    })
    return { year, cells, available: cells.filter(c => c.state === 'value' || c.state === 'zero').length }
  })
}

/** Cortes de las 9 clases por cuantiles: por región y serie, sobre todos sus meses con detección. */
export function seriesBreaks(years: SeriesYear[]): number[] {
  return quantileBreaks(years.flatMap(row => row.cells.map(cell => cell.value)))
}

/**
 * Mes que se muestra al abrir, para que el panel nunca empiece vacío: el mes más intenso del año
 * pedido o, si no se pidió año, del último año completo (o del último con datos).
 */
export function initialCell(years: SeriesYear[], preferredYear: number | null): SeriesCell | null {
  const usable = (row: SeriesYear | undefined) => row?.cells.filter(cell => cell.state === 'value' || cell.state === 'zero') ?? []
  const pick = (row: SeriesYear | undefined) => usable(row).reduce<SeriesCell | null>((best, cell) => !best || (cell.value ?? 0) > (best.value ?? 0) ? cell : best, null)
  if (preferredYear !== null) {
    const row = years.find(r => r.year === preferredYear)
    return pick(row) ?? row?.cells[0] ?? null
  }
  const complete = [...years].reverse().find(row => row.available === 12)
  const latest = [...years].reverse().find(row => row.available > 0)
  return pick(complete ?? latest)
}

/**
 * Resumen de la serie sobre los años completos: la ventana de tres meses seguidos con más
 * actividad acumulada y el año con la mayor suma anual. Describe los datos; no predice.
 */
export function seasonSummary(years: SeriesYear[]) {
  const complete = years.filter(row => row.available === 12)
  if (!complete.length) return null
  const totals = Array.from({ length: 12 }, (_, i) => complete.reduce((sum, row) => sum + (row.cells[i].value ?? 0), 0))
  if (totals.every(total => total === 0)) return null
  let start = 0, best = -1
  for (let i = 0; i < 12; i++) {
    const window = totals[i] + totals[(i + 1) % 12] + totals[(i + 2) % 12]
    if (window > best) { best = window; start = i }
  }
  const annual = complete.map(row => ({ year: row.year, total: row.cells.reduce((sum, cell) => sum + (cell.value ?? 0), 0) }))
  const peakYear = annual.reduce((a, b) => b.total > a.total ? b : a).year
  return {
    peakMonths: [start + 1, ((start + 1) % 12) + 1, ((start + 2) % 12) + 1],
    peakLabel: `${monthShort(start + 1)}–${monthShort(((start + 2) % 12) + 1)}`,
    peakYear,
    firstYear: complete[0].year,
    lastYear: complete[complete.length - 1].year,
  }
}

/** Nombre legible del ámbito; nunca se inventa: si no hay nombre publicado, devuelve null. */
export function regionName(method: MethodInfo | NationalMethod | null, region: string): string | null {
  if (!method) return null
  if ('contract_version' in method) {
    const name = method.regions.find(item => item.region_id === region)?.nombre
    return name === undefined ? null : region === 'PE' ? 'Peru' : name
  }
  if (method.region_id !== region || !method.region) return null
  return method.region.split('. ')[0].replace(/^Departamento de /, '').split(',')[0].trim()
}

export type TestError =
  | { reportable: true; wape: number | null; period: string; months: number | null; note?: string; clean?: { label: string; wape: number | null } }
  | { reportable: false }

type PilotTest = { periodo?: string; n_meses?: number; B1?: Metrics }

/** Error de B1 en el período de test, tal como se publicó en method.json (agregado, no por mes). */
export function b1TestError(method: MethodInfo | NationalMethod | null, region: string): TestError | null {
  if (!method) return null
  if ('contract_version' in method) {
    if (region in method.resultados.test_no_reportables) return { reportable: false }
    const result = method.resultados.test[region]
    if (!result) return null
    if (region === 'PE') {
      const cleanId = method.resultados.resultado_limpio
      const clean = method.resultados.test[cleanId]
      return { reportable: true, wape: result.B1.wape, period: result.periodo, months: result.n_meses, note: 'ucayali', clean: clean ? { label: 'Peru without Ucayali', wape: clean.B1.wape } : undefined }
    }
    return { reportable: true, wape: result.B1.wape, period: result.periodo, months: result.n_meses }
  }
  if (method.region_id !== region) return null
  const test = (method as { resultados?: { test?: PilotTest } }).resultados?.test
  if (!test?.B1) return null
  return { reportable: true, wape: test.B1.wape, period: test.periodo ?? method.period_test, months: test.n_meses ?? null }
}

/** Nombre accesible de una celda: «September 2024, MODIS: 2,323 cell-days». */
export function cellName(cell: SeriesCell, series: CalendarSeries): string {
  const what = cell.state === 'value' ? `${formatCount(cell.value)} cell-days`
    : cell.state === 'zero' ? '0 cell-days (observed zero)'
    : cell.state === 'missing' ? 'no usable data' : 'not published'
  return `${formatMonthLong(cell.year, cell.month)}, ${SERIES_LABEL[series]}: ${what}`
}
