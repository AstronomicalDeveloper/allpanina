import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { valueContext } from '../src/components/ui/valueContext.ts'
import CellDaysHelp from '../src/components/ui/CellDaysHelp.tsx'
import { PURPOSE_CELL, PURPOSE_COMPARE } from '../src/components/ui/cellDaysPurpose.ts'
const dom = new JSDOM('<body></body>', {url:'http://localhost/'})
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},IS_REACT_ACT_ENVIRONMENT:{value:true,configurable:true}})

test('valueContext cuenta cuántos valores son mayores y no inventa nada', () => {
  assert.deepEqual(valueContext([5, 10, 10, 20], 10), { greater: 1, total: 4, max: 20 })
  assert.deepEqual(valueContext([5, 10, 20], 20), { greater: 0, total: 3, max: 20 })
  assert.deepEqual(valueContext([0, 0, 3], 0), { greater: 1, total: 3, max: 3 })
  assert.equal(valueContext([], 4), null)
  assert.equal(valueContext([1, 2], null), null)
  assert.equal(valueContext([1, 2], Number.NaN), null)
})

test('la ayuda de días-celda añade para qué sirve comparar períodos y cómo leer una celda', async t => {
  for (const [purpose, title] of [[PURPOSE_COMPARE, /Para qué sirve comparar períodos/], [PURPOSE_CELL, /Cómo leer el valor de una celda/]] as const) {
    const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
    t.after(async () => { await act(async () => root.unmount()); host.remove() })
    await act(async () => root.render(createElement(CellDaysHelp, { purpose })))
    const text = host.textContent!
    assert.match(text, /No equivale a cantidad de incendios/)
    assert.match(text, title)
  }
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
  t.after(async () => { await act(async () => root.unmount()); host.remove() })
  await act(async () => root.render(createElement(CellDaysHelp)))
  assert.doesNotMatch(host.textContent!, /Para qué sirve|Cómo leer el valor/)
})
