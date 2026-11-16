/** Raíz virtual de los archivos de Mi región (ver services/region/store.ts). */
export const LOCAL_ROOT = 'local:'
export type DatasetMode = 'peru' | 'pilot' | 'demo' | 'local'
export function datasetMode(params: URLSearchParams): DatasetMode {
  if (params.get('data') === 'local') return 'local'   // Mi región: resultado procesado o subido en este navegador
  if (params.get('data') === 'demo') return 'demo'
  if (/^(PE|PE-(0[1-9]|1[0-9]|2[0-5]))$/.test(params.get('mapRegion') ?? '')) return 'peru'
  if (params.get('data') === 'pilot' || params.get('mapRegion') === 'PE-UCA') return 'pilot'
  return 'peru'
}
export function datasetRoot(mode: DatasetMode) {
  if (mode === 'local') return LOCAL_ROOT
  return `${import.meta.env?.BASE_URL ?? '/'}data${mode === 'peru' ? '/peru' : mode === 'demo' ? '/demo' : ''}`
}
