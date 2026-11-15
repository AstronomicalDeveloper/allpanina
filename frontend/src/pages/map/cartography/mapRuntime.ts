export type MapRuntime = typeof import('maplibre-gl')
export type RuntimeLoader = () => Promise<MapRuntime>

export async function loadMapRuntime(): Promise<MapRuntime> {
  const [runtime, worker] = await Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
  ])
  runtime.setWorkerUrl(worker.default)
  return runtime
}
