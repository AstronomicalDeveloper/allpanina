import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import type { ExplorationSelection, CalendarSelection, MapSelection } from '../types/selection'
import type { Sensor } from '../types/data'
import { ROUTES } from '../shell/routes'
const observed = (value: string | null, fallback: Sensor): Sensor => value === 'VIIRS' || value === 'MODIS' ? value : fallback
export default function useExplorationSelection() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { hash } = useLocation()
  const integer = (key: string, max: number) => {
    const raw = params.get(key) ?? ''
    const value = /^\d+$/.test(raw) ? Number(raw) : NaN
    return Number.isInteger(value) && value >= 1 && value <= max ? value : null
  }
  const legacy = observed(params.get('sensor'), 'MODIS')
  const scope = params.get('scope')
  const selection: ExplorationSelection = {
    region: params.get('mapRegion') ?? '', year: integer('periodYear', 9999), month: integer('periodMonth', 12),
    calendarSeries: observed(params.get('calendarSeries'), legacy), mapSensor: observed(params.get('mapSensor'), legacy),
    scope: scope === 'year' || scope === 'month' ? scope : params.get('mapScope') === 'month' ? 'month' : 'year',
  }
  function parameters(next: ExplorationSelection) {
    const result = new URLSearchParams(params)
    for (const [key, value] of Object.entries({ mapRegion: next.region || null, periodYear: next.year, periodMonth: next.month, calendarSeries: next.calendarSeries, mapSensor: next.mapSensor, scope: next.scope, mapScope: next.scope, sensor: next.calendarSeries })) {
      if (value === null) result.delete(key)
      else result.set(key, String(value))
    }
    return result
  }
  function changeCalendar(next: CalendarSelection) {
    navigate({ search: `?${parameters({ ...selection, region: next.region, year: next.year, month: next.month, calendarSeries: next.series, scope: next.scope ?? selection.scope })}`, hash }, { replace: true })
  }
  function changeMap(next: MapSelection) {
    const result = parameters({ ...selection, region: next.region, year: next.year, month: next.month, mapSensor: next.sensor, scope: next.scope ?? selection.scope })
    result.delete('view')
    navigate({ search: `?${result}`, hash })
  }
  function mapHref(period: CalendarSelection) {
    const result = parameters({ ...selection, region: period.region, year: period.year, month: period.month, scope: 'month' })
    result.set('sensor', selection.mapSensor)
    result.delete('view')
    return `${ROUTES.map}?${result}${hash}`
  }
  return { selection, changeCalendar, changeMap, mapHref }
}
