import { CSSProperties, ReactNode } from 'react';
import { Seo } from '@/components/shared/Seo';
import fullLogo from '@/assets/legal-hero-logo.svg';
import Beams from './Beams';
import ApplyBackground from './ApplyBackground';

interface AuthLayoutProps {
  title: string;
  children: ReactNode;
  /** Centred title block on the card. */
  cardTitle?: ReactNode;
  cardSubtitle?: ReactNode;
  /** Optional alignment override (defaults to centre). */
  align?: 'center' | 'left';
  /**
   * Which ambient layer sits behind the card.
   *
   * 'workspace' (default) is the beams backdrop shared by sign in, sign up,
   * password reset and the other member-facing utility pages.
   *
   * 'application' is the /join particle field, used by the pages an
   * APPLICANT meets while sending an application, so the recruiting page
   * and the form it leads into read as one continuous journey.
   */
  background?: 'workspace' | 'application';
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
export function AuthLayout({
  title, children, cardTitle, cardSubtitle, align = 'center', background = 'workspace',
}: AuthLayoutProps) {
  return (
    <>
      {/* Sign-in, password reset and email confirmation are steps in a
          journey, not answers to a search: indexed, they would put a
          half-finished flow in results under a dozen near-identical
          titles. */}
      <Seo title={title} description={`${title} for the Minerva Investment Management Society workspace.`} noindex />
      <div className="w-full flex flex-col bg-background" style={{ minHeight: '100vh' }}>
        {/* Form panel */}
        <main className="relative flex-1 flex items-center justify-center px-6 pt-[calc(84px+env(safe-area-inset-top)+theme(spacing.8))] pb-12 lg:pb-[7.5vh] overflow-hidden" style={{ backgroundColor: '#05030F' }}>
          <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
            {background === 'application' ? (
              <ApplyBackground />
            ) : (
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
            )}
          </div>
          {/* z-[55]: over the navigation, under the overlay layer at z-[70].
              See the layer scale at the top of index.css. */}
          <div
            className="relative z-[55] w-full max-w-md bg-background"
            style={{
              borderRadius: 0,
              padding: '38px 32px',
              boxShadow: '0 20px 60px -20px rgba(31, 15, 77, 0.18)',
            }}
          >
            <div className="flex justify-center mb-7">
              <img
                src={fullLogo}
                alt="Minerva Investment Management Society"
                className="card-lockup"
                style={{ '--lockup-h': '138px' } as CSSProperties}
              />
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
