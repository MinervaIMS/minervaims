// =====================================================================
// THE APPLICANT'S OWN PROFILE (Step 106: moved out of MyProfile.tsx,
// unchanged, so that Recruiting, Applicant Preview draws the very same
// page with its sample applicant).
// ---------------------------------------------------------------------
// What the applicant told us, what they attached, what they asked for and
// where to go next, in four quarters. Everything is the applicant's own
// application; the documents are opened through `signMyDocument`, which
// resolves the application from the session (or, in the preview, opens
// the sample documents).
// =====================================================================
import type { Session } from '@supabase/supabase-js';
import { divisionLabels } from '@/lib/roles';
import { ACADEMIC_YEAR_LABELS, type ApplicationRow } from '@/lib/applications-api';
import { formatStamp } from '@/lib/event-time';
import { CandidateDocRow } from '@/components/admin/recruiting/CandidateDocRow';
import { Field, ProfileCard } from '@/components/admin/profile/profile-ui';

export function ApplicantProfile({ app, email, session }: {
  app: ApplicationRow | null;
  email: string;
  session: Session | null;
}) {
  return (
    <div className="font-body lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-2 lg:items-stretch">
        {/* Upper left. Who you are. */}
        <div className="min-w-0 flex lg:min-h-0">
          <ProfileCard title="Your details" scrollBody>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <Field label="First name" value={app?.first_name ?? ''} />
              <Field label="Surname" value={app?.surname ?? ''} />
              <Field label="Email" value={app?.email || email} />
              <Field label="Phone number" value={app?.phone ?? ''} />
              <Field label="Bocconi ID" value={app?.bocconi_id ?? ''} />
              <Field label="Role" value="Applicant" />
              <div className="sm:col-span-2">
                <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">LinkedIn</div>
                {app?.linkedin_url
                  ? <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-accent underline max-lg:inline-flex max-lg:min-h-11 max-lg:items-center">{app.linkedin_url}</a>
                  : <div className="text-sm text-foreground">Not set</div>}
              </div>
            </div>
          </ProfileCard>
        </div>

        {/* Upper right. What you attached. */}
        <div className="min-w-0 flex lg:min-h-0">
          <ProfileCard title="Your documents" scrollBody>
            <div className="space-y-2">
              <CandidateDocRow label="Curriculum Vitae (CV)" kind="cv" present={!!app?.cv_path} session={session} />
              <CandidateDocRow label="Written answer" kind="answer" present={!!app?.answer_path} session={session} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              You can preview and download what you submitted. Your application and its documents cannot be changed or replaced; if you need a correction, contact the association.
            </p>
          </ProfileCard>
        </div>

        {/* Lower left. What you asked for. Every value is shown in the
            words the website uses, never as a stored key. */}
        <div className="min-w-0 flex lg:min-h-0">
          <ProfileCard
            title="Your application"
            subtitle={app?.semester_label ?? undefined}
            scrollBody
          >
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <Field label="Programme" value={app?.degree_course ?? ''} />
              <Field label="Academic year" value={app ? ACADEMIC_YEAR_LABELS[app.academic_year] : ''} />
              <Field label="First choice division" value={app ? divisionLabels[app.first_choice] : ''} />
              <Field label="Second choice division" value={app?.second_choice ? divisionLabels[app.second_choice] : 'None'} />
              {app?.interview_division && (
                <Field label="Interview division" value={divisionLabels[app.interview_division]} />
              )}
              <Field label="Submitted" value={app ? formatStamp(app.created_at) : ''} />
            </div>
          </ProfileCard>
        </div>

        {/* Lower right. Where to go next. */}
        <div className="min-w-0 flex lg:min-h-0">
          <ProfileCard title="Applicant info" scrollBody>
            <div className="space-y-4 text-sm leading-relaxed text-foreground">
              <p>
                Your details above come from the form you submitted and cannot be edited here.
                They are what the selection team reads.
              </p>
              <div className="space-y-2.5">
                <div className="flex gap-3">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-accent" aria-hidden />
                  <span>Follow your application in <strong>My Application, Status</strong>.</span>
                </div>
                <div className="flex gap-3">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-accent" aria-hidden />
                  <span>If you are invited to interview, book your slot in <strong>My Application, Interview</strong>.</span>
                </div>
                <div className="flex gap-3">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-accent" aria-hidden />
                  <span>Questions about the process are answered in <strong>FAQs</strong>.</span>
                </div>
                <div className="flex gap-3">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-accent" aria-hidden />
                  <span>Once you accept an offer, this page becomes your full member profile.</span>
                </div>
              </div>
            </div>
          </ProfileCard>
        </div>
      </div>

      <p className="mt-4 shrink-0 text-center text-xs text-muted-foreground lg:mt-3">
        Activity across the workspace is recorded for accountability and security.
      </p>
    </div>
  );
}

export default ApplicantProfile;
