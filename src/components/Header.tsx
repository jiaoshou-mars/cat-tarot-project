import type { Page } from '../App';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: Array<{ page: Page; label: string }> = [
  { page: 'home', label: '首页' },
  { page: 'reading', label: '塔罗测算' },
  { page: 'gallery', label: '图鉴' },
];

export function Header({ currentPage, onNavigate }: HeaderProps) {
  return (
    <header className="site-header">
      <button className="brand" onClick={() => onNavigate('home')}>
        <span className="brand-mark">✦</span>
        <span>
          <strong>猫咪塔罗</strong>
          <small>Cat Tarot Lab</small>
        </span>
      </button>
      <nav className="site-nav" aria-label="主导航">
        {navItems.map((item) => (
          <button
            key={item.page}
            className={currentPage === item.page ? 'active' : ''}
            onClick={() => onNavigate(item.page)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
