/** "What are cell-days?" for the map, in English (the shared help is still in Spanish for other pages). */
export default function MapCellDaysHelp({ national = false }: { national?: boolean }) {
  return <details className="cell-days-help"><summary><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 5 .3c0 1.7-2.5 1.9-2.5 3.7M12 16v1" /></svg>What are cell-days?</summary><div>
    <p>A cell-day is one geographic cell with at least one valid thermal detection on one day.</p>
    <p>A cell with detections on three days adds three cell-days. Ten cells with detections on the same day add ten cell-days together.</p>
    {national && <p>On the national map, each 10 km square adds up cell-days computed on 1 km cells. The value can exceed 31 per month: it does not count distinct days of the 10 km square.</p>}
    <p>It is not a number of fires, burned area or individual detections. A recorded zero does not prove there was no fire: clouds and other limits can hide it.</p>
    <p><strong>How to read a cell's value.</strong> A single cell does not show severity: its value depends on how many days had detections in the period. Compare it with the other visible cells and, in the Calendar, with other periods of the same sensor.</p>
  </div></details>
}
