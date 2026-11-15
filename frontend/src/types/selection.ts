import type { Sensor } from './data.ts'

/** One shared period; selecting a month does not filter CSV export. */
export interface ExplorationPeriod {
  region: string
  year: number | null
  month: number | null
}
// Only observed series are implemented. Estimated series belong to UX-07.
export type CalendarSeries = Sensor
export type ExplorationScope = 'year' | 'month'
export interface ExplorationSelection extends ExplorationPeriod {
  calendarSeries: CalendarSeries
  mapSensor: Sensor
  scope: ExplorationScope
}
export interface CalendarSelection extends ExplorationPeriod {
  series: CalendarSeries
  scope?: ExplorationScope
}
export interface MapSelection extends ExplorationPeriod {
  sensor: Sensor
  scope?: ExplorationScope
}
export interface CalendarSelectionProps {
  selection?: CalendarSelection
  onSelectionChange?: (selection: CalendarSelection) => void
  mapHref?: (selection: CalendarSelection) => string
  onOpenMap?: (event: import('react').MouseEvent<HTMLAnchorElement>, selection: CalendarSelection) => void
}
