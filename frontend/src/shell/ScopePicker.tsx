import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { datasetMode } from '../services/data/geography'
import { leerConjunto } from '../services/region/store'
import { PATHS, SCOPED_PATHS, normalizePath } from '../app/routes'
import { cx } from '../ui/cx'
import { useScopeOptions } from './useScopeOptions'

const PILOT = 'PE-UCA', LOCAL = 'local', DEMO = 'demo'

/**
 * Scope picker in the top bar (PLAN_REDISENO A3): Peru or one of its 25 departments. The scope lives in
 * the URL (mapRegion / data), so it travels between pages and in shared links. It also shows, without
 * offering them as choices, the special data sets: Ucayali pilot, My region (local) and DEMO.
 */
export default function ScopePicker({ className }: { className?: string }) {
  const [params] = useSearchParams(), navigate = useNavigate(), { pathname, hash } = useLocation()
  const scopes = useScopeOptions()
  const mode = datasetMode(params)
  const [localName, setLocalName] = useState<string | null>(null)
  useEffect(() => {
    if (mode !== 'local') return
    let alive = true
    void leerConjunto().then(set => { if (alive) setLocalName(set?.nombre ?? null) })
    return () => { alive = false }
  }, [mode])

  const value = mode === 'local' ? LOCAL : mode === 'demo' ? DEMO : mode === 'pilot' ? PILOT : params.get('mapRegion') || 'PE'
  const options = scopes.status === 'ready' ? scopes.options : []
  const known = options.some(option => option.id === value) || [LOCAL, DEMO, PILOT].includes(value)

  function choose(id: string) {
    if (id === value || id === LOCAL || id === DEMO) return
    const next = new URLSearchParams(params)
    next.set('mapRegion', id)
    if (id === PILOT) next.set('data', 'pilot'); else next.delete('data')
    const here = normalizePath(pathname)
    navigate({ pathname: SCOPED_PATHS.has(here) ? here : PATHS.calendar, search: `?${next}`, hash })
  }

  return <div className={cx('flex items-center gap-2', className)}>
    <label htmlFor="scope-picker" className="text-xs text-paper/70 max-sm:sr-only">Scope</label>
    <select id="scope-picker" aria-label="Scope" value={value} onChange={event => choose(event.target.value)}
      disabled={scopes.status !== 'ready' && mode === 'peru'}
      className="focus-ring h-9 max-w-[10.5rem] rounded-control border border-rule bg-orbit px-2 text-sm font-medium text-paper disabled:opacity-60 sm:max-w-[15rem]">
      {mode === 'local' && <option value={LOCAL}>{`My region${localName ? ` · ${localName}` : ''} (exploratory)`}</option>}
      {mode === 'demo' && <option value={DEMO}>Demo data (fictitious)</option>}
      {mode === 'pilot' && <option value={PILOT}>Ucayali pilot (v1.0)</option>}
      {scopes.status === 'loading' && mode === 'peru' && <option value={value}>Loading…</option>}
      {!known && scopes.status === 'ready' && <option value={value}>{`Unknown region: ${value}`}</option>}
      {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
    </select>
    {scopes.status === 'error' && <button type="button" onClick={scopes.retry} title={scopes.error}
      className="focus-ring h-9 rounded-control border border-rule bg-transparent px-2 text-xs text-paper hover:border-paper/60">Retry</button>}
  </div>
}
