import { useEffect, useState } from 'react';
import { fetchStates } from '../lib/homeassistant.js';
import {
  liveRevenueEurPerHour,
  todayRevenueEstimate,
  whToKwh,
  formatEuro,
} from '../lib/revenue.js';
import './RevenueCard.css';

// We use HA's EnergyZero integration for the price (already in €/kWh).
// PriceCard uses ENTSO-E directly; both should agree closely since EnergyZero
// passes through the wholesale day-ahead spot price to consumers.
const ENV = import.meta.env;

const ENTITY_NET_W =
  ENV.VITE_HA_NET_W ||
  'sensor.envoy_122503008953_current_net_power_consumption';
const ENTITY_PRODUCTION_TODAY =
  ENV.VITE_HA_PRODUCTION_TODAY_WH ||
  'sensor.envoy_122503008953_today_s_energy_production';
const ENTITY_CONSUMPTION_TODAY =
  ENV.VITE_HA_CONSUMPTION_TODAY_WH ||
  'sensor.envoy_122503008953_today_s_energy_consumption';
const ENTITY_PRICE_NOW =
  ENV.VITE_HA_PRICE_NOW || 'sensor.energyzero_today_energy_current_hour_price';
const ENTITY_PRICE_AVG =
  ENV.VITE_HA_PRICE_AVG || 'sensor.energyzero_today_energy_average_price';

const REFRESH_MS = 5 * 60 * 1000;

const ENTITIES = [
  ENTITY_NET_W,
  ENTITY_PRODUCTION_TODAY,
  ENTITY_CONSUMPTION_TODAY,
  ENTITY_PRICE_NOW,
  ENTITY_PRICE_AVG,
];

export default function RevenueCard() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const map = await fetchStates(ENTITIES);
        if (cancelled) return;

        const netW = Number(map[ENTITY_NET_W].state);
        const productionTodayKwh = whToKwh(
          Number(map[ENTITY_PRODUCTION_TODAY].state),
        );
        const consumptionTodayKwh = whToKwh(
          Number(map[ENTITY_CONSUMPTION_TODAY].state),
        );
        const priceNow = Number(map[ENTITY_PRICE_NOW].state);
        const priceAvg = Number(map[ENTITY_PRICE_AVG].state);

        const liveRate = liveRevenueEurPerHour(netW, priceNow);
        const today = todayRevenueEstimate(
          productionTodayKwh,
          consumptionTodayKwh,
          priceAvg,
        );

        setState({
          status: 'ok',
          liveRate,
          today,
          priceNow,
          priceAvg,
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
    return <div className="revenue-card revenue-card--muted">Omzet laden…</div>;
  }
  if (state.status === 'error') {
    return <div className="revenue-card revenue-card--error">{state.error}</div>;
  }

  const earning = state.liveRate >= 0;
  const todayEarning = state.today.estimatedEur >= 0;

  return (
    <div className="revenue-card">
      <div className="revenue-card__label">Omzet — live</div>

      <div
        className={`revenue-card__live ${
          earning ? 'revenue-card__live--earn' : 'revenue-card__live--pay'
        }`}
      >
        {earning ? '+' : ''}
        {formatEuro(state.liveRate, 3)}
        <span className="revenue-card__unit">/uur</span>
      </div>

      <div className="revenue-card__hint">
        bij huidige prijs {formatEuro(state.priceNow, 4)}/kWh
      </div>

      <div className="revenue-card__divider" />

      <div className="revenue-card__today">
        <div className="revenue-card__today-label">Schatting vandaag</div>
        <div
          className={`revenue-card__today-value ${
            todayEarning
              ? 'revenue-card__today-value--earn'
              : 'revenue-card__today-value--pay'
          }`}
        >
          {todayEarning ? '+' : ''}
          {formatEuro(state.today.estimatedEur, 2)}
        </div>
        <div className="revenue-card__today-detail">
          netto {state.today.netExportKwh.toLocaleString('nl-NL', {
            maximumFractionDigits: 1,
          })}{' '}
          kWh × ⌀ {formatEuro(state.priceAvg, 4)}/kWh
        </div>
      </div>

      <div className="revenue-card__meta">
        ververst {state.fetchedAt.toLocaleTimeString('nl-NL')} · geen InfluxDB
        nog (zie TASKS.md)
      </div>
    </div>
  );
}
