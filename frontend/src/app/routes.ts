/** English routes (PLAN_REDISENO B7). The old Spanish routes redirect, keeping query and hash. */
export const PATHS = {
  home: '/',
  calendar: '/calendar',
  map: '/map',
  method: '/method',
  myRegion: '/my-region',
  about: '/about',
} as const

/** Old address -> new address. Links already shared keep working. */
export const LEGACY_PATHS: Record<string, string> = {
  '/calendario': PATHS.calendar,
  '/mapa': PATHS.map,
  '/metodo': PATHS.method,
  '/mi-region': PATHS.myRegion,
  '/acerca': PATHS.about,
}

export const NAVIGATION: { path: string; label: string }[] = [
  { path: PATHS.home, label: 'Home' },
  { path: PATHS.calendar, label: 'Calendar' },
  { path: PATHS.map, label: 'Map' },
  { path: PATHS.method, label: 'Method' },
  { path: PATHS.myRegion, label: 'My region' },
  { path: PATHS.about, label: 'About' },
]

/** Pages that show data for the selected scope: changing scope keeps the user on the same page. */
export const SCOPED_PATHS: ReadonlySet<string> = new Set([PATHS.calendar, PATHS.map, PATHS.method])

/** "/calendar/" and "/calendar" are the same page. */
export function normalizePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}
