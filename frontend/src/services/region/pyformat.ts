/** Formatos idénticos a Python, para que las salidas coincidan byte a byte con el algoritmo de referencia. */

/** round(v, 5) de Python (los empates exactos en binario son prácticamente imposibles aquí). */
export function round5(v: number): number { return Number(v.toFixed(5)) }

/** repr(float) de Python: 55 -> "55.0", 1e-05 -> "1e-05", 1e+16 -> "1e+16". */
export function pyFloat(v: number): string {
  if (!Number.isFinite(v)) return v > 0 ? 'inf' : v < 0 ? '-inf' : 'nan'
  if (v === 0) return Object.is(v, -0) ? '-0.0' : '0.0'
  const abs = Math.abs(v)
  if (abs >= 1e16 || abs < 1e-4) {
    const [m, ex] = v.toExponential().split('e')
    const n = Number(ex)
    return `${m}e${n < 0 ? '-' : '+'}${String(Math.abs(n)).padStart(2, '0')}`
  }
  const s = String(v)
  return /[.e]/.test(s) ? s : `${s}.0`
}

/** json.dumps de Python (float con ".0", ensure_ascii=False). indent=null -> separadores compactos (",", ":"). */
export function pyJson(value: unknown, indent: number | null = 2): string {
  const pad = (level: number) => (indent === null ? '' : '\n' + ' '.repeat(indent * level))
  const sep = indent === null ? ':' : ': '
  const walk = (v: unknown, level: number): string => {
    if (v === null || v === undefined) return 'null'
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : pyFloat(v)
    if (v instanceof PyFloat) return pyFloat(v.value)
    if (typeof v === 'boolean') return v ? 'true' : 'false'
    if (typeof v === 'string') return JSON.stringify(v)
    if (Array.isArray(v)) {
      if (!v.length) return '[]'
      return '[' + v.map(x => pad(level + 1) + walk(x, level + 1)).join(',') + pad(level) + ']'
    }
    const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined)
    if (!entries.length) return '{}'
    return '{' + entries.map(([k, x]) => pad(level + 1) + JSON.stringify(k) + sep + walk(x, level + 1)).join(',') + pad(level) + '}'
  }
  return walk(value, 0)
}

/** Marca un número como float de Python (para que 55 se escriba "55.0"). */
export class PyFloat { value: number; constructor(value: number) { this.value = value } }
export const f = (v: number | null | undefined) => (v === null || v === undefined ? null : new PyFloat(v))
