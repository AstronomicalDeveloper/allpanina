import type { MethodInfo, NationalMethod, NationalValidation, ValidationResult } from '../../types/data'
/** Select published results only: never re-estimate metrics or apply the national reference kappa. */
export function regionalMethod(method: NationalMethod | null, validation: NationalValidation | null, region: string) {
  const metadata=method?.regions.find(r=>r.region_id===region)
  const evaluation=validation?.regions.find(r=>r.region_id===region)
  const valid=method?.resultados.valid[region]
  const info: MethodInfo | null=method&&metadata?{
    region_id:region,region:`${metadata.nombre} (${region}) · estrato ${metadata.estrato}`,
    indicator:method.indicator,sensors:method.sensors,estado:method.estado,
    period_train:method.period_train,period_valid:method.period_valid,period_test:method.period_test,
    calibration:method.calibration,limitations:method.limitations,
    ...(region==='PE'?{}:{kappa:metadata.kappa}),
    ...(valid?{resultados:{valid}}:{}),
  }:null
  const metrics: ValidationResult|null=evaluation?{region_id:region,methods:evaluation.reportable?evaluation.methods:{}}:null
  return {info,metrics,metadata,evaluation}
}
