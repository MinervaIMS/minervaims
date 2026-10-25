import { Link } from 'react-router-dom';

// =====================================================================
// THE WAY INTO THE DIVISION FIT TEST from /join (Step 97), placed right
// after the divisions themselves: a reader who has just seen all six and
// cannot choose is the reader the test is for. Half rhythm at both ends,
// because it continues the divisions section rather than opening a new
// subject; the alumni band after it takes its own wider join.
// =====================================================================
export default function DivisionFitInvite() {
  return (
    <section aria-labelledby="join-fit-heading" className="bg-background pt-10 md:pt-16 pb-10 md:pb-16">
      <div className="container">
        <div className="border border-separator p-6 sm:p-8 md:p-12 grid grid-cols-1 md:grid-cols-[1.4fr_auto] gap-5 md:gap-10 items-center">
          <div>
            <h2 id="join-fit-heading" className="font-serif text-heading text-accent">Not sure which division suits you?</h2>
            <p className="font-body text-body-lg text-muted-foreground mt-4 max-w-xl leading-relaxed">
              The Division Fit test asks a few everyday questions and suggests which research division or fund may suit
              the way you like to think. About three minutes, no finance knowledge needed, and nothing is stored.
            </p>
          </div>
          <div className="md:justify-self-end">
            <Link to="/join/division-fit" className="cta-link">Take the Division Fit test</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
