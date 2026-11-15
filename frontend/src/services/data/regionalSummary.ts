import type { MonthlyRecord } from '../../types/data'
import type { MapSelection } from '../../types/selection'
export function regionalSummary(records: MonthlyRecord[], selection: MapSelection) {
  const rows=records.filter(r=>r.region_id===selection.region&&r.year===selection.year&&r.sensor_group===selection.sensor)
  const coverage=Array.from({length:12},(_,i)=>({month:i+1,status:rows.find(r=>r.month===i+1)?.status??'unpublished'}))
  const selected=selection.scope==='month'?rows.filter(r=>r.month===selection.month):rows
  const usable=selected.filter(r=>r.status==='ok')
  return {coverage,value:usable.length?usable.reduce((sum,r)=>sum+r.cell_days!,0):null,usableMonths:coverage.filter(m=>m.status==='ok').length,
    status:selection.scope==='month'?coverage[(selection.month??1)-1].status:usable.length?'ok':'missing'}
}
