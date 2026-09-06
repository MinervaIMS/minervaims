import { ReactNode } from 'react';

interface WorkspacePageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /**
   * Lay the actions out in TWO columns from `lg` up, rather than one.
   *
   * For the pages that carry five or six controls a single column is a
   * tall ladder down the right of the page, taller than the header it
   * belongs to. Two columns halve that without giving the width back to
   * the title, and the buttons still align on a shared grid rather than
   * re-wrapping. Opt in per page: most pages have two or three actions
   * and read better in one column.
   */
  actionColumns?: 1 | 2;
}

// =====================================================================
// The header every workspace page opens with.
// ---------------------------------------------------------------------
// TWO COLUMNS, AND THE SECOND ONE IS A COLUMN.
//
// The actions used to be a wrapping horizontal row, which works for the
// two or three buttons most pages carry and collapses for the pages that
// carry five. The Calendar is the worst case: Jump to today, the colour
// key, three sizes, Exam sessions and Add entry come to well over a
// thousand pixels, the row is `shrink-0`, and everything it takes comes
// out of the title column - which is `min-w-0` and therefore gives way
// without limit. The result was a nine-line paragraph in a 440px gutter
// beside a row of buttons, with half the width of the page empty
// underneath them.
//
// Stacking them removes the competition entirely. The actions take one
// button's width instead of five, the description gets the rest, and the
// buttons align on a single right edge in a fixed order rather than
// re-wrapping at every viewport width. `items-stretch` is what makes
// them the same width as each other: a column of ragged buttons reads
// worse than the row did.
//
// Below `lg` they stay a wrapping row, because a phone has no room for a
// column of full-width buttons above the content they act on.
//
// ---------------------------------------------------------------------
// THE DESCRIPTION IS ONE SENTENCE, AND THAT IS A RULE.
//
// It says what the page gives you, and stops. Every page here used to
// carry a paragraph explaining its controls, its rules and its
// consequences, which is the right material in the wrong place: it is
// read once, it pushes the page itself down the screen, and it is
// already written, better and in full, in the help panel that every page
// carries. `max-w-2xl` and the shorter copy keep it to a line or two at
// any width.
// =====================================================================

export function WorkspacePageHeader({ title, description, actions, actionColumns = 1 }: WorkspacePageHeaderProps) {
  return (
    <div className="mb-6 pb-4 border-b border-separator">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-heading text-accent">{title}</h1>
          {description && (
            <p className="font-body text-body text-muted-foreground mt-1.5 max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div
            className={
              actionColumns === 2
                // A grid rather than a column: two equal tracks, each
                // button filling its cell, so the block is a tidy
                // rectangle at any number of buttons and an odd one out
                // simply occupies the left cell of the last row.
                ? 'flex flex-wrap items-center gap-2 shrink-0 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-1.5 lg:w-[25.5rem] lg:pt-1 [&>*]:lg:w-full'
                : 'flex flex-wrap items-center gap-2 shrink-0 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-1.5 lg:w-[12.5rem] lg:pt-1'
            }
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspacePageHeader;
