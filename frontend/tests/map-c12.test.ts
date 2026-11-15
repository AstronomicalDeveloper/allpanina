/** C12 (AUDITORIA_FRONTEND.md): the square cell icon must exist before MapLibre asks for it. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerSquareImage, squareImage, SQUARE_IMAGE, summaryLayers } from '../src/pages/map/cartography/multiscaleLayers'

function fakeMap(ready = true) {
  const images = new Map<string, unknown>(), listeners = new Map<string, ((e: { id?: string }) => void)[]>()
  return {
    images, ready,
    hasImage: (id: string) => images.has(id),
    addImage(id: string, image: unknown, options: { sdf: boolean }) { if (!this.ready) throw new Error('Style is not done loading'); assert.equal(options.sdf, true); images.set(id, image) },
    on(type: string, fn: (e: { id?: string }) => void) { listeners.set(type, [...(listeners.get(type) ?? []), fn]) },
    emit(type: string, e: { id?: string } = {}) { for (const fn of listeners.get(type) ?? []) fn(e) },
  }
}

test('C12: el icono de celda se registra al crear el mapa, antes de "load"', () => {
  const map = fakeMap()
  registerSquareImage(map)
  assert.ok(map.images.has(SQUARE_IMAGE), 'registered synchronously')
  map.emit('load'); map.emit('styleimagemissing', { id: SQUARE_IMAGE })
  assert.equal(map.images.size, 1, 'no duplicate addImage')
})

test('C12: si el estilo aún no admite imágenes, se reintenta en style.load y styleimagemissing', () => {
  const map = fakeMap(false)
  assert.doesNotThrow(() => registerSquareImage(map))
  assert.equal(map.images.size, 0)
  map.emit('styleimagemissing', { id: 'other-icon' }); assert.equal(map.images.size, 0)
  map.ready = true
  map.emit('styleimagemissing', { id: SQUARE_IMAGE }); assert.ok(map.images.has(SQUARE_IMAGE))
  map.images.clear(); map.emit('style.load'); assert.ok(map.images.has(SQUARE_IMAGE), 're-registered after a style reload')
})

test('C12: la capa que usa el icono pide exactamente ese id y la imagen es un SDF de 32×32', () => {
  const uses = summaryLayers(0.8, { q25: 1, q50: 2, q75: 3 } as never).filter(l => (l as { layout?: Record<string, unknown> }).layout?.['icon-image'] !== undefined)
  assert.ok(uses.length >= 1)
  for (const l of uses) assert.equal((l as { layout: Record<string, unknown> }).layout['icon-image'], SQUARE_IMAGE)
  const img = squareImage(); assert.equal(img.width, 32); assert.equal(img.height, 32); assert.equal(img.data.length, 32 * 32 * 4)
})
