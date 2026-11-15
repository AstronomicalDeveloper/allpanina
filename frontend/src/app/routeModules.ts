import { createElement, lazy } from 'react'
import type { ComponentType } from 'react'

type PageModule = { default: ComponentType }

/**
 * A page loaded on demand (React.lazy, PLAN_REDISENO T2). Once its module is loaded it renders without
 * suspending again, and `preload()` lets the app (or tests) load it ahead of time.
 */
function lazyPage(load: () => Promise<PageModule>) {
  let loaded: ComponentType | null = null
  const preload = () => load().then(module => { loaded = module.default; return module })
  const Lazy = lazy(preload)
  function Page() { return loaded ? createElement(loaded) : createElement(Lazy) }
  return Object.assign(Page, { preload })
}

export const LandingPage = lazyPage(() => import('../pages/landing/LandingPage'))
export const CalendarPage = lazyPage(() => import('../pages/calendar/CalendarPage'))
export const MapPage = lazyPage(() => import('../pages/map/MapPage'))
export const MethodPage = lazyPage(() => import('../pages/method/MethodPage'))
export const RegionPage = lazyPage(() => import('../pages/region/RegionPage'))
export const AboutPage = lazyPage(() => import('../features/about/AboutPage'))
export const NotFoundPage = lazyPage(() => import('../pages/NotFoundPage'))

const pages = [LandingPage, CalendarPage, MapPage, MethodPage, RegionPage, AboutPage, NotFoundPage]

/** Loads every page module. The browser calls it when idle; tests call it before rendering. */
export function preloadPages(): Promise<unknown> {
  return Promise.all(pages.map(page => page.preload()))
}

// Outside Vite (Node tests with tsx) there is no import.meta.env: load everything first, so routes
// render synchronously and tests never see the loading fallback.
if (!import.meta.env) await preloadPages()
