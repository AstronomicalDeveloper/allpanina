import DemoDataCheck from './components/DemoDataCheck'
import CalendarPage from './components/calendar/CalendarPage'
import './components/calendar/calendar.css'

function App() {
	if (new URLSearchParams(window.location.search).get('demo') === '1') {
		return <DemoDataCheck />
	}
	return <CalendarPage dataUrl={`${import.meta.env.BASE_URL}data/demo/monthly_series.csv`} />
}

export default App
