import type { CSSProperties, ReactNode } from 'react';
import { Seo } from '@/components/shared/Seo';
import fullLogoAsset from '@/assets/mims-full-logo-color.png.asset.json';
import Beams from '@/components/shared/Beams';

// =====================================================================
// Shell: the navy stage, the beams field and the white card.
// ---------------------------------------------------------------------
// THIS LIVES AT MODULE SCOPE, AND THAT IS THE WHOLE POINT.
//
// It used to be declared inside EventRegister's body. A component
// declared during a render is a NEW COMPONENT TYPE on every render, and
// React does not reconcile two different types: it unmounts the old
// subtree and mounts a fresh one. Every field in this form is state on
// EventRegister, so every keystroke, every checkbox, every dropdown
// selection re-rendered the page - and each of those re-renders threw
// away the entire shell, including <Beams>, and built it again.
//
// Beams is a WebGL canvas. Destroying and recreating it means a new
// context, a new compile, a new first frame: the background blinked out
// and faded back in on every interaction with the form. That is the
// flash. Nothing about the visual concept changes here; the component
// simply keeps its identity, so React updates the card's children in
// place and never touches the canvas again after the first mount.
// =====================================================================
export const EventCardShell = ({ children, title = 'Event Registration', description = 'Register for an event held by Minerva Investment Management Society.' }: { children: ReactNode; title?: string; description?: string }) => (
  <>
    <Seo title={title} description={description} noindex />
    {/* THE CARD STARTS BELOW THE NAVIGATION, which it did not.
        This shell centred the card in the viewport with 48px of padding, so
        on any card taller than the screen - which is every event with a
        description - the top of the card came to rest at 48px while the
        fixed header occupies the first 84. The card was drawn over the
        navigation and the event's own eyebrow and title sat under it.
        The application form already solves this correctly; this is the same
        measure: start at the top, and clear the header plus a band of space,
        including the iOS safe area. */}
    <div
      className="relative min-h-screen w-full flex items-start justify-center overflow-hidden px-4 pb-12 pt-[calc(84px+env(safe-area-inset-top)+theme(spacing.8))]"
      style={{ backgroundColor: '#05030F' }}
    >
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
      {/* Flat white card per the Minerva Forms design. */}
      {/* z-[55]: over the navigation, under the overlay layer at z-[70].
          See the layer scale at the top of index.css. */}
      <div className="relative z-[55] w-full max-w-[640px] bg-white border border-[#D9D9D9] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.55)] px-6 sm:px-10 py-10">
        <div className="flex justify-center mb-6"><img
          src={fullLogoAsset.url}
          alt="Minerva Investment Management Society"
          className="card-lockup"
          style={{ '--lockup-h': '118px' } as CSSProperties}
        /></div>
        {children}
      </div>
    </div>
  </>
);
