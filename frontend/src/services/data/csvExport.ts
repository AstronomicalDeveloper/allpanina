import type { MonthlyRecord, Sensor } from '../../types/data.ts'

export const MONTHLY_COLUMNS = ['region_id', 'year', 'month', 'sensor_group', 'cell_days', 'status', 'source_version', 'updated_at'] as const satisfies readonly (keyof MonthlyRecord)[]

function csvField(value: string | number | null): string {
  if (value === null) return ''
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('El CSV contiene un número no finito')
    return String(value)
  }
  // Only text is neutralized. Quoting alone does not prevent spreadsheet formulas.
  // Preserve the original text after a leading apostrophe, including whitespace.
  const safe = /^[\s\p{Cc}]*[=+\-@＝＋－＠]/u.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** CSV with CRLF rows; string fields get spreadsheet-formula protection. */
export function serializeCsv(rows: readonly (readonly (string | number | null)[])[]): string {
  return rows.map(row => row.map(csvField).join(',')).join('\r\n') + '\r\n'
}

/** Input is the existing validated, filtered series, not the generated grid. */
export function serializeMonthlySeries(records: MonthlyRecord[]): string {
  const ordered = [...records].sort((a, b) => a.year - b.year || a.month - b.month)
  return serializeCsv([MONTHLY_COLUMNS, ...ordered.map(record => MONTHLY_COLUMNS.map(column => record[column]))])
}

function filenamePart(value: string): string {
  return value.normalize('NFKC').replace(/[^\p{L}\p{N}_-]/gu, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'region'
}

/** Explicit DEMO suffix; production exports preserve the official observed schema. */
export function calendarCsvFilename(region: string, sensor: Sensor, demo = false): string {
  return `allpanina_${filenamePart(region)}_${filenamePart(sensor)}${demo ? '_demo' : ''}.csv`
}

export function downloadCsv(csv: string, filename: string): void {
  // UTF-8 BOM improves Unicode detection in spreadsheet applications.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
  const anchor = document.createElement('a')
  const url = URL.createObjectURL(blob)
  try {
    anchor.href = url
    anchor.download = filename
    anchor.hidden = true
    document.body.append(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    // Defer release so the browser can start consuming the Blob after the click.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
