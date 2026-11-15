import { getDaysInMonth } from '../constants/mapConfig';
import type { CellFeature, CellFeatureCollection, SensorGroup } from '../types/fireMap';

function buildDemoCells(): CellFeatureCollection {
  const features: CellFeature[] = [];
  const sensors: SensorGroup[] = ['MODIS_TA', 'VIIRS_SNPP'];
  const years = [2023, 2024];
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const clusters = [
    // Selva Norte y Nororiente
    { region: 'PE-LOR', lon: -73.35, lat: -4.15, spread: 0.65, count: 16 },
    { region: 'PE-LOR', lon: -75.95, lat: -5.20, spread: 0.55, count: 12 },
    { region: 'PE-AMZ', lon: -78.15, lat: -5.75, spread: 0.42, count: 12 },
    { region: 'PE-SMN', lon: -76.65, lat: -6.65, spread: 0.48, count: 16 },
    // Costa y Sierra Norte
    { region: 'PE-PIU', lon: -79.85, lat: -5.15, spread: 0.38, count: 10 },
    { region: 'PE-LAM', lon: -79.55, lat: -6.45, spread: 0.30, count: 9 },
    { region: 'PE-CAJ', lon: -78.65, lat: -6.85, spread: 0.42, count: 14 },
    { region: 'PE-ANC', lon: -77.55, lat: -9.35, spread: 0.36, count: 10 },
    // Selva Central y Sierra Central
    { region: 'PE-UCA', lon: -74.55, lat: -8.38, spread: 0.42, count: 18 },
    { region: 'PE-UCA', lon: -73.85, lat: -10.35, spread: 0.38, count: 12 },
    { region: 'PE-HCO', lon: -75.85, lat: -9.45, spread: 0.40, count: 12 },
    { region: 'PE-PAS', lon: -75.10, lat: -10.45, spread: 0.36, count: 11 },
    { region: 'PE-JUN', lon: -74.65, lat: -11.35, spread: 0.42, count: 14 },
    { region: 'PE-LIM', lon: -76.35, lat: -11.85, spread: 0.32, count: 8 },
    // Sur y Amazonía Sur
    { region: 'PE-MDD', lon: -70.15, lat: -12.35, spread: 0.58, count: 18 },
    { region: 'PE-CUS', lon: -72.15, lat: -13.15, spread: 0.48, count: 15 },
    { region: 'PE-APU', lon: -73.05, lat: -13.85, spread: 0.36, count: 11 },
    { region: 'PE-AYA', lon: -74.15, lat: -13.45, spread: 0.38, count: 10 },
    { region: 'PE-PUN', lon: -69.85, lat: -14.45, spread: 0.45, count: 12 },
    { region: 'PE-ARE', lon: -71.65, lat: -15.85, spread: 0.35, count: 9 },
  ];
  let index = 1;
  for (const year of years) {
    for (const month of months) {
      const maxMonthDays = getDaysInMonth(year, month);
      const seasonalBoost = month >= 7 && month <= 10 ? 1.25 : month >= 5 && month <= 11 ? 0.95 : 0.75;
      for (const sensor of sensors) {
        clusters.forEach((cluster, clusterIndex) => {
          const baseCount = Math.max(4, Math.round(cluster.count * seasonalBoost));
          const count = sensor === 'VIIRS_SNPP' ? baseCount : Math.max(3, Math.floor(baseCount * 0.72));
          for (let i = 0; i < count; i++) {
            const seed = (index * 9301 + 49297) % 233280;
            const randomLon = (seed / 233280 - 0.5) * cluster.spread;
            const randomLat = (((seed * 7) % 233280) / 233280 - 0.5) * cluster.spread;
            const lon = Number((cluster.lon + randomLon).toFixed(3));
            const lat = Number((cluster.lat + randomLat).toFixed(3));
            const size = 0.032;
            const baseDays = ((i * 7 + month * 3 + clusterIndex * 5 + (year - 2023) * 4) % (maxMonthDays - 3)) + 1;
            const cellDays = sensor === 'VIIRS_SNPP'
              ? Math.min(maxMonthDays, baseDays + 3)
              : Math.min(maxMonthDays, baseDays);
            features.push({
              type: 'Feature',
              properties: {
                id: `CELL_${693300 + index}`,
                region_id: cluster.region,
                year,
                month,
                sensor,
                cell_days: cellDays,
                status: 'ok',
              },
              geometry: {
                type: 'Polygon',
                coordinates: [[[lon, lat], [lon + size, lat], [lon + size, lat + size], [lon, lat + size], [lon, lat]]],
              },
            });
            index++;
          }
        });
      }
    }
  }
  return { type: 'FeatureCollection', features };
}

export const DEMO_COLLECTION = buildDemoCells();
