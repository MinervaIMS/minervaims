// =====================================================================
// THE HOMEPAGE'S FIRST SCREEN, AS THE BUILD DRAWS IT (Step 102).
// ---------------------------------------------------------------------
// Rendered once per build by vite.prerender.ts, in Node, with the site's
// own components: the page frame, the header and the hero, given the key
// numbers and the application settings the build read. What comes out is
// exactly what the app draws first on the homepage; lib/prerender.ts says
// how the page puts it on screen and hands over to the app.
//
// Nothing here runs in the browser.
// =====================================================================

import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { LAYOUT_FRAME_CLASS, LAYOUT_MAIN_CLASS } from '@/components/layout/layout-frame';
import { HomeHero } from '@/components/home/HomeHero';
import { applicationSettingsFromRow, type ApplicationSettingsRow } from '@/hooks/useApplicationSettings';
import { HOME_HERO_FIGURES } from '@/lib/prerender';
import { chromeFor } from '@/components/shared/RouteChrome';
import type { KeyNumber } from '@/lib/key-numbers';

export { HOME_HERO_LOGO } from '@/components/home/HomeHero';
/** The picture of the phone intro (components/shared/Preloader). */
export { default as INTRO_LOGO } from '@/assets/logo-white.svg';
/** The page's colours at the homepage, as RouteChrome sets them. */
export const HOME_CHROME = chromeFor('/');

export interface FirstScreenInput {
  /** The key numbers embedded in the page, by slug. */
  numbers: Record<string, KeyNumber> | null;
  /** The application settings row the build read, if it could. */
  applicationRow: ApplicationSettingsRow | null;
  /** The moment the build decides "Applications Are Open" for. */
  now: number;
}

export function renderFirstScreen({ numbers, applicationRow, now }: FirstScreenInput): string {
  const figure = (slug: string) => numbers?.[slug] ?? null;
  const accepting = applicationRow ? applicationSettingsFromRow(applicationRow, now).acceptingApplications : false;
  return renderToString(
    <StaticRouter location="/">
      <AuthProvider>
        <div className={LAYOUT_FRAME_CLASS}>
          <Header />
          <main className={LAYOUT_MAIN_CLASS}>
            <HomeHero
              reportsFigure={figure(HOME_HERO_FIGURES[0])}
              membersFigure={figure(HOME_HERO_FIGURES[1])}
              alumniFigure={figure(HOME_HERO_FIGURES[2])}
              acceptingApplications={accepting}
            />
          </main>
          {/* The app's page is always longer than the screen, so the
              scrollbar is there from its first frame; one pixel below the
              hero gives this screen the same scrollbar until it takes over. */}
          <div aria-hidden="true" style={{ height: 1 }} />
        </div>
      </AuthProvider>
    </StaticRouter>,
  );
}
