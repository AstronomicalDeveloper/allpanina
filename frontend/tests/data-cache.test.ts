import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { clearDataCache, loadManifest } from '../src/services/data/loaders.ts'

// Manifiesto real publicado: el validador exige el contrato completo.
const manifest = readFileSync(new URL('../public/data/peru/manifest.json', import.meta.url), 'utf8')

test('caché: un archivo validado no se vuelve a descargar', async t => {
  clearDataCache()
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(manifest))
  await loadManifest('/data/cache-a/manifest.json')
  await loadManifest('/data/cache-a/manifest.json')
  assert.equal(fetch.mock.callCount(), 1)
})

test('caché: un archivo que no pasa la validación no se guarda y el reintento vuelve a leer', async t => {
  clearDataCache()
  let body = '{ no es json'
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(body))
  await assert.rejects(loadManifest('/data/cache-b/manifest.json'))
  body = manifest
  await loadManifest('/data/cache-b/manifest.json')
  assert.equal(fetch.mock.callCount(), 2)
})

test('caché: un error HTTP no se guarda', async t => {
  clearDataCache()
  let status = 503
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(manifest, { status }))
  await assert.rejects(loadManifest('/data/cache-c/manifest.json'))
  status = 200
  await loadManifest('/data/cache-c/manifest.json')
  assert.equal(fetch.mock.callCount(), 2)
})
