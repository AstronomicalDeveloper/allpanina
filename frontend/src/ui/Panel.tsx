import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

/** Surface with a 1 px border. Shadow only when it floats over the map (A2). */
export function Panel({ dark = false, floating = false, className, ...props }: HTMLAttributes<HTMLDivElement> & { dark?: boolean; floating?: boolean }) {
  return <div className={cx('rounded-panel border p-5',
    dark ? 'on-dark border-rule bg-orbit text-paper' : 'border-ink/10 bg-white text-ink',
    floating && 'shadow-[0_8px_24px_rgb(11_23_54_/_28%)]', className)} {...props} />
}

/** Page heading: optional eyebrow, title (Plex Condensed) and lead paragraph. */
export function PageHeader({ eyebrow, title, lead, actions, dark = false, className }: {
  eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode; actions?: ReactNode; dark?: boolean; className?: string
}) {
  return <header className={cx('grid gap-3', className)}>
    {eyebrow && <p className={cx('m-0 text-xs font-semibold uppercase tracking-[0.08em]', dark ? 'text-ember' : 'text-cinder')}>{eyebrow}</p>}
    <h1 className={cx('m-0 font-display text-3xl font-semibold tracking-[-0.01em] md:text-4xl', dark ? 'text-paper' : 'text-ink')}>{title}</h1>
    {lead && <p className={cx('m-0 max-w-[65ch] text-lg', dark ? 'text-paper/80' : 'text-muted')}>{lead}</p>}
    {actions && <div className="mt-2 flex flex-wrap items-center gap-3">{actions}</div>}
  </header>
}

/** Page section with an h2. Lines of 60-75 characters. */
export function Section({ title, id, children, className }: { title: ReactNode; id?: string; children: ReactNode; className?: string }) {
  return <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cx('grid gap-4 border-t border-ink/10 py-10', className)}>
    <h2 id={id ? `${id}-title` : undefined} className="m-0 font-display text-2xl font-semibold text-ink">{title}</h2>
    {children}
  </section>
}

/** Page container: 40 px side margins on desktop, 16 px on mobile. */
export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('mx-auto w-full max-w-[1280px] px-4 md:px-10', className)} {...props} />
}
