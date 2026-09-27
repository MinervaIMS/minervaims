import type { ReactNode } from 'react';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';

// =====================================================================
// The frame every Career page shares: the title and its one-line goal,
// the content, and the line My Profile closes with.
// ---------------------------------------------------------------------
// ON A COMPUTER THE PAGE ITSELF DOES NOT SCROLL. It takes exactly the
// height of the workspace pane (`lg:h-full`, the same mechanism as My
// Profile) and hands what is left under the header to its content, whose
// cards scroll inside themselves. So the header, the buttons and the
// footer line stay where they are, and only the part being read moves.
//
// The body keeps a floor of 22rem: on an unusually short window the pane
// scrolls rather than squeezing the cards to nothing.
//
// Below `lg` none of this applies: the page stacks and scrolls normally.
// =====================================================================

export function CareerPage({ title, description, toolbar, children }: {
  title: string;
  description: string;
  /** A row between the header and the content, such as a view switch. */
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="font-body lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <div className="lg:shrink-0">
        <WorkspacePageHeader title={title} description={description} />
      </div>
      {toolbar && <div className="mb-4 lg:shrink-0">{toolbar}</div>}
      <div className="lg:flex lg:min-h-[22rem] lg:flex-1 lg:flex-col">{children}</div>
      <p className="mt-4 shrink-0 text-center text-xs text-muted-foreground lg:mt-3">
        Activity across the workspace is recorded for accountability and security.
      </p>
    </div>
  );
}

export default CareerPage;
