import { cn } from './cn'

/**
 * primary  Ascua con texto blanco, para fondos claros (6,0:1).
 * glow     Brasa con texto Tinta, para fondos oscuros (Noche).
 * secondary borde fino, fondo transparente; se adapta al color del texto que lo rodea.
 * ghost    solo texto, para acciones menores.
 */
export type ButtonVariant = 'primary' | 'glow' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base = 'inline-flex items-center justify-center gap-2 rounded-control font-sans font-medium whitespace-nowrap no-underline cursor-pointer transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50'
const variants: Record<ButtonVariant, string> = {
  primary: 'border-0 bg-cinder text-white hover:bg-fire-8',
  glow: 'border-0 bg-ember text-ink hover:bg-glow-8',
  secondary: 'border border-current bg-transparent text-inherit hover:bg-ink/5',
  ghost: 'border-0 bg-transparent text-inherit underline underline-offset-4 hover:decoration-2',
}
const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-base',
  lg: 'min-h-12 px-5 text-lg',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}
