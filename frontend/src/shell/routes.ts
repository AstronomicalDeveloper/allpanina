/** Rutas públicas (B7: en inglés) y equivalencias con las rutas anteriores en español. */
export const ROUTES = {
  home: '/',
  calendar: '/calendar',
  map: '/map',
  method: '/method',
  myRegion: '/my-region',
  about: '/about',
} as const

/** Rutas antiguas → nuevas. Se redirigen conservando parámetros y ancla. */
export const LEGACY_ROUTES: Record<string, string> = {
  '/calendario': ROUTES.calendar,
  '/mapa': ROUTES.map,
  '/metodo': ROUTES.method,
  '/mi-region': ROUTES.myRegion,
}

/** Páginas que leen el ámbito (región) de la URL y muestran el selector en la barra. */
export const SCOPED_PATHS: string[] = [ROUTES.calendar, ROUTES.map, ROUTES.method]

/** Destinos de la navegación principal. `keepQuery`: conservan ámbito, período y ancla al cambiar de página. */
export const NAVIGATION: Array<{ to: string; label: string; keepQuery: boolean }> = [
  { to: ROUTES.home, label: 'Home', keepQuery: false },
  { to: ROUTES.calendar, label: 'Calendar', keepQuery: true },
  { to: ROUTES.map, label: 'Map', keepQuery: true },
  { to: ROUTES.method, label: 'Method', keepQuery: true },
  { to: ROUTES.myRegion, label: 'My region', keepQuery: false },
  { to: ROUTES.about, label: 'About', keepQuery: false },
]

/** Normaliza la barra final: «/calendar/» → «/calendar». */
export function cleanPath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

export const REPOSITORY_URL = 'https://github.com/AstronomicalDeveloper/allpanina'
