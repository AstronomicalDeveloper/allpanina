import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { NAVIGATION } from '../app/routes'

/**
 * Full-screen menu for small screens (A3). Accessible dialog: focus goes to the first link, Tab stays
 * inside, Escape closes and returns focus to the menu button. The page behind does not scroll.
 */
export default function MobileMenu({ onClose, onNavigate }: { onClose: () => void; onNavigate: () => void }) {
  const { search, hash } = useLocation()
  const panel = useRef<HTMLDivElement>(null)
  const navigateRef = useRef(onNavigate)
  useEffect(() => { navigateRef.current = onNavigate })
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('a')?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // If the window grows to desktop width, the menu is hidden by CSS: close it so the page can scroll again.
    const wide = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 64rem)') : null
    const close = () => { if (wide?.matches) navigateRef.current() }
    wide?.addEventListener('change', close)
    return () => { document.body.style.overflow = previous; wide?.removeEventListener('change', close) }
  }, [])
  function keep(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
    if (event.key !== 'Tab') return
    const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('a, button') ?? [])
    if (!items.length) return
    const first = items[0], last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  return <div ref={panel} id="mobile-menu" role="dialog" aria-modal="true" aria-label="Main menu" onKeyDown={keep}
    className="fixed inset-x-0 bottom-0 top-topbar z-40 overflow-y-auto bg-night px-4 pb-10 pt-6 text-paper lg:hidden">
    <nav aria-label="Main">
      <ul className="m-0 grid list-none gap-1 p-0">
        {NAVIGATION.map(item => <li key={item.path}>
          <NavLink end to={{ pathname: item.path, search, hash }} onClick={onNavigate}
            className="focus-ring flex min-h-12 items-center rounded-control px-3 font-display text-xl font-medium text-paper/80 no-underline hover:bg-orbit aria-[current=page]:bg-orbit aria-[current=page]:text-paper">
            {item.label}
          </NavLink>
        </li>)}
      </ul>
    </nav>
    <p className="mt-8 max-w-[40ch] text-xs text-paper/60">Scientific prototype. A thermal detection is not a confirmed fire. Do not use for tactical or emergency decisions.</p>
  </div>
}
