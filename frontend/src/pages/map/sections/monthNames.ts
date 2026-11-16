/** English month names for the map controls: January … December. */
const longName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' })
export const MONTH_NAMES: readonly string[] = Array.from({ length: 12 }, (_, i) => longName.format(new Date(Date.UTC(2024, i, 1))))
