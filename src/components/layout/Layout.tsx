import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

const CHROMELESS_ROUTES = [
  '/admin',
  // PayoffLab is an app-like, full-viewport tool: the site navbar and footer
  // stay out of the way; it carries its own header with a link back to the
  // society website.
  '/lab',
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
