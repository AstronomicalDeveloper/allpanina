/** Formatos de presentación en inglés (B7): «25,046», «Aug 2024», «August 2024». Solo presentación. */
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Conteo entero con separador de miles. `null` → «—». */
export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? '—' : Math.round(value).toLocaleString('en-US')
}
/** «Aug 2024». `month` va de 1 a 12. */
export function formatMonth(year: number, month: number): string {
  return `${MONTHS_SHORT[month - 1]} ${year}`
}
/** «August 2024». */
export function formatMonthLong(year: number, month: number): string {
  return `${MONTHS_LONG[month - 1]} ${year}`
}

/** Inicial del mes para encabezados estrechos: «J», «F», … */
export function monthInitial(month: number): string {
  return MONTHS_LONG[month - 1][0]
}
/** «Aug». */
export function monthShort(month: number): string {
  return MONTHS_SHORT[month - 1]
}
/** «2025-01:2026-07» o «2025-01» → «Jan 2025 – Jul 2026». Si el texto no tiene ese formato, se devuelve tal cual. */
export function formatPeriodRange(period: string): string {
  const parts = period.split(':').map(part => /^(\d{4})-(\d{2})$/.exec(part.trim()))
  if (!parts.length || parts.some(match => !match)) return period
  return parts.map(match => formatMonth(Number(match![1]), Number(match![2]))).join(' – ')
}
/** Fracción → porcentaje con un decimal: 0.308 → «30.8%». */
export function formatPercent(fraction: number | null | undefined): string {
  return fraction === null || fraction === undefined || !Number.isFinite(fraction) ? '—' : `${(fraction * 100).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}
/** Número con hasta `digits` decimales: 1638.602 → «1,638.6». */
export function formatDecimal(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined || !Number.isFinite(value) ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: digits })
}
