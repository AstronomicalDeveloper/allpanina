import type { CalendarStatus } from '../../services/data/calendar.ts'

export const CALENDAR_STATE_TEXT: Record<CalendarStatus, string> = {
  value: 'Observado',
  zero: 'Cero observado',
  missing: 'Sin dato utilizable',
  absent: 'No publicado',
}

/** Presentation only. Saturation changes the color, never the observed value. */
export function calendarHeatColor(value: number, scaleMax: number): string {
  const intensity = Math.max(0, Math.min(1, value / scaleMax))
  const low = [255, 246, 224]
  const high = [221, 130, 82]
  return `rgb(${low.map((channel, i) => Math.round(channel + (high[i] - channel) * intensity)).join(', ')})`
}
