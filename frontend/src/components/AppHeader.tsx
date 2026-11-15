import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { loadManifest, loadMethod, safelyLoad } from '../services/data/loaders.ts'
import type { LoadResult } from '../services/data/loaders.ts'
import type { Manifest, MethodInfo } from '../types/data.ts'

interface Context {
  manifest: LoadResult<Manifest>
  method: LoadResult<MethodInfo>
}

/** Read-only publication context; never changes the exploration selection. */
export default function AppHeader({ dataRoot, children }: { dataRoot: string; children: ReactNode }) {
  const root = dataRoot.replace(/\/$/, '')
  const [context, setContext] = useState<Context | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      safelyLoad(() => loadManifest(`${root}/manifest.json`, controller.signal)),
      safelyLoad(() => loadMethod(`${root}/method.json`, controller.signal)),
    ]).then(([manifest, method]) => {
      if (!controller.signal.aborted) setContext({ manifest, method })
    })
    return () => controller.abort()
  }, [root, attempt])

  const manifest = context?.manifest.ok ? context.manifest.data : null
  const method = context?.method.ok ? context.method.data : null
  // A friendly name is usable only when it belongs to this manifest's region.
  const regionName = method?.region_id === manifest?.region_id ? method?.region?.split('. ')[0] : undefined

  return <header className="app-header">
    <a className="app-skip-link" href="#app-content">Saltar al contenido</a>
    <div className="app-header-top">
      <div className="app-wordmark">
        <strong>AllpaNina</strong>
        <p>Exploración histórica de detecciones térmicas</p>
      </div>
      <details className="app-sources">
        <summary>Acerca de / Fuentes</summary>
        <div className="ui-surface">
          <p>Explora cuándo y dónde se registraron detecciones térmicas y cómo se compararon los sensores. No son incendios confirmados ni superficie quemada.</p>
          {manifest && <dl>
            <div><dt>Producto publicado</dt><dd>{manifest.producto}</dd></div>
            <div><dt>Entrega generada</dt><dd><time dateTime={manifest.generated_at}>{manifest.generated_at}</time></dd></div>
          </dl>}
          <p>La fecha de generación corresponde a la entrega, no a una observación. El período publicado no certifica cobertura completa.</p>
          <p className="ui-source-note">Metadatos: <a href={`${root}/manifest.json`}>manifest.json</a> · <a href={`${root}/method.json`}>method.json</a>. Las definiciones y limitaciones se presentan en Método.</p>
        </div>
      </details>
    </div>
    <div className="app-region-context" aria-live="polite">
      {!context ? <p>Cargando contexto de la publicación…</p> : manifest ? <p>
        <span>Región piloto: <strong>{regionName ? `${regionName} (${manifest.region_id})` : manifest.region_id}</strong></span>
        <span>Serie publicada: <time dateTime={manifest.periodo.desde}>{manifest.periodo.desde}</time> — <time dateTime={manifest.periodo.hasta}>{manifest.periodo.hasta}</time></span>
      </p> : <p>Contexto de región y período no disponible: no se pudo leer manifest.json.</p>}
      {context && !context.method.ok && <p className="ui-source-note">Descripción de región no disponible: no se pudo leer method.json.</p>}
      {context && (!context.manifest.ok || !context.method.ok) && <button className="ui-button" type="button" onClick={() => { setContext(null); setAttempt(attempt + 1) }}>Reintentar contexto</button>}
    </div>
    {children}
  </header>
}
