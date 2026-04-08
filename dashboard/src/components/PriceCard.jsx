import { useEffect, useState } from 'react';
import {
  fetchDayAheadPricesNL,
  currentPrice,
  mwhToKwh,
} from '../lib/entsoe.js';
import './PriceCard.css';

const TOKEN = import.meta.env.VITE_ENTSOE_TOKEN;

// Refresh once per hour — day-ahead prices don't change intraday.
const REFRESH_MS = 60 * 60 * 1000;

export default function PriceCard() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!TOKEN) {
        setState({
          status: 'error',
          error:
            'Geen ENTSO-E token. Kopieer .env.example naar .env en vul VITE_ENTSOE_TOKEN in.',
        });
        return;
      }
      try {
        const prices = await fetchDayAheadPricesNL({ token: TOKEN });
        if (cancelled) return;
        const now = new Date();
        const current = currentPrice(prices, now);
        if (!current) {
          setState({ status: 'error', error: 'Geen prijsdata voor dit uur' });
          return;
        }
        setState({ status: 'ok', current, fetchedAt: now });
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

  return (
    <div className="price-card">
      <div className="price-card__label">NL stroomprijs — nu</div>
      {state.status === 'loading' && (
        <div className="price-card__body price-card__body--muted">
          Prijzen laden…
        </div>
      )}
      {state.status === 'error' && (
        <div className="price-card__body price-card__body--error">
          {state.error}
        </div>
      )}
      {state.status === 'ok' && (
        <PriceBody current={state.current} fetchedAt={state.fetchedAt} />
      )}
    </div>
  );
}

function PriceBody({ current, fetchedAt }) {
  const eurKwh = mwhToKwh(current.priceEurMwh);
  const fmtKwh = eurKwh.toLocaleString('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  const fmtMwh = current.priceEurMwh.toLocaleString('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const hour = current.start.toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  });

  return (
    <div className="price-card__body">
      <div className="price-card__primary">
        {fmtKwh} <span className="price-card__unit">/kWh</span>
      </div>
      <div className="price-card__secondary">
        {fmtMwh} /MWh · uur {hour}
      </div>
      <div className="price-card__meta">
        Bron: ENTSO-E day-ahead · ververst {fetchedAt.toLocaleTimeString('nl-NL')}
      </div>
    </div>
  );
}
