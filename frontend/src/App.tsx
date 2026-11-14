import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import DemoDataCheck from './components/DemoDataCheck'
import CalendarPage from './components/calendar/CalendarPage'
import MethodPage from './components/method/MethodPage'

type View = 'calendar' | 'method' | 'demo'
function currentView(): View {
	const params = new URLSearchParams(window.location.search)
	return params.get('demo') === '1' ? 'demo' : params.get('view') === 'method' ? 'method' : 'calendar'
}

// dataRoot is injectable for integration tests; production uses Vite's base path.
function App({ dataRoot }: { dataRoot?: string }) {
	const root = dataRoot ?? `${import.meta.env.BASE_URL}data/demo`
	const [view, setView] = useState<View>(currentView)
	useEffect(() => {
		const onPopState = () => setView(currentView())
		window.addEventListener('popstate', onPopState)
		return () => window.removeEventListener('popstate', onPopState)
	}, [])
	function hrefFor(target: View) {
		const url = new URL(window.location.href)
		url.searchParams.delete('demo')
		url.searchParams.set('view', target)
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
			<a href={hrefFor('method')} aria-current={view === 'method' ? 'page' : undefined} onClick={event => navigate(event, 'method')}>Método</a>
		</nav>
		{view === 'method' ? <MethodPage dataRoot={root} /> : <CalendarPage dataUrl={`${root}/monthly_series.csv`} />}
	</>
}

export default App
