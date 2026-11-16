import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import type { LinkProps } from 'react-router-dom'
import { buttonClasses } from './buttonStyles'
import type { ButtonSize, ButtonVariant } from './buttonStyles'

type Common = { variant?: ButtonVariant; size?: ButtonSize }

export function Button({ variant, size, className, type = 'button', ...props }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />
}

/** Enlace interno con aspecto de botón. */
export function ButtonLink({ variant, size, className, ...props }: Common & LinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />
}

/** Enlace externo con aspecto de botón; abre en otra pestaña y lo anuncia. */
export function ButtonAnchor({ variant, size, className, children, ...props }: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={buttonClasses(variant, size, className)} target="_blank" rel="noreferrer" {...props}>{children}<span className="sr-only"> (opens in a new tab)</span></a>
}
