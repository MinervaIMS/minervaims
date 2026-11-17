import { useEffect, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabel as composeRoleLabel, divisionLabels } from '@/lib/roles';
import { getMyMember, type MemberRow } from '@/lib/members-api';
import { getMyApplication, type ApplicationRow } from '@/lib/applications-api';
import { certificateStatus, downloadCertificate, type CertificateStatus } from '@/lib/certificate-api';
import { declarationSwitches, type DeclarationSwitches } from '@/lib/declarations-api';
import { myCareerHistory, myProjects, type CareerHistory, type MyProjects } from '@/lib/profile-api';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { useMyDeclarations } from '@/components/admin/CommitmentPanel';
import { ProfileCard } from '@/components/admin/profile/profile-ui';
import { ProfileIdentity, type ProfilePage } from '@/components/admin/profile/ProfileIdentity';
import { PersonalInformation, profileCompleteness } from '@/components/admin/profile/PersonalInformation';
import { MembershipPage, careerSemesters } from '@/components/admin/profile/MembershipPage';
import { CommitmentPage } from '@/components/admin/profile/CommitmentPage';
import { ApplicantProfile } from '@/components/admin/profile/ApplicantProfile';

// =====================================================================
// MY PROFILE.
// ---------------------------------------------------------------------
// For a member, three pages since Step 97B, each in the navigation under
// My Profile and each with its own address:
//
//   Personal Information  /workspace/my-profile/personal-information
//                         who you are, your role, where it leads
//   Membership            /workspace/my-profile/membership
//                         your semesters, your reports, your certificate
//   Commitment            /workspace/my-profile/commitment
//                         the semester commitment, what you signed, the
//                         one-association policy and the Statute
//
// One page held all of it until then, and with the commitment and the
// signatures added in Step 97 it had become a wall: nine cards competing
// for one screen, three of them scrolling inside themselves. Split by
// what the reader comes to do, each page has room to show its part
// properly, and the band at the top (ProfileIdentity) keeps the person,
// and what is waiting for them, in view on all three.
//
// THIS COMPONENT DRAWS ALL THREE, so moving between them keeps what has
// been read: the record, the certificate, the signatures and the
// semesters are fetched once, when My Profile is first opened.
//
// AN APPLICANT'S PROFILE IS UNCHANGED: one page, read-only, in four
// quarters, drawn below before anything of the member's.
// =====================================================================

