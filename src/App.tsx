import { useState } from 'react';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { TarotReading } from './components/TarotReading';
import { Gallery } from './components/Gallery';

export type Page = 'home' | 'reading' | 'gallery';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  return (
    <div className="app-shell">
      <Header currentPage={currentPage} onNavigate={setCurrentPage} />
      {currentPage === 'home' ? <Home onNavigate={setCurrentPage} /> : null}
      {currentPage === 'reading' ? <TarotReading /> : null}
      {currentPage === 'gallery' ? <Gallery /> : null}
    </div>
  );
}
