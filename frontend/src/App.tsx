import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import DemoDataCheck from './components/DemoDataCheck'
import AppHeader from './components/AppHeader'
import CalendarPage from './components/calendar/CalendarPage'
import MethodPage from './components/method/MethodPage'
import MapPage from './components/map/MapPage'
import type { CalendarSelection, ExplorationSelection, MapSelection } from './types/selection.ts'
import type { Sensor } from './types/data.ts'
import type { RuntimeLoader } from './components/map/mapRuntime.ts'

type View = 'calendar' | 'method' | 'map' | 'demo'
function currentView(): View {
	const params = new URLSearchParams(window.location.search)
	return params.get('demo') === '1' ? 'demo' : params.get('view') === 'method' ? 'method' : params.get('view') === 'map' ? 'map' : 'calendar'
}

function observedSensor(value: string | null): value is Sensor {
	return value === 'MODIS' || value === 'VIIRS'
}

function initialSelection(): ExplorationSelection {
	const params = new URLSearchParams(window.location.search)
	const integer = (key: string, max: number) => {
		const raw = params.get(key)
		const value = raw && /^\d+$/.test(raw) ? Number(raw) : NaN
		return Number.isInteger(value) && value >= 1 && value <= max ? value : null
	}
	const legacySensor = params.get('sensor') === 'VIIRS' ? 'VIIRS' : 'MODIS'
	const calendarSeries = params.get('calendarSeries'), mapSensor = params.get('mapSensor')
	return {
		region: params.get('mapRegion') ?? '', year: integer('periodYear', 9999), month: integer('periodMonth', 12),
		calendarSeries: observedSensor(calendarSeries) ? calendarSeries : legacySensor,
		mapSensor: observedSensor(mapSensor) ? mapSensor : legacySensor,
		scope: params.get('scope') === 'year' || params.get('scope') === 'month' ? params.get('scope') as 'year' | 'month' : params.get('mapScope') === 'month' ? 'month' : 'year',
	}
}

// dataRoot is injectable for integration tests; production uses Vite's base path.
function App({ dataRoot, mapRuntimeLoader }: { dataRoot?: string; mapRuntimeLoader?: RuntimeLoader }) {
	const root = dataRoot ?? `${(import.meta.env?.BASE_URL ?? '/')}data${new URLSearchParams(window.location.search).get('data') === 'demo' ? '/demo' : ''}`
	const [view, setView] = useState<View>(currentView)
	const [selection, setSelection] = useState<ExplorationSelection>(initialSelection)
	useEffect(() => {
		const onPopState = () => { setView(currentView()); setSelection(initialSelection()) }
		window.addEventListener('popstate', onPopState)
		return () => window.removeEventListener('popstate', onPopState)
	}, [])
	function selectionFor(target: View): ExplorationSelection {
		// Do not copy future non-observed calendar series into the geographic sensor.
		return view === 'calendar' && target === 'map' && observedSensor(selection.calendarSeries)
			? { ...selection, mapSensor: selection.calendarSeries } : selection
	}
	function selectionUrl(target: View, next: ExplorationSelection) {
		const url = new URL(window.location.href)
		url.searchParams.delete('demo')
		url.searchParams.set('view', target)
		for (const [key, value] of Object.entries({
			mapRegion: next.region || null, periodYear: next.year, periodMonth: next.month,
			calendarSeries: next.calendarSeries, mapSensor: next.mapSensor, scope: next.scope, mapScope: next.scope,
			// Keep older clients/links usable with the sensor of their destination view.
			sensor: target === 'map' ? next.mapSensor : next.calendarSeries,
		})) {
			if (value === null) url.searchParams.delete(key)
			else url.searchParams.set(key, String(value))
		}
		return `${url.pathname}${url.search}${url.hash}`
	}
	function hrefFor(target: View) { return selectionUrl(target, selectionFor(target)) }
	function updateSelection(next: ExplorationSelection) {
		// Filter changes update this entry; only view navigation adds history entries.
		window.history.replaceState(null, '', selectionUrl(view, next))
		setSelection(next)
	}
	function changeCalendar({ region, year, month, series, scope }: CalendarSelection) {
		updateSelection({ ...selection, region, year, month, calendarSeries: series, scope: scope ?? selection.scope })
	}
	function changeMap({ region, year, month, sensor, scope }: MapSelection) {
		updateSelection({ ...selection, region, year, month, mapSensor: sensor, scope: scope ?? selection.scope })
	}
	function mapMonthSelection(period: CalendarSelection): ExplorationSelection {
		return { ...selection, region: period.region, year: period.year, month: period.month, calendarSeries: period.series,
			mapSensor: observedSensor(period.series) ? period.series : selection.mapSensor, scope: 'month' }
	}
	function navigate(event: MouseEvent<HTMLAnchorElement>, target: View, next = selectionFor(target)) {
		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
		event.preventDefault()
		window.history.replaceState(null, '', selectionUrl(view, selection))
		window.history.pushState(null, '', selectionUrl(target, next))
		setSelection(next)
		setView(target)
	}
	if (view === 'demo') {
		return <DemoDataCheck />
	}
	return <div className="app-shell">
		<AppHeader key={root} dataRoot={root}>
			<nav className="app-nav" aria-label="Navegación principal">
				<a href={hrefFor('calendar')} aria-current={view === 'calendar' ? 'page' : undefined} onClick={event => navigate(event, 'calendar')}>Calendario</a>
				<a href={hrefFor('map')} aria-current={view === 'map' ? 'page' : undefined} onClick={event => navigate(event, 'map')}>Mapa</a>
				<a href={hrefFor('method')} aria-current={view === 'method' ? 'page' : undefined} onClick={event => navigate(event, 'method')}>Método</a>
			</nav>
		</AppHeader>
		<div id="app-content" className="app-content" tabIndex={-1}>
		{view === 'method' ? <MethodPage dataRoot={root} /> : view === 'map' ? <MapPage dataRoot={root} selection={{ region: selection.region, year: selection.year, month: selection.month, sensor: selection.mapSensor, scope: selection.scope }} onSelectionChange={changeMap} runtimeLoader={mapRuntimeLoader} /> : <CalendarPage dataUrl={`${root}/monthly_series.csv`} selection={{ region: selection.region, year: selection.year, month: selection.month, series: selection.calendarSeries, scope: selection.scope }} onSelectionChange={changeCalendar} mapHref={period => selectionUrl('map', mapMonthSelection(period))} onOpenMap={(event, period) => navigate(event, 'map', mapMonthSelection(period))} />}
		</div>
	</div>
}

export default App