export default function MyProfile({ page }: { page?: string | null }) {
  const { user, session } = useAuth();
  const { primaryRole, primaryDivision, isCandidate, canView } = useAccess();
  const { toast } = useToast();
  const current: ProfilePage = page === 'my-membership' || page === 'my-commitment' ? page : 'my-role';

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberRow | null>(null);
  const [candidateApp, setCandidateApp] = useState<ApplicationRow | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  // The membership certificate. Read on its own: if it cannot be read, its
  // card simply does not appear and the rest of the page is unaffected.
  const [certificate, setCertificate] = useState<CertificateStatus | null>(null);
  const [issuing, setIssuing] = useState(false);
  // Step 97: the semester commitment and the member's signed documents.
  const { data: declarations, reload: reloadDeclarations } = useMyDeclarations();
  // Step 97B: the declaration's switches, the semesters and the reports.
  const [switches, setSwitches] = useState<DeclarationSwitches | null>(null);
  const [history, setHistory] = useState<CareerHistory | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [projects, setProjects] = useState<MyProjects | null>(null);
  const [projectsError, setProjectsError] = useState(false);

  const roleText = primaryRole ? composeRoleLabel(primaryRole, primaryDivision) : isCandidate ? 'Candidate' : 'No role';
  const divisionText = primaryDivision && primaryDivision !== 'none' ? divisionLabels[primaryDivision] : 'Board';
  const email = member?.email || user?.email || '';

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getMyMember(session);
        if (!active) return;
        setMember(res.member);
        setPhotoUrl(res.member?.photo_url ?? null);
        // Candidates have no member record; load their application to complete
        // the profile (name, LinkedIn, phone, etc.).
        if (!res.member && isCandidate) {
          try { const app = await getMyApplication(); if (active) setCandidateApp(app); } catch { /* ignore */ }
        }
      } catch (e) {
        console.error(e);
        toast({ title: 'Could not load your profile', variant: 'destructive' });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session, toast, isCandidate]);

  // Everything else a member's pages read, each on its own: one that fails
  // leaves its own card explaining so, and nothing else.
  useEffect(() => {
    let active = true;
    if (isCandidate) return;
    certificateStatus(session)
      .then((s) => { if (active) setCertificate(s); })
      .catch((e) => console.error('Could not read the membership certificate', e));
    declarationSwitches()
      .then((s) => { if (active) setSwitches(s); })
      .catch(() => { /* the policy card stays hidden */ });
    myCareerHistory()
      .then((h) => { if (active) setHistory(h); })
      .catch(() => { if (active) setHistoryError(true); });
    myProjects()
      .then((p) => { if (active) setProjects(p); })
      .catch(() => { if (active) setProjectsError(true); });
    return () => { active = false; };
  }, [session, isCandidate]);

  const handleCertificate = async () => {
    setIssuing(true);
    try {
      const issued = await downloadCertificate(session);
      setCertificate((c) => (c ? { ...c, certificate: issued } : c));
      toast({ title: 'Certificate downloaded', description: `Certificate ${issued.code}, ${issued.semester_label}.` });
    } catch (e) {
      toast({ title: 'Could not prepare the certificate', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setIssuing(false);
    }
  };

  if (loading) {
    return <div><WorkspacePageHeader title="My profile" description="Your account details and current workspace role." /><WorkspaceLoader /></div>;
  }

  // Candidate profile: no member record yet, populated from the application.
  //
  // THIS IS WHERE AN APPLICANT'S OWN SUBMISSION LIVES NOW. The documents and
  // the division preferences used to sit inside Applications, Status, which is
  // the page about what happens NEXT; what a candidate SENT belongs to their
  // profile. Status keeps the process, this page keeps the submission, and
  // neither repeats the other.
  //
  // Three plain groups, in the order a candidate thinks about them: who they
  // are, what they asked for, and what they attached. Everything is read from
  // their own application - `getMyApplication` resolves it from the session
  // and takes no id - so no candidate can address another's record.
  if (isCandidate) {
    const app = candidateApp;
    // =================================================================
    // THE APPLICANT'S PROFILE IS THE MEMBER'S PROFILE, IN FOUR QUARTERS.
    // -----------------------------------------------------------------
    // It used to be three stacked headings and a rule on a plain page,
    // which is a different piece of design from the card composition
    // every member sees on the same route. An applicant meets this page
    // before they meet anything else in the workspace, and it should not
    // be the one page that looks like it belongs to another product.
    //
    // So: the same `ProfileCard`, the same rounded rectangle, the same
    // ten-column grid arithmetic, arranged as four quarters.
    //
    //   Your details      |  Your documents
    //   Your application  |  Applicant info
    //
    // The two on the left are what the applicant IS and what they ASKED
    // FOR; the two on the right are what they ATTACHED and what happens
    // next. `lg:items-stretch` with `lg:h-full` is what makes the four
    // genuinely equal quarters rather than four boxes of ragged height,
    // and `scrollBody` lets a long list inside one of them scroll rather
    // than lengthen the page, exactly as the member cards do.
    // =================================================================
    return <ApplicantProfile app={app} email={email} session={session} />;
  }

  // ===================================================================
  // MEMBER PROFILE. Everything below this line is the NON-CANDIDATE
  // page: the candidate branch above returned already, so a candidate
  // can never reach these pages. The distinction is made on the access
  // hook's `isCandidate`, which reads the role, not on any visual test.
  // ===================================================================

  const semesters = careerSemesters(history);
  const memberSince = semesters.length ? semesters[semesters.length - 1].label : null;
  const commitment = declarations?.campaign && declarations.request
    ? { semester: declarations.campaign.semester_label, status: declarations.request.status }
    : null;
  const fullName = member ? `${member.first_name} ${member.surname}`.trim() : '';

  return (
    <div className="font-body">
      <ProfileIdentity
        page={current}
        name={fullName}
        email={email}
        roleText={roleText}
        divisionText={member || primaryDivision ? divisionText : null}
        photoUrl={photoUrl}
        standing={member?.membership_status ?? null}
        memberSince={memberSince}
        completeness={profileCompleteness(member, photoUrl)}
        commitment={commitment}
      />

      {current === 'my-role' && (
        <PersonalInformation
          member={member}
          onMemberChange={(m) => { setMember(m); setPhotoUrl(m.photo_url ?? null); }}
          photoUrl={photoUrl}
          onPhotoChange={setPhotoUrl}
          email={email}
          roleText={roleText}
          divisionText={divisionText}
          primaryRole={primaryRole}
          careerHints={canView('career-linkedin')}
          semestersServed={history ? semesters.length : null}
        />
      )}
      {current === 'my-membership' && (
        <MembershipPage
          history={history}
          historyError={historyError}
          projects={projects}
          projectsError={projectsError}
          certificate={certificate}
          onCertificate={handleCertificate}
          issuing={issuing}
          canUpload={canView('reports-upload')}
          canSeeRosters={canView('people-rosters')}
        />
      )}
      {current === 'my-commitment' && (
        <CommitmentPage data={declarations} onDone={reloadDeclarations} switches={switches} canSign={!!member} />
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Activity across the workspace is recorded for accountability and security.
      </p>
    </div>
  );
}
