import type { Sensor } from './data.ts'

/** UI context; selecting a month does not add a temporal filter to CSV export. */
export interface MapSelection {
  region: string
  year: number | null
  month: number | null
  sensor: Sensor
}
export interface SharedSelectionProps {
  selection?: MapSelection
  onSelectionChange?: (selection: MapSelection) => void
}
