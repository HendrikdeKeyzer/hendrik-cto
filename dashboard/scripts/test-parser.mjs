// Smoke test for the ENTSO-E XML parser. No network, no token required.
// Run with: node scripts/test-parser.mjs
import { parsePrices, currentPrice, mwhToKwh } from '../src/lib/entsoe.js';

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<Publication_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-3:publicationdocument:7:0">
  <mRID>abc123</mRID>
  <TimeSeries>
    <mRID>1</mRID>
    <Period>
      <timeInterval>
        <start>2026-04-07T22:00Z</start>
        <end>2026-04-08T22:00Z</end>
      </timeInterval>
      <resolution>PT60M</resolution>
      <Point><position>1</position><price.amount>45.12</price.amount></Point>
      <Point><position>2</position><price.amount>38.50</price.amount></Point>
      <Point><position>3</position><price.amount>32.10</price.amount></Point>
      <Point><position>10</position><price.amount>89.75</price.amount></Point>
      <Point><position>24</position><price.amount>120.00</price.amount></Point>
    </Period>
  </TimeSeries>
</Publication_MarketDocument>`;

const prices = parsePrices(sampleXml);
console.log(`Parsed ${prices.length} hourly prices:`);
for (const p of prices) {
  console.log(
    `  ${p.start.toISOString()}  €${p.priceEurMwh.toFixed(2)}/MWh  ` +
      `→ €${mwhToKwh(p.priceEurMwh).toFixed(4)}/kWh`,
  );
}

// Pick "current" as the 3rd price's start
const fakeNow = new Date('2026-04-08T00:30:00Z');
const cur = currentPrice(prices, fakeNow);
console.log(`\nAt ${fakeNow.toISOString()}, current = ${cur?.priceEurMwh} EUR/MWh`);

if (prices.length !== 5) {
  console.error('FAIL: expected 5 prices');
  process.exit(1);
}
if (cur?.priceEurMwh !== 32.10) {
  console.error(`FAIL: expected 32.10, got ${cur?.priceEurMwh}`);
  process.exit(1);
}
console.log('\nOK');
