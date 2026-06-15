import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

const CHROMELESS_ROUTES = [
  '/admin',
  '/auth',
  '/forgot-password',
  '/check-email',
  '/reset-password',
  '/password-reset-success',
  '/verify-email',
  '/session-expired',
  '/access-denied',
  '/pending-approval',
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
        <Outlet />
      </main>
      {!isChromeless && <Footer />}
    </div>
  );
}
