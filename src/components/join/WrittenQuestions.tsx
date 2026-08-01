import { usePermissions } from '@/hooks/usePermissions';
import { useDivisionQuestions } from '@/hooks/useDivisionQuestions';
import { JOIN_WRITTEN } from '@/lib/join-content';

/**
 * Block 05. Each division sits in a grey panel that lifts to light purple on
 * hover, matching the fund rows on the Portfolio Management page. The only
 * rule kept is the vertical one separating the division name from its written
 * question, so the section reads as five blocks rather than a ruled table.
 *
 * These panels are deliberately not links: they are informational and must not
 * navigate anywhere.
 */
export function WrittenQuestions() {
  const { questions, publishedCount, isLoading } = useDivisionQuestions();
  const { isFullAccess } = usePermissions();

  const noneSet = !isLoading && publishedCount === 0;

  return (
    <div>
      <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
        {JOIN_WRITTEN.lead}
      </p>

      {/*
        None published yet: the neutral line is stated once, above the list,
        and the five divisions read as a plain roster. Repeating it against
        every division would look like five failures instead of one state.
      */}
      {noneSet && (
        <p className="font-serif text-xl text-accent/70 mt-8">
          {JOIN_WRITTEN.emptyState}
        </p>
      )}

      <ul className="mt-10 flex flex-col gap-[.7rem] md:gap-4">
        {JOIN_WRITTEN.divisions.map((division) => {
          const question = questions[division.key as keyof typeof questions];
          return (
            <li
              key={division.key}
              className="grid grid-cols-1 gap-3 bg-muted p-6 transition-colors duration-300 ease-out hover:bg-[#ece9f4] md:grid-cols-[minmax(0,18rem)_1fr] md:gap-10 md:p-7"
            >
              <h3 className="font-serif text-lg text-accent">{division.name}</h3>
              {question ? (
                // The vertical rule is the one separator kept, running the full
                // height of the quoted question.
                <blockquote className="border-l-2 border-accent/45 pl-5">
                  <p className="font-body text-body text-muted-foreground">{question}</p>
                </blockquote>
              ) : noneSet ? null : (
                // Mixed state: only the divisions still waiting carry the line.
                <div className="border-l-2 border-accent/25 pl-5">
                  <p className="font-body text-body text-muted-foreground/70">
                    {JOIN_WRITTEN.emptyState}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {isFullAccess && noneSet && (
        <p className="font-body text-sm text-muted-foreground mt-6 pt-5 border-t border-separator">
          Visible to administrators only. No written questions are published, so
          each division is showing the empty state. Set them in Workspace,
          Website, Applications.
        </p>
      )}
    </div>
  );
}

export default WrittenQuestions;
