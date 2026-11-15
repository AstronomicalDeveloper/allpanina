/** English number and date formats for the interface (PLAN_REDISENO B7): 25,046 · Aug 2024. */
const count = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const monthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const monthLong = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** Integer counts (cell-days): never decimals. */
export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? 'No data' : count.format(Math.round(value))
}
export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? 'No data' : decimal.format(value)
}
/** 0.308 -> "30.8%". */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined || !Number.isFinite(value) ? 'Not available' : `${(value * 100).toFixed(digits)}%`
}
/** (2024, 8) -> "Aug 2024"; long: "August 2024". */
export function formatMonth(year: number, month: number, long = false): string {
  return (long ? monthLong : monthYear).format(new Date(Date.UTC(year, month - 1, 1)))
}
export const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
