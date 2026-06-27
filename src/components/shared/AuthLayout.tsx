import { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import logoWhite from '@/assets/logo-white.svg';
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
      <div className="w-full flex flex-col lg:flex-row bg-background" style={{ minHeight: '100vh' }}>
        {/* Brand panel — desktop only */}
        <aside
          aria-hidden
          className="hidden lg:flex relative overflow-hidden flex-col justify-center"
          style={{
            flex: '0 0 25%',
            backgroundColor: '#1F0F4D',
            color: '#fff',
            padding: '64px 44px',
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              right: '-130px',
              top: '-90px',
              width: '440px',
              height: '440px',
              backgroundImage: `url(${logoWhite})`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundSize: 'contain',
              opacity: 0.06,
            }}
          />
          <h4
            className="font-serif"
            style={{
              fontSize: '34px',
              fontWeight: 400,
              lineHeight: 1.18,
              letterSpacing: '-0.01em',
              marginBottom: '18px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            The Minerva Workspace
          </h4>
          <p
            className="font-body"
            style={{
              fontSize: '16px',
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.74)',
              maxWidth: '38ch',
              position: 'relative',
              zIndex: 1,
            }}
          >
            From your first application to your last report. Applicants follow their candidacy from day one.
            Members edit their profile, upload reports, register for events, and stay connected to a network built to last long after.
          </p>
          <div
            className="font-body"
            style={{
              position: 'absolute',
              left: '54px',
              right: '54px',
              bottom: '40px',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)',
              zIndex: 1,
            }}
          >
            {"\n"}
          </div>
        </aside>

        {/* Form panel */}
        <main className="relative flex-1 bg-background flex items-center justify-center px-6 py-[7.5vh] lg:py-[7.5vh] overflow-hidden">
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
          <div
            className="relative z-10 w-full max-w-md bg-background"
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
                    style={{ fontSize: '14.5px', color: '#737373', lineHeight: 1.55 }}
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
