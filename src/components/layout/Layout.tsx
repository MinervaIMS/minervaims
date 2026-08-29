import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { WORKSPACE_BASE, LEGACY_WORKSPACE_BASE } from '@/lib/workspace-base';

const CHROMELESS_ROUTES = [
  // The workspace, at its current address and at the one it used to have:
  // the /admin route still exists as a redirect, and for the frame it is
  // mounted the site header and footer must stay out of the way exactly as
  // they did before.
  WORKSPACE_BASE,
  LEGACY_WORKSPACE_BASE,
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
