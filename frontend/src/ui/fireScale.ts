/**
 * Escala de fuego de AllpaNina (PLAN_REDISENO.md §A2). Solo presentación: no cambia ningún valor.
 *
 * - 9 pasos de un solo tono, validados: luminosidad monótona y texto legible dentro de cada paso.
 * - `light` va sobre Papel (claro → oscuro); `dark` va sobre Noche (oscuro → claro: lo intenso brilla).
 * - Clases por cuantiles de los valores mayores que cero. Cero, sin dato y no publicado NO son clases:
 *   se dibujan aparte (gris, rayado, borde punteado).
 */
export const FIRE_LIGHT = ['#FFF1D0', '#FFDC9A', '#FFC062', '#FB9C38', '#EF781E', '#D65512', '#B23A0E', '#86270C', '#5A1909'] as const
export const FIRE_DARK = ['#4A1E14', '#6E2812', '#96350F', '#BE4710', '#DE6216', '#F3842A', '#FCA548', '#FFC977', '#FFEBB8'] as const
export const FIRE_STEPS = 9
export type FireSurface = 'light' | 'dark'

/** Color del texto dentro de cada paso (tinta o blanco), elegido por contraste (≥ 3,9:1). */
const INK = '#14213D', WHITE = '#FFFFFF'
const TEXT_LIGHT = [INK, INK, INK, INK, INK, WHITE, WHITE, WHITE, WHITE] as const
const TEXT_DARK = [WHITE, WHITE, WHITE, WHITE, INK, INK, INK, INK, INK] as const

export function fireColor(step: number, surface: FireSurface = 'light'): string {
  return (surface === 'light' ? FIRE_LIGHT : FIRE_DARK)[clampStep(step)]
}
export function fireTextColor(step: number, surface: FireSurface = 'light'): string {
  return (surface === 'light' ? TEXT_LIGHT : TEXT_DARK)[clampStep(step)]
}
function clampStep(step: number) { return Math.max(0, Math.min(FIRE_STEPS - 1, Math.trunc(step))) }

/**
 * Cortes por cuantiles (hasta 8 cortes → 9 clases) sobre los valores finitos > 0.
 * Los cortes se deduplican: con pocos valores distintos hay menos clases, nunca clases vacías inventadas.
 */
export function quantileBreaks(values: Iterable<number | null | undefined>): number[] {
  const positive = [...values].filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0).sort((a, b) => a - b)
  if (!positive.length) return []
  const breaks: number[] = []
  for (let k = 1; k < FIRE_STEPS; k++) {
    const cut = positive[Math.min(positive.length - 1, Math.floor(positive.length * k / FIRE_STEPS))]
    if (cut > positive[0] && !breaks.includes(cut)) breaks.push(cut)
  }
  return breaks
}

/**
 * Paso de la escala (0–8) para un valor > 0. Con menos cortes que 8, las clases se reparten
 * a lo largo de toda la escala para que el más alto siga siendo el más intenso.
 */
export function fireStep(value: number, breaks: number[]): number {
  let cls = 0
  while (cls < breaks.length && value >= breaks[cls]) cls++
  if (breaks.length === 0) return FIRE_STEPS - 1
  return Math.round(cls * (FIRE_STEPS - 1) / breaks.length)
}

/** Rótulos enteros de cada clase para la leyenda: «1–12», «13–40», …, «≥ 4 200». */
export function classLabels(breaks: number[], min = 1): string[] {
  const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
  const bounds = [min, ...breaks]
  return bounds.map((lo, i) => i === bounds.length - 1 ? `≥ ${fmt(lo)}` : `${fmt(lo)}–${fmt(Math.max(lo, bounds[i + 1] - 1))}`)
}
