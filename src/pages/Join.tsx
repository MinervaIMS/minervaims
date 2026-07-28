import { Helmet } from 'react-helmet-async';
import { useApplicationSettings } from '@/hooks/useApplicationSettings';
import {
  AdmissionsSteps,
  AlumniWall,
  DivisionsBlock,
  JoinFaqs,
  JoinHero,
  SocietyBlock,
  StatusBand,
  WrittenQuestions,
  useLenisScroll,
  useRevealOnScroll,
  useStillMode,
} from '@/components/join';

// =====================================================================
// /join — admissions.
//
// Nine blocks: hero, status, the Society, the divisions, alumni,
// admissions, the written question, the closing status, and the FAQs.
//
// Nothing on this page gates first paint. The status, the figures, the
// written questions and the FAQ entries all load after the layout is on
// screen and each has a designed state for the moment before its data
// arrives and for the case where it never does.
// =====================================================================

const DESCRIPTION =
  'Admissions to Minerva Investment Management Society, the student-run association at Bocconi University with five research divisions and two student-managed virtual funds.';

const Join = () => {
  const { settings, isLoading } = useApplicationSettings();
  const still = useStillMode();
  const rootRef = useRevealOnScroll(still);
  useLenisScroll(still);

  return (
    <>
      <Helmet>
        <title>Join Minerva | MIMS</title>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Join Minerva | MIMS" />
        <meta property="og:description" content={DESCRIPTION} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollegeOrUniversity',
            name: 'Minerva Investment Management Society',
            alternateName: 'MIMS',
            foundingDate: '2019',
            description:
              'A student-run investment management society at Bocconi University, organised into five research divisions and running two student-managed virtual funds for educational purposes.',
            parentOrganization: { '@type': 'CollegeOrUniversity', name: 'Bocconi University' },
          })}
        </script>
      </Helmet>

      <div ref={rootRef as React.RefObject<HTMLDivElement>} className="theme-join theme-join-root">
        <JoinHero still={still} />

        <section aria-labelledby="join-status" style={{ borderBottom: '1px solid var(--join-hairline)' }}>
          <StatusBand
            settings={settings}
            isLoading={isLoading}
            headingId="join-status"
            closedLine="Admissions open at the start of each academic semester."
          />
        </section>

        <SocietyBlock still={still} />

        <DivisionsBlock still={still} />

        <AlumniWall />

        <AdmissionsSteps still={still} />

        <WrittenQuestions still={still} />

        {/* Mirrors the status band above, from the same source. */}
        <section
          aria-labelledby="join-close"
          style={{ borderTop: '1px solid var(--join-hairline)', backgroundColor: 'var(--join-bg-black)' }}
        >
          <StatusBand
            settings={settings}
            isLoading={isLoading}
            headingId="join-close"
            closedLine="Admissions open once each academic semester."
          />
        </section>

        <div style={{ backgroundColor: 'var(--join-bg)' }}>
          <JoinFaqs />
        </div>
      </div>
    </>
  );
};

export default Join;
