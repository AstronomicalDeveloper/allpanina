import { PERCENTILE_COLORS } from '../../constants/mapConfig';

interface MapLegendProps {
  breaks: [number, number, number];
}

export function MapLegend({ breaks }: MapLegendProps) {
  return (
    <div>
      {/* Mover aquí el render de tu leyenda dinámica P25/P50/P75 */}
      <span>{breaks.join(' / ')} ({PERCENTILE_COLORS.length} niveles)</span>
    </div>
  );
}
