import { Link } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { JOIN_STATUS_COPY, formatDeadlineSentence } from '@/lib/join-content';

interface Props {
  applicationsOpen: boolean;
  semesterLabel: string;
  endDate: Date | null;
  /**
   * False when application_settings has no row, or a row without both window
   * dates. The page still renders its closed state; administrators get a
   * notice so a half-populated row is visible to the people who can fix it.
   */
  isConfigured: boolean;
  isLoading: boolean;
  /**
   * 'light' sits on the dark hero stage, 'dark' sits on the white page. The
   * two states carry identical weight in both tones: closed is a designed
   * state, not an apology.
   */
  tone: 'light' | 'dark';
  /** Closed-state sentence, which differs between the Status and Close blocks. */
  closedBody: string;
  headingId: string;
}

export function ApplicationCta({
  applicationsOpen,
  semesterLabel,
  endDate,
  isConfigured,
  isLoading,
  tone,
  closedBody,
  headingId,
}: Props) {
  const { isFullAccess } = usePermissions();
  const light = tone === 'light';

  const surface = light
    ? 'bg-background text-foreground'
    : 'bg-accent text-background';
  const headingClass = light ? 'text-accent' : 'text-background';
  const bodyClass = light ? 'text-muted-foreground' : 'text-background/85';

  const heading = applicationsOpen
    ? JOIN_STATUS_COPY.openHeading
    : JOIN_STATUS_COPY.closedHeading;
  const body = applicationsOpen
    ? formatDeadlineSentence(semesterLabel, endDate)
    : closedBody;

  // The closed state always keeps a route into the funnel. Between intakes the
  // useful destination is the research archive, so the primary action sends
  // candidates to the reports; contact stays available as a secondary link.
  const action = applicationsOpen
    ? { to: '/apply', label: JOIN_STATUS_COPY.applyLabel }
    : { to: '/archive', label: JOIN_STATUS_COPY.archiveLabel };

  /*
    Button behaviour matches the site-wide .cta-link system used on /about:
    a bordered button that fills with the opposite colour on hover. On the
    accent card the fill is inverted so the same gesture reads correctly.
  */
  const buttonClass = light
    ? 'cta-link'
    : 'inline-block border border-background bg-background px-10 py-4 font-serif text-lg text-accent shadow-none transition-all duration-200 hover:bg-transparent hover:text-background hover:shadow-elevated';

  return (
    <div className={`${surface} p-6 sm:p-8 md:p-12 shadow-elevated`}>
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_auto] gap-5 md:gap-10 items-center">
        <div>
          <h2 id={headingId} className={`font-serif text-heading ${headingClass}`}>
            {heading}
          </h2>
          {/*
            While the settings request is in flight the sentence would otherwise
            flash the closed copy and then swap. A neutral placeholder of the
            same height holds the space instead, so nothing shifts.
          */}
          {isLoading ? (
            <p className={`font-body text-body-lg mt-4 max-w-xl leading-relaxed ${bodyClass} opacity-0`} aria-hidden>
              {closedBody}
            </p>
          ) : (
            <>
              <p className={`font-body text-body mt-3 max-w-xl leading-relaxed sm:text-body-lg md:mt-4 ${bodyClass}`}>
                {body}
              </p>
              {!applicationsOpen && (
                <p className={`font-body text-sm mt-3 max-w-xl leading-relaxed sm:text-body ${bodyClass}`}>
                  {JOIN_STATUS_COPY.closedInvitation}
                </p>
              )}
            </>
          )}
        </div>

        <div className="md:justify-self-end">
          <Link to={action.to} className={buttonClass}>
            {action.label}
          </Link>
          {!applicationsOpen && !isLoading && (
            <p className="mt-4 md:text-right">
              <Link
                to="/contacts"
                className={`font-body text-sm underline-offset-4 hover:underline ${
                  light ? 'text-muted-foreground' : 'text-background/75'
                }`}
              >
                {JOIN_STATUS_COPY.contactLabel}
              </Link>
            </p>
          )}
        </div>
      </div>

      {isFullAccess && !isLoading && !isConfigured && (
        <p
          className={`font-body text-sm mt-8 pt-5 border-t ${
            light ? 'border-separator text-muted-foreground' : 'border-background/25 text-background/80'
          }`}
        >
          Visible to administrators only. The application window is not
          configured, so this page is showing its closed state. Set the start
          and end dates in Workspace, Website, Applications.
        </p>
      )}
    </div>
  );
}

export default ApplicationCta;
