import type { Method, Split, ValidationResult } from '../../types/data.ts'

export const METHODS: Method[] = ['B0', 'B1']
export const SPLITS: Split[] = ['train', 'valid', 'test']
export const SPLIT_LABELS: Record<Split, string> = {
  train: 'train · entrenamiento', valid: 'valid · validación', test: 'test · evaluación',
}
export interface TestError {
  method: Method
  month: string
  modis_observed: number
  estimate: number
  signed_error: number
  absolute_error: number
}

/** Presentation only: never calculate metrics/residuals or mutate producer data. */
export function topTestErrors(validation: ValidationResult): TestError[] {
  return METHODS.flatMap(method => {
    const result = validation.methods[method]
    return result?.split === 'test'
      ? (result.residuals ?? []).map(error => ({ ...error, method }))
      : []
  }).sort((a, b) => b.absolute_error - a.absolute_error || a.month.localeCompare(b.month) || a.method.localeCompare(b.method)).slice(0, 5)
}

export function hasMetrics(validation: ValidationResult): boolean {
  return METHODS.some(method => {
    const metrics = validation.methods[method]?.metrics
    return metrics !== undefined && Object.values(metrics).some(value => value !== null)
  })
}

export function hasPartialResults(validation: ValidationResult): boolean {
  return hasMetrics(validation) && METHODS.some(method => {
    const result = validation.methods[method]
    return !result || Object.values(result.metrics).some(value => value === null)
  })
}

/** Keep the received value, including zero; do not round or rescale WAPE. */
export function metricText(value: number | null | undefined): string {
  return value == null ? 'No disponible' : String(value)
}
