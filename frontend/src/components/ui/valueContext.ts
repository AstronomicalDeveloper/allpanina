/** Presentation helper: where a published value sits among other published values. No new metric is stored. */
export interface ValueContext { greater: number; total: number; max: number }

export function valueContext(values: readonly number[], value: number | null | undefined): ValueContext | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  const usable = values.filter(v => Number.isFinite(v))
  if (!usable.length) return null
  return { greater: usable.filter(v => v > value).length, total: usable.length, max: Math.max(...usable) }
}
