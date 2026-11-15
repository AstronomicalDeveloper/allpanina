import { useEffect, useState } from 'react'
import { datasetRoot } from '../services/data/geography'
import { loadManifest, loadMethodDocument } from '../services/data/loaders'

export type ScopeOption = { id: string; name: string }
type State = { status: 'loading' } | { status: 'ready'; options: ScopeOption[] } | { status: 'error'; error: string }

/** English name of the national scope; department names are proper names and stay as published. */
const displayName = (id: string, name: string) => (id === 'PE' ? 'Peru' : name)

/** Peru and its 25 departments, in the order of the national manifest, with names from method.json. */
export function useScopeOptions(): State & { retry: () => void } {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController(), root = datasetRoot('peru')
    void Promise.all([loadManifest(`${root}/manifest.json`, controller.signal), loadMethodDocument(`${root}/method.json`, controller.signal)])
      .then(([manifest, method]) => {
        if (manifest.contract_version !== '1.1' || !('contract_version' in method) || !manifest.regions) throw new Error('The national publication (v1.1) is required.')
        const names = new Map(method.regions.map(region => [region.region_id, region.nombre]))
        const options = manifest.regions.map(id => {
          const name = names.get(id)
          if (!name) throw new Error(`No name for region ${id}.`)
          return { id, name: displayName(id, name) }
        })
        if (!controller.signal.aborted) setState({ status: 'ready', options })
      })
      .catch(error => { if (!controller.signal.aborted) setState({ status: 'error', error: error instanceof Error ? error.message : String(error) }) })
    return () => controller.abort()
  }, [attempt])
  return { ...state, retry: () => { setState({ status: 'loading' }); setAttempt(a => a + 1) } }
}
