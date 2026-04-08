import PriceCard from './components/PriceCard.jsx';
import DataFeed from './components/DataFeed.jsx';
import RevenueCard from './components/RevenueCard.jsx';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">Hendrik</div>
        <div className="app__tagline">Het slimme huis · Energie dashboard</div>
      </header>
      <main className="app__main">
        <div className="app__grid">
          <PriceCard />
          <RevenueCard />
          <DataFeed />
        </div>
      </main>
      <section className="app__explainer">
        <h2 className="explainer__title">Hoe werkt dit?</h2>
        <div className="explainer__grid">
          <div className="explainer__item">
            <span className="explainer__icon">☀️</span>
            <strong>Zonnepanelen</strong>
            <p>Hendrik's Enphase Envoy meet productie en verbruik real-time. Op zonnige middagen levert het systeem meer terug dan het verbruikt.</p>
          </div>
          <div className="explainer__item">
            <span className="explainer__icon">🔋</span>
            <strong>Batterij</strong>
            <p>De thuisbatterij slaat goedkope stroom op (daluren) en verkoopt dure stroom (piekuren). Zo maximaliseert Hendrik de opbrengst per kWh.</p>
          </div>
          <div className="explainer__item">
            <span className="explainer__icon">📈</span>
            <strong>Day-ahead markt</strong>
            <p>Stroomprijzen variëren elk uur. Via ENTSO-E en de EnergyZero integratie ziet Home Assistant de prijs van het volgende uur — en handelt automatisch.</p>
          </div>
          <div className="explainer__item">
            <span className="explainer__icon">🏠</span>
            <strong>Home Assistant</strong>
            <p>De slimme kern van het huis. Automatiseringen sturen verwarming, EV-lader en batterij op basis van prijzen, zon en verbruik.</p>
          </div>
          <div className="explainer__item">
            <span className="explainer__icon">🔄</span>
            <strong>Live data</strong>
            <p>Dit dashboard toont echte data van Hendrik's huis, elke 15 minuten ververst via een automatische achtergrondtaak (GitHub Actions).</p>
          </div>
          <div className="explainer__item">
            <span className="explainer__icon">💼</span>
            <strong>Wil jij dit ook?</strong>
            <p>Hendrik helpt je een vergelijkbaar systeem te ontwerpen voor jouw woning — van PV-sizing tot Home Assistant setup. Neem contact op voor een vrijblijvend advies.</p>
          </div>
        </div>
      </section>
      <footer className="app__footer">
        Hendrik · Het slimme huis · Open source op{' '}
        <a href="https://github.com/HendrikdeKeyzer/hendrik-cto" target="_blank" rel="noopener noreferrer">GitHub</a>
      </footer>
    </div>
  );
}
