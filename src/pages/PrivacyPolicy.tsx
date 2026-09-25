import { Seo } from '@/components/shared/Seo';
import { LegalLayout, LegalSectionBlock, type LegalSection } from '@/components/shared';

// =====================================================================
// Privacy Policy (GDPR information notice under articles 13 and 14).
// Drafted for an Italian unrecognised association (articles 36 to 38 of
// the Italian Civil Code) operated by Bocconi University students.
//
// Every statement describes what the website and the Workspace actually
// do, as audited in September 2026 (step 73). In particular: who is added
// to the newsletter and on what basis, the public alumni directory and
// the fields it shows, the notice for alumni data taken from LinkedIn,
// and the retention periods. If the system changes, change this text in
// the same release.
// =====================================================================

const sections: LegalSection[] = [
  { id: 'who-we-are', title: '1. Who We Are' },
  { id: 'controller', title: '2. Data Controller and Contact' },
  { id: 'scope', title: '3. Scope of This Notice' },
  { id: 'data-collected', title: '4. Personal Data We Process' },
  { id: 'legal-bases', title: '5. Purposes and Legal Bases' },
  { id: 'newsletter', title: '6. Newsletter and Emails' },
  { id: 'applications', title: '7. Membership Applications' },
  { id: 'members', title: '8. Members and the Workspace' },
  { id: 'public-profiles', title: '9. Public Profiles and Photographs' },
  { id: 'alumni', title: '10. Alumni' },
  { id: 'sources', title: '11. Data Not Obtained from You (Art. 14)' },
  { id: 'cookies', title: '12. Cookies' },
  { id: 'sharing', title: '13. Recipients and Processors' },
  { id: 'transfers', title: '14. International Transfers' },
  { id: 'retention', title: '15. Data Retention' },
  { id: 'security', title: '16. Security' },
  { id: 'rights', title: '17. Your Rights' },
  { id: 'complaints', title: '18. Complaints to the Garante' },
  { id: 'children', title: '19. Minors' },
  { id: 'changes', title: '20. Changes to This Notice' },
];

