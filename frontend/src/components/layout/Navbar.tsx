import { Link, NavLink, useLocation } from 'react-router-dom'
import { datasetMode, datasetRoot } from '../../services/data/geography'
import type { DatasetMode } from '../../services/data/geography'

const destinations = [['/calendario', 'Calendario'], ['/mapa', 'Mapa'], ['/metodo', 'Método'], ['/mi-region', 'Mi región']]

/** Nombre del conjunto de datos activo, para que el enlace al manifiesto diga qué publicación abre. */
const datasetLabel: Record<DatasetMode, string> = { peru: 'Perú v1.1', pilot: 'piloto Ucayali v1.0', demo: 'DEMO (datos ficticios)' }

export default function Navbar() {
  const { pathname, search, hash } = useLocation()
  const mode = datasetMode(new URLSearchParams(search))

  return <header className={`navbar${pathname === '/mapa' ? ' navbar--map' : ''}`}>
    <strong className="brand-wrap"><Link className="brand" to="/" aria-label="AllpaNina, ir al inicio"><svg className="brand-symbol" viewBox="0 0 24 28" fill="none" aria-hidden="true"><path d="M13 2c1 6 7 8 7 15a8 8 0 0 1-16 0c0-3 2-6 5-8 0 4 1 6 3 7 3-4 2-9 1-14Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>AllpaNina</Link></strong>
    <nav aria-label="Navegación principal">
      {destinations.map(([path, label]) => <NavLink end key={path} to={{ pathname: path, search, hash }}>{label}</NavLink>)}
    </nav>
    <details key={pathname} className="secondary-navigation" onKeyDown={event => {
      if (event.key === 'Escape') {
        event.currentTarget.open = false
        event.currentTarget.querySelector('summary')?.focus()
      }
    }}>
      <summary aria-label="Información sobre AllpaNina" title="Información sobre AllpaNina"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 10v7" /><circle cx="12" cy="7" r=".8" fill="currentColor" stroke="none" /></svg></summary>
      <div><h2>Acerca de AllpaNina</h2><p>Exploración de detecciones térmicas satelitales. Una detección no equivale a un incendio confirmado.</p><h3>Fuentes</h3><a href={`${datasetRoot(mode)}/manifest.json`}>Manifiesto de datos · {datasetLabel[mode]}</a><h3>Ayuda</h3><p>Calendario muestra cuándo hubo más detecciones, Mapa dónde se registraron y Método cómo se calcula el indicador y cuáles son sus límites.</p></div>
    </details>
  </header>
}
