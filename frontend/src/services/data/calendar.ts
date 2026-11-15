import type { MonthlyRecord, Sensor } from '../../types/data.ts'

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'] as const
export type CalendarStatus = 'value' | 'zero' | 'missing' | 'absent'
export interface CalendarCell {
  year: number
  month: number
  record: MonthlyRecord | null
  status: CalendarStatus
}
export interface CalendarYear { year: number; cells: CalendarCell[] }

export function calendarStatus(record: MonthlyRecord | null): CalendarStatus {
  if (!record) return 'absent'
  if (record.status !== 'ok') return record.status
  return record?.cell_days === 0 ? 'zero' : 'value'
}

export function filterCalendarRecords(records: MonthlyRecord[], region: string, sensor: Sensor): MonthlyRecord[] {
  return records.filter(record => record.region_id === region && record.sensor_group === sensor)
}

/** Already validated L3 records; never aggregate regions or infer missing zeros. */
export function buildCalendar(records: MonthlyRecord[], region: string, sensor: Sensor): CalendarYear[] {
  const regional = records.filter(record => record.region_id === region)
  // Keep the same years when switching sensors, even if one sensor has no rows.
  const years = [...new Set(regional.map(record => record.year))].sort((a, b) => a - b)
  const lookup = new Map(filterCalendarRecords(records, region, sensor).map(record => [`${record.year}-${record.month}`, record]))
  return years.map(year => ({
    year,
    cells: MONTHS.map((_, index) => {
      const month = index + 1, record = lookup.get(`${year}-${month}`) ?? null
      return { year, month, record, status: calendarStatus(record) }
    }),
  }))
}

export function cellLabel(cell: CalendarCell): string {
  switch (cell.status) {
    case 'value': return String(cell.record?.cell_days)
    case 'zero': return '0 · válido'
    case 'missing': return 'Sin datos'
    case 'absent': return 'Ausente'
  }
}
