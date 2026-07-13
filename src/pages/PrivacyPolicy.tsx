import { Helmet } from 'react-helmet-async';
import { LegalLayout, LegalSectionBlock, type LegalSection } from '@/components/shared';

// =====================================================================
// Privacy Policy (GDPR information notice under articles 13 and 14).
// Drafted for an Italian unrecognised association (articles 36 to 38 of
// the Italian Civil Code) operated by Bocconi University students.
// Finalised text: every clause is stated definitively.
// =====================================================================

const sections: LegalSection[] = [
  { id: 'who-we-are', title: '1. Who We Are' },
  { id: 'controller', title: '2. Data Controller and Contact' },
  { id: 'scope', title: '3. Scope of This Notice' },
  { id: 'data-collected', title: '4. Personal Data We Collect' },
  { id: 'legal-bases', title: '5. Purposes and Legal Bases' },
  { id: 'newsletter', title: '6. Newsletter and Emails' },
  { id: 'applications', title: '7. Membership Applications' },
  { id: 'members', title: '8. Members, Alumni, Workspace' },
  { id: 'cookies', title: '9. Cookies' },
  { id: 'sharing', title: '10. Recipients and Processors' },
  { id: 'transfers', title: '11. International Transfers' },
  { id: 'retention', title: '12. Data Retention' },
  { id: 'security', title: '13. Security' },
  { id: 'rights', title: '14. Your Rights' },
  { id: 'complaints', title: '15. Complaints to the Garante' },
  { id: 'children', title: '16. Minors' },
  { id: 'sources', title: '17. Data Not Obtained from You' },
  { id: 'changes', title: '18. Changes to This Notice' },
];

