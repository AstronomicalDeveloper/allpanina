import type {MonthlyRecord, Sensor} from '../../types/data'
export interface HistoricalSelection {region: string; year: number; month: number; sensor: Sensor}
/** Observations only; the caller supplies exactly one dataset (national, pilot or DEMO). */
export function historicalAnalysis(records: readonly MonthlyRecord[], selection: HistoricalSelection) {
 const matching=records.filter(r=>r.region_id===selection.region&&r.sensor_group===selection.sensor&&r.month===selection.month&&r.year<=selection.year)
 const valid=(r:MonthlyRecord)=>r.status==='ok'&&r.cell_days!==null&&Number.isFinite(r.cell_days)&&r.cell_days>=0
 const reference=matching.filter(r=>r.year<selection.year&&valid(r)).sort((a,b)=>a.year-b.year)
 const current=matching.find(r=>r.year===selection.year)
 const selectedValue=current&&valid(current)?current.cell_days:null
 const points=matching.filter(valid).sort((a,b)=>a.year-b.year).map(r=>({year:r.year,value:r.cell_days!,selected:r.year===selection.year}))
 const base={selectedValue,referenceYears:reference.map(r=>r.year),count:reference.length,points}
 if(selectedValue===null)return {...base,status:'unavailable' as const,median:null,difference:null,absoluteDifference:null,percentage:null}
 if(reference.length<3)return {...base,status:'insufficient' as const,median:null,difference:null,absoluteDifference:null,percentage:null}
 const sorted=reference.map(r=>r.cell_days!).sort((a,b)=>a-b), middle=Math.floor(sorted.length/2)
 const median=sorted.length%2?sorted[middle]:sorted[middle-1]/2+sorted[middle]/2
 const difference=selectedValue-median
 return {...base,status:'ready' as const,median,difference,absoluteDifference:Math.abs(difference),percentage:median>0?difference/median*100:null}
}
