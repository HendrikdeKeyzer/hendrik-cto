// Smoke test for revenue calculations.
// Run: node scripts/test-revenue.mjs
import {
  liveRevenueEurPerHour,
  todayRevenueEstimate,
  whToKwh,
  formatEuro,
  formatPower,
  formatEnergy,
} from '../src/lib/revenue.js';

let failed = 0;
function expect(label, actual, expected) {
  const ok = Math.abs(actual - expected) < 1e-9;
  console.log(`  ${ok ? 'OK ' : 'FAIL'}  ${label}: ${actual} (expected ${expected})`);
  if (!ok) failed++;
}

console.log('liveRevenueEurPerHour:');
// Exporting 2422 W at €0.10/kWh → +0.2422 €/h
expect('exporting 2422W @ €0.10/kWh', liveRevenueEurPerHour(-2422, 0.1), 0.2422);
// Importing 1500 W at €0.30/kWh → -0.45 €/h
expect('importing 1500W @ €0.30/kWh', liveRevenueEurPerHour(1500, 0.3), -0.45);
// Zero net power → 0
expect('zero net @ €0.10/kWh', liveRevenueEurPerHour(0, 0.1), 0);

console.log('\ntodayRevenueEstimate:');
// Produced 24 kWh, consumed 30 kWh → -6 kWh net @ €0.10 → -€0.60
const r = todayRevenueEstimate(24, 30, 0.1);
expect('  netExportKwh', r.netExportKwh, -6);
expect('  estimatedEur', r.estimatedEur, -0.6);

console.log('\nformatters (visual check):');
console.log('  €0.2422  →', formatEuro(0.2422, 4));
console.log('  €-0.60   →', formatEuro(-0.6));
console.log('  2422 W   →', formatPower(-2422));
console.log('  500 W    →', formatPower(500));
console.log('  24.033 kWh →', formatEnergy(24.033));
console.log('  whToKwh(2400) =', whToKwh(2400));

console.log(failed === 0 ? '\nALL OK' : `\nFAILED ${failed}`);
process.exit(failed === 0 ? 0 : 1);
