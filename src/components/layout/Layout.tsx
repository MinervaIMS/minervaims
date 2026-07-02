import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

const CHROMELESS_ROUTES = [
  '/admin',
];

export function Layout() {
  const { pathname } = useLocation();
  const isChromeless = CHROMELESS_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  return (
    <div className="min-h-screen flex flex-col overflow-x-clip bg-background">
      {!isChromeless && <Header />}
      <main className="flex-1">
        {/* Keyed by route so each page's content fades in together rather than
            elements popping in one after another. */}
        <div key={pathname} className={isChromeless ? undefined : 'animate-page-in'}>
          <Outlet />
        </div>
      </main>
      {!isChromeless && <Footer />}
    </div>
  );
}
