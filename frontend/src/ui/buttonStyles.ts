import { cx } from './cx'

export type ButtonVariant = 'primary' | 'primary-dark' | 'secondary' | 'secondary-dark' | 'ghost'
export type ButtonSize = 'sm' | 'md'

const base = 'focus-ring inline-flex items-center justify-center gap-2 rounded-control font-sans font-semibold no-underline transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50'
const sizes: Record<ButtonSize, string> = { sm: 'min-h-9 px-3 text-sm', md: 'min-h-11 px-5 text-base' }
const variants: Record<ButtonVariant, string> = {
  /** On light surfaces: Ascua with white text (6.0:1). */
  primary: 'border border-cinder bg-cinder text-white hover:bg-fire-8 hover:border-fire-8',
  /** On dark surfaces: Brasa with ink text (8.3:1 against Noche). */
  'primary-dark': 'border border-ember bg-ember text-ink hover:bg-glow-8 hover:border-glow-8',
  secondary: 'border border-ink/25 bg-white text-ink hover:border-ink/50',
  'secondary-dark': 'border border-paper/30 bg-transparent text-paper hover:border-paper/60',
  ghost: 'border border-transparent bg-transparent text-cinder underline underline-offset-4 hover:text-fire-8',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string): string {
  return cx(base, sizes[size], variants[variant], className)
}
