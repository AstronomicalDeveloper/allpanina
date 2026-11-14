import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import DemoDataCheck from './components/DemoDataCheck'
import CalendarPage from './components/calendar/CalendarPage'
import MethodPage from './components/method/MethodPage'
import MapPage from './components/map/MapPage'
import type { MapSelection } from './types/selection.ts'
import type { RuntimeLoader } from './components/map/mapRuntime.ts'

type View = 'calendar' | 'method' | 'map' | 'demo'
function currentView(): View {
	const params = new URLSearchParams(window.location.search)
	return params.get('demo') === '1' ? 'demo' : params.get('view') === 'method' ? 'method' : params.get('view') === 'map' ? 'map' : 'calendar'
}

function initialSelection(): MapSelection {
	const params = new URLSearchParams(window.location.search)
	const integer = (key: string, max: number) => {
		const raw = params.get(key)
		const value = raw && /^\d+$/.test(raw) ? Number(raw) : NaN
		return Number.isInteger(value) && value >= 1 && value <= max ? value : null
	}
	return { region: params.get('mapRegion') ?? '', year: integer('periodYear', 9999), month: integer('periodMonth', 12), sensor: params.get('sensor') === 'VIIRS' ? 'VIIRS' : 'MODIS' }
}

// dataRoot is injectable for integration tests; production uses Vite's base path.
function App({ dataRoot, mapRuntimeLoader }: { dataRoot?: string; mapRuntimeLoader?: RuntimeLoader }) {
	const root = dataRoot ?? `${(import.meta.env?.BASE_URL ?? '/')}data${new URLSearchParams(window.location.search).get('data') === 'demo' ? '/demo' : ''}`
	const [view, setView] = useState<View>(currentView)
	const [selection, setSelection] = useState<MapSelection>(initialSelection)
	useEffect(() => {
		const onPopState = () => { setView(currentView()); setSelection(initialSelection()) }
		window.addEventListener('popstate', onPopState)
		return () => window.removeEventListener('popstate', onPopState)
	}, [])
	function hrefFor(target: View) {
		const url = new URL(window.location.href)
		url.searchParams.delete('demo')
		url.searchParams.set('view', target)
		for (const [key, value] of Object.entries({ mapRegion: selection.region || null, periodYear: selection.year, periodMonth: selection.month, sensor: selection.sensor })) {
			if (value === null) url.searchParams.delete(key)
			else url.searchParams.set(key, String(value))
		}
		return `${url.pathname}${url.search}${url.hash}`
	}
	function navigate(event: MouseEvent<HTMLAnchorElement>, target: View) {
		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
		event.preventDefault()
		window.history.pushState(null, '', hrefFor(target))
		setView(target)
	}
	if (view === 'demo') {
		return <DemoDataCheck />
	}
	return <>
		<nav className="app-nav" aria-label="Navegación principal">
			<a href={hrefFor('calendar')} aria-current={view === 'calendar' ? 'page' : undefined} onClick={event => navigate(event, 'calendar')}>Calendario</a>
			<a href={hrefFor('map')} aria-current={view === 'map' ? 'page' : undefined} onClick={event => navigate(event, 'map')}>Mapa</a>
			<a href={hrefFor('method')} aria-current={view === 'method' ? 'page' : undefined} onClick={event => navigate(event, 'method')}>Método</a>
		</nav>
		{view === 'method' ? <MethodPage dataRoot={root} /> : view === 'map' ? <MapPage dataRoot={root} selection={selection} onSelectionChange={setSelection} runtimeLoader={mapRuntimeLoader} /> : <CalendarPage dataUrl={`${root}/monthly_series.csv`} selection={selection} onSelectionChange={setSelection} />}
	</>
}

export default App
