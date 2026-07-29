import { usePermissions } from '@/hooks/usePermissions';
import { useDivisionQuestions } from '@/hooks/useDivisionQuestions';
import { JOIN_WRITTEN } from '@/lib/join-content';

/**
 * Block 05. Each division lists its written question as a quotation, marked by
 * a vertical rule running the full height of the quoted lines. The questions
 * are set by the Board ahead of each intake: until they are published the
 * section shows one designed empty line rather than five repeated placeholders.
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

      <ul className="mt-10 border-t border-separator">
        {JOIN_WRITTEN.divisions.map((division) => {
          const question = questions[division.key as keyof typeof questions];
          return (
            <li
              key={division.key}
              className="grid grid-cols-1 gap-y-3 border-b border-separator py-7 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-x-10"
            >
              <h3 className="font-serif text-subheading text-accent">{division.name}</h3>
              {question ? (
                <blockquote className="border-l-2 border-accent/45 pl-5">
                  <p className="font-body text-body-lg text-muted-foreground">{question}</p>
                </blockquote>
              ) : noneSet ? null : (
                // Mixed state: only the divisions still waiting carry the line.
                <p className="font-body text-body text-muted-foreground/70 md:pt-1">
                  {JOIN_WRITTEN.emptyState}
                </p>
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
