import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { JSDOM } from 'jsdom'
import AppRoutes from '../src/app/AppRoutes.tsx'
const dom = new JSDOM('<body></body>', {url:'http://localhost/'})
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},IS_REACT_ACT_ENVIRONMENT:{value:true,configurable:true}})
for(const [path,title,active] of [['/calendario','Calendario histórico','Calendario'],['/mapa','Mapa de observaciones','Mapa'],['/metodo','Método y evaluación','Método'],['/no-existe','Página no encontrada',null]]) {
 test(`acceso directo ${path}, navegación e historial`,async t=>{
 window.history.replaceState(null,'',path+'?scope=month&periodYear=2024#detalle')
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 t.after(async()=>{await act(async()=>root.unmount());host.remove()})
 await act(async()=>root.render(createElement(BrowserRouter,null,createElement(AppRoutes))))
 assert.equal(host.querySelector('h1')!.textContent,title)
 assert.equal(host.querySelector('[aria-current="page"]')?.textContent??null,active)
 assert.equal(window.location.search,'?scope=month&periodYear=2024')
 const link=[...host.querySelectorAll<HTMLAnchorElement>('nav a')].find(a=>a.textContent==='Mapa')!
 assert.equal(new URL(link.href).hash,'#detalle')
 await act(async()=>link.click())
 assert.equal(window.location.pathname,'/mapa')
 assert.equal(host.querySelector('[aria-current="page"]')!.textContent,'Mapa')
 await act(async()=>{window.history.replaceState(null,'','/metodo?scope=month');window.dispatchEvent(new dom.window.PopStateEvent('popstate'))})
 assert.equal(host.querySelector('h1')!.textContent,'Método y evaluación')
 })
}
