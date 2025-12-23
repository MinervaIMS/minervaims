import { PageIntroduction } from '@/components/shared';

const Terms = () => {
  return (
    <>
      <PageIntroduction
        title="Terms of Use"
        description="Terms and conditions governing the use of this website."
      />

      <div className="container py-section-sm md:py-section">
        <div className="max-w-3xl space-y-8">
          <section>
            <h2 className="font-serif text-heading mb-4">1. Acceptance of Terms</h2>
            <p className="font-body text-body text-muted-foreground">
              By accessing and using this website, you accept and agree to be bound by 
              these Terms of Use. If you do not agree to these terms, please do not use 
              this website.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">2. Educational Purpose</h2>
            <p className="font-body text-body text-muted-foreground">
              The content on this website is provided for educational and informational 
              purposes only. Nothing on this website constitutes investment advice or a 
              recommendation to buy or sell any financial instrument.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">3. Intellectual Property</h2>
            <p className="font-body text-body text-muted-foreground">
              [Placeholder: Details on intellectual property rights]
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">4. Disclaimer</h2>
            <p className="font-body text-body text-muted-foreground">
              [Placeholder: Disclaimer details]
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">5. Limitation of Liability</h2>
            <p className="font-body text-body text-muted-foreground">
              [Placeholder: Limitation of liability details]
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">6. Governing Law</h2>
            <p className="font-body text-body text-muted-foreground">
              [Placeholder: Governing law and jurisdiction]
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">7. Contact</h2>
            <p className="font-body text-body text-muted-foreground">
              For questions regarding these Terms of Use, please contact us at 
              [placeholder email address].
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default Terms;
