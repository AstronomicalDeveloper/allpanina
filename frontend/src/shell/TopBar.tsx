import { useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { NAVIGATION, PATHS, normalizePath } from '../app/routes'
import { cx } from '../ui/cx'
import MobileMenu from './MobileMenu'
import ScopePicker from './ScopePicker'

const linkClass = 'focus-ring relative flex h-full items-center px-3 text-sm font-medium text-paper/75 no-underline transition-colors hover:text-paper aria-[current=page]:text-paper after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:scale-x-0 after:bg-ember after:transition-transform aria-[current=page]:after:scale-x-100'

export function Brand() {
  return <Link to={PATHS.home} aria-label="AllpaNina, go to home" className="brand focus-ring flex items-center gap-2.5 font-display text-xl font-semibold tracking-[-0.01em] text-paper no-underline">
    <span aria-hidden="true" className="size-4 rounded-full bg-ember ring-[3px] ring-ember/30" />AllpaNina
  </Link>
}

/** Top bar, 56 px, flat and fixed (A3). Desktop: links and scope. Mobile: logo, scope and menu button, in one row. */
export default function TopBar() {
  const { pathname, search, hash } = useLocation()
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const isMap = normalizePath(pathname) === PATHS.map
  return <header className={cx('topbar sticky top-0 z-30 h-topbar border-b border-rule bg-night text-paper', isMap && 'topbar--map')}>
    <div className="mx-auto flex h-full max-w-[1440px] items-center gap-6 px-4 md:px-10">
      <Brand />
      <nav aria-label="Main" className="hidden h-full items-stretch lg:flex">
        {NAVIGATION.map(item => <NavLink key={item.path} end to={{ pathname: item.path, search, hash }} className={linkClass}>{item.label}</NavLink>)}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <ScopePicker />
        <button ref={button} type="button" className="focus-ring grid size-10 place-items-center rounded-control border border-rule bg-transparent text-paper lg:hidden"
          aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(o => !o)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
    </div>
    {open && <MobileMenu onClose={() => { setOpen(false); button.current?.focus() }} onNavigate={() => setOpen(false)} />}
  </header>
}