const PrivacyPolicy = () => (
  <>
    <Helmet>
      <title>Privacy Policy | MIMS</title>
      <meta
        name="description"
        content="How Minerva Investment Management Society collects, uses and protects personal data, in line with the GDPR and Italian data protection law."
      />
    </Helmet>
    <LegalLayout
      title="Privacy Policy"
      description="How we collect, use and protect personal data, in line with the GDPR and Italian data protection law."
      lastUpdated="July 12th, 2026"
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
          and scale of its processing, and has not appointed one. The board reassesses this requirement whenever the
          association's processing activities change materially.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="scope" number="03" title="Scope of This Notice">
        <p>
          This notice covers personal data processed through the public website (including the application form, the
          newsletter and event registration forms), through the reserved area of the website (the "Workspace") used
          by members, advisors, alumni and applicants, and through direct correspondence with the association. It
          does not cover processing carried out by Università Bocconi, by social networks on which the association
          has profiles, or by external websites we link to.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="data-collected" number="04" title="Personal Data We Collect">
        <p>We collect only the data needed for each activity:</p>
        <ul>
          <li>
            <strong>Newsletter subscription:</strong> email address, subscription date and unsubscribe status.
          </li>
          <li>
            <strong>Membership applications:</strong> name and surname, email address, telephone number, Bocconi
            student identifier, academic year and study programme, LinkedIn profile where provided, curriculum
            vitae, written answers, division preferences, interview bookings and outcomes, shared evaluation notes,
            and the status of the application through the selection process.
          </li>
          <li>
            <strong>Event registrations:</strong> name, email address and, where relevant, whether you are a Bocconi
            student and your programme, together with attendance records.
          </li>
          <li>
            <strong>Members and alumni:</strong> identification and contact details, division and role, photograph
            where provided, LinkedIn profile, membership status and fee records and, for alumni, employer, role and
            city, used for the alumni directory and alumni initiatives.
          </li>
          <li>
            <strong>Workspace accounts:</strong> authentication data (handled by our infrastructure provider; we
            never see or store passwords in readable form), role assignments and an activity log of actions
            performed in the Workspace (who did what, where and when), kept for security and accountability.
          </li>
          <li>
            <strong>Technical data:</strong> data generated by visiting the website, such as IP address, browser
            type and requested pages, processed in server logs by our hosting providers for security and delivery,
            plus the cookies and local storage items described in the <a href="/cookie-policy">Cookie Policy</a>.
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
      </LegalSectionBlock>

      <LegalSectionBlock id="legal-bases" number="05" title="Purposes and Legal Bases">
        <ul>
          <li>
            <strong>Running the selection process</strong> (receiving applications, screening, interviews, offers):
            pre-contractual measures taken at your request, article 6(1)(b) GDPR.
          </li>
          <li>
            <strong>Managing membership</strong> (member records, roles, fee collection, semester member registers,
            governance): performance of the association relationship under the Statute, article 6(1)(b); for
            accounting entries, legitimate interest in orderly administration and, where applicable, legal
            obligations, article 6(1)(c).
          </li>
          <li>
            <strong>Newsletter and updates:</strong> consent, article 6(1)(a), given when you subscribe and
            withdrawable at any time.
          </li>
          <li>
            <strong>Event management:</strong> measures you request when registering, article 6(1)(b), and
            legitimate interest in organising events safely.
          </li>
          <li>
            <strong>Alumni relations:</strong> legitimate interest, article 6(1)(f), balanced by your right to
            object at any time.
          </li>
          <li>
            <strong>Security and accountability</strong> (server logs, Workspace activity log, access control):
            legitimate interest in protecting the website, the Workspace, association assets and members.
          </li>
          <li>
            <strong>Non-essential cookies:</strong> consent collected through the cookie banner.
          </li>
          <li>
            <strong>Establishment, exercise or defence of legal claims:</strong> legitimate interest.
          </li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock id="newsletter" number="06" title="Newsletter and Email Communications">
        <p>
          Subscribing to the newsletter is voluntary and requires only an email address. By subscribing you consent
          to receive periodic updates about the association's publications, events and initiatives. Every message
          contains an unsubscribe link; unsubscribing is immediate and free of charge. We keep a suppression record
          of unsubscribed addresses solely to make sure we do not contact them again.
        </p>
        <p>
          We do not use the newsletter list for third-party advertising, we do not sell or rent it, and we do not
          combine it with tracking profiles. Transactional emails (application confirmations, interview invitations,
          offer notifications, account emails) are sent because they are necessary for the process you are taking
          part in and do not depend on newsletter consent.
        </p>
        <p>
          Your consent takes effect when you submit your address, and we keep a timestamped record of the
          subscription as proof of consent. If you receive a message you did not request, use the unsubscribe link
          or write to us and we will remove the address and investigate.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="applications" number="07" title="Membership Applications">
        <p>
          Application data is visible only to the association members involved in the selection process, under
          role-based access controls enforced in the Workspace. Reviewers may record shared evaluation notes. If
          your application is not successful, we retain the application file for a limited period (see Data
          Retention) to document that the process was run correctly, to handle any repeat application and to defend
          against possible claims; you may request earlier deletion at any time.
        </p>
        <p>
          The selection process does not involve automated decision-making producing legal or similarly significant
          effects (article 22 GDPR): every decision on an application is taken by people.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="members" number="08" title="Members, Alumni and the Workspace">
        <p>
          When you become a member, your data is processed to run the association: directories, role assignments,
          division work, membership fee administration and governance. At the close of each semester's fee
          collection the association freezes a register of that semester's members, kept as the historical record of
          the association's composition for the life of the association.
        </p>
        <p>
          Some member information is published on the public website only where the member holds an active public
          role (for example name, role and photograph on the team page). Members can ask for their public profile to
          be limited. Alumni are listed in an internal directory and may be contacted for alumni initiatives; they
          may object at any time.
        </p>
        <p>
          Actions performed inside the Workspace are recorded in an activity log (author, role held at the time,
          action, affected item, timestamp) used for accountability and security. Users are informed of this inside
          the Workspace; the log is visible only to roles with the corresponding permission.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="cookies" number="09" title="Cookies and Similar Technologies">
        <p>
          The website uses strictly necessary technical cookies and similar local storage items, and non-essential
          categories (preferences, analytics, external media) only with your prior consent collected through the
          cookie banner, in line with the Garante's Guidelines on cookies of 10 June 2021 and article 122 of the
          Italian Privacy Code (Legislative Decree 196/2003, as amended). Full details, including how to change your
          choices at any time, are in the <a href="/cookie-policy">Cookie Policy</a>.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="sharing" number="10" title="Recipients and Processors">
        <p>Personal data is shared only with:</p>
        <ul>
          <li>
            <strong>Infrastructure providers acting as processors</strong> under article 28 GDPR terms: the website
            building and hosting platform (Lovable), the backend, database, authentication and file storage provider
            (Supabase) and the transactional email provider (Resend).
          </li>
          <li>
            <strong>Association members with a need to know,</strong> under role-based access controls (for example,
            only members involved in recruiting can access applications).
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
        <p>We do not sell personal data and we do not share it with advertisers.</p>
      </LegalSectionBlock>

      <LegalSectionBlock id="transfers" number="11" title="International Transfers">
        <p>
          Our providers may process data on servers outside the European Economic Area, in particular in the United
          States. Where that happens, transfers rely on a European Commission adequacy decision (including the EU-US
          Data Privacy Framework where the provider is certified) or on Standard Contractual Clauses with
          supplementary measures. You can request information on the applicable safeguards by contacting us. We
          verify our providers' transfer mechanisms when we appoint them and review them periodically.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="retention" number="12" title="Data Retention">
        <ul>
          <li><strong>Newsletter data:</strong> until you unsubscribe, plus a permanent suppression record to honour the unsubscribe.</li>
          <li><strong>Unsuccessful applications:</strong> up to twenty-four months from the end of the selection round, then deleted or anonymised; earlier deletion on request.</li>
          <li><strong>Member records:</strong> for the duration of membership and afterwards for institutional memory (semester registers and governance records) and defence of claims; records with accounting relevance generally not beyond ten years.</li>
          <li><strong>Accounting and treasury records:</strong> ten years, consistent with article 2220 of the Italian Civil Code applied by analogy.</li>
          <li><strong>Event registrations:</strong> up to twelve months after the event, unless connected to accounting records.</li>
          <li><strong>Workspace activity logs:</strong> up to twenty-four months, unless needed longer for a specific security investigation or legal claim.</li>
          <li><strong>Provider server and security logs:</strong> per the providers' standard, typically short, retention.</li>
        </ul>
        <p>Where a legal claim or investigation requires it, specific data may be kept for the additional time strictly needed.</p>
      </LegalSectionBlock>

      <LegalSectionBlock id="security" number="13" title="Security">
        <p>
          We apply appropriate technical and organisational measures: encrypted connections (HTTPS), authenticated
          access to the Workspace, role-based permissions enforced at the interface and at the database level,
          activity logging, separation between the public website and the reserved area, and providers with
          established security programmes. No system is perfectly secure; if a breach likely to result in a risk to
          your rights occurs, we will notify the competent authority and, where required, the persons concerned, in
          line with articles 33 and 34 GDPR.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="rights" number="14" title="Your Rights">
        <p>
          Under articles 15 to 22 GDPR you have the right to access your data, obtain rectification or erasure,
          restrict processing, receive your data in a portable format where processing is based on consent or
          contract, object to processing based on legitimate interest, and withdraw consent at any time without
          affecting prior processing. To exercise any right, write to{' '}
          <a href="mailto:as.minerva@unibocconi.it">as.minerva@unibocconi.it</a>. We respond within one month,
          extendable by two further months for complex requests, as allowed by article 12 GDPR.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="complaints" number="15" title="Complaints to the Garante">
        <p>
          If you believe your data is processed in breach of the law, you may lodge a complaint with the Italian
          supervisory authority, the Garante per la protezione dei dati personali, Piazza Venezia 11, 00187 Rome,{' '}
          <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">www.garanteprivacy.it</a>,
          or bring proceedings before the competent court. We would appreciate the chance to address your concern
          first, but you are not required to contact us before complaining.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="children" number="16" title="Minors">
        <p>
          The website and the association's activities are directed at university students and adults. We do not
          knowingly collect data of children under sixteen. If you believe a minor's data has been provided to us,
          contact us and we will delete it.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="sources" number="17" title="Data Not Obtained from You">
        <p>
          Limited alumni information (for example a change of employer) may be recorded from publicly available
          professional sources such as LinkedIn, in the legitimate interest of keeping the alumni directory
          accurate. Alumni may object at any time, in which case the record is limited to name and membership
          history.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="changes" number="18" title="Changes to This Notice">
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
