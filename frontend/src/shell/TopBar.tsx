import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '../ui'
import Logo from './Logo'
import ScopePicker, { ScopeLinks } from './ScopePicker'
import { NAVIGATION, SCOPED_PATHS, cleanPath } from './routes'

/**
 * Barra superior (PLAN_REDISENO §A3): 56 px, azul noche, plana y fija.
 * Escritorio: logo, navegación y ámbito. Móvil (< 1024 px): logo, ámbito compacto y menú.
 */
export default function TopBar() {
  const { pathname, search, hash } = useLocation()
  const path = cleanPath(pathname)
  const scoped = SCOPED_PATHS.includes(path)
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  // Al navegar, el menú se cierra.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) { setLastPath(pathname); setOpen(false) }

  useEffect(() => {
    if (!open) return
    panel.current?.querySelector<HTMLElement>('a, select, button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); button.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const target = (to: string, keepQuery: boolean) => keepQuery ? { pathname: to, search, hash } : to
  const linkClass = ({ isActive }: { isActive: boolean }) => cn(
    'flex h-14 items-center px-3 text-sm no-underline transition-colors',
    isActive ? 'font-medium text-white shadow-[inset_0_-2px_0_var(--color-ember)]' : 'text-mist hover:text-white',
  )

  return <header className="sticky top-0 z-40 h-14 border-b border-rule bg-night text-white">
    <div className="mx-auto flex h-full items-center gap-2 px-3 sm:gap-4 sm:px-4 lg:gap-6 lg:px-4 sm:px-6 lg:px-10">
      <Logo />
      <nav aria-label="Main navigation" className="hidden h-full lg:flex">
        {NAVIGATION.map(item => <NavLink key={item.to} end to={target(item.to, item.keepQuery)} className={linkClass}>{item.label}</NavLink>)}
      </nav>
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 lg:flex-none lg:gap-3">
        {scoped && <div className="min-w-0 flex-1 lg:flex-none"><ScopePicker /></div>}
        <button ref={button} type="button" className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-control border-0 bg-transparent text-white hover:bg-orbit lg:hidden"
          aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
    </div>
    {open && <div ref={panel} id="mobile-menu" className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto border-t border-rule bg-night px-4 pb-8 pt-4 lg:hidden">
      <nav aria-label="Main navigation" className="flex flex-col">
        {NAVIGATION.map(item => <NavLink key={item.to} end to={target(item.to, item.keepQuery)} className={({ isActive }) => cn(
          'flex min-h-12 items-center border-b border-rule font-display text-xl no-underline',
          isActive ? 'font-semibold text-white' : 'text-mist hover:text-white')}>
          {item.label}
        </NavLink>)}
      </nav>
      {scoped && <div className="mt-6 flex flex-wrap gap-4"><ScopeLinks /></div>}
    </div>}
  </header>
}