const PrivacyPolicy = () => (
  <>
    <Seo page="/privacy-policy" />
    <LegalLayout
      title="Privacy Policy"
      description="How we collect, use and protect personal data, in line with the GDPR and Italian data protection law."
      lastUpdated="September 25th, 2026"
      currentId="privacy"
      sections={sections}
    >
      <LegalSectionBlock id="who-we-are" number="01" title="Who We Are">
        <p>
          Minerva Investment Management Society ("MIMS", "we", "us", "our") is a student society organised as an
          unrecognised association under articles 36 to 38 of the Italian Civil Code, formed and run by students of
          Università Bocconi in Milan, Italy, and operating within the framework of the Bocconi student association
          system. MIMS acts through its governing bodies as identified in its Statute, available on this website.
        </p>
        <p>
          This website is operated by MIMS and is independent from Università Bocconi: the University does not
          operate, review or approve this website and is not a controller of the personal data processed through it.
          Where MIMS activities take place within University programmes or premises, the University may process
          related data under its own policies, which are separate from this notice.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="controller" number="02" title="Data Controller and Contact">
        <p>
          The data controller is Minerva Investment Management Society, an unrecognised association based in Milan,
          Italy, at Università Bocconi. For every matter concerning personal data you can write to{' '}
          <a href="mailto:as.minerva@unibocconi.it">as.minerva@unibocconi.it</a>. This mailbox is monitored by the
          association's board, which acts on behalf of the association in data protection matters.
        </p>
        <p>
          MIMS is not required to appoint a data protection officer under article 37 GDPR, given the nature, scope
          and scale of its processing, and has not appointed one. The board keeps an internal record of processing
          activities (article 30 GDPR) and a register of the service providers that process personal data on our
          behalf, reviews both at least once a year and whenever the association's activities change, and makes the
          record available to the Garante on request.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="scope" number="03" title="Scope of This Notice">
        <p>
          This notice covers personal data processed through the public website (including the application form, the
          newsletter form, event registration forms and the public alumni directory), through the reserved area of
          the website (the "Workspace") used by members, advisors, alumni and applicants, through the emails we send,
          and through direct correspondence with the association. It also contains the notice required by article 14
          GDPR for data we obtain from sources other than you (section 11). It does not cover processing carried out
          by Università Bocconi, by social networks on which the association has profiles, by the providers of the
          video-call services used for interviews, or by external websites we link to, which act under their own
          policies.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="data-collected" number="04" title="Personal Data We Process">
        <p>We process only the data needed for each activity:</p>
        <ul>
          <li>
            <strong>Newsletter:</strong> email address, date and source of the subscription (for example the
            footer form, a membership application or an event registration) and, if you unsubscribe, a suppression
            record.
          </li>
          <li>
            <strong>Membership applications:</strong> name and surname, email address, telephone number, Bocconi
            student identifier, academic year and study programme, LinkedIn profile where provided, curriculum
            vitae, written answers, division preferences, interview bookings and outcomes, shared evaluation notes,
            the status of the application through the selection process and, for successful candidates, the offer.
          </li>
          <li>
            <strong>Event registrations and attendance:</strong> name, email address and, where relevant, whether you
            are a Bocconi student and your programme, affiliation, whether you attended, and a record of the
            registration reminders sent for the event.
          </li>
          <li>
            <strong>Members:</strong> identification and contact details, division and role, membership status and
            history, membership fee records, photograph where provided, LinkedIn profile, and the semester registers
            of members.
          </li>
          <li>
            <strong>Alumni:</strong> name and surname, graduation year, current employer, job area, city and LinkedIn
            profile address, used for the alumni directory and alumni initiatives (section 10); and, for alumni who
            agree to give one, a testimonial with their name and role.
          </li>
          <li>
            <strong>Workspace accounts:</strong> authentication data (handled by our infrastructure provider; we
            never see or store passwords in readable form), role assignments and an activity log of actions
            performed in the Workspace (who did what, where and when), kept for security and accountability.
          </li>
          <li>
            <strong>Technical data:</strong> data generated by visiting the website, such as IP address, browser
            type and requested pages, processed in server logs by our providers for security and delivery; for the
            Payoff Lab calculator only, the IP address is stored for a few minutes to limit abusive use; plus the
            technical storage items described in the <a href="/cookie-policy">Cookie Policy</a>.
          </li>
          <li>
            <strong>Emails we send:</strong> a record of each automatic email (recipient, type of email, time and
            delivery status), kept to prove delivery, prevent duplicates and honour unsubscribe requests.
          </li>
          <li>
            <strong>Correspondence:</strong> anything you choose to send to our email addresses.
          </li>
        </ul>
        <p>
          We do not request special categories of personal data (article 9 GDPR). Please do not include such data in
          CVs, written answers or messages; if it is nonetheless received, we do not use it in the selection process
          and we delete it where feasible.
        </p>
        <p>
          Providing the data marked as required in a form is necessary to take part in the process concerned (for
          example, an application cannot be assessed without a CV); everything else is optional. No decision about
          you is taken solely by automated means, including profiling, within the meaning of article 22 GDPR.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="legal-bases" number="05" title="Purposes and Legal Bases">
        <ul>
          <li>
            <strong>Running the selection process</strong> (receiving applications, screening, interviews, offers):
            steps taken at your request before joining, article 6(1)(b) GDPR; the shared evaluation notes of
            reviewers rest on our legitimate interest in a fair and documented selection, article 6(1)(f).
          </li>
          <li>
            <strong>Managing membership</strong> (member records, roles, divisions, fee collection, semester member
            registers, governance, internal communications and event reminders to members): performance of the
            association relationship under the Statute, article 6(1)(b); for accounting entries, legal obligations
            where applicable, article 6(1)(c), and legitimate interest in orderly administration, article 6(1)(f).
          </li>
          <li>
            <strong>Event management</strong> (registration, reminders, attendance): measures you request when
            registering, article 6(1)(b), and legitimate interest in organising events well and safely, article
            6(1)(f).
          </li>
          <li>
            <strong>Newsletter:</strong> your consent, article 6(1)(a), when you subscribe through a newsletter form;
            for applicants, members, alumni and event participants, our legitimate interest in keeping people who
            have taken part in the association's activities informed about similar activities, article 6(1)(f) and
            article 130(4) of the Italian Privacy Code, with the right to object at any time (section 6).
          </li>
          <li>
            <strong>Public team pages</strong> (name, role and division of members who hold a public role):
            legitimate interest in presenting the association's governing bodies and teams, article 6(1)(f).
            <strong> Photographs:</strong> consent, article 6(1)(a) (section 9).
          </li>
          <li>
            <strong>Alumni relationship</strong> (alumni directory in the Workspace, alumni calls, invitations to
            association events concerning alumni): legitimate interest in maintaining the association's alumni
            network, article 6(1)(f). <strong>Public alumni directory:</strong> legitimate interest in showing the
            association's network to prospective members and partners, article 6(1)(f), limited to professional
            information (section 10). <strong>Testimonials:</strong> consent, article 6(1)(a).
          </li>
          <li>
            <strong>Security and accountability</strong> (server logs, Workspace activity log, access control, abuse
            prevention): legitimate interest in protecting the website, the Workspace, association assets and
            members, article 6(1)(f).
          </li>
          <li>
            <strong>Technical storage on your device:</strong> strictly necessary items do not require consent under
            article 122 of the Italian Privacy Code; any non-essential category requires consent through the cookie
            banner.
          </li>
          <li>
            <strong>Establishment, exercise or defence of legal claims:</strong> legitimate interest, article
            6(1)(f).
          </li>
        </ul>
        <p>
          Where we rely on legitimate interest, we have balanced it against your rights and expectations, taking into
          account your relationship with the association, and you can object at any time (section 17). Where we rely
          on consent, you can withdraw it at any time without affecting processing carried out before.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="newsletter" number="06" title="Newsletter and Email Communications">
        <p>
          The newsletter informs about the association's own publications, events, recruitment rounds and
          initiatives. It reaches two groups of people:
        </p>
        <ul>
          <li>
            <strong>People who subscribe</strong> through the newsletter form in the website footer or on the Events
            page. Subscribing is voluntary, requires only an email address and is based on your consent.
          </li>
          <li>
            <strong>People who have taken part in the association's activities:</strong> when you apply for
            membership, become a member (the address stays on the list when you later become an alumnus, until you
            unsubscribe), or register for or attend an event as a guest, the email address you gave us is added to
            the newsletter. We do this on the basis
            of our legitimate interest and article 130(4) of the Italian Privacy Code, only for communications about
            the association's own activities of the same kind as those you took part in, and you can object at any
            time, free of charge, with the unsubscribe link in every newsletter or by writing to{' '}
            <a href="mailto:as.minerva@unibocconi.it">as.minerva@unibocconi.it</a>. If you prefer not to receive
            the newsletter from the start, write to us when you apply or register and we will not add you.
          </li>
        </ul>
        <p>
          Unsubscribing is immediate. We keep a suppression record of unsubscribed addresses solely to make sure we
          do not contact them again. We do not use the newsletter list for third-party advertising, we do not sell or
          rent it, we do not share it with sponsors or partners, and we do not combine it with tracking profiles.
          Requests for sponsorship, donations or other support, if the association ever makes them by email, will be
          sent only to people who have given specific consent to receive them.
        </p>
        <p>
          Transactional emails (application confirmations, interview invitations, offer notifications, event
          registration confirmations and reminders to members, membership fee notices, account emails) are sent
          because they are necessary for the process or the membership concerned and do not depend on the newsletter.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="applications" number="07" title="Membership Applications">
        <p>
          Application data is visible only to the association members involved in the selection process, under
          role-based access controls enforced in the Workspace and in the database. Reviewers may record shared
          evaluation notes. CVs and written answers are stored in a private storage area and opened only through
          links that expire after a short time.
        </p>
        <p>
          Interviews are held online. The interview slot you book carries a Microsoft Teams or Zoom meeting link; the
          meeting itself takes place on that service, which processes your participation under its own terms and
          privacy policy. We do not record interviews.
        </p>
        <p>
          If your application is not successful, or you withdraw it, we keep it only for the periods set out in
          section 15 and you may request earlier deletion at any time. Every decision on an application is taken by
          people; no automated decision-making is involved.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="members" number="08" title="Members and the Workspace">
        <p>
          When you become a member, your data is processed to run the association: directories, role assignments,
          division work, event organisation, membership fee administration and governance. At the close of each
          semester's fee collection the association freezes a register of that semester's members, kept as the
          historical record of the association's composition (section 15).
        </p>
        <p>
          Members who hold a role in the Workspace can see the personal data of applicants, members and alumni only
          as far as their role requires. They act as persons authorised by the association under article 29 GDPR and
          article 2-quaterdecies of the Italian Privacy Code, and are bound by the confidentiality rules in the{' '}
          <a href="/terms-of-use">Terms of Use</a>.
        </p>
        <p>
          Actions performed inside the Workspace are recorded in an activity log (author, role held at the time,
          action, affected item, timestamp) used for accountability and security. Users are informed of this inside
          the Workspace; the log is visible only to roles with the corresponding permission.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="public-profiles" number="09" title="Public Profiles and Photographs">
        <p>
          The public website shows the name, position, division or fund and, where provided, the LinkedIn profile of
          members who hold a public role in the association (for example on the team page), on the basis of our
          legitimate interest in presenting the people who run it. Members can object, in which case their public
          profile is removed or limited.
        </p>
        <p>
          A member's photograph is published only with that member's consent, given when the photograph is provided
          for publication. Consent can be withdrawn at any time by writing to us: the photograph is then taken off
          the public website. When a member's public role ends, their public profile and photograph are removed from
          the current team pages.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="alumni" number="10" title="Alumni">
        <p>
          We distinguish between two kinds of processing concerning alumni:
        </p>
        <ul>
          <li>
            <strong>Alumni relationship:</strong> keeping the alumni directory, organising alumni calls with members,
            and inviting alumni to association events that concern them. This rests on our legitimate interest in
            maintaining the association's network, and alumni may object at any time.
          </li>
          <li>
            <strong>Communications of a promotional nature:</strong> the newsletter, sent as described in section 6
            with the right to object at any time; and any request for sponsorship, donations or other support, which
            we send only with specific consent. Alumni data is never shared with sponsors or partners for their own
            purposes.
          </li>
        </ul>
        <p>
          <strong>The public alumni directory.</strong> The Alumni page of the website shows to any visitor up to one
          hundred alumni, ordered by graduation year, with name and surname, graduation year, current employer, job
          area, city and a link to their public LinkedIn profile, together with aggregate figures for the whole
          directory. Members with access to the alumni section of the Workspace can consult the complete directory. The directory
          contains no email address, telephone number or other contact details. It rests on our legitimate interest in
          showing prospective members and partners where the association's alumni work; we limit it to professional
          information that alumni have made public themselves and that is relevant to that purpose. Any alumnus can
          ask to be removed from the public page or from the directory altogether by writing to{' '}
          <a href="mailto:as.minerva@unibocconi.it">as.minerva@unibocconi.it</a>; we act on such a request without
          delay and in any case within one month.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="sources" number="11" title="Data Not Obtained from You (Article 14 GDPR)">
        <p>
          This section is the information notice required by article 14 GDPR for alumni data we record without
          collecting it from the alumnus directly.
        </p>
        <ul>
          <li>
            <strong>Controller and contact:</strong> as in section 2.
          </li>
          <li>
            <strong>Categories of data:</strong> name and surname, graduation year, current employer, job area, city
            and the address of the public LinkedIn profile.
          </li>
          <li>
            <strong>Source:</strong> publicly accessible professional profiles, in particular LinkedIn, and the
            association's own membership records. Members of the association with the relevant role update the
            directory by hand; no automated collection (scraping) is used.
          </li>
          <li>
            <strong>Purposes and legal basis:</strong> keeping the alumni directory accurate, organising the alumni
            relationship and the public alumni directory described in section 10, on the basis of our legitimate
            interest, article 6(1)(f) GDPR.
          </li>
          <li>
            <strong>Recipients:</strong> members with access to the alumni section of the Workspace; any visitor of the
            website for the fields shown on the public Alumni page; the providers listed in section 13.
          </li>
          <li>
            <strong>Retention:</strong> as long as the alumnus remains in the directory; the entry is reviewed at
            least every twenty-four months, and data that is no longer accurate is corrected or removed (section 15).
          </li>
          <li>
            <strong>Your rights:</strong> all the rights in section 17, and in particular the right to object at any
            time, after which the entry is removed from the public page or, if you ask, from the directory, keeping
            only your name and membership history in the association's historical records.
          </li>
        </ul>
        <p>
          We hold no email address or other contact details for most alumni in the directory, so giving this
          information to each of them individually would involve a disproportionate effort. For this reason, as
          allowed by article 14(5)(b) GDPR, we make it publicly available here. Whenever we do contact an alumnus, at
          the latest in the first communication we refer them to this notice, as required by article 14(3)(b) GDPR.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="cookies" number="12" title="Cookies and Similar Technologies">
        <p>
          The website uses only strictly necessary technical storage items, set by the website itself, which do not
          require consent. It sets no analytics, advertising or profiling cookies and loads no third-party tracking
          services. The consent banner reserves further categories (preferences, analytics, external media) that are
          not in use today and would load only with your prior consent, in line with the Garante's Guidelines on
          cookies of 10 June 2021 and article 122 of the Italian Privacy Code. The full list of items, and how to
          change your choices at any time, is in the <a href="/cookie-policy">Cookie Policy</a>.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="sharing" number="13" title="Recipients and Processors">
        <p>Personal data is shared only with:</p>
        <ul>
          <li>
            <strong>Service providers acting as processors</strong> under article 28 GDPR terms: Lovable, the platform
            on which the website is built and hosted, which also provides the managed backend and the delivery of the
            association's automatic emails; and, as Lovable's sub-processors, the infrastructure providers it relies
            on, including Supabase for the database, authentication and file storage. The current list of processors
            and sub-processors is kept in the association's register of processors and is available on request.
          </li>
          <li>
            <strong>Video-call providers</strong> (Microsoft Teams or Zoom), only for the interviews you book, under
            their own terms.
          </li>
          <li>
            <strong>Association members with a need to know,</strong> under role-based access controls (for example,
            only members involved in recruiting can access applications).
          </li>
          <li>
            <strong>Visitors of the website,</strong> only for the information published on the public team pages
            and the public alumni directory (sections 9 and 10).
          </li>
          <li>
            <strong>Università Bocconi and its student association bodies,</strong> only where required by the
            University regulations governing recognised student associations (for example lists connected to the use
            of University spaces or benefits).
          </li>
          <li>
            <strong>Authorities,</strong> where disclosure is required by law.
          </li>
        </ul>
        <p>We do not sell personal data and we do not share it with advertisers, sponsors or partners.</p>
      </LegalSectionBlock>

      <LegalSectionBlock id="transfers" number="14" title="International Transfers">
        <p>
          Our providers may process data on servers outside the European Economic Area, in particular in the United
          States. Where that happens, transfers rely on a European Commission adequacy decision (including the EU-US
          Data Privacy Framework where the provider is certified) or on Standard Contractual Clauses with
          supplementary measures. The data processing agreements with our providers and their transfer mechanisms are
          recorded in the association's register of processors; you can request information on the applicable
          safeguards by contacting us.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="retention" number="15" title="Data Retention">
        <p>We keep personal data only for as long as each purpose requires:</p>
        <ul>
          <li>
            <strong>Unsuccessful, withdrawn or declined applications:</strong> CV and written answers are deleted six
            months after the end of the selection round; the rest of the application file (identity and contact
            details, interview records, evaluation notes and outcome) is deleted twelve months after the end of the
            round, keeping only anonymous statistics. Earlier deletion is available on request.
          </li>
          <li>
            <strong>Successful applications:</strong> the details needed for membership move to the member record;
            the CV and written answers are deleted twelve months after joining.
          </li>
          <li>
            <strong>Current members:</strong> for the duration of membership.
          </li>
          <li>
            <strong>Former members:</strong> telephone number, contact details and the Workspace account are deleted
            within twelve months of the end of membership, unless the person continues as an alumnus in the Workspace;
            the public profile and photograph are removed from the current team pages when the public role ends, and
            photographs are deleted within six months unless the person agrees to their use in the association's
            history pages. Name, role, division and semesters of membership, as recorded in the semester registers and
            governance records, are kept for the life of the association as its historical record.
          </li>
          <li>
            <strong>Expelled members:</strong> the account and member record are deleted thirty days after the
            expulsion, except the governance and accounting records that must be kept.
          </li>
          <li>
            <strong>Membership fee, accounting and treasury records:</strong> ten years, consistent with article 2220
            of the Italian Civil Code applied by analogy.
          </li>
          <li>
            <strong>Alumni directory:</strong> as long as the alumnus remains in the directory, with a review of each
            entry at least every twenty-four months; removed on objection (sections 10 and 11).
          </li>
          <li>
            <strong>Event registrations and attendance:</strong> twelve months after the event, unless connected to
            accounting records; aggregate figures (such as the number of attendees) are kept without names.
          </li>
          <li>
            <strong>Newsletter:</strong> until you unsubscribe or object, plus a permanent suppression record to honour
            the request.
          </li>
          <li>
            <strong>Records of automatic emails sent:</strong> twelve months.
          </li>
          <li>
            <strong>Workspace activity log:</strong> twelve months at most; the log also deletes its oldest entries
            automatically once it exceeds five thousand entries.
          </li>
          <li>
            <strong>Payoff Lab abuse-prevention record</strong> (IP address): a few minutes.
          </li>
          <li>
            <strong>Provider server and security logs:</strong> per the providers' standard, short, retention.
          </li>
        </ul>
        <p>
          Where a legal claim or investigation requires it, specific data may be kept for the additional time strictly
          needed. The board checks at least every six months that data past these periods has been deleted.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="security" number="16" title="Security">
        <p>
          We apply appropriate technical and organisational measures: encrypted connections (HTTPS), authenticated
          access to the Workspace, role-based permissions enforced at the interface, in the server functions and at
          the database level (row level security), administrative keys kept only on the server and never in the
          browser, private storage for application documents with time-limited links, activity logging, separation
          between the public website and the reserved area, and providers with established security programmes. No
          system is perfectly secure; if a breach likely to result in a risk to your rights occurs, we will notify the
          Garante within seventy-two hours of becoming aware of it and, where required, the persons concerned, in line
          with articles 33 and 34 GDPR, and we record every breach internally.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="rights" number="17" title="Your Rights">
        <p>
          Under articles 15 to 22 GDPR you have the right to access your data, obtain rectification or erasure,
          restrict processing, receive your data in a portable format where processing is based on consent or
          contract, object to processing based on legitimate interest (including the newsletter, the public team
          pages and the alumni directory), and withdraw consent at any time without affecting prior processing. To
          exercise any right, write to <a href="mailto:as.minerva@unibocconi.it">as.minerva@unibocconi.it</a>. We
          respond within one month, extendable by two further months for complex requests, as allowed by article 12
          GDPR. We may ask you to confirm your identity before acting on a request.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="complaints" number="18" title="Complaints to the Garante">
        <p>
          If you believe your data is processed in breach of the law, you may lodge a complaint with the Italian
          supervisory authority, the Garante per la protezione dei dati personali, Piazza Venezia 11, 00187 Rome,{' '}
          <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">www.garanteprivacy.it</a>,
          or bring proceedings before the competent court. We would appreciate the chance to address your concern
          first, but you are not required to contact us before complaining.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="children" number="19" title="Minors">
        <p>
          The website and the association's activities are directed at university students and adults. We do not
          knowingly collect data of children under sixteen. If you believe a minor's data has been provided to us,
          contact us and we will delete it.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="changes" number="20" title="Changes to This Notice">
        <p>
          We may update this notice as the association's activities or the law evolve. The date at the top reflects
          the latest revision; material changes will be highlighted on the website. This notice is provided in
          English for accessibility and is governed by Italian law.
        </p>
      </LegalSectionBlock>
    </LegalLayout>
  </>
);

export default PrivacyPolicy;
