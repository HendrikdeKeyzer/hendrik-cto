// Home Assistant REST API client.
// Docs: https://developers.home-assistant.io/docs/api/rest/
//
// Auth: long-lived access token via VITE_HA_TOKEN.
// Token URL: in HA, click your profile (bottom-left) → Long-Lived Access Tokens.
//
// Browser security note: any token in `import.meta.env.VITE_*` is bundled into
// the public JS at build time, so anyone who views the deployed source can see
// it. That's fine for local dev. For Task 1.3 (public deploy) we'll need a
// backend proxy that adds the token server-side, OR a scheduled job that
// publishes pre-fetched data as static JSON.
//
// CORS: HA's REST API does NOT send Access-Control-* headers by default. We
// route browser requests through Vite's dev proxy: /api/ha → $VITE_HA_BASE.
// See vite.config.js.

const TOKEN = import.meta.env.VITE_HA_TOKEN;

// In dev: requests go to /api/ha and Vite forwards them to the real HA host.
// In prod: same path; will need to be served by a real backend (Task 1.3).
const API_BASE = '/api/ha/api';

class HAError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HAError';
    this.status = status;
  }
}

function requireToken() {
  if (!TOKEN) {
    throw new HAError(
      'Geen HA token. Kopieer .env.example naar .env en vul VITE_HA_TOKEN in.',
    );
  }
}

async function haFetch(path) {
  requireToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new HAError(
      `HA ${res.status} ${path}: ${body.slice(0, 200)}`,
      res.status,
    );
  }
  return res.json();
}

/**
 * Fetch a single entity's state.
 * @param {string} entityId  e.g. "sensor.envoy_122503008953_current_power_production"
 * @returns {Promise<{ state: string, attributes: object, last_updated: string }>}
 */
export function fetchState(entityId) {
  return haFetch(`/states/${encodeURIComponent(entityId)}`);
}

/**
 * Fetch multiple entities in parallel. Returns a map keyed by entity_id.
 * Throws if any single fetch fails.
 */
export async function fetchStates(entityIds) {
  const results = await Promise.all(entityIds.map(fetchState));
  const map = {};
  for (let i = 0; i < entityIds.length; i++) {
    map[entityIds[i]] = results[i];
  }
  return map;
}

/**
 * Convenience: fetch a sensor and parse its state as a number.
 * Returns NaN if the state is not numeric (e.g. "unavailable", "unknown").
 */
export async function fetchNumber(entityId) {
  const s = await fetchState(entityId);
  return Number(s.state);
}
