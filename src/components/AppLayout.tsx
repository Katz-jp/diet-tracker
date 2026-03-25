import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'ホーム', ico: '🏠' },
  { to: '/meals', label: '食事', ico: '🍽' },
  { to: '/recipes', label: 'レシピ', ico: '📖' },
  { to: '/body', label: '体重・サイズ', ico: '📏' },
  { to: '/graphs', label: 'グラフ', ico: '📈' },
  { to: '/settings', label: '設定', ico: '⚙' },
] as const;

export function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="top-bar">
        <span className="brand">Diet Tracker</span>
      </header>
      {children ?? <Outlet />}
      <nav className="bottom-nav" aria-label="メイン">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            <span className="ico" aria-hidden>
              {l.ico}
            </span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
