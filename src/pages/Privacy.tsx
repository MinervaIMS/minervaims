import { PageIntroduction } from '@/components/shared';

const Privacy = () => {
  return (
    <>
      <PageIntroduction
        title="Privacy Policy"
        description="How we collect, use, and protect your personal data."
      />

      <div className="container py-section-sm md:py-section">
        <div className="max-w-3xl space-y-8">
          <section>
            <h2 className="font-serif text-heading mb-4">1. Introduction</h2>
            <p className="font-body text-body text-muted-foreground">
              This Privacy Policy explains how Minerva Investment Management Society 
              ("we", "us", "our") collects, uses, and protects personal data when you 
              visit our website.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">2. Data Collection</h2>
            <p className="font-body text-body text-muted-foreground">
              [Placeholder: Details on data collection practices]
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">3. Data Usage</h2>
            <p className="font-body text-body text-muted-foreground">
              [Placeholder: Details on how data is used]
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">4. Data Protection</h2>
            <p className="font-body text-body text-muted-foreground">
              [Placeholder: Details on security measures]
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">5. Your Rights</h2>
            <p className="font-body text-body text-muted-foreground">
              [Placeholder: Details on user rights under GDPR]
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">6. Contact</h2>
            <p className="font-body text-body text-muted-foreground">
              For questions regarding this Privacy Policy, please contact us at 
              [placeholder email address].
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default Privacy;
