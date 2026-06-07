const BASE = '/api';

function headers(settings) {
  const h = { 'Content-Type': 'application/json' };
  if (settings.tessieToken) h['x-tessie-token'] = settings.tessieToken;
  if (settings.openeiKey) h['x-openei-key'] = settings.openeiKey;
  return h;
}

async function apiFetch(url, settings, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: { ...headers(settings), ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function fetchVehicles(settings) {
  return apiFetch('/tessie/vehicles', settings);
}

export function fetchChargingHistory(settings, vin, { after, before } = {}) {
  const params = new URLSearchParams();
  if (after) params.set('after', after);
  if (before) params.set('before', before);
  return apiFetch(`/tessie/vehicles/${vin}/charging-history?${params}`, settings);
}

export function fetchRates(settings, zip) {
  return apiFetch(`/rates/lookup?zip=${encodeURIComponent(zip)}`, settings);
}
