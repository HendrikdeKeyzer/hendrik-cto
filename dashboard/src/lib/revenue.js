// Revenue calculations from solar export.
//
// Pure functions only — no I/O. Easy to unit test.
//
// Sign convention (matches Enphase Envoy):
//   net_power_w > 0  → importing from grid (we pay)
//   net_power_w < 0  → exporting to grid  (we earn)
//
// Hendrik's MEMORY.md preference: always denominate in €/kWh, never €/MWh.

/**
 * Live revenue rate, in €/h.
 *
 * @param {number} netPowerW          Current net grid power, in watts (signed).
 * @param {number} priceEurPerKwh     Current grid price, in €/kWh.
 * @returns {number}                  Positive when earning, negative when paying.
 */
export function liveRevenueEurPerHour(netPowerW, priceEurPerKwh) {
  if (!Number.isFinite(netPowerW) || !Number.isFinite(priceEurPerKwh)) return NaN;
  // Exporting (negative net power) → positive revenue.
  const exportKw = -netPowerW / 1000;
  return exportKw * priceEurPerKwh;
}

/**
 * Rough estimate of today's revenue so far, using day totals + a single price.
 *
 * This is intentionally a SIMPLIFICATION: real revenue depends on hour-by-hour
 * export integrated against hour-by-hour prices, which we'll do properly when
 * InfluxDB is wired up (deferred from Task 1.2).
 *
 * @param {number} productionTodayKwh   Today's PV production (kWh).
 * @param {number} consumptionTodayKwh  Today's house consumption (kWh).
 * @param {number} avgPriceEurPerKwh    Today's average grid price (€/kWh).
 * @returns {{ netExportKwh: number, estimatedEur: number }}
 */
export function todayRevenueEstimate(
  productionTodayKwh,
  consumptionTodayKwh,
  avgPriceEurPerKwh,
) {
  const netExportKwh = productionTodayKwh - consumptionTodayKwh;
  const estimatedEur = netExportKwh * avgPriceEurPerKwh;
  return { netExportKwh, estimatedEur };
}

/** Wh → kWh */
export function whToKwh(wh) {
  return wh / 1000;
}

/** Format a number as a euro string with the given fraction digits. */
export function formatEuro(value, fractionDigits = 2) {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Format a power value (W) with the right unit. */
export function formatPower(watts) {
  if (!Number.isFinite(watts)) return '—';
  const kw = watts / 1000;
  if (Math.abs(kw) >= 1) {
    return `${kw.toLocaleString('nl-NL', { maximumFractionDigits: 2 })} kW`;
  }
  return `${watts.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} W`;
}

/** Format an energy value (kWh) for display. */
export function formatEnergy(kwh) {
  if (!Number.isFinite(kwh)) return '—';
  return `${kwh.toLocaleString('nl-NL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kWh`;
}
