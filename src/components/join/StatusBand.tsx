import { Link } from 'react-router-dom';
import type { ApplicationSettings } from '@/hooks/useApplicationSettings';
import { AdminNotice } from './AdminNotice';

// =====================================================================
// Status band.
//
// Two states, open and closed, of identical visual weight: closed is a
// designed state, not an apology, and never a dead end. Both the band
// under the hero and the closing band render from this one component and
// the same settings object, so they can never disagree.
//
// The open branch links to /apply. The closed branch keeps a quiet route
// to the contacts page, so there is always somewhere to go, which is what
// the old page lacked whenever the settings row was missing.
// =====================================================================

interface Props {
  settings: ApplicationSettings;
  isLoading: boolean;
  /**
   * The closed sentence differs slightly between the two placements, so
   * each caller passes its own.
   */
  closedLine: string;
  /** The band under the hero carries the accessible section name. */
  headingId: string;
}

export function StatusBand({ settings, isLoading, closedLine, headingId }: Props) {
  const { applicationsOpen, semesterLabel, deadlineDate, deadlineTime } = settings;

  // The deadline sentence only makes sense with a real date and time. With
  // the window half filled in, fall back to the semester alone rather than
  // printing an empty token into the sentence.
  const openLine =
    deadlineDate && deadlineTime
      ? `Applications for ${semesterLabel} close on ${deadlineDate} at ${deadlineTime} CET.`
      : `Applications for ${semesterLabel} are open.`;

  return (
    <div className="container py-16 md:py-20">
      <div className="max-w-3xl">
        {isLoading ? (
          // Neutral placeholder: never announce a state we do not yet know.
          <div aria-hidden className="space-y-4">
            <div className="h-7 w-56" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div className="h-5 w-full max-w-xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        ) : (
          <>
            <h2
              id={headingId}
              className="font-serif text-2xl md:text-3xl leading-tight"
              style={{ color: 'var(--join-ink)' }}
            >
              {applicationsOpen ? 'Applications open' : 'Applications closed'}
            </h2>

            <p className="font-body text-body-lg mt-4" style={{ color: 'var(--join-body)' }}>
              {applicationsOpen ? openLine : closedLine}
            </p>

            <div className="mt-8">
              {applicationsOpen ? (
                <a href="/apply" className="join-cta">
                  Apply <span className="join-cta-arrow" aria-hidden>&rarr;</span>
                </a>
              ) : (
                <Link to="/contacts" className="join-link">
                  Contact Us <span aria-hidden>&rarr;</span>
                </Link>
              )}
            </div>
          </>
        )}

        {settings.isDegraded && settings.degradedReason && (
          <AdminNotice message={settings.degradedReason} />
        )}
      </div>
    </div>
  );
}

export default StatusBand;
