import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { WORKSPACE_BASE, LEGACY_WORKSPACE_BASE } from '@/lib/workspace-base';
import { ChromeProvider, useChrome } from './ChromeContext';
import { LAYOUT_FRAME_CLASS, LAYOUT_MAIN_CLASS } from './layout-frame';

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

function LayoutFrame() {
  const { pathname } = useLocation();
  const isChromeless = CHROMELESS_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  // A page built as a full-viewport backdrop with one card on it says so
  // for itself, through `useHideSiteFooter`. See ChromeContext for why
  // that is declared by the shell rather than listed by route here.
  const { footerHidden } = useChrome();
  return (
    <div className={LAYOUT_FRAME_CLASS}>
      {!isChromeless && <Header />}
      <main className={LAYOUT_MAIN_CLASS}>
        <Outlet />
      </main>
      {!isChromeless && !footerHidden && <Footer />}
    </div>
  );
}

export function Layout() {
  return (
    <ChromeProvider>
      <LayoutFrame />
    </ChromeProvider>
  );
}
