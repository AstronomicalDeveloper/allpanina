import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { JSDOM } from 'jsdom'
import AppRoutes from '../src/app/AppRoutes.tsx'
const dom = new JSDOM('<body></body>', {url:'http://localhost/'})
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},IS_REACT_ACT_ENVIRONMENT:{value:true,configurable:true}})
const current=(host:HTMLElement)=>host.querySelector('nav[aria-label="Main navigation"] [aria-current="page"]')?.textContent??null
async function open(t:import('node:test').TestContext,url:string){
 window.history.replaceState(null,'',url)
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 t.after(async()=>{await act(async()=>root.unmount());host.remove()})
 await act(async()=>root.render(createElement(BrowserRouter,null,createElement(AppRoutes))))
 return host
}
// F3 y F5a traducen Calendario y Mapa; Método conserva su título hasta F4.
for(const [path,title,active] of [['/calendar','Thermal detection calendar','Calendar'],['/map','Map of observations','Map'],['/method','Método y evaluación','Method'],['/no-such-page','Page not found',null]]) {
 test(`acceso directo ${path}, navegación e historial`,async t=>{
 const host=await open(t,path+'?scope=month&periodYear=2024#detalle')
 assert.equal(host.querySelector('h1')!.textContent,title)
 assert.equal(current(host),active)
 assert.equal(window.location.search,'?scope=month&periodYear=2024')
 const link=[...host.querySelectorAll<HTMLAnchorElement>('nav a')].find(a=>a.textContent==='Map')!
 assert.equal(new URL(link.href).hash,'#detalle')
 await act(async()=>link.click())
 assert.equal(window.location.pathname,'/map')
 assert.equal(current(host),'Map')
 await act(async()=>{window.history.replaceState(null,'','/method?scope=month');window.dispatchEvent(new dom.window.PopStateEvent('popstate'))})
 assert.equal(host.querySelector('h1')!.textContent,'Método y evaluación')
 })
}
for(const [from,to] of [['/calendario','/calendar'],['/mapa','/map'],['/metodo','/method'],['/mi-region','/my-region'],['/calendario/','/calendar']]) {
 test(`la ruta antigua ${from} redirige a ${to} con todos los parámetros y el ancla`,async t=>{
 const query='?data=local&mapRegion=PE-UCA&periodYear=2024&periodMonth=9&calendarSeries=VIIRS&mapSensor=MODIS&scope=month&extra=keep'
 await open(t,from+query+'#detalle')
 assert.equal(window.location.pathname,to)
 assert.equal(window.location.search,query)
 assert.equal(window.location.hash,'#detalle')
 })
}
test('la redirección reemplaza la entrada del historial: Atrás no vuelve a la ruta antigua',async t=>{
 window.history.replaceState(null,'','/about')
 window.history.pushState(null,'','/mapa?periodYear=2024')
 const before=window.history.length
 await open(t,'/mapa?periodYear=2024')
 assert.equal(window.location.pathname,'/map')
 assert.equal(window.history.length,before)
})
test('Acerca de muestra equipo, créditos, uso de IA y el piloto anterior',async t=>{
 const host=await open(t,'/about')
 assert.equal(host.querySelector('h1')!.textContent,'About AllpaNina')
 for(const name of ['Aldo','Marco','Antonella','Juan Matías','Landry','Adriana'])assert.match(host.querySelector('main')!.textContent!,new RegExp(name))
 assert.match(host.querySelector('main')!.textContent!,/Use of AI/)
 const pilot=[...host.querySelectorAll<HTMLAnchorElement>('main a')].find(a=>a.textContent==='Open the Ucayali pilot')!
 const url=new URL(pilot.href)
 assert.equal(url.pathname,'/calendar');assert.equal(url.searchParams.get('data'),'pilot');assert.equal(url.searchParams.get('mapRegion'),'PE-UCA')
})
