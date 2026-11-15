import type { AnchorHTMLAttributes } from 'react'
import { cx } from './cx'

/** Link to another site: opens in a new tab and says so to screen readers. */
export function ExternalLink({ className, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a target="_blank" rel="noreferrer" className={cx('focus-ring underline underline-offset-4', className)} {...props}>
    {children}<span className="sr-only"> (opens in a new tab)</span>
  </a>
}
