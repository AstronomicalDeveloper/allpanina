import type { MethodInfo, NationalMethod, NationalValidation, ValidationResult } from '../../types/data'
import { validateMethod, validateValidation } from './validators'
const object = (v: unknown, name: string): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`${name}: objeto requerido`); return v as Record<string, unknown> }
const text = (v: unknown, name: string) => { if(typeof v !== 'string'||!v.trim())throw new Error(`${name}: texto obligatorio`);return v }
const positive = (v: unknown, name: string) => { if(typeof v !== 'number'||!Number.isFinite(v)||v<0)throw new Error(`${name}: número no negativo requerido`);return v }
const list = (v: unknown, name: string): unknown[] => {if(!Array.isArray(v))throw new Error(`${name}: lista requerida`);return v}
const regionId = (v: unknown, aggregate=false) => {const id=text(v,'region_id');if(!/^(PE|PE-(0[1-9]|1[0-9]|2[0-5]))$/.test(id)&&!(aggregate&&id==='PE-SIN-25'))throw new Error(`region_id inválido: ${id}`);return id}
const unique = (ids: string[]) => {if(new Set(ids).size!==ids.length)throw new Error('Región duplicada')}
function stratum(v:unknown) {if(!['propio','agrupado','nacional'].includes(String(v)))throw new Error('Estrato inválido')}
export function validateMethodDocument(value: unknown): MethodInfo | NationalMethod {
 const root=object(value,'method')
 if(root.contract_version===undefined)return validateMethod(value)
 if(root.contract_version!=='1.1')throw new Error('contract_version de method no soportada')
 // Reuse v1 validation for shared scientific fields; regional results have a different envelope.
 validateMethod({...root,resultados:undefined,kappa:undefined})
 if(root.region_id!=='PE')throw new Error('Ámbito nacional incorrecto')
 const regions=list(root.regions,'regions');const ids=regions.map(v=>{
  const r=object(v,'region');const id=regionId(r.region_id);text(r.nombre,'nombre');stratum(r.estrato);positive(r.kappa,'kappa')
  const inputs=object(r.kappa_inputs,'kappa_inputs');for(const key of ['suma_modis_train','suma_viirs_train','meses_train'])positive(inputs[key],key)
  if(r.kappa_anual_rango!==null){const range=list(r.kappa_anual_rango,'kappa_anual_rango');if(range.length!==2||positive(range[0],'rango')>positive(range[1],'rango'))throw new Error('Rango kappa inválido')}
  return id
 });unique(ids);if(ids.length!==26)throw new Error('Metadatos de 26 regiones requeridos')
 const strata=object(root.estratos,'estratos');const pooled=object(strata.agrupado,'agrupado');positive(pooled.kappa,'kappa agrupado')
 const members=list(pooled.miembros,'miembros').map(v=>regionId(v));unique(members)
 if(members.some(id=>!ids.includes(id)))throw new Error('Miembros de estrato desconocidos')
 const national=object(strata.nacional,'nacional');if(national.region_id!=='PE')throw new Error('Estrato nacional inválido');positive(national.kappa,'kappa nacional')
 const results=object(root.resultados,'resultados')
 for(const split of ['valid','test'])for(const [id,v] of Object.entries(object(results[split],split))) {
  regionId(id,true);const r=object(v,`${split}.${id}`);positive(r.suma_modis,'suma_modis')
  validateMethod({...root,resultados:{valid:r},kappa:undefined})
  if(!/^\d{4}-(0[1-9]|1[0-2]):\d{4}-(0[1-9]|1[0-2])$/.test(text(r.periodo,'periodo')))throw new Error('Período de resultados inválido')
 }
 const reasons=object(results.test_no_reportables,'test_no_reportables')
 for(const [id,reason] of Object.entries(reasons)){regionId(id);text(reason,'motivo');if(object(results.test,'test')[id])throw new Error('Región no reportable con métricas de test')}
 regionId(results.resultado_limpio,true)
 return value as NationalMethod
}
export function validateValidationDocument(value: unknown): ValidationResult | NationalValidation {
 const root=object(value,'validation')
 if(root.contract_version===undefined)return validateValidation(value)
 if(root.contract_version!=='1.1')throw new Error('contract_version de validation no soportada')
 if(!['train','valid','test'].includes(String(root.split)))throw new Error('Split inválido')
 const ids=list(root.regions,'regions').map(v=>{
  const r=object(v,'region');const id=regionId(r.region_id,true);stratum(r.estrato)
  if(r.nota!==undefined)text(r.nota,'nota')
  if(r.reportable===false){text(r.motivo,'motivo');if(r.methods!==undefined)throw new Error('Región no reportable no debe contener métricas')}
  else if(r.reportable===true){
   validateValidation(r);const methods=object(r.methods,'methods')
   for(const name of ['B0','B1'])if(object(methods[name],name).split!==root.split)throw new Error('Split regional contradictorio')
  } else throw new Error('reportable debe ser booleano')
  return id
 });unique(ids)
 const expected=['PE',...Array.from({length:25},(_,i)=>`PE-${String(i+1).padStart(2,'0')}`)]
 if(expected.some(id=>!ids.includes(id)))throw new Error('Faltan regiones de evaluación')
 return value as NationalValidation
}
