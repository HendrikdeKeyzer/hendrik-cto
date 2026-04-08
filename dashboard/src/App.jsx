import PriceCard from './components/PriceCard.jsx';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">Hendrik</div>
        <div className="app__tagline">Het slimme huis · Energie dashboard</div>
      </header>
      <main className="app__main">
        <PriceCard />
      </main>
      <footer className="app__footer">
        Sprint 1 · MVP · ENTSO-E day-ahead prijzen
      </footer>
    </div>
  );
}
