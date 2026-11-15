import { useEffect, useState } from 'react'
import { datasetRoot } from '../../services/data/geography'
import type { DatasetMode } from '../../services/data/geography'
import { loadMethodDocument } from '../../services/data/loaders'
import { leerConjunto } from '../../services/region/store'

/** Names, never codes, on screen (C3): "Cusco", not "PE-08". Codes stay in downloads and links. */
export function useRegionName(region: string, mode: DatasetMode): string {
  const [names, setNames] = useState<Record<string, string>>({})
  useEffect(() => {
    let alive = true
    const done = (entries: Record<string, string>) => { if (alive) setNames(entries) }
    if (mode === 'peru') {
      void loadMethodDocument(`${datasetRoot('peru')}/method.json`).then(method => {
        if ('contract_version' in method) done(Object.fromEntries(method.regions.map(r => [r.region_id, r.region_id === 'PE' ? 'Peru' : r.nombre])))
      }).catch(() => {})
    } else if (mode === 'local') {
      void leerConjunto().then(set => { if (set) done({ [set.region_id]: set.nombre }) }).catch(() => {})
    }
    return () => { alive = false }
  }, [mode])
  if (mode === 'pilot') return 'Ucayali (pilot)'
  if (mode === 'demo') return 'Demo region'
  return names[region] ?? (mode === 'peru' && region === 'PE' ? 'Peru' : region)
}
