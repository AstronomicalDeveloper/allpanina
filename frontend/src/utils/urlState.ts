import type * as maplibregl from 'maplibre-gl';
import { getDaysInMonth } from '../constants/mapConfig';
import type { BaseMapId, InitialMapView, SensorGroup } from '../types/fireMap';

export function readInitialMapView(): InitialMapView {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const base = params.get('mapBase') as BaseMapId | null;
  const allowedBaseMaps: BaseMapId[] = ['blue-marble', 'firefly', 'streets', 'topographic'];
  const sensorParam = params.get('sensor') as SensorGroup | null;
  const numberParam = (key: string): number | undefined => {
    const raw = params.get(key);
    if (raw === null) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };
  const year = numberParam('periodYear');
  const month = numberParam('periodMonth');
  const day = numberParam('periodDay');
  const latitude = numberParam('mapLat');
  const longitude = numberParam('mapLon');
  const zoom = numberParam('mapZoom');
  const validYear = year !== undefined && year >= 2000 && year <= 2100 ? year : undefined;
  const validMonth = month !== undefined && month >= 1 && month <= 12 ? month : undefined;
  const maxDay = getDaysInMonth(validYear ?? 2023, validMonth ?? 1);
  return {
    baseMap: base && allowedBaseMaps.includes(base) ? base : undefined,
    year: validYear,
    month: validMonth,
    day: day !== undefined && day >= 1 && day <= maxDay ? day : undefined,
    sensor: sensorParam === 'MODIS_TA' || sensorParam === 'VIIRS_SNPP' ? sensorParam : undefined,
    latitude: latitude !== undefined && latitude >= -85 && latitude <= 85 ? latitude : undefined,
    longitude: longitude !== undefined && longitude >= -180 && longitude <= 180 ? longitude : undefined,
    zoom: zoom !== undefined && zoom >= 0 && zoom <= 22 ? zoom : undefined,
  };
}

export function buildShareUrl(
  map: maplibregl.Map | null,
  state: { baseMap: BaseMapId; year: number; month: number; day: number; sensor: SensorGroup },
): string {
  const url = new URL(window.location.href);
  const center = map?.getCenter();
  const zoom = map?.getZoom();
  if (center) {
    url.searchParams.set('mapLat', center.lat.toFixed(5));
    url.searchParams.set('mapLon', center.lng.toFixed(5));
  }
  if (zoom !== undefined) url.searchParams.set('mapZoom', zoom.toFixed(2));
  url.searchParams.set('mapBase', state.baseMap);
  url.searchParams.set('periodYear', String(state.year));
  url.searchParams.set('periodMonth', String(state.month));
  url.searchParams.set('periodDay', String(state.day));
  url.searchParams.set('sensor', state.sensor);
  return url.toString();
}

export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Alternativa del navegador.
  }
  try {
    const temporaryInput = document.createElement('textarea');
    temporaryInput.value = value;
    temporaryInput.style.position = 'fixed';
    temporaryInput.style.opacity = '0';
    document.body.appendChild(temporaryInput);
    temporaryInput.select();
    const copied = document.execCommand('copy');
    temporaryInput.remove();
    return copied;
  } catch {
    return false;
  }
}

export function openSocialShare(provider: 'facebook' | 'x' | 'reddit' | 'email', targetUrl: string) {
  const encoded = encodeURIComponent(targetUrl);
  const urls: Record<typeof provider, string> = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    x: `https://twitter.com/intent/tweet?url=${encoded}&text=${encodeURIComponent('Visor histórico de incendios — Allpanina')}`,
    reddit: `https://www.reddit.com/submit?url=${encoded}&title=${encodeURIComponent('Visor histórico de incendios — Allpanina')}`,
    email: `mailto:?subject=${encodeURIComponent('Mapa Allpanina')}&body=${encoded}`,
  };
  if (provider === 'email') window.location.href = urls.email;
  else window.open(urls[provider], '_blank', 'noopener,noreferrer');
}
