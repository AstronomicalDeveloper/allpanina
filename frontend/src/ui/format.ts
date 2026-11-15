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
