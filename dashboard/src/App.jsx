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
      <footer className="app__footer">
        Sprint 1 · MVP · ENTSO-E + Home Assistant
      </footer>
    </div>
  );
}
