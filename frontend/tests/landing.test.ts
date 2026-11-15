import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { JSDOM } from 'jsdom'
import AppRoutes from '../src/app/AppRoutes.tsx'
import { titleFor } from '../src/app/useDocumentTitle.ts'
const dom = new JSDOM('<body></body>', {url:'http://localhost/'})
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},IS_REACT_ACT_ENVIRONMENT:{value:true,configurable:true}})

async function open(t: import('node:test').TestContext, url: string) {
  window.history.replaceState(null,'',url)
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
  t.after(async()=>{await act(async()=>root.unmount());host.remove()})
  await act(async()=>root.render(createElement(BrowserRouter,null,createElement(AppRoutes))))
  return host
}

test('la raíz muestra la página de inicio y enlaza a las tres vistas',async t=>{
  const host=await open(t,'/')
  assert.equal(window.location.pathname,'/')
  assert.equal(host.querySelectorAll('h1').length,1)
  assert.match(host.querySelector('h1')!.textContent!,/detecciones térmicas/i)
  const hrefs=[...host.querySelectorAll<HTMLAnchorElement>('main a')].map(a=>new URL(a.href).pathname)
  for(const ruta of ['/calendario','/mapa','/metodo'])assert.ok(hrefs.includes(ruta),`falta enlace a ${ruta}`)
  assert.equal(host.querySelector('nav [aria-current="page"]')!.textContent,'Home')
})

test('la página de inicio explica los límites y no promete lo que no demuestra',async t=>{
  const host=await open(t,'/')
  const text=host.querySelector('main')!.textContent!.toLowerCase()
  for(const frase of ['25 departamentos','bloques de 10 km','no equivale a un incendio confirmado','no predice','tiempo real','día-celda','nasa firms','inei'])assert.ok(text.includes(frase),`falta: ${frase}`)
  for(const prohibida of ['predice incendios futuros con','alertas en vivo','detección confirmada de incendios','todo el país está disponible','solo el piloto','todavía no está disponible aquí'])assert.ok(!text.includes(prohibida),`no debe decir: ${prohibida}`)
})

test('la marca de la barra lleva al inicio',async t=>{
  const host=await open(t,'/calendario')
  const brand=host.querySelector<HTMLAnchorElement>('a.brand')!
  assert.ok(brand)
  assert.equal(new URL(brand.href).pathname,'/')
})

test('un enlace antiguo con parámetros en la raíz sigue llegando al Calendario',async t=>{
  const host=await open(t,'/?sensor=VIIRS&periodYear=2024#detalle')
  assert.equal(window.location.pathname,'/calendar')
  assert.equal(window.location.search,'?sensor=VIIRS&periodYear=2024')
  assert.equal(window.location.hash,'#detalle')
  assert.equal(host.querySelector('h1')!.textContent,'Calendario histórico')
})

test('cada ruta tiene su propio título de pestaña',async t=>{
  for(const [ruta,esperado] of [['/',/Satellite fire detections/],['/calendar',/^Calendar/],['/map',/^Map/],['/method',/^Method/],['/my-region',/^My region/],['/about',/^About/],['/calendario',/^Calendar/],['/no-existe',/^Page not found/]] as const){
    await open(t,ruta)
    assert.match(document.title,esperado,ruta)
  }
  assert.equal(titleFor('/calendar/'),titleFor('/calendar'))
})
