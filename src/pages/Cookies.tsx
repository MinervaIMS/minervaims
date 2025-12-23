import { PageIntroduction } from '@/components/shared';

const Cookies = () => {
  return (
    <>
      <PageIntroduction
        title="Cookie Policy"
        description="Information about cookies and similar technologies on our website."
      />

      <div className="container py-section-sm md:py-section">
        <div className="max-w-3xl space-y-8">
          <section>
            <h2 className="font-serif text-heading mb-4">1. What Are Cookies</h2>
            <p className="font-body text-body text-muted-foreground">
              Cookies are small text files stored on your device when you visit a website. 
              They are widely used to make websites work more efficiently and provide 
              information to website owners.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">2. How We Use Cookies</h2>
            <p className="font-body text-body text-muted-foreground">
              [Placeholder: Details on cookie usage]
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">3. Types of Cookies</h2>
            <p className="font-body text-body text-muted-foreground">
              [Placeholder: Details on types of cookies used]
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">4. Managing Cookies</h2>
            <p className="font-body text-body text-muted-foreground">
              [Placeholder: Instructions for managing cookie preferences]
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">5. Contact</h2>
            <p className="font-body text-body text-muted-foreground">
              For questions regarding this Cookie Policy, please contact us at 
              [placeholder email address].
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default Cookies;
