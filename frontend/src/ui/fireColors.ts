/** Fire scale, 9 steps (A2). Light: on paper. Dark: on night, inverted (intense = light, like embers). */
export const FIRE_LIGHT = ['#FFF1D0', '#FFDC9A', '#FFC062', '#FB9C38', '#EF781E', '#D65512', '#B23A0E', '#86270C', '#5A1909'] as const
export const FIRE_DARK = ['#4A1E14', '#6E2812', '#96350F', '#BE4710', '#DE6216', '#F3842A', '#FCA548', '#FFC977', '#FFEBB8'] as const
/** Text color with enough contrast inside a cell of each step (ink or white). */
export const FIRE_LIGHT_TEXT = ['#14213D', '#14213D', '#14213D', '#14213D', '#14213D', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'] as const
export const FIRE_DARK_TEXT = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#14213D', '#14213D', '#14213D', '#14213D', '#14213D'] as const

export function fireColor(step: number, dark = false): string {
  const scale = dark ? FIRE_DARK : FIRE_LIGHT
  return scale[Math.max(0, Math.min(8, step))]
}
