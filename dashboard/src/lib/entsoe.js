// ENTSO-E Transparency Platform API client
// Docs: https://transparency.entsoe.eu/content/static_content/Static%20content/web%20api/Guide.html
//
// Get a token: register at https://transparency.entsoe.eu/, then email
// transparency@entsoe.eu requesting "Restful API access" for your account.
// Token arrives within ~3 working days.
//
// Note: ENTSO-E does not send CORS headers, so browser requests must go
// through a proxy. In dev we use Vite's server.proxy (see vite.config.js)
// which rewrites /api/entsoe → https://web-api.tp.entsoe.eu/api.

import { XMLParser } from 'fast-xml-parser';

// Domain code for The Netherlands (bidding zone)
const NL_DOMAIN = '10YNL----------L';

// A44 = Day-ahead prices
const DOC_TYPE_DAY_AHEAD = 'A44';

// In dev: routed via Vite proxy. In prod: needs a backend (Task 1.3).
const API_BASE = '/api/entsoe';

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
});

/**
 * Format a Date as ENTSO-E period string: YYYYMMDDhhmm in UTC.
 */
function formatPeriod(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes())
  );
}

/**
 * Fetch day-ahead prices for The Netherlands for a given day.
 *
 * @param {object} opts
 * @param {string} opts.token   ENTSO-E security token
 * @param {Date}   [opts.day]   Day to fetch (defaults to today, UTC)
 * @returns {Promise<Array<{ start: Date, priceEurMwh: number }>>}
 *          Hourly prices, sorted ascending by start time.
 */
export async function fetchDayAheadPricesNL({ token, day = new Date() } = {}) {
  if (!token) {
    throw new Error(
      'ENTSO-E token missing. Set VITE_ENTSOE_TOKEN in .env (see .env.example)',
    );
  }

  // ENTSO-E day-ahead window: 23:00 UTC of day-1 → 23:00 UTC of day
  // (matches the local CET/CEST day for The Netherlands).
  const start = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() - 1, 23, 0),
  );
  const end = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 0),
  );

  const params = new URLSearchParams({
    securityToken: token,
    documentType: DOC_TYPE_DAY_AHEAD,
    in_Domain: NL_DOMAIN,
    out_Domain: NL_DOMAIN,
    periodStart: formatPeriod(start),
    periodEnd: formatPeriod(end),
  });

  const res = await fetch(`${API_BASE}?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ENTSO-E ${res.status}: ${body.slice(0, 200)}`);
  }

  const xml = await res.text();
  return parsePrices(xml, start);
}

/**
 * Parse ENTSO-E Publication_MarketDocument XML and return hourly prices.
 * Exported for testing.
 */
export function parsePrices(xml, periodStart) {
  const doc = parser.parse(xml);
  const root = doc.Publication_MarketDocument;
  if (!root) {
    throw new Error('Unexpected ENTSO-E response (no Publication_MarketDocument)');
  }

  // Single TimeSeries → object; multiple → array. Normalize.
  const series = Array.isArray(root.TimeSeries) ? root.TimeSeries : [root.TimeSeries];
  const out = [];

  for (const ts of series) {
    const periods = Array.isArray(ts.Period) ? ts.Period : [ts.Period];
    for (const period of periods) {
      // resolution is ISO 8601 duration, e.g. PT60M (1 hour)
      const resolutionMin = parseResolution(period.resolution);
      const seriesStart = period.timeInterval?.start
        ? new Date(period.timeInterval.start)
        : periodStart;

      const points = Array.isArray(period.Point) ? period.Point : [period.Point];
      for (const point of points) {
        const position = Number(point.position);
        const price = Number(point['price.amount']);
        if (!Number.isFinite(position) || !Number.isFinite(price)) continue;

        const start = new Date(
          seriesStart.getTime() + (position - 1) * resolutionMin * 60_000,
        );
        out.push({ start, priceEurMwh: price });
      }
    }
  }

  out.sort((a, b) => a.start - b.start);
  return out;
}

function parseResolution(iso) {
  // Supports PT15M, PT30M, PT60M. Defaults to 60 if unrecognized.
  const m = /^PT(\d+)M$/.exec(iso || '');
  return m ? Number(m[1]) : 60;
}

/**
 * Find the price for the hour containing `now` in a list of prices.
 */
export function currentPrice(prices, now = new Date()) {
  // Prices are sorted; find the latest one whose start <= now.
  let current = null;
  for (const p of prices) {
    if (p.start <= now) current = p;
    else break;
  }
  return current;
}

/** €/MWh → €/kWh (Hendrik's preferred unit, see workspace MEMORY.md). */
export function mwhToKwh(eurMwh) {
  return eurMwh / 1000;
}
