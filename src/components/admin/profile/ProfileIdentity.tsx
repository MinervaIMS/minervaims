import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { workspacePath } from '@/lib/workspace-nav';
import { StatusChip, type Tone } from '@/components/admin/profile/profile-ui';

// =====================================================================
// WHO THIS IS, ON EVERY PAGE OF MY PROFILE (Step 97B).
// ---------------------------------------------------------------------
// My Profile is three pages now, and the reader should never wonder
// whose they are on or what is waiting for them. So each page opens with
// the same band: the picture (or the initials), the name, the role and
// its division, the standing, and how long they have been a member. On
// its right, at most two things at a glance, each a way to the page that
// deals with it: how complete the profile is, and the semester
// commitment. A glance item that needs nothing says so quietly; one that
// needs an answer is the one that stands out.
//
// The page's own name is the level-one heading, for assistive technology;
// the band itself is the person, not a title.
// =====================================================================

export type ProfilePage = 'my-role' | 'my-membership' | 'my-commitment';

export const PROFILE_PAGE_LABEL: Record<ProfilePage, string> = {
  'my-role': 'Personal Information',
  'my-membership': 'Membership',
  'my-commitment': 'Commitment',
};

const STANDING: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'positive' },
  on_exchange: { label: 'On exchange', tone: 'accent' },
  one_semester_pause: { label: 'Semester of leave', tone: 'accent' },
  alumni: { label: 'Alumni', tone: 'neutral' },
  expelled: { label: 'Expelled', tone: 'negative' },
};

const COMMITMENT: Record<'pending' | 'confirmed' | 'declined', { label: string; tone: Tone }> = {
  pending: { label: 'Waiting for your answer', tone: 'waiting' },
  confirmed: { label: 'Confirmed', tone: 'positive' },
  declined: { label: 'Declined', tone: 'negative' },
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return `${first}${last}`.toUpperCase();
}

// The visible words are the accessible name: anything a sighted reader
// infers from the position is added for a screen reader in `sr-only`.
function Glance({ to, current, children }: { to: string; current: boolean; children: React.ReactNode }) {
  const cls = 'group flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-separator bg-background px-3 py-2 text-sm text-foreground';
  if (current) {
    return <div className={cls}>{children}</div>;
  }
  return (
    <Link
      to={to}
      className={`${cls} transition-colors hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
    >
      {children}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-accent" aria-hidden="true" />
    </Link>
  );
}

export function ProfileIdentity({
  page, name, email, roleText, divisionText, photoUrl, standing, memberSince, completeness, commitment,
}: {
  page: ProfilePage;
  /** First name and surname; empty for the association account. */
  name: string;
  email: string;
  roleText: string;
  divisionText: string | null;
  photoUrl: string | null;
  /** members.membership_status, when there is a member record. */
  standing: string | null;
  /** "Fall 2024", from the rosters, when known. */
  memberSince: string | null;
  /** Phone, photo and LinkedIn: how many of the three are there. Null for the association account. */
  completeness: { done: number; total: number } | null;
  /** The semester commitment, while a semester has one. */
  commitment: { semester: string; status: 'pending' | 'confirmed' | 'declined' } | null;
}) {
  const shownName = name || email || 'Your account';
  const standingInfo = standing ? STANDING[standing] : null;
  const complete = completeness && completeness.done >= completeness.total;

  return (
    <header className="mb-5 flex flex-col gap-4 rounded-xl border border-separator bg-background px-5 py-4 sm:px-6 md:flex-row md:items-center">
      <h1 className="sr-only">My Profile: {PROFILE_PAGE_LABEL[page]}</h1>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-separator bg-accent">
          {photoUrl
            ? <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            : <span className="flex h-full w-full items-center justify-center font-serif text-2xl text-accent-foreground" aria-hidden="true">{initialsOf(name) || 'M'}</span>}
        </div>
        <div className="min-w-0">
          <p className="truncate font-serif text-2xl leading-tight text-accent">{shownName}</p>
          <p className="mt-0.5 text-sm text-foreground">
            <span className="font-serif italic">{roleText}</span>
            {divisionText && <span className="text-muted-foreground"> · {divisionText}</span>}
          </p>
          {(standingInfo || memberSince) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {standingInfo && <StatusChip tone={standingInfo.tone}>{standingInfo.label}</StatusChip>}
              {memberSince && <span className="text-xs text-muted-foreground">Member since {memberSince}</span>}
            </div>
          )}
        </div>
      </div>

      {(completeness || commitment) && (
        <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end" aria-label="At a glance">
          {completeness && (
            <li>
              <Glance
                to={workspacePath('my-role', 'my-role')}
                current={page === 'my-role'}
              >
                {complete
                  ? <><CheckCircle2 className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /><span>Profile complete</span></>
                  : (
                    <>
                      <span className="flex gap-0.5" aria-hidden="true">
                        {Array.from({ length: completeness.total }, (_, i) => (
                          <span key={i} className={`h-1.5 w-4 rounded-full ${i < completeness.done ? 'bg-accent' : 'bg-separator'}`} />
                        ))}
                      </span>
                      <span>Profile <strong className="font-semibold">{completeness.done} of {completeness.total}</strong><span className="sr-only"> done</span></span>
                    </>
                  )}
              </Glance>
            </li>
          )}
          {commitment && (
            <li>
              <Glance
                to={`${workspacePath('my-role', 'my-commitment')}${commitment.status === 'pending' ? '?commitment=1' : ''}`}
                current={page === 'my-commitment'}
              >
                <span className="whitespace-nowrap"><span className="sr-only">Commitment for </span>{commitment.semester}<span className="sr-only">:</span></span>
                <StatusChip tone={COMMITMENT[commitment.status].tone}>{COMMITMENT[commitment.status].label}</StatusChip>
              </Glance>
            </li>
          )}
        </ul>
      )}
    </header>
  );
}
