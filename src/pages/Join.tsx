import AlumniTicker from '@/components/shared/AlumniTicker';
import { Seo } from '@/components/shared/Seo';
import ApplicationCta from '@/components/join/ApplicationCta';
import DivisionsFilledNote from '@/components/join/DivisionsFilledNote';
import DivisionVideoRail from '@/components/join/DivisionVideoRail';
import JoinFaq from '@/components/join/JoinFaq';
import { WorkspaceSection } from '@/components/shared/WorkspaceSection';
import JoinFigures from '@/components/join/JoinFigures';
import JoinHeroStage from '@/components/join/JoinHeroStage';
import JoinJourney from '@/components/join/JoinJourney';
import WrittenQuestions from '@/components/join/WrittenQuestions';
import { useApplicationSettings } from '@/hooks/useApplicationSettings';
import {
  JOIN_JOURNEY,
  JOIN_SOCIETY,
  JOIN_STATUS_COPY,
  JOIN_WRITTEN,
} from '@/lib/join-content';

// Note on splitting: the heavy things on this page are the particle canvas and
// the five cinemagraphs, and both are deferred at the point of use (DotField is
// a lazy import inside JoinHeroStage; the videos carry poster frames and
// preload="metadata" and only the visible card plays). The rail and FAQ
// components themselves are a few kilobytes of markup, so importing them
// eagerly keeps the section heights reserved from first paint and avoids the
// large layout shift a Suspense swap would otherwise introduce.
const Join = () => {
  const { settings, isLoading } = useApplicationSettings();

  // `acceptingApplications` and not `applicationsOpen`: a round whose
  // divisions have all filled their places is over as far as a visitor is
  // concerned, and this page then shows exactly the closed state it shows
  // after the closing date.
  const status = {
    applicationsOpen: settings.acceptingApplications,
    semesterLabel: settings.semesterLabel,
    startDate: settings.startDate,
    endDate: settings.endDate,
    isConfigured: settings.isConfigured,
    isLoading,
  };

  // Under each Apply block: which divisions have already filled up.
  const filledNote = (
    <DivisionsFilledNote
      closedDivisions={settings.closedDivisions}
      scheduleOpen={settings.applicationsOpen}
      everyDivisionClosed={settings.openDivisions.length === 0}
      isLoading={isLoading}
    />
  );

  return (
    <>
      <Seo page="/join" />

      {/* The dark introduction: title, payoff and the live key figures. */}
      <JoinHeroStage figures={<JoinFigures tone="dark" />} />

      {/* APPLICATIONS, FIRST THING ON THE WHITE PAGE.
          This used to sit inside the dark stage, under the figures, in the
          light variant. A candidate arriving on /join is here to find out
          whether they can apply, so it is now the first thing the white page
          says - and it says it in the SAME language the closing block at the
          foot of the page already uses: the accent rectangle, its heading,
          its sentence and its white button. One component, one visual system,
          two placements. The state is still read from application_settings,
          so open and closed behave exactly as they did. */}
      <section aria-labelledby="join-status-heading" className="bg-background pt-section-sm md:pt-section pb-10 md:pb-16">
        <div className="container">
          <ApplicationCta
            {...status}
            tone="dark"
            closedBody={JOIN_STATUS_COPY.closedBodyTop}
            headingId="join-status-heading"
          />
          {filledNote}
        </div>
      </section>

      {/* 01 The Society.
          Half rhythm on top: the applications block above is a section in its
          own right and has already opened the white page, so counting a full
          rhythm at both ends of that join would put sixteen rems between two
          blocks that belong together. This is the same measure the Admissions
          section already uses where it continues from the block above it. */}
      <section aria-labelledby="join-society-heading" className="bg-background pt-10 md:pt-16 pb-10 md:pb-16">
        <div className="container">
          <h2
            id="join-society-heading"
            className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent"
          >
            {JOIN_SOCIETY.heading}
          </h2>
          <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
            {JOIN_SOCIETY.lead}
          </p>

          <div className="mt-12 grid grid-cols-1 gap-10 md:mt-16 md:grid-cols-2 md:gap-14">
            {JOIN_SOCIETY.statements.map((statement) => (
              <div key={statement.title} className="grid grid-cols-[auto_1fr] gap-5 md:gap-7">
                <span
                  aria-hidden="true"
                  className="select-none leading-[0.8] text-accent/25"
                  style={{
                    fontFamily: "'Times New Roman', Times, Georgia, serif",
                    fontSize: 'clamp(4.85rem, 14.2vw, 8.4rem)',
                  }}
                >
                  {statement.figure}
                </span>
                <div>
                  <h3 className="font-serif text-subheading text-accent">
                    <span className="sr-only">{statement.figure} </span>
                    {statement.title}
                  </h3>
                  {/* Same size as the section lead, so the two carry equal weight. */}
                  <p className="font-body text-body-lg text-muted-foreground mt-3 leading-relaxed">
                    {statement.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 02 The Divisions */}
      <DivisionVideoRail />

      {/* 03 Alumni: the homepage section, unchanged. */}
      <AlumniTicker />

      {/* 04 Admissions.
          =================================================================
          THE FIVE NUMBERED BLOCKS WERE SPACED 64, 128, 192 AND 192.
          -----------------------------------------------------------------
          A numbered sequence read at four different intervals, because
          the opening and closing sides of each join were chosen
          independently: a section that closed on the HALF rhythm was
          followed by one that opened on the FULL one, and 64 + 128 is a
          gap that appears nowhere else on the site.
          The rule the rest of the site follows is that the two sides of a
          join agree. A half meets a half (128 in total) and a full meets
          a full (256). This block opens on the full rhythm because it
          follows the alumni ticker, which is a full-bleed coloured band
          and takes the wider join everywhere it appears; the two blocks
          after it open on the half, because they continue the sequence.
          ================================================================= */}
      <section aria-labelledby="join-journey-heading" className="bg-background pt-section-sm md:pt-section pb-10 md:pb-16">
        <div className="container">
          <h2
            id="join-journey-heading"
            className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent"
          >
            {JOIN_JOURNEY.heading}
          </h2>
          <p className="font-body text-body-lg text-muted-foreground max-w-3xl mb-12">
            {JOIN_JOURNEY.lead}
          </p>
          <JoinJourney />
        </div>
      </section>

      {/* 05 The Written Question. Opens on the half: it continues the
          sequence above it, which closed on the half. */}
      <section aria-labelledby="join-written-heading" className="bg-background pt-10 md:pt-16 pb-10 md:pb-16">
        <div className="container">
          <h2
            id="join-written-heading"
            className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent"
          >
            {JOIN_WRITTEN.heading}
          </h2>
          <WrittenQuestions />
        </div>
      </section>

      {/* The workspace, immediately after Craft your Application.
          Everything above this point describes a selection that runs
          inside it, from the form to the offer, so it lands on a reader
          who already knows what it is for. It also carries the one thing
          on this page that is about membership rather than admission:
          what the alumni network looks like from the inside. */}
      <WorkspaceSection />

      {/* Close: mirrors the Status block, same source, same two states.
          Opens on the half, because it continues from the workspace section
          above it. It CLOSES on the full rhythm, because what follows is
          a different subject: the FAQ section below is joined at 256, which
          is the interval the site puts between two subjects. */}
      <section aria-labelledby="join-close-heading" className="bg-background pt-10 md:pt-16 pb-section-sm md:pb-section">
        <div className="container">
          <ApplicationCta
            {...status}
            tone="dark"
            closedBody={JOIN_STATUS_COPY.closedBodyBottom}
            headingId="join-close-heading"
          />
          {filledNote}
        </div>
      </section>

      {/* FAQs */}
      <JoinFaq />

    </>
  );
};

export default Join;
