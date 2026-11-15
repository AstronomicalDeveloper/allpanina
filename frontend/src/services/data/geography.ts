export type DatasetMode = 'peru' | 'pilot' | 'demo'
export function datasetMode(params: URLSearchParams): DatasetMode {
  if (params.get('data') === 'demo') return 'demo'
  if (/^(PE|PE-(0[1-9]|1[0-9]|2[0-5]))$/.test(params.get('mapRegion') ?? '')) return 'peru'
  if (params.get('data') === 'pilot' || params.get('mapRegion') === 'PE-UCA') return 'pilot'
  return 'peru'
}
export function datasetRoot(mode: DatasetMode) {
  return `${import.meta.env?.BASE_URL ?? '/'}data${mode === 'peru' ? '/peru' : mode === 'demo' ? '/demo' : ''}`
}
