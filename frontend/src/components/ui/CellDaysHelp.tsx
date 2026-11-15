/** Native disclosure: works with keyboard and touch without managing popup focus. */
export default function CellDaysHelp({ national = false }: { national?: boolean }) {
  return <details className="cell-days-help"><summary><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 5 .3c0 1.7-2.5 1.9-2.5 3.7M12 16v1" /></svg>¿Qué significa días-celda?</summary><div>
    <p>Un día-celda representa una celda geográfica con al menos una detección térmica válida durante un día.</p>
    <p>Una celda con detecciones en tres días aporta tres días-celda. Diez celdas con detecciones en un mismo día aportan diez días-celda en conjunto.</p>
    {national&&<p>En el mapa nacional, cada geometría de 10 km acumula días-celda calculados sobre celdas de 1 km. El valor puede superar 31 por mes: no cuenta días distintos de la cuadrícula de 10 km.</p>}
    <p>No equivale a cantidad de incendios, superficie quemada ni número de detecciones individuales. Un cero registrado no demuestra ausencia de fuego: puede haber limitaciones de observación, como nubes.</p>
  </div></details>
}
