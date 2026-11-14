import { useEffect, useState } from 'react'
import { loadDemo } from '../services/data/loaders.ts'

const filenames = ['monthly_series.csv', 'calibrated_series.csv', 'validation.json', 'method.json', 'cells_PE-DEMO_2024.geojson', 'manifest.json']
type Results = Awaited<ReturnType<typeof loadDemo>>

function preview(data: unknown): { count: number; sample: unknown } {
  if (Array.isArray(data)) return { count: data.length, sample: data.slice(0, 3) }
  if (data && typeof data === 'object' && 'features' in data && Array.isArray(data.features)) {
    return { count: data.features.length, sample: data.features.slice(0, 1) }
  }
  if (data && typeof data === 'object' && 'methods' in data && data.methods && typeof data.methods === 'object') {
    return { count: Object.keys(data.methods).length, sample: data }
  }
  return { count: 1, sample: data }
}

export default function DemoDataCheck() {
  const [results, setResults] = useState<Results | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void loadDemo(`${import.meta.env.BASE_URL}data/demo`, controller.signal).then(data => {
      if (!controller.signal.aborted) setResults(data)
    })
    return () => controller.abort()
  }, [])
  return (
    <main style={{ padding: '1.5rem', maxWidth: '64rem', margin: 'auto', fontFamily: 'sans-serif' }}>
      <h1>Comprobación temporal de datos L3</h1>
      <p><strong>DATOS DEMO — NO SON OBSERVACIONES REALES</strong></p>
      <p>PE-DEMO · agosto–octubre 2024 · Contrato oficial de Aldo. Sin calibración ni evaluación científica.</p>
      <p>cell_days: días-celda regionales. Datos sintéticos bajo el esquema vigente.</p>
      <p role="status">{results ? 'Carga finalizada. Revisa el estado de cada archivo.' : 'Cargando archivos DEMO…'}</p>
      {filenames.map((name, index) => {
        const result = results?.[index]
        const data = result?.ok ? preview(result.data) : null
        return (
          <section key={name} aria-label={name} style={{ marginBlock: '1.5rem' }}>
            <h2>{name}</h2>
            {!result && <p>Pendiente de carga</p>}
            {result && !result.ok && <p role="alert">Error: {result.error}</p>}
            {data && <>
              <p>Formato leído según contrato oficial · Registros: {data.count}{name === 'validation.json' ? ' métodos (métricas nulas; detalle mensual no disponible en DEMO)' : ''}</p>
              <pre style={{ overflow: 'auto', maxHeight: '18rem', background: '#f3f4f6', padding: '1rem' }}>{JSON.stringify(data.sample, null, 2)}</pre>
            </>}
          </section>
        )
      })}
    </main>
  )
}
