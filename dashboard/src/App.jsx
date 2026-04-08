import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import PriceCard from './components/PriceCard.jsx';
import DataFeed from './components/DataFeed.jsx';
import RevenueCard from './components/RevenueCard.jsx';
import ConsultancyPage from './pages/ConsultancyPage.jsx';
import './App.css';

function Nav() {
  const loc = useLocation();
  const base = import.meta.env.BASE_URL || '/';

  const linkStyle = (path) => ({
    color: loc.pathname.includes(path) ? '#F9A825' : 'rgba(255,255,255,0.85)',
    textDecoration: 'none',
    fontWeight: loc.pathname.includes(path) ? 700 : 400,
    fontSize: 14,
    padding: '4px 10px',
    borderRadius: 4,
    background: loc.pathname.includes(path) ? 'rgba(249,168,37,0.15)' : 'transparent',
    transition: 'all 0.15s',
  });

  return (
    <nav style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
      <Link to="/" style={linkStyle('__home__')}>Dashboard</Link>
      <Link to="/consultancy" style={linkStyle('consultancy')}>☀️ Get Quote</Link>
    </nav>
  );
}

function DashboardPage() {
  return (
    <>
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
            <p>Hendrik helpt je een vergelijkbaar systeem te ontwerpen. <Link to="/consultancy" style={{ color: '#2E7D32', fontWeight: 600 }}>Bereken jouw besparing →</Link></p>
          </div>
        </div>
      </section>
      <footer className="app__footer">
        Hendrik · Het slimme huis · Open source op{' '}
        <a href="https://github.com/HendrikdeKeyzer/hendrik-cto" target="_blank" rel="noopener noreferrer">GitHub</a>
        {' · '}
        <Link to="/consultancy" style={{ color: '#F9A825' }}>☀️ Solar Quote</Link>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="app">
        <header className="app__header" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="app__brand">Hendrik</div>
            <div className="app__tagline">Het slimme huis · Energie dashboard</div>
          </div>
          <Nav />
        </header>

        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/consultancy" element={<ConsultancyPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
