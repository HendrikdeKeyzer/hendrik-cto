import { useEffect, useState } from 'react';
import { fetchStates } from '../lib/homeassistant.js';
import { whToKwh, formatPower, formatEnergy } from '../lib/revenue.js';
import './DataFeed.css';

// Default Enphase Envoy entities for Hendrik. Override via env if needed.
const ENV = import.meta.env;
const ENTITY_PRODUCTION =
  ENV.VITE_HA_PRODUCTION_W ||
  'sensor.envoy_122503008953_current_power_production';
const ENTITY_CONSUMPTION =
  ENV.VITE_HA_CONSUMPTION_W ||
  'sensor.envoy_122503008953_current_power_consumption';
const ENTITY_NET =
  ENV.VITE_HA_NET_W ||
  'sensor.envoy_122503008953_current_net_power_consumption';
const ENTITY_PRODUCTION_TODAY =
  ENV.VITE_HA_PRODUCTION_TODAY_WH ||
  'sensor.envoy_122503008953_today_s_energy_production';
const ENTITY_CONSUMPTION_TODAY =
  ENV.VITE_HA_CONSUMPTION_TODAY_WH ||
  'sensor.envoy_122503008953_today_s_energy_consumption';
const ENTITY_BATTERY_PCT =
  ENV.VITE_HA_BATTERY_PCT ||
  'sensor.envoy_122503008953_total_battery_percentage';

// Acceptance criterion 1.2: data updates every 5 minutes.
const REFRESH_MS = 5 * 60 * 1000;

const ENTITIES = [
  ENTITY_PRODUCTION,
  ENTITY_CONSUMPTION,
  ENTITY_NET,
  ENTITY_PRODUCTION_TODAY,
  ENTITY_CONSUMPTION_TODAY,
  ENTITY_BATTERY_PCT,
];

export default function DataFeed() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const map = await fetchStates(ENTITIES);
        if (cancelled) return;
        const productionW = Number(map[ENTITY_PRODUCTION].state);
        const consumptionW = Number(map[ENTITY_CONSUMPTION].state);
        const netW = Number(map[ENTITY_NET].state);
        const productionTodayKwh = whToKwh(
          Number(map[ENTITY_PRODUCTION_TODAY].state),
        );
        const consumptionTodayKwh = whToKwh(
          Number(map[ENTITY_CONSUMPTION_TODAY].state),
        );
        const batteryPct = Number(map[ENTITY_BATTERY_PCT].state);
        setState({
          status: 'ok',
          productionW,
          consumptionW,
          netW,
          productionTodayKwh,
          consumptionTodayKwh,
          batteryPct,
          fetchedAt: new Date(),
        });
      } catch (err) {
        if (cancelled) return;
        setState({ status: 'error', error: err.message });
      }
    }

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="datafeed datafeed--muted">Hendrik’s data laden…</div>
    );
  }
  if (state.status === 'error') {
    return <div className="datafeed datafeed--error">{state.error}</div>;
  }

  const exporting = state.netW < 0;
  const flowLabel = exporting ? 'Exporteert naar net' : 'Importeert van net';
  const flowValue = formatPower(Math.abs(state.netW));
  const flowClass = exporting ? 'datafeed__flow--export' : 'datafeed__flow--import';

  return (
    <div className="datafeed">
      <div className="datafeed__row">
        <Stat label="Productie nu" value={formatPower(state.productionW)} accent="green" />
        <Stat label="Verbruik nu" value={formatPower(state.consumptionW)} accent="amber" />
        <Stat label="Batterij" value={`${state.batteryPct.toFixed(0)} %`} accent="blue" />
      </div>
      <div className={`datafeed__flow ${flowClass}`}>
        <div className="datafeed__flow-label">{flowLabel}</div>
        <div className="datafeed__flow-value">{flowValue}</div>
      </div>
      <div className="datafeed__row datafeed__row--small">
        <Stat label="Productie vandaag" value={formatEnergy(state.productionTodayKwh)} />
        <Stat label="Verbruik vandaag" value={formatEnergy(state.consumptionTodayKwh)} />
      </div>
      <div className="datafeed__meta">
        ververst {state.fetchedAt.toLocaleTimeString('nl-NL')} · update elke 5 min
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`stat${accent ? ` stat--${accent}` : ''}`}>
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
    </div>
  );
}
