import { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import fullLogo from '@/assets/legal-hero-logo.svg';
import Beams from './Beams';

interface AuthLayoutProps {
  title: string;
  children: ReactNode;
  /** Centred title block on the card. */
  cardTitle?: ReactNode;
  cardSubtitle?: ReactNode;
  /** Optional alignment override (defaults to centre). */
  align?: 'center' | 'left';
}

/**
 * Shared layout for every Workspace auth/utility page.
 *
 * - Desktop (>=1024px): solid navy left third + white right two thirds with a centred card.
 * - Tablet & mobile: hide the navy panel; the card stretches comfortably on white.
 *
 * Every card opens with the full Minerva lock-up at the top, followed by the
 * heading / subtitle block and the page-specific body.
 */
export function AuthLayout({ title, children, cardTitle, cardSubtitle, align = 'center' }: AuthLayoutProps) {
  return (
    <>
      <Helmet>
        <title>{title} | MIMS</title>
      </Helmet>
      <div className="w-full flex flex-col bg-background" style={{ minHeight: '100vh' }}>
        {/* Form panel */}
        <main className="relative flex-1 flex items-center justify-center px-6 pt-[calc(84px+env(safe-area-inset-top)+theme(spacing.16))] pb-12 lg:pb-[7.5vh] overflow-hidden" style={{ backgroundColor: '#05030F' }}>
          <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
            <Beams
              beamWidth={8.4}
              beamHeight={30}
              beamNumber={38}
              lightColor="#afa2d2"
              speed={2}
              noiseIntensity={0.6}
              scale={0.2}
              rotation={30}
            />
          </div>
          {/* z-[55]: while scrolling, the card passes OVER the fixed site nav bar (z-50). */}
          <div
            className="relative z-[55] w-full max-w-md bg-background"
            style={{
              borderRadius: 0,
              padding: '38px 32px',
              boxShadow: '0 20px 60px -20px rgba(31, 15, 77, 0.18)',
            }}
          >
            <div className="flex justify-center mb-7">
              <img src={fullLogo} alt="Minerva Investment Management Society" style={{ height: '138px', width: 'auto' }} />
            </div>


            {(cardTitle || cardSubtitle) && (
              <div className={align === 'center' ? 'text-center mb-6' : 'mb-6'}>
                {cardTitle && (
                  <h1
                    className="font-serif"
                    style={{
                      fontSize: '26px',
                      fontWeight: 400,
                      color: '#141414',
                      letterSpacing: '-0.005em',
                      marginBottom: cardSubtitle ? '10px' : 0,
                      lineHeight: 1.25,
                    }}
                  >
                    {cardTitle}
                  </h1>
                )}
                {cardSubtitle && (
                  <p
                    className="font-body"
                    style={{ fontSize: '14.5px', color: '#737373', lineHeight: 1.55, whiteSpace: 'pre-line' }}
                  >
                    {cardSubtitle}
                  </p>
                )}
              </div>
            )}

            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export default AuthLayout;
